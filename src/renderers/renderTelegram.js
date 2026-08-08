/**
 * renderers/renderTelegram.js
 * Transforma o pódio do Moneyball Pro (perfil_geral + pernas_elegiveis)
 * num alerta pro Telegram. Não reinterpreta nada — só formata.
 * Reaproveita o telegramService.js existente sem mudança.
 */
import {
  enviarMensagemTelegram,
  escaparMarkdownV2,
} from "../services/telegramService.js";

const MEDALHA_EMOJI = { Ouro: "🥇", Prata: "🥈", Bronze: "🥉" };

/**
 * @param {{ partida: { home_team: string, away_team: string, liga: string }, podio: { perfil_geral: string, pernas_elegiveis: object[] } }} payload
 * @param {object} env
 * @returns {Promise<{ ok: boolean, messageId?: number, erro?: string }>}
 */
export async function renderTelegram({ partida, podio }, env) {
  const linhas = [
    "🧠 *Pódio Moneyball Pro*",
    escaparMarkdownV2(`${partida.home_team} x ${partida.away_team} — ${partida.liga}`),
    "",
    escaparMarkdownV2(podio.perfil_geral),
    "",
  ];

  for (const p of podio.pernas_elegiveis) {
    linhas.push(`${MEDALHA_EMOJI[p.medalha] ?? ""} *${escaparMarkdownV2(p.medalha)} — ${escaparMarkdownV2(p.mercado)}*`);
    linhas.push(`➡️ ${escaparMarkdownV2(p.selecao)} \\| 💰 \`${escaparMarkdownV2(String(p.odd))}\``);
    linhas.push(escaparMarkdownV2(p.motivo));
    linhas.push("");
  }

  return enviarMensagemTelegram(env, linhas.join("\n").trim());
}
