/**
 * mdmBuilder.js
 *
 * Orquestrador do MDM (Modelo de Dados Moneyball) — Futebol v1.
 *
 * Responsabilidade única: chamar os sub-builders de builders/mdm/ na
 * ordem certa e montar o JSON final. Não contém lógica própria — se
 * alguma regra de negócio parecer necessária aqui, ela pertence a um
 * dos sub-builders, não a este arquivo.
 *
 * `oddsFacts` é recebido por contrato/compatibilidade com o restante do
 * Analyser, mas NÃO é usado por nenhum sub-builder do MDM nesta versão
 * — odds/mercado são território do BetBuilder. Mantido como parâmetro
 * para não quebrar a assinatura esperada pelo restante do pipeline.
 *
 * Não faz: não gera pick, bilhete, stake, EV, probabilidade de aposta
 * ou recomendação de mercado. Não modifica providers, coleta,
 * normalização, investigação ou os builders existentes do Analyser
 * (executiveSummaryBuilder, telegramCardBuilder).
 */

import { buildMetadata } from "./mdm/metadataBuilder.js";
import { buildAuditoria } from "./mdm/auditoriaBuilder.js";
import { buildFingerprint } from "./mdm/fingerprintBuilder.js";
import { buildContext } from "./mdm/contextoBuilder.js";
import { buildAnaliseColetiva } from "./mdm/analiseColetivaBuilder.js";
import { buildProps } from "./mdm/propsBuilder.js";
import { buildGate } from "./mdm/gateBuilder.js";

export function buildMdm(matchInput, structuredFacts, oddsFacts, dossie, retrievedAt) {
  return {
    metadata: buildMetadata(),
    auditoria: buildAuditoria(retrievedAt),
    fingerprint_geral: buildFingerprint(matchInput),
    contexto_interpretado: buildContext(structuredFacts),
    analise_coletiva: buildAnaliseColetiva(structuredFacts, dossie),
    analises_prop: buildProps(),
    gate: buildGate(structuredFacts)
  };
}
