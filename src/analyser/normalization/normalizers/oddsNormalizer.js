/**
 * analyser/normalization/normalizers/oddsNormalizer.js
 * Transforma o evento bruto devolvido pelo oddsProvider.js em facts
 * atômicos — um fact por (bookmaker, mercado, outcome). Não decide o
 * que é "sinal" ou "ruído", não compara nada entre casas — isso é
 * trabalho da Investigation. Aqui só estrutura o que já veio.
 */

// Janela de frescor: acima disso, o fact é "stale" em vez de "live".
// Odds de mercado mudam rápido — 30min sem atualização já é sinal de
// que a casa não está acompanhando o movimento do mercado.
const JANELA_LIVE_MS = 30 * 60 * 1000;

/**
 * @param {{ provider: string, data: object, fetchedAt: string }} source
 *   - source.data é o evento bruto da Odds API (ver oddsProvider.js)
 * @returns {object[]} lista de facts (sem `conflicting` resolvido ainda
 *   — isso é calculado depois, entre normalizers, em normalizeFacts.js)
 */
export function normalizarOddsEmFacts(source) {
  const evento = source.data;
  const agora = Date.now();
  const facts = [];

  for (const bookmaker of evento?.bookmakers ?? []) {
    for (const mercado of bookmaker.markets ?? []) {
      for (const outcome of mercado.outcomes ?? []) {
        const timestamp = bookmaker.last_update ?? source.fetchedAt;
        const idadeMs = agora - new Date(timestamp).getTime();

        facts.push({
          key: `odds.${mercado.key}.${outcome.name}`,
          market: mercado.key,
          outcome: outcome.name,
          value: outcome.price,
          provenance: `oddsApi:${bookmaker.key}`,
          availability: idadeMs <= JANELA_LIVE_MS ? "live" : "stale",
          conflicting: false,
          conflictingWith: [],
          timestamp,
        });
      }
    }
  }

  return facts;
}
