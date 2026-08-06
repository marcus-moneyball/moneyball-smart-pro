/**
 * renderers/renderGhost.js
 * Transforma o Knowledge Package num artigo pro Ghost. Não reinterpreta
 * a partida — só formata. Reaproveita o ghostService.js existente.
 */

import { publicarNoGhost } from "../services/ghostService.js";

/**
 * @param {object} kp - Knowledge Package
 * @param {object} env
 * @returns {Promise<{ ok: boolean, post?: object, erro?: string }>}
 */
export async function renderGhost(kp, env) {
  const titulo = `${kp.partida.evento} — Leitura Nexus`;

  const html = `
    <p><strong>Confiança:</strong> ${kp.arvore_decisao.nivel_confianca}</p>
    <p><strong>Cenário:</strong> ${kp.arvore_decisao.dna_cenario}</p>

    <p>${kp.previsao_final}</p>

    <h3>Hipótese principal</h3>
    <p>${kp.arvore_decisao.hipoteses.principal}</p>

    <h3>Hipótese alternativa</h3>
    <p>${kp.arvore_decisao.hipoteses.alternativa}</p>
  `.trim();

  return publicarNoGhost(env, {
    titulo,
    html,
    status: "draft",
    tags: ["nexus"],
  });
}