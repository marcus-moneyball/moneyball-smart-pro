/**
 * settlementEngine.js
 * Liquidação pós-jogo: busca o resultado real, compara com a regra da
 * aposta enviada, decide GREEN/RED/PUSH e dispara o alerta no Telegram.
 *
 * Requer no Worker: API_FOOTBALL_KEY (já existe), TELEGRAM_BOT_TOKEN,
 * TELEGRAM_CHAT_ID (ver telegramService.js).
 */

import { enviarMensagemTelegram, montarMensagemLiquidacao } from "./telegramService.js";

const REGRAS_MERCADO = {
  mais_de_0_5_gols_1t: (s) => s.gols_1t_casa + s.gols_1t_visitante > 0.5,
  menos_de_0_5_gols_1t: (s) => s.gols_1t_casa + s.gols_1t_visitante < 0.5,
  ambas_marcam: (s) => s.gols_casa > 0 && s.gols_visitante > 0,
  ambas_nao_marcam: (s) => !(s.gols_casa > 0 && s.gols_visitante > 0),
  cartoes_mais_4_5: (s) => s.cartoes_total > 4.5,
  cartoes_menos_4_5: (s) => s.cartoes_total < 4.5,
  moneyline_casa: (s) => s.gols_casa > s.gols_visitante,
  moneyline_visitante: (s) => s.gols_visitante > s.gols_casa,
  moneyline_empate: (s) => s.gols_casa === s.gols_visitante,
};

export function avaliarResultado(aposta, statsFinais) {
  const regra = REGRAS_MERCADO[aposta.direcao_regra];
  if (!regra) {
    console.error(`Regra desconhecida: "${aposta.direcao_regra}". Adicione em REGRAS_MERCADO.`);
    return "INDEFINIDO";
  }
  try {
    return regra(statsFinais) ? "GREEN" : "RED";
  } catch (e) {
    console.error(`Erro avaliando regra "${aposta.direcao_regra}":`, e.message);
    return "INDEFINIDO";
  }
}

function normalizarStatsFinais(fixtureData, statisticsData) {
  const fixture = fixtureData?.[0];
  if (!fixture) throw new Error("Fixture não encontrada na API-Football.");

  const golsCasa = fixture.goals?.home ?? null;
  const golsVisitante = fixture.goals?.away ?? null;
  const golsHTCasa = fixture.score?.halftime?.home ?? null;
  const golsHTVisitante = fixture.score?.halftime?.away ?? null;

  const contarCartoes = (statsTime) => {
    const encontrarValor = (tipo) =>
      statsTime?.statistics?.find((s) => s.type === tipo)?.value ?? 0;
    return (encontrarValor("Yellow Cards") || 0) + (encontrarValor("Red Cards") || 0);
  };

  const cartoesTotal = (statisticsData || []).reduce((soma, time) => soma + contarCartoes(time), 0);

  return {
    gols_casa: golsCasa,
    gols_visitante: golsVisitante,
    gols_1t_casa: golsHTCasa,
    gols_1t_visitante: golsHTVisitante,
    cartoes_total: cartoesTotal,
  };
}

async function buscarStatsFinais(env, fixtureId) {
  const headers = { "x-apisports-key": env.API_FOOTBALL_KEY };

  const [resFixture, resStats] = await Promise.all([
    fetch(`https://v3.football.api-sports.io/fixtures?id=${fixtureId}`, { headers }),
    fetch(`https://v3.football.api-sports.io/fixtures/statistics?fixture=${fixtureId}`, { headers }),
  ]);

  if (!resFixture.ok) throw new Error(`API-Football falhou (${resFixture.status}) buscando fixture.`);
  if (!resStats.ok) throw new Error(`API-Football falhou (${resStats.status}) buscando estatísticas.`);

  const fixtureData = (await resFixture.json()).response;
  const statisticsData = (await resStats.json()).response;

  return normalizarStatsFinais(fixtureData, statisticsData);
}

export async function liquidarAposta(env, aposta) {
  let statsFinais;
  try {
    statsFinais = await buscarStatsFinais(env, aposta.fixture_id);
  } catch (e) {
    console.error("Falha ao buscar estatísticas finais:", e.message);
    return { ok: false, erro: e.message };
  }

  const resultado = avaliarResultado(aposta, statsFinais);

  const placarFinal =
    statsFinais.gols_casa !== null ? `${statsFinais.gols_casa} - ${statsFinais.gols_visitante}` : null;

  const mensagem = montarMensagemLiquidacao({
    homeTeam: aposta.home_team,
    awayTeam: aposta.away_team,
    mercado: aposta.mercado,
    direcao: aposta.direcao_regra,
    resultado,
    placarFinal,
  });

  const envio = await enviarMensagemTelegram(env, mensagem);

  return { ok: true, resultado, placarFinal, telegram: envio };
}
