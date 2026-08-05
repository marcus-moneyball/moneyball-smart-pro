/**
 * Executive Summary — texto humano. Nunca menciona odds, EV, stake
 * ou qualquer vocabulário de aposta.
 */
export function buildExecutiveSummary(matchInput, structuredFacts, dossie) {
  const lines = [];
  lines.push(`${matchInput.home_team} x ${matchInput.away_team} — ${matchInput.league}, ${matchInput.date}.`);

  const bandsSummary = dossie.markets
    .map((m) => `${m.market_id}: banda ${m.band}`)
    .join('; ');
  lines.push(`Leitura geral: ${bandsSummary}.`);

  const greenMarkets = dossie.markets.filter((m) => m.band === 'verde');
  if (greenMarkets.length > 0) {
    lines.push(`Pontos de maior consistência: ${greenMarkets.map((m) => m.market_id).join(', ')}.`);
  }

  const uncertainMarkets = dossie.markets.filter((m) => m.band === 'vermelha' || m.band === 'indefinida');
  if (uncertainMarkets.length > 0) {
    lines.push(`Pontos de maior incerteza: ${uncertainMarkets.map((m) => m.market_id).join(', ')}.`);
  }

  if (dossie.context_notes.length > 0) {
    lines.push(...dossie.context_notes);
  }

  return lines.join('\n');
}
