/**
 * analyser/builders/buildTelegramCard.js
 * Camada 4 do Analyser — Builders. Formata o Dossiê num card curto,
 * pronto pra ir num post de Telegram (Markdown). Não acessa provider
 * nenhum, não investiga nada — só lê o Dossiê e formata.
 *
 * Isso é o texto do card em si — não confundir com
 * src/renderers/renderTelegram.js, que é quem efetivamente publica
 * (chama a API do Telegram). Builder só formata; Renderer só entrega.
 *
 * @param {object} dossie - saída de investigate.js
 * @returns {string} texto em Markdown do Telegram
 */
export function buildTelegramCard(dossie) {
  const { matchInput, mercados } = dossie;
  const linhas = [];

  linhas.push(`*${matchInput.home_team} x ${matchInput.away_team}*`);
  linhas.push(`_${matchInput.league}_`);
  linhas.push("");

  for (const m of mercados) {
    linhas.push(`*Mercado: ${m.mercado}*`);

    for (const [outcome, prob] of Object.entries(m.baseline.probabilidadeNormalizada)) {
      linhas.push(`• ${outcome}: ${(prob * 100).toFixed(1)}%`);
    }

    linhas.push(`Deviation trigger: ${m.deviationTrigger.acionado ? "⚠️ acionado" : "✅ não acionado"}`);

    if (m.limitacoes.length > 0) {
      linhas.push(`_Limitações: ${m.limitacoes.length} fonte(s) indisponível(is)._`);
    }

    linhas.push("");
  }

  linhas.push("_Conhecimento estruturado — não é recomendação de aposta._");

  return linhas.join("\n").trim();
}
