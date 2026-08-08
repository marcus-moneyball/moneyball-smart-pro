/**
 * analyser/builders/buildExecutiveSummary.js
 * Camada 4 do Analyser — Builders. Formata o Dossiê (saída da
 * Investigation) num resumo executivo em texto. Não acessa provider
 * nenhum, não investiga nada — só lê o Dossiê e formata.
 *
 * @param {object} dossie - saída de investigate.js
 * @returns {string}
 */
export function buildExecutiveSummary(dossie) {
  const { matchInput, mercados, limitacoesGerais } = dossie;
  const linhas = [];

  linhas.push(`Resumo executivo — ${matchInput.home_team} x ${matchInput.away_team} (${matchInput.league})`);
  linhas.push("");

  for (const m of mercados) {
    linhas.push(`Mercado: ${m.mercado}`);

    const baselineTexto = Object.entries(m.baseline.probabilidadeNormalizada)
      .map(([outcome, prob]) => `${outcome}: ${(prob * 100).toFixed(1)}%`)
      .join(" | ");
    linhas.push(`  Baseline (probabilidade implícita, sem margem da casa): ${baselineTexto}`);

    linhas.push(`  Deviation trigger: ${m.deviationTrigger.acionado ? "ACIONADO" : "não acionado"}`);

    if (m.evidenciasFavoraveis.length > 0) {
      linhas.push(`  Evidências favoráveis: ${m.evidenciasFavoraveis.join("; ")}`);
    }
    if (m.evidenciasContrarias.length > 0) {
      linhas.push(`  Evidências contrárias: ${m.evidenciasContrarias.join("; ")}`);
    }
    if (m.limitacoes.length > 0) {
      linhas.push(`  Limitações: ${m.limitacoes.join("; ")}`);
    }
    if (m.openQuestions.length > 0) {
      linhas.push(`  Perguntas em aberto: ${m.openQuestions.join("; ")}`);
    }
    linhas.push("");
  }

  if (limitacoesGerais.length > 0) {
    linhas.push(`Limitações gerais desta leitura: ${limitacoesGerais.join("; ")}`);
  }

  return linhas.join("\n").trim();
}
