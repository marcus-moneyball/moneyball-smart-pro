/**
 * runAnalyser.js
 *
 * Orquestrador único do Analyser: reúne as etapas já existentes do
 * pipeline (coleta → normalização → investigação) e os 3 builders de
 * saída (executiveSummary, telegramCard, mdm) numa única função.
 *
 * Cada etapa é uma função isolada e testável — o objetivo é poder
 * migrar qualquer uma delas para um módulo/arquivo independente depois
 * sem tocar na lógica interna, só trocando o import.
 *
 * AJUSTE NECESSÁRIO NOS IMPORTS ABAIXO: os caminhos assumem os nomes já
 * usados no histórico do projeto (coleta via providers, normalização em
 * fact items, investigação por banda). Troque só os caminhos/nomes de
 * função pelos reais do seu repositório — a assinatura de cada etapa
 * (o que entra, o que sai) é o que importa pro resto do arquivo
 * continuar funcionando sem alteração.
 *
 * Injeção de dependência: `deps` tem defaults apontando pras
 * implementações reais, mas pode ser sobrescrito nos testes (ver
 * tests/runAnalyser.test.js) sem precisar de providers/IA de verdade.
 */

import { collectData } from "../core/collector.js";
import { normalizeFacts } from "../core/normalizer.js";
import { investigate } from "../core/investigator.js";
import { buildExecutiveSummary } from "../builders/executiveSummaryBuilder.js";
import { buildTelegramCard } from "../builders/telegramCardBuilder.js";
import { buildMdm } from "../builders/mdmBuilder.js";

const defaultDeps = {
  collectData,
  normalizeFacts,
  investigate,
  buildExecutiveSummary,
  buildTelegramCard,
  buildMdm
};

// Etapa 1 — coleta (providers de stats/odds/weather/news)
export async function runCollect(matchInput, deps = defaultDeps) {
  return deps.collectData(matchInput);
}

// Etapa 2 — normalização (raw -> fact items com provenance/availability/conflicting)
export function runNormalize(rawData, deps = defaultDeps) {
  return deps.normalizeFacts(rawData);
}

// Etapa 3 — investigação (baseline -> gatilho de desvio -> banda por mercado -> dossiê)
export async function runInvestigate(structuredFacts, matchInput, deps = defaultDeps) {
  return deps.investigate(structuredFacts, matchInput);
}

// Etapa 4 — geração dos 3 artefatos de saída a partir do dossiê já pronto
export function runBuildOutputs(matchInput, structuredFacts, oddsFacts, dossie, retrievedAt, deps = defaultDeps) {
  return {
    resumoExecutivo: deps.buildExecutiveSummary(structuredFacts, dossie),
    cardTelegram: deps.buildTelegramCard(structuredFacts, dossie),
    mdm: deps.buildMdm(matchInput, structuredFacts, oddsFacts, dossie, retrievedAt)
  };
}

/**
 * Orquestrador principal — único ponto de entrada do Analyser.
 *
 * Recebe só os 4 campos do formulário (homeTeam, awayTeam, competition,
 * date) dentro de `matchInput` e devolve exatamente os 3 artefatos que
 * o app precisa exibir: resumoExecutivo, cardTelegram, mdm.
 *
 * Nesta v1 de validação de fluxo, qualquer erro em qualquer etapa sobe
 * explícito (facilita debug end-to-end); a política de Fail-Open por
 * provider individual já existe dentro de collectData().
 */
export async function runAnalyser(matchInput, deps = defaultDeps) {
  const retrievedAt = new Date().toISOString();

  const rawData = await runCollect(matchInput, deps);
  const structuredFacts = runNormalize(rawData, deps);
  const dossie = await runInvestigate(structuredFacts, matchInput, deps);
  const oddsFacts = rawData?.odds ?? null;

  return runBuildOutputs(matchInput, structuredFacts, oddsFacts, dossie, retrievedAt, deps);
}
