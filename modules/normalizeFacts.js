/**
 * Normalização — puramente mecânica. Transforma dado bruto coletado
 * em fact items estruturados, organizados por domínio. Nunca julga,
 * nunca pondera, nunca decide o que "importa".
 */
import { createFact, createAbsentFact, markConflicts } from '../core/factHelpers.js';

const TEAM_LEVEL_FIELDS = ['forma_recente', 'especifico_esporte'];
const MATCH_LEVEL_FIELDS = ['h2h', 'clima'];
// 'contexto' é misto: alguns campos por time, outros por partida — tratado à parte.

export function normalizeFacts({ rawStats, rawWeather, sportSchema, statsProvenance, weatherProvenance }) {
  const structured = {};

  for (const domain of TEAM_LEVEL_FIELDS) {
    const keys = sportSchema.FIELDS[domain] ?? [];
    structured[domain] = [
      ...mapTeamFields('home_team', keys, rawStats?.home_team, statsProvenance),
      ...mapTeamFields('away_team', keys, rawStats?.away_team, statsProvenance),
    ];
  }

  // h2h e clima: nível de partida (subject = "match")
  structured.h2h = mapTeamFields('match', sportSchema.FIELDS.h2h ?? [], rawStats?.match, statsProvenance);
  structured.clima = mapTeamFields('match', sportSchema.FIELDS.clima ?? [], rawWeather, weatherProvenance);

  // contexto: campos por time + campos de partida, ambos vindos de rawStats
  const contextoTeamKeys = ['league_position', 'rest_days'];
  const contextoMatchKeys = ['match_importance', 'is_away_travel_long'];
  structured.contexto = [
    ...mapTeamFields('home_team', contextoTeamKeys, rawStats?.home_team, statsProvenance),
    ...mapTeamFields('away_team', contextoTeamKeys, rawStats?.away_team, statsProvenance),
    ...mapTeamFields('match', contextoMatchKeys, rawStats?.match, statsProvenance),
  ];

  return structured;
}

function mapTeamFields(subject, keys, rawObject, provenance) {
  return keys.map((key) => {
    const value = rawObject ? rawObject[key] : undefined;
    if (value === undefined || value === null) return createAbsentFact({ subject, key, provenance });
    return createFact({ subject, key, value, provenance });
  });
}

/** Odds → fact items (subject "match"), sem julgar/priorizar mercado. */
export function normalizeOdds(rawOdds, provenance) {
  if (!rawOdds || !Array.isArray(rawOdds.markets)) return [];
  return rawOdds.markets.map((market) =>
    createFact({ subject: 'match', key: `odds_${market.key}`, value: market.outcomes, provenance })
  );
}

/** Notícias/lesões extraídas via AI Provider — extraction_method: ai_extraction. */
export function normalizeNewsFacts(extractedItems, retrievedAt) {
  return extractedItems
    .filter((f) => f.subject && f.key)
    .map((f) =>
      createFact({
        subject: f.subject,
        key: f.key,
        value: f.value,
        provenance: {
          provider: 'ai-provider:extraction',
          retrieved_at: retrievedAt,
          source_ref: f.sourceRef ?? null,
          extraction_method: 'ai_extraction',
        },
      })
    );
}

export { markConflicts };
