/**
 * renderers/renderGhost.js
 * Transforma o pódio do Moneyball Pro (perfil_geral + pernas_elegiveis)
 * num artigo pro Ghost. Não reinterpreta nada — só formata. Reaproveita
 * o ghostService.js existente sem mudança.
 */
import { publicarNoGhost } from "../services/ghostService.js";

const MEDALHA_EMOJI = { Ouro: "🥇", Prata: "🥈", Bronze: "🥉" };

/**
 * @param {{ partida: { home_team: string, away_team: string, liga: string }, podio: { perfil_geral: string, pernas_elegiveis: object[] } }} payload
 * @param {object} env
 * @returns {Promise<{ ok: boolean, post?: object, erro?: string }>}
 */
export async function renderGhost({ partida, podio }, env) {
  const titulo = `${partida.home_team} x ${partida.away_team} — Pódio Moneyball Pro`;

  const pernasHtml = podio.pernas_elegiveis
    .map(
      (p) => `
    <h3>${MEDALHA_EMOJI[p.medalha] ?? ""} ${p.medalha} — ${p.mercado}</h3>
    <p><strong>Seleção:</strong> ${p.selecao} &nbsp;|&nbsp; <strong>Odd:</strong> ${p.odd}</p>
    <p>${p.motivo}</p>`
    )
    .join("\n");

  const html = `
    <p><strong>${partida.liga}</strong></p>
    <p>${podio.perfil_geral}</p>
    ${pernasHtml}
  `.trim();

  return publicarNoGhost(env, {
    titulo,
    html,
    status: "draft",
    tags: ["moneyball-pro"],
  });
}
