/**
 * core/radar.js
 * Radar real. Não é lógica nova — é a costura entre 2 peças que já
 * existiam soltas: fetchEvents (providers/oddsApi.js) e
 * assimetriaFilter/eventosComSinal (core/assimetriaFilter.js).
 * Formata a saída no contrato RankingDeInteresse[] já congelado.
 */
import { fetchEvents } from "../providers/oddsApi.js";
import { assimetriaFilter, eventosComSinal } from "./assimetriaFilter.js";

/**
 * @param {object} env - precisa de env.ODDS_API_KEY
 * @returns {(criterios: { liga: { id: string, oddsApiSportKey: string }, edgeMinimo?: number, dispersaoMinima?: number }) => Promise<object[]>}
 */
export function criarRadar(env) {
  return async function radar(criterios) {
    const { liga, edgeMinimo, dispersaoMinima } = criterios ?? {};

    if (!liga?.oddsApiSportKey) {
      throw new Error("Radar precisa de criterios.liga.oddsApiSportKey.");
    }

    console.log(`[Radar] Buscando eventos de "${liga.oddsApiSportKey}"...`);
    const events = await fetchEvents(liga.oddsApiSportKey, env.ODDS_API_KEY);
    console.log(`[Radar] ${events.length} evento(s) encontrado(s) na fonte de odds.`);

    const sinais = assimetriaFilter(events, { league: liga.id, edgeMinimo, dispersaoMinima });
    const mapaSinais = eventosComSinal(sinais);

    const ranking = events
      .filter((e) => mapaSinais.has(e.id))
      .map((e) => ({
        event_id: e.id,
        home_team: e.home_team,
        away_team: e.away_team,
        sport: e.sport_key,
        league: liga.id,
        sinais: mapaSinais.get(e.id),
      }));

    console.log(`[Radar] ${ranking.length}/${events.length} partida(s) sobreviveram ao piso de assimetria.`);
    return ranking;
  };
}
