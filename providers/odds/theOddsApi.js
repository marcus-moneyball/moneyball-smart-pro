/**
 * OddsProvider — The Odds API.
 *
 * v1: só a leitura atual (foto única) de mercados/linhas. Histórico de
 * movimentação de odds fica FORA do escopo desta versão — decisão
 * tomada para não bloquear a entrega; requer um componente de
 * armazenamento ao longo do tempo que ainda não existe no projeto.
 */
export function criarOddsProviderTheOddsApi({ apiKey, sportKey, baseUrl = 'https://api.the-odds-api.com/v4', fetchImpl = fetch }) {
  if (!apiKey) throw new Error('OddsProvider: apiKey é obrigatório');
  if (!sportKey) throw new Error('OddsProvider: sportKey é obrigatório');

  return {
    providerName: 'the-odds-api',
    async getOdds(eventId) {
      const url = `${baseUrl}/sports/${encodeURIComponent(sportKey)}/events/${encodeURIComponent(eventId)}/odds?apiKey=${apiKey}&markets=h2h,spreads,totals`;
      const response = await fetchImpl(url);
      if (!response.ok) return null;
      const data = await response.json();
      return { markets: normalizeMarkets(data) };
    },
  };
}

function normalizeMarkets(rawEventOdds) {
  if (!rawEventOdds || !Array.isArray(rawEventOdds.bookmakers)) return [];
  const byMarket = new Map();
  for (const bookmaker of rawEventOdds.bookmakers) {
    for (const market of bookmaker.markets ?? []) {
      if (!byMarket.has(market.key)) byMarket.set(market.key, []);
      byMarket.get(market.key).push({ bookmaker: bookmaker.key, outcomes: market.outcomes });
    }
  }
  return Array.from(byMarket.entries()).map(([key, outcomes]) => ({ key, outcomes }));
}
