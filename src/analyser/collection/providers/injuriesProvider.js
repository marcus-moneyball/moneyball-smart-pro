/**
 * analyser/collection/providers/injuriesProvider.js
 *
 * TODO — provider ainda não implementado.
 * Nenhuma fonte real de desfalques/notícias de time (lesões,
 * suspensões, escalação provável) foi integrada ainda. Não retorna
 * dado simulado — falha explicitamente até existir uma fonte real
 * conectada.
 *
 * Pra implementar de verdade:
 *   1. Escolher a fonte (ex: API-Football injuries endpoint, feed de
 *      notícias oficial da liga, scraping autorizado).
 *   2. Configurar a credencial correspondente via `wrangler secret put`
 *      (ex: INJURIES_API_KEY) e documentar aqui.
 *   3. Trocar o corpo desta função por uma chamada HTTP real, seguindo
 *      o mesmo padrão de oddsProvider.js: sem interpretar nada, só
 *      devolver o dado bruto da fonte.
 * A assinatura da função (matchInput, env) → Promise<object> já é a
 * definitiva — o orquestrador (collectMatchData.js) não muda quando
 * isso for implementado.
 */

/**
 * @param {import('../matchInput.js').MatchInput} matchInput
 * @param {object} env
 * @returns {Promise<object>}
 */
export async function buscarDesfalques(_matchInput, _env) {
  throw new Error(
    "[injuriesProvider] Provider não implementado — TODO: integrar fonte real de desfalques/lesões (ver comentário no topo do arquivo)."
  );
}
