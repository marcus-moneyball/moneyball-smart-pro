/**
 * analyser/builders/buildMdm.js
 * Camada 4 do Analyser — Builders. Formata o Dossiê num JSON
 * estruturado (MDM — Master Data Model) pra persistência/consumo por
 * outros sistemas. Não acessa provider nenhum, não investiga nada —
 * só lê o Dossiê e reformata em JSON limpo.
 *
 * @param {object} dossie - saída de investigate.js
 * @returns {object}
 */
export function buildMdm(dossie) {
  const { matchInput, investigatedAt, metodologia, mercados, limitacoesGerais } = dossie;

  return {
    analysisId: crypto.randomUUID(),
    geradoEm: new Date().toISOString(),
    metodologia,
    partida: {
      mandante: matchInput.home_team,
      visitante: matchInput.away_team,
      esporte: matchInput.sport,
      liga: matchInput.league,
    },
    investigadoEm: investigatedAt,
    mercados: mercados.map((m) => ({
      mercado: m.mercado,
      baseline: m.baseline,
      banda: m.banda,
      deviationTrigger: m.deviationTrigger,
      evidenciasFavoraveis: m.evidenciasFavoraveis,
      evidenciasContrarias: m.evidenciasContrarias,
      limitacoes: m.limitacoes,
      openQuestions: m.openQuestions,
    })),
    limitacoesGerais,
  };
}
