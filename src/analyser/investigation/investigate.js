/**
 * analyser/investigation/investigate.js
 * Camada 3 do Analyser — Investigation. Implementa o método Nexus
 * sobre `structuredFacts` (saída da Normalization).
 *
 * IMPORTANTE — isso NÃO é a metodologia Nexus em prompt (ver
 * src/methodologies/nexusV1.js, usada pelo pipeline antigo via IA).
 * Esta é a versão determinística: opera só sobre os facts que
 * realmente existem, sem chamar nenhuma IA e sem inventar dado.
 * Quando `statsProvider`/`injuriesProvider`/`headToHeadProvider` forem
 * implementados (ver Collection), este arquivo passa a ter mais facts
 * pra trabalhar automaticamente — a estrutura do Dossiê não muda.
 *
 * Regras duras (contrato do usuário):
 *   - NÃO calcula EV.
 *   - NÃO gera aposta.
 *   - NÃO calcula stake.
 *   - Só produz conhecimento estruturado: baseline, deviation trigger,
 *     banda, evidências a favor/contra, limitações, open questions.
 */

const TOLERANCIA_BANDA_ESTREITA = 0.03; // abaixo disso, convergência é "evidência favorável"

function agruparPorMercado(facts) {
  const mercados = new Map();
  for (const fact of facts) {
    if (!mercados.has(fact.market)) mercados.set(fact.market, []);
    mercados.get(fact.market).push(fact);
  }
  return mercados;
}

function agruparPorOutcome(factsDoMercado) {
  const outcomes = new Map();
  for (const fact of factsDoMercado) {
    if (!outcomes.has(fact.outcome)) outcomes.set(fact.outcome, []);
    outcomes.get(fact.outcome).push(fact);
  }
  return outcomes;
}

/**
 * Baseline: probabilidade implícita de cada outcome a partir da
 * mediana das odds coletadas, com o overround removido (as odds de
 * uma casa sempre somam mais que 100% de probabilidade implícita —
 * isso é a margem da casa, não sinal de mercado). É leitura descritiva
 * do que o mercado precifica agora, não uma previsão nem EV.
 */
function calcularBaseline(outcomesMap) {
  const medianaPorOutcome = {};
  for (const [outcome, facts] of outcomesMap) {
    const valores = facts.map((f) => f.value).sort((a, b) => a - b);
    medianaPorOutcome[outcome] = valores[Math.floor(valores.length / 2)];
  }

  const implicitasBrutas = Object.fromEntries(
    Object.entries(medianaPorOutcome).map(([outcome, odd]) => [outcome, 1 / odd])
  );
  const somaImplicitas = Object.values(implicitasBrutas).reduce((a, b) => a + b, 0);
  const overround = somaImplicitas - 1;

  const probabilidadeNormalizada = Object.fromEntries(
    Object.entries(implicitasBrutas).map(([outcome, p]) => [outcome, p / somaImplicitas])
  );

  return { medianaPorOutcome, probabilidadeNormalizada, overround };
}

/**
 * Banda: intervalo de valores observado entre as fontes, por outcome.
 * Amplitude relativa alta = mercado dividido; baixa = convergência.
 */
function calcularBanda(outcomesMap) {
  const banda = {};
  for (const [outcome, facts] of outcomesMap) {
    const valores = facts.map((f) => f.value);
    const min = Math.min(...valores);
    const max = Math.max(...valores);
    const mediana = valores.slice().sort((a, b) => a - b)[Math.floor(valores.length / 2)];
    banda[outcome] = {
      min,
      max,
      mediana,
      amplitudeRelativa: mediana !== 0 ? (max - min) / mediana : 0,
      nFontes: valores.length,
    };
  }
  return banda;
}

/**
 * Deviation Trigger: aciona quando existe pelo menos um fact marcado
 * `conflicting` pela Normalization dentro deste mercado — ou seja,
 * pelo menos uma fonte destoou da mediana das demais além da
 * tolerância. É um proxy de "movimento anômalo" baseado em divergência
 * entre casas na mesma coleta (não temos série histórica de linha
 * ainda — ver TODO abaixo).
 *
 * TODO: quando o KnowledgeStore passar a guardar coletas anteriores da
 * mesma partida, trocar/complementar isso por um trigger de verdade
 * baseado em movimento de linha ao longo do tempo, não só divergência
 * entre casas na mesma leitura.
 */
function calcularDeviationTrigger(factsDoMercado) {
  const conflitantes = factsDoMercado.filter((f) => f.conflicting);

  return {
    acionado: conflitantes.length > 0,
    detalhes: conflitantes.map((f) => ({
      outcome: f.outcome,
      provenance: f.provenance,
      valor: f.value,
      destoaDe: f.conflictingWith,
    })),
  };
}

function levantarEvidencias(banda, deviationTrigger) {
  const favoraveis = [];
  const contrarias = [];

  for (const [outcome, dados] of Object.entries(banda)) {
    if (dados.amplitudeRelativa <= TOLERANCIA_BANDA_ESTREITA) {
      favoraveis.push(
        `Convergência entre ${dados.nFontes} fonte(s) para "${outcome}" (amplitude de ${(dados.amplitudeRelativa * 100).toFixed(1)}%) — mercado alinhado.`
      );
    } else {
      contrarias.push(
        `Dispersão de ${(dados.amplitudeRelativa * 100).toFixed(1)}% entre as fontes para "${outcome}" — mercado sem consenso claro.`
      );
    }
  }

  if (deviationTrigger.acionado) {
    for (const d of deviationTrigger.detalhes) {
      contrarias.push(
        `"${d.provenance}" destoa do consenso para "${d.outcome}" (valor ${d.valor}, fora da banda das demais fontes).`
      );
    }
  }

  return { favoraveis, contrarias };
}

/**
 * Limitações do mercado — o que faltou pra uma leitura mais completa.
 * Vem 1:1 dos `gaps` da Normalization (providers não implementados ou
 * que falharam na coleta), reescrito em linguagem de limitação.
 */
function levantarLimitacoes(gaps) {
  if (gaps.length === 0) return [];
  return gaps.map((g) => `Sem dado de "${g.provider}" disponível para esta leitura (${g.reason}).`);
}

/**
 * Open Questions — perguntas concretas que ficam em aberto dado o que
 * temos e o que falta. Geradas a partir de divergências reais
 * (deviation trigger) e das limitações reais (gaps) — nunca uma
 * pergunta genérica solta sem fact ou gap por trás.
 */
function levantarOpenQuestions(deviationTrigger, gaps) {
  const perguntas = [];

  for (const d of deviationTrigger.detalhes) {
    perguntas.push(`O que explica "${d.provenance}" destoar do consenso em "${d.outcome}"?`);
  }

  const providersFaltando = gaps.map((g) => g.provider);
  if (providersFaltando.length > 0) {
    perguntas.push(
      `Com ${providersFaltando.join(", ")} indisponíveis, o que dessas fontes mudaria essa leitura se estivesse disponível?`
    );
  }

  return perguntas;
}

/**
 * @param {object} normalized - saída de normalizeFacts.js
 * @returns {{
 *   matchInput: object,
 *   investigatedAt: string,
 *   metodologia: string,
 *   mercados: object[],
 *   limitacoesGerais: string[]
 * }}
 */
export function investigate(normalized) {
  const { matchInput, structuredFacts, gaps } = normalized;
  const mercadosMap = agruparPorMercado(structuredFacts);

  const mercados = [];
  for (const [mercado, factsDoMercado] of mercadosMap) {
    const outcomesMap = agruparPorOutcome(factsDoMercado);

    const baseline = calcularBaseline(outcomesMap);
    const banda = calcularBanda(outcomesMap);
    const deviationTrigger = calcularDeviationTrigger(factsDoMercado);
    const { favoraveis, contrarias } = levantarEvidencias(banda, deviationTrigger);

    mercados.push({
      mercado,
      baseline,
      banda,
      deviationTrigger,
      evidenciasFavoraveis: favoraveis,
      evidenciasContrarias: contrarias,
      limitacoes: levantarLimitacoes(gaps),
      openQuestions: levantarOpenQuestions(deviationTrigger, gaps),
    });
  }

  console.log(`[Investigation] ${mercados.length} mercado(s) investigado(s) — método Nexus (determinístico).`);

  return {
    matchInput,
    investigatedAt: new Date().toISOString(),
    metodologia: "nexus_investigacao_v1_deterministico",
    mercados,
    limitacoesGerais: levantarLimitacoes(gaps),
  };
}
