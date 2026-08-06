/**
 * analyser/collection/matchInput.js
 * Contrato do matchInput — o único formato de entrada que a camada de
 * Collection aceita. Nenhum provider recebe nada além disso; nenhuma
 * etapa posterior (Normalization, Investigation) inventa dado que não
 * veio daqui ou de um provider real.
 *
 * @typedef {object} MatchInput
 * @property {string} home_team - nome do time mandante, como aparece na fonte de dados.
 * @property {string} away_team - nome do time visitante.
 * @property {string} sport - chave interna do esporte (ex: "futebol").
 * @property {string} league - nome da competição, usado pra resolver o
 *   sport_key de cada provider (ex: "Brasileirão Série A").
 * @property {string} [commence_time] - ISO 8601, opcional. Usado só pra
 *   desambiguar quando há mais de um jogo entre os mesmos dois times
 *   numa janela curta de tempo. Nunca inventado — se não vier, os
 *   providers seguem sem ele.
 */

const CAMPOS_OBRIGATORIOS = ["home_team", "away_team", "sport", "league"];

/**
 * Valida um matchInput. Não corrige nem preenche nada — só reporta o
 * que está faltando. Lança erro (fail-fast) em vez de deixar a
 * Collection rodar com entrada incompleta.
 * @param {object} matchInput
 * @throws {Error} se algum campo obrigatório estiver ausente.
 */
export function validarMatchInput(matchInput) {
  if (!matchInput || typeof matchInput !== "object") {
    throw new Error("[matchInput] matchInput ausente ou inválido.");
  }

  const faltando = CAMPOS_OBRIGATORIOS.filter((campo) => !matchInput[campo]);

  if (faltando.length > 0) {
    throw new Error(`[matchInput] Campos obrigatórios ausentes: ${faltando.join(", ")}`);
  }
}
