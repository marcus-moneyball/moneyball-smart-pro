import { getBaselineValue } from './baseline.js';
import { computeDeviation } from './deviationTrigger.js';
import { classifyBand, worstBand } from './bands.js';

/**
 * Investiga os fatos de "forma_recente" e monta um dossiê por mercado.
 * Nunca calcula EV, probabilidade ou recomendação — só hipótese +
 * evidências + banda de confiança + limitações.
 */
export function investigateMarkets(structuredFacts) {
  const forma = structuredFacts.forma_recente ?? [];

  const deviations = {
    home_attack: computeDeviation(
      getBaselineValue(forma, 'home_team', 'goals_scored_last_10'),
      getBaselineValue(forma, 'home_team', 'xg_last_10')
    ),
    home_defense: computeDeviation(
      getBaselineValue(forma, 'home_team', 'goals_conceded_last_10'),
      getBaselineValue(forma, 'home_team', 'xga_last_10')
    ),
    away_attack: computeDeviation(
      getBaselineValue(forma, 'away_team', 'goals_scored_last_10'),
      getBaselineValue(forma, 'away_team', 'xg_last_10')
    ),
    away_defense: computeDeviation(
      getBaselineValue(forma, 'away_team', 'goals_conceded_last_10'),
      getBaselineValue(forma, 'away_team', 'xga_last_10')
    ),
  };

  const bandsByFactor = Object.fromEntries(
    Object.entries(deviations).map(([factor, dev]) => [factor, classifyBand(dev)])
  );

  const markets = [
    buildMarketHypothesis('moneyline', ['home_attack', 'home_defense', 'away_attack', 'away_defense'], deviations, bandsByFactor, forma),
    buildMarketHypothesis('totais', ['home_attack', 'home_defense', 'away_attack', 'away_defense'], deviations, bandsByFactor, forma),
  ];

  return { markets, context_notes: buildContextNotes(structuredFacts) };
}

function buildMarketHypothesis(marketId, factors, deviations, bandsByFactor, forma) {
  const relevantBands = factors.map((f) => bandsByFactor[f]);
  const band = worstBand(relevantBands);

  const evidenceFor = [];
  const evidenceAgainst = [];
  const limitations = [];
  const openQuestions = [];

  for (const factor of factors) {
    const dev = deviations[factor];
    const b = bandsByFactor[factor];
    if (b === 'indefinida') {
      limitations.push(`Sem dado suficiente para avaliar ${factor} (baseline ou métrica preditiva ausente).`);
      openQuestions.push(`Qual o real ${factor} desta equipe nas últimas rodadas?`);
      continue;
    }
    const line = `${factor}: observado ${dev.observed}, esperado ${dev.predictive} (desvio ${(dev.deviation_pct * 100).toFixed(1)}%)`;
    if (b === 'verde') evidenceFor.push(line);
    else evidenceAgainst.push(line);
  }

  const conflicts = forma.filter((f) => f.conflicting).map((f) => f.fact_id);

  return {
    market_id: marketId,
    hypothesis: `Banda ${band} para ${marketId}, com base na comparação forma recente x métricas preditivas.`,
    evidence_for: evidenceFor,
    evidence_against: evidenceAgainst,
    band,
    conflicts,
    limitations,
    open_questions: openQuestions,
  };
}

function buildContextNotes(structuredFacts) {
  const notes = [];
  const injuries = structuredFacts.lesoes ?? [];
  if (injuries.length > 0) {
    notes.push(`${injuries.length} fato(s) de lesão/desfalque identificado(s) — ver bloco lesoes do MDM.`);
  }
  return notes;
}
