/**
 * metadataBuilder.js
 *
 * Responsabilidade única: declarar a versão da metodologia usada para
 * construir este MDM. Não lê nenhuma fonte externa — é sempre o mesmo
 * valor fixo para o Futebol v1 (nexus_futebol_2.0), conforme o Código
 * Nexus vigente.
 *
 * Não faz: leitura de fatos, cálculo, decisão de aposta.
 */

export function buildMetadata() {
  return {
    methodology_version: "nexus_futebol_2.0"
  };
}
