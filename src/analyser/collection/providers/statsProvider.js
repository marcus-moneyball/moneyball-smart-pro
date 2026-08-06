/**
 * analyser/collection/providers/statsProvider.js
 *
 * TODO — provider ainda não implementado.
 * Nenhuma fonte real de estatísticas de equipe (forma recente, xG,
 * posse, PPDA etc.) foi integrada ainda. Não retorna dado simulado —
 * falha explicitamente até existir uma fonte real conectada.
 *
 * Pra implementar de verdade:
 *   1. Escolher a fonte (ex: API-Football, SofaScore, Understat).
 *   2. Configurar a credencial correspondente via `wrangler secret put`
 *      (ex: STATS_API_KEY) e documentar aqui.
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
export async function buscarEstatisticasTime(_matchInput, _env) {
  throw new Error(
    "[statsProvider] Provider não implementado — TODO: integrar fonte real de estatísticas de equipe (ver comentário no topo do arquivo)."
  );
}
