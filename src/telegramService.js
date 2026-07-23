/**
 * telegramService.js
 * Envio de mensagens formatadas pro Telegram (Bot API), em MarkdownV2.
 *
 * Requer no Worker (wrangler secret put ...):
 *   TELEGRAM_BOT_TOKEN
 *   TELEGRAM_CHAT_ID
 */

const TELEGRAM_API_BASE = "https://api.telegram.org";

// MarkdownV2 do Telegram exige escapar estes caracteres em texto livre,
// senão a API recusa a mensagem inteira.
const CARACTERES_RESERVADOS = /[_*[\]()~`>#+\-=|{}.!]/g;

export function escaparMarkdownV2(texto) {
  return String(texto ?? "").replace(CARACTERES_RESERVADOS, (c) => `\\${c}`);
}

/**
 * Monta a mensagem de uma nova oportunidade (alerta de entrada).
 */
export function montarMensagemOportunidade({
  homeTeam,
  awayTeam,
  liga,
  mercado,
  direcao,
  odd,
  ev,
  confianca,
  justificativa,
}) {
  const linhas = [
    `🎯 *Nova Oportunidade — ${escaparMarkdownV2(liga)}*`,
    `${escaparMarkdownV2(homeTeam)} × ${escaparMarkdownV2(awayTeam)}`,
    "",
    `📊 Mercado: *${escaparMarkdownV2(mercado)}*`,
    `➡️ Direção: *${escaparMarkdownV2(direcao)}*`,
    `💰 Odd: \`${escaparMarkdownV2(odd)}\``,
    ev !== undefined && ev !== null
      ? `📈 EV: \`${escaparMarkdownV2((ev * 100).toFixed(1))}%\``
      : null,
    confianca ? `🔒 Confiança: *${escaparMarkdownV2(confianca)}*` : null,
    "",
    justificativa ? `📝 ${escaparMarkdownV2(justificativa)}` : null,
  ].filter(Boolean);

  return linhas.join("\n");
}

/**
 * Monta a mensagem de liquidação (GREEN/RED/PUSH) pós-jogo.
 */
export function montarMensagemLiquidacao({
  homeTeam,
  awayTeam,
  mercado,
  direcao,
  resultado, // "GREEN" | "RED" | "PUSH" | "INDEFINIDO"
  placarFinal,
  detalheEstatistico,
}) {
  const emoji = { GREEN: "✅", RED: "❌", PUSH: "➖", INDEFINIDO: "⚠️" }[resultado] ?? "⚠️";

  const linhas = [
    `${emoji} *${resultado}* — ${escaparMarkdownV2(homeTeam)} × ${escaparMarkdownV2(awayTeam)}`,
    `📊 Mercado: *${escaparMarkdownV2(mercado)}* — ${escaparMarkdownV2(direcao)}`,
    placarFinal ? `⚽ Placar final: \`${escaparMarkdownV2(placarFinal)}\`` : null,
    detalheEstatistico ? `📎 ${escaparMarkdownV2(detalheEstatistico)}` : null,
  ].filter(Boolean);

  return linhas.join("\n");
}

/**
 * Envia uma mensagem já formatada (MarkdownV2) pro chat configurado.
 * Nunca lança erro pra fora — loga e retorna { ok: false, erro } em vez
 * de derrubar o fluxo que chamou (um alerta falho não deve quebrar o
 * pipeline de análise ou de liquidação).
 */
export async function enviarMensagemTelegram(env, texto, opcoes = {}) {
  const token = env.TELEGRAM_BOT_TOKEN;
  const chatId = opcoes.chatId ?? env.TELEGRAM_CHAT_ID;

  if (!token || !chatId) {
    console.error("Telegram não configurado (TELEGRAM_BOT_TOKEN / TELEGRAM_CHAT_ID ausentes).");
    return { ok: false, erro: "Telegram não configurado." };
  }

  try {
    const response = await fetch(`${TELEGRAM_API_BASE}/bot${token}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: chatId,
        text: texto,
        parse_mode: "MarkdownV2",
        disable_web_page_preview: true,
      }),
    });

    const data = await response.json();
    if (!data.ok) {
      console.error("Telegram recusou a mensagem:", data.description);
      return { ok: false, erro: data.description };
    }
    return { ok: true, messageId: data.result.message_id };
  } catch (e) {
    console.error("Falha ao enviar mensagem pro Telegram:", e.message);
    return { ok: false, erro: e.message };
  }
}
