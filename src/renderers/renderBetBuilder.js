/**
 * renderers/renderBetBuilder.js
 * Transforma o Knowledge Package no JSON MDM compacto pro Moneyball Pro.
 * Transformação pura em memória — não conhece nenhum serviço externo.
 */

/**
 * @param {object} kp - Knowledge Package
 * @param {object} _env - não usado (transformação pura)
 * @returns {Promise<{ ok: boolean, mdm?: object }>}
 */
export async function renderBetBuilder(kp, _env) {
  const mdm = {
    partida: kp.partida,
    mercados: kp.mercados,
    ctx: {}, // MatchSnapshot.ctx não é carregado no Knowledge Package atual — gap conhecido, não bloqueia este teste
    nexus: {
      analysis_id: kp.analysis_id,
      dna_cenario: kp.arvore_decisao.dna_cenario,
      sinal_ruido: kp.arvore_decisao.sinal_ruido,
      nivel_confianca: kp.arvore_decisao.nivel_confianca,
    },
  };

  return { ok: true, mdm };
}
