/**
 * analyser/collection/providers/oddsProvider.js
 * Provider REAL — busca odds ao vivo na The Odds API
 * (https://the-odds-api.com/liveapi/guides/v4/). Só coleta e devolve o
 * evento bruto encontrado; não interpreta, não calcula, não classifica
 * nada. Isso é trabalho da camada de Normalization/Investigation.
 *
 * Requer env.ODDS_API_KEY (configurar via `wrangler secret put ODDS_API_KEY`).
 */
import { resolverSportKey } from "./leagueToSportKey.js";

const ODDS_API_HOST = "https://api.the-odds-api.com";

function normalizarNomeTime(nome) {
  return (nome ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // remove acentos
    .toLowerCase()
    .trim();
}

/**
 * Procura, dentro da lista de eventos devolvida pela Odds API, o evento
 * que corresponde ao matchInput. Não inventa: se não achar, quem chama
 * decide o que fazer (aqui, lança erro).
 */
function encontrarEvento(eventos, matchInput) {
  const home = normalizarNomeTime(matchInput.home_team);
  const away = normalizarNomeTime(matchInput.away_team);

  const candidatos = eventos.filter((evento) => {
    const eventoHome = normalizarNomeTime(evento.home_team);
    const eventoAway = normalizarNomeTime(evento.away_team);
    return (
      (eventoHome.includes(home) || home.includes(eventoHome)) &&
      (eventoAway.includes(away) || away.includes(eventoAway))
    );
  });

  if (candidatos.length === 0) return null;
  if (candidatos.length === 1) return candidatos[0];

  // Mais de um candidato (ex: mesmos times jogando duas vezes na janela
  // coberta pela API) — se o matchInput trouxe commence_time, usa isso
  // pra desempatar. Se não trouxe, não inventa: pega o mais próximo de
  // agora e loga o alerta pra quem investigar depois saber que houve ambiguidade.
  if (matchInput.commence_time) {
    const alvo = new Date(matchInput.commence_time).getTime();
    return candidatos.reduce((maisProximo, atual) =>
      Math.abs(new Date(atual.commence_time).getTime() - alvo) <
      Math.abs(new Date(maisProximo.commence_time).getTime() - alvo)
        ? atual
        : maisProximo
    );
  }

  console.warn(
    `[oddsProvider] ${candidatos.length} eventos ambíguos para ${matchInput.home_team} x ${matchInput.away_team} — usando o mais próximo de agora. Considere enviar commence_time no matchInput.`
  );
  const agora = Date.now();
  return candidatos.reduce((maisProximo, atual) =>
    Math.abs(new Date(atual.commence_time).getTime() - agora) <
    Math.abs(new Date(maisProximo.commence_time).getTime() - agora)
      ? atual
      : maisProximo
  );
}

/**
 * @param {import('./matchInput.js').MatchInput} matchInput
 * @param {object} env - env do Worker, precisa de env.ODDS_API_KEY
 * @returns {Promise<object>} evento bruto da Odds API (sem nenhuma transformação)
 */
export async function buscarOddsReais(matchInput, env) {
  if (!env?.ODDS_API_KEY) {
    throw new Error("[oddsProvider] ODDS_API_KEY não configurada no Worker.");
  }

  const sportKey = resolverSportKey(matchInput.league);
  const regions = env.ODDS_API_REGIONS || "eu,us";
  const url = `${ODDS_API_HOST}/v4/sports/${sportKey}/odds/?apiKey=${env.ODDS_API_KEY}&regions=${regions}&markets=h2h&oddsFormat=decimal`;

  const resposta = await fetch(url);

  if (!resposta.ok) {
    const corpo = await resposta.text().catch(() => "");
    throw new Error(`[oddsProvider] Odds API respondeu ${resposta.status}: ${corpo.slice(0, 300)}`);
  }

  const eventos = await resposta.json();

  if (!Array.isArray(eventos)) {
    throw new Error("[oddsProvider] Resposta da Odds API em formato inesperado (esperava array de eventos).");
  }

  const evento = encontrarEvento(eventos, matchInput);

  if (!evento) {
    throw new Error(
      `[oddsProvider] Nenhum evento encontrado para ${matchInput.home_team} x ${matchInput.away_team} em ${sportKey}.`
    );
  }

  return evento;
}
