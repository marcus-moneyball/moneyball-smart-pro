/**
 * MDM Builder — empacota todo o conhecimento estruturado. Nenhum
 * número de probabilidade/EV/stake entra aqui — só o que já foi
 * investigado (fatos + dossiê).
 */
export function buildMdm(matchInput, structuredFacts, oddsFacts, dossie, generatedAt) {
  return {
    match: {
      sport: matchInput.sport,
      league: matchInput.league,
      home_team: matchInput.home_team,
      away_team: matchInput.away_team,
      date: matchInput.date,
    },
    generated_at: generatedAt,
    facts: {
      forma_recente: structuredFacts.forma_recente ?? [],
      h2h: structuredFacts.h2h ?? [],
      lesoes: structuredFacts.lesoes ?? [],
      contexto: structuredFacts.contexto ?? [],
      clima: structuredFacts.clima ?? [],
      especifico_esporte: structuredFacts.especifico_esporte ?? [],
      mercados_odds: oddsFacts ?? [],
    },
    investigation: {
      markets: dossie.markets,
      context_notes: dossie.context_notes,
    },
  };
}
