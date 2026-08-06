/**
 * auditoriaBuilder.js
 *
 * Responsabilidade única: montar o bloco de auditoria do MDM.
 *
 * - analysis_id: identificador único desta análise. Gerado aqui (não é
 *   fato de partida, é metadado da execução), usando crypto.randomUUID()
 *   quando disponível (padrão no runtime do Cloudflare Workers).
 * - versao_metodologia: fixo, espelha o metadata.
 * - timestamp: vem de `retrievedAt`, recebido pelo mdmBuilder. Nunca
 *   inventado aqui — se não vier, fica "".
 * - resultado_real / erro_classificado: pertencem ao ciclo de
 *   Settlement/Auditoria pós-jogo, que ainda não existe. Ficam null até
 *   esse módulo existir e alimentar o MDM depois do jogo.
 *
 * Não faz: não decide o que aconteceu no jogo, não classifica erro,
 * não calcula EV/resultado de aposta.
 */

function generateAnalysisId() {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  // Fallback simples caso crypto.randomUUID não esteja disponível no runtime.
  return `analysis_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
}

export function buildAuditoria(retrievedAt) {
  return {
    analysis_id: generateAnalysisId(),
    versao_metodologia: "nexus_futebol_2.0",
    timestamp: retrievedAt || "",
    resultado_real: null,
    erro_classificado: null
  };
}
