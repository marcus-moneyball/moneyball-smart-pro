/**
 * renderers/renderTelegram.js
 * Transforma o Knowledge Package num alerta para o Telegram.
 * Não reinterpreta a partida — apenas formata o conteúdo.
 */

import {
  enviarMensagemTelegram,
  escaparMarkdownV2,
} from "../services/telegramService.js";

/**
 * @param {object} kp - Knowledge Package
 * @param {object} env
 * @returns {Promise<{ ok: boolean, messageId?: number, erro?: string }>}
 */
export async function renderTelegram(kp, env) {
  const mensagem = [
    "🧠 *Prognóstico Nexus*",
    escaparMarkdownV2(kp.partida.evento),
    "",
    `📍 Cenário: *${escaparMarkdownV2(
      kp.arvore_decisao.dna_cenario
    )}*`,
    `🔒 Confiança: *${escaparMarkdownV2(
      kp.arvore_decisao.nivel_confianca
    )}*`,
    "",
    `📝 ${escaparMarkdownV2(kp.previsao_final)}`,
  ].join("\n");

  return enviarMensagemTelegram(env, mensagem);
}