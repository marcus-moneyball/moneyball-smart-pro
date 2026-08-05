import assert from 'node:assert/strict';
import { criarAnalyser } from './index.js';
import { criarSportRegistry } from './core/sportRegistry.js';
import { criarFutebolSportModule } from './sports/futebol/module.js';

const clock = { now: () => new Date('2026-08-09T12:00:00Z') };

const matchInput = { sport: 'soccer', league: 'Brasileirão', home_team: 'Flamengo', away_team: 'Palmeiras', date: '2026-08-10' };

function mockStatsProvider(data) {
  return { providerName: 'mock-stats', async getMatchStats(_m) { return data; } };
}
function mockOddsProvider(markets) {
  return { providerName: 'mock-odds', async getOdds(_id) { return { markets }; } };
}
function mockWeatherProvider(data) {
  return { providerName: 'mock-weather', async getWeather(_m) { return data; } };
}
function mockNewsExtractor(items) {
  return { async extractFacts(_m) { return items; } };
}

async function testFluxoCompletoBandaVerde() {
  // home com desvio pequeno (banda verde), away com dado ausente (indefinida)
  const stats = {
    home_team: { goals_scored_last_10: 18, xg_last_10: 17, goals_conceded_last_10: 8, xga_last_10: 8.5, league_position: 3, rest_days: 5 },
    away_team: { goals_scored_last_10: 14, league_position: 6, rest_days: 4 }, // xg ausente de propósito
    match: { h2h_last_5_home_wins: 3, h2h_last_5_away_wins: 1, h2h_last_5_draws: 1, match_importance: 'alta', is_away_travel_long: false },
  };
  const odds = [{ key: 'h2h', outcomes: [{ name: 'Flamengo', price: 1.85 }] }];
  const weather = { temperature_c: 24, wind_kph: 10, rain_probability: 0.1 };
  const news = [{ subject: 'player', key: 'availability', value: { player: 'Estêvão', status: 'duvida' }, sourceRef: 'https://exemplo.com/noticia' }];

  const futebolModule = criarFutebolSportModule({
    statsProvider: mockStatsProvider(stats),
    oddsProvider: mockOddsProvider(odds),
    weatherProvider: mockWeatherProvider(weather),
    newsExtractor: mockNewsExtractor(news),
    eventIdForOdds: 'evt123',
  });

  const registry = criarSportRegistry({ soccer: futebolModule });
  const analyser = criarAnalyser({ sportRegistry: registry, clock });

  const { executiveSummary, telegramCard, mdm } = await analyser.run(matchInput);

  // As 3 saídas existem
  assert.ok(typeof executiveSummary === 'string' && executiveSummary.length > 0);
  assert.ok(typeof telegramCard === 'string' && telegramCard.length > 0);
  assert.ok(typeof mdm === 'object');

  // Resumo Executivo e Card nunca mencionam odds/aposta
  const forbiddenWords = ['odds', 'ev', 'stake', 'aposta', 'bilhete'];
  for (const word of forbiddenWords) {
    assert.ok(!executiveSummary.toLowerCase().includes(word), `executiveSummary não deve conter "${word}"`);
    assert.ok(!telegramCard.toLowerCase().includes(word), `telegramCard não deve conter "${word}"`);
  }

  // MDM contém odds (é o único artefato que pode)
  assert.equal(mdm.facts.mercados_odds.length, 1);

  // Dado ausente representado explicitamente
  const awayXg = mdm.facts.forma_recente.find((f) => f.subject === 'away_team' && f.key === 'xg_last_10');
  assert.equal(awayXg.availability, false);
  assert.equal(awayXg.value, null);

  // Fato via AI extraction presente e marcado corretamente
  assert.equal(mdm.facts.lesoes.length, 1);
  assert.equal(mdm.facts.lesoes[0].provenance.extraction_method, 'ai_extraction');

  // Investigação: home_attack (18 vs 17) é desvio pequeno -> banda verde deveria aparecer em algum lugar
  const moneyline = mdm.investigation.markets.find((m) => m.market_id === 'moneyline');
  assert.ok(moneyline.evidence_for.some((line) => line.includes('home_attack')));

  // away_attack não tem xg -> banda indefinida -> vira limitation/open_question
  assert.ok(moneyline.limitations.some((l) => l.includes('away_attack')));
  assert.equal(moneyline.band, 'indefinida', 'pior banda entre os fatores deve prevalecer');
}

async function testFalhaDeProviderNaoDerrubaPipeline() {
  const futebolModule = criarFutebolSportModule({
    statsProvider: { providerName: 'mock', async getMatchStats() { throw new Error('timeout'); } },
    oddsProvider: mockOddsProvider([]),
    weatherProvider: mockWeatherProvider({ temperature_c: 20, wind_kph: 5, rain_probability: 0 }),
    newsExtractor: mockNewsExtractor([]),
    eventIdForOdds: 'evt123',
  });
  const registry = criarSportRegistry({ soccer: futebolModule });
  const analyser = criarAnalyser({ sportRegistry: registry, clock });

  const { mdm } = await analyser.run(matchInput);
  // stats falhou inteiro -> todos os fatos de forma_recente devem vir ausentes, nunca lançar exceção pro chamador
  assert.ok(mdm.facts.forma_recente.every((f) => f.availability === false));
}

async function main() {
  await testFluxoCompletoBandaVerde();
  await testFalhaDeProviderNaoDerrubaPipeline();
  console.log('OK — todos os testes do Analyser (núcleo + Futebol) passaram');
}

main().catch((err) => { console.error('FALHA:', err); process.exit(1); });
