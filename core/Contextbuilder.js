/**
 * core/contextBuilder.js
 * MatchSnapshot + methodology → { systemPrompt, userContent } pronto
 * pro AI Provider. Não conhece o conteúdo de nenhuma metodologia — só
 * monta o payload com o que recebe injetado. Trocar de metodologia
 * (Nexus v2, uma metodologia de MLB, etc.) nunca exige editar este arquivo.
 */

/**
 * @param {object} matchSnapshot
 * @param {{ systemPrompt: string, methodology_version: string, prompt_version: string }} methodology
 *   - módulo de metodologia injetado pelo CortexEngine (ex: methodologies/nexusV1.js)
 * @returns {Promise<{ systemPrompt: string, userContent: string }>}
 */
export async function contextBuilder(matchSnapshot, methodology) {
  console.log(`[ContextBuilder] Montando payload (metodologia ${methodology?.methodology_version ?? "?"})`);

  return {
    systemPrompt: methodology.systemPrompt,
    userContent: JSON.stringify(matchSnapshot, null, 2),
  };
}
