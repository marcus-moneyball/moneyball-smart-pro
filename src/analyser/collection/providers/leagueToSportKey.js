/**
 * analyser/collection/providers/leagueToSportKey.js
 * Mapa de nome de liga (como o matchInput recebe) → sport_key real da
 * The Odds API (https://the-odds-api.com/liveapi/guides/v4/). Os
 * valores abaixo são as chaves documentadas pela própria API — nenhum
 * inventado.
 *
 * Cobertura parcial de propósito: liga que não estiver aqui lança erro
 * explícito (ver resolverSportKey) em vez de tentar adivinhar. Pra
 * cobrir uma liga nova, só adicionar a entrada — nenhum outro arquivo
 * precisa mudar.
 */
export const LEAGUE_TO_SPORT_KEY = {
  // Futebol
  "brasileirão série a": "soccer_brazil_campeonato",
  "brasileirão": "soccer_brazil_campeonato",
  "premier league": "soccer_epl",
  "la liga": "soccer_spain_la_liga",
  "bundesliga": "soccer_germany_bundesliga",
  "serie a": "soccer_italy_serie_a",
  "ligue 1": "soccer_france_ligue_one",
  "champions league": "soccer_uefa_champs_league",
  "libertadores": "soccer_conmebol_copa_libertadores",

  // Outros esportes (referência, mesmo que o projeto foque em futebol por enquanto)
  "nba": "basketball_nba",
  "nfl": "americanfootball_nfl",
  "mlb": "baseball_mlb",
  "nhl": "icehockey_nhl",
};

/**
 * @param {string} league - matchInput.league
 * @returns {string} sport_key da Odds API
 * @throws {Error} se a liga não estiver mapeada — fail-fast, sem chute.
 */
export function resolverSportKey(league) {
  const chave = (league ?? "").trim().toLowerCase();
  const sportKey = LEAGUE_TO_SPORT_KEY[chave];

  if (!sportKey) {
    throw new Error(
      `[oddsProvider] Liga "${league}" não está mapeada em leagueToSportKey.js. ` +
        `Adicione o sport_key real (ver https://the-odds-api.com/sports-odds-data/sports-apis.html) antes de coletar dados dessa liga.`
    );
  }

  return sportKey;
}
