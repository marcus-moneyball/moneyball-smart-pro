/**
 * Card Telegram — teaser curto. Sem odds, sem sugestão de aposta.
 */
export function buildTelegramCard(matchInput, dossie) {
  const mostInterestingMarket =
    dossie.markets.find((m) => m.band === 'vermelha') ??
    dossie.markets.find((m) => m.band === 'verde') ??
    dossie.markets[0];

  const hook = mostInterestingMarket
    ? `Olho em ${mostInterestingMarket.market_id} (banda ${mostInterestingMarket.band}).`
    : 'Investigação em andamento.';

  return [
    `⚽ ${matchInput.home_team} x ${matchInput.away_team}`,
    `${matchInput.league} — ${matchInput.date}`,
    hook,
  ].join('\n');
}
