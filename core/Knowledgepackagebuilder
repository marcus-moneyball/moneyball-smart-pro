/**
 * core/knowledgePackageBuilder.js
 * Etapa 1. Recebe a resposta bruta da IA (já vinda do AI Provider),
 * valida os campos obrigatórios do schema, e monta o Knowledge Package
 * canônico. Não conhece KnowledgeStore nem RendererRegistry — só
 * constrói o artefato e devolve.
 */

const CAMPOS_OBRIGATORIOS_ARVORE = ["contexto", "dna_cenario", "hipoteses", "sinal_ruido", "nivel_confianca"];
const CAMPOS_OBRIGATORIOS_HIPOTESES = ["principal", "alternativa", "refutada"];

function gerarAnalysisId() {
  // Sem dependência externa de uuid — suficientemente único pra uso interno.
  const timestamp = Date.now().toString(36);
  const aleatorio = Math.random().toString(36).slice(2, 8);
  return `anl_${timestamp}${aleatorio}`;
}

/**
 * Confere se a resposta da IA tem os campos mínimos do schema. Não
 * tenta adivinhar ou preencher o que falta — só reporta.
 * @returns {string[]} lista de campos ausentes (vazia = tudo ok)
 */
function validarRespostaIA(resposta) {
  const faltando = [];

  if (!resposta?.arvore_decisao) {
    faltando.push("arvore_decisao");
  } else {
    for (const campo of CAMPOS_OBRIGATORIOS_ARVORE) {
      if (resposta.arvore_decisao[campo] === undefined) faltando.push(`arvore_decisao.${campo}`);
    }
    if (resposta.arvore_decisao.hipoteses) {
      for (const campo of CAMPOS_OBRIGATORIOS_HIPOTESES) {
        if (resposta.arvore_decisao.hipoteses[campo] === undefined) {
          faltando.push(`arvore_decisao.hipoteses.${campo}`);
        }
      }
    }
  }

  if (!Array.isArray(resposta?.mercados)) faltando.push("mercados");
  if (!resposta?.previsao_final) faltando.push("previsao_final");

  return faltando;
}

/**
 * @param {object} respostaIA - o campo `.resposta` devolvido pelo AI Provider
 * @param {object} metadados - `.metadados` do AI Provider: { provider, model, timestamp }
 * @param {object} matchSnapshot - o MatchSnapshot original (só usamos `.partida`)
 * @param {object} versoes - { methodology_version, prompt_version }
 * @returns {{ ok: boolean, knowledgePackage?: object, erro?: string, camposFaltando?: string[] }}
 */
export function construirKnowledgePackage(respostaIA, metadados, matchSnapshot, versoes) {
  const camposFaltando = validarRespostaIA(respostaIA);

  if (camposFaltando.length > 0) {
    console.error("[KnowledgePackageBuilder] Campos obrigatórios ausentes:", camposFaltando);
    return { ok: false, erro: "Resposta da IA incompleta — não gerou Knowledge Package.", camposFaltando };
  }

  const knowledgePackage = {
    analysis_id: gerarAnalysisId(),
    methodology_version: versoes?.methodology_version ?? null,
    prompt_version: versoes?.prompt_version ?? null,
    provider: metadados?.provider ?? null,
    model: metadados?.model ?? null,
    timestamp: metadados?.timestamp ?? new Date().toISOString(),

    partida: matchSnapshot?.partida ?? {},

    arvore_decisao: {
      contexto: respostaIA.arvore_decisao.contexto,
      dna_cenario: respostaIA.arvore_decisao.dna_cenario,
      hipoteses: {
        principal: respostaIA.arvore_decisao.hipoteses.principal,
        alternativa: respostaIA.arvore_decisao.hipoteses.alternativa,
        refutada: respostaIA.arvore_decisao.hipoteses.refutada,
      },
      sinal_ruido: respostaIA.arvore_decisao.sinal_ruido,
      nivel_confianca: respostaIA.arvore_decisao.nivel_confianca,
    },

    mercados: respostaIA.mercados,
    dados_chave: respostaIA.dados_chave ?? [],
    pontos_de_risco: respostaIA.pontos_de_risco ?? [],
    previsao_final: respostaIA.previsao_final,

    // Nasce vazio de propósito — só o Cortex Audit Engine (fase futura)
    // preenche isso, via KnowledgeStore.enriquecer(). Nunca é tocado aqui.
    auditoria: {
      resultado_real: null,
      erro_classificado: null,
      ipn: null,
      feedback_metodologico: null,
    },
  };

  console.log(`[KnowledgePackageBuilder] Pacote construído: ${knowledgePackage.analysis_id}`);

  return { ok: true, knowledgePackage };
}
