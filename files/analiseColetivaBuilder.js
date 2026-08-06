/**
 * analiseColetivaBuilder.js
 *
 * Responsabilidade única: montar o bloco `analise_coletiva` do MDM.
 *
 * Nesta primeira versão, este builder é essencialmente um MAPEADOR:
 * ele conecta o que já existe no `dossie` (produzido pelo Analyser/AI
 * Provider) para o formato do MDM, sem inferir, sintetizar ou julgar
 * nada que o dossiê não tenha dito explicitamente. Onde o dossiê não
 * tem a informação, o campo fica `[]` ou `null` — nunca texto genérico.
 *
 * Formato assumido de `dossie.markets` (contrato já usado no MIE):
 *   {
 *     [nomeDoMercado]: {
 *       questions: [...],
 *       evidences: [{ id, source, fact }],
 *       conflicts: [{ id, description, involved_evidence }],
 *       limitations: [...],
 *       open_questions: [...],
 *       public_attention: [...],
 *       hypothesis: { statement, supporting_evidence_ids, contradicting_evidence_ids, logic_path }
 *     }
 *   }
 * Se o seu dossie usar outro shape, ajuste apenas `getMarkets()` abaixo.
 *
 * IMPORTANTE — `analise_de_precificacao` fica sempre `null` nesta versão.
 * Precificação (odds, EV, probabilidade de aposta) é território exclusivo
 * do BetBuilder; mesmo que o dossie um dia carregue algo parecido, esse
 * campo só deve ser preenchido depois de uma decisão explícita sobre o
 * que é "leitura de mercado" (permitido) vs. "decisão de aposta" (proibido).
 *
 * Não faz: não gera hipótese nova, não calcula probabilidade, não
 * resolve conflito entre evidências, não decide qual hipótese "vale".
 */

function getMarkets(dossie) {
  if (!dossie || typeof dossie.markets !== "object" || dossie.markets === null) {
    return {};
  }
  return dossie.markets;
}

function buildModulosEvidencia(dossie) {
  const markets = getMarkets(dossie);
  return Object.entries(markets)
    .filter(([, market]) => Array.isArray(market?.evidences) && market.evidences.length > 0)
    .map(([mercado, market]) => ({
      mercado,
      evidencias: market.evidences
    }));
}

function buildSinteseEvidencias(dossie) {
  // O Analyser/MIE atual não produz uma síntese explícita por mercado —
  // só evidências, conflitos e hipótese. Sem um campo de síntese real no
  // dossie, este bloco fica vazio (nunca resumido artificialmente aqui).
  if (Array.isArray(dossie?.synthesis)) {
    return dossie.synthesis;
  }
  return [];
}

function buildHipotesesConcorrentes(dossie) {
  const markets = getMarkets(dossie);
  return Object.entries(markets)
    .filter(([, market]) => market?.hypothesis && market.hypothesis.statement)
    .map(([mercado, market]) => ({
      mercado,
      statement: market.hypothesis.statement,
      supporting_evidence_ids: market.hypothesis.supporting_evidence_ids ?? [],
      contradicting_evidence_ids: market.hypothesis.contradicting_evidence_ids ?? [],
      logic_path: market.hypothesis.logic_path ?? null
    }));
}

function buildValidacaoCruzada(dossie) {
  const markets = getMarkets(dossie);
  return Object.entries(markets)
    .filter(([, market]) => Array.isArray(market?.conflicts) && market.conflicts.length > 0)
    .map(([mercado, market]) => ({
      mercado,
      conflitos: market.conflicts
    }));
}

function buildNarrativa(dossie) {
  if (typeof dossie?.narrativa === "string" && dossie.narrativa) {
    return dossie.narrativa;
  }
  return null;
}

export function buildAnaliseColetiva(structuredFacts, dossie) {
  return {
    modulos_evidencia: buildModulosEvidencia(dossie),
    sintese_evidencias: buildSinteseEvidencias(dossie),
    hipoteses_concorrentes: buildHipotesesConcorrentes(dossie),
    resultado_principal: dossie?.resultado_principal ?? null,
    deliberacao: dossie?.deliberacao ?? null,
    assimetrias: Array.isArray(dossie?.assimetrias) ? dossie.assimetrias : [],
    analise_precificacao: null,
    validacao_cruzada: buildValidacaoCruzada(dossie),
    narrativa: buildNarrativa(dossie),
    leitura_segmento_inicial: dossie?.leitura_segmento_inicial ?? null
  };
}
