/**
 * gateBuilder.js
 *
 * Responsabilidade única: relatório estrutural objetivo de cobertura de
 * dados. Não interpreta, não julga suficiência, não atribui nível de
 * confiança. Só CONTA o que já está marcado em `structuredFacts` — cada
 * fact item chega com seu próprio `availability`/`conflicting` definidos
 * por uma etapa anterior do Analyser (normalização/investigação); este
 * builder apenas agrega essas contagens, nunca as produz.
 *
 * `structuredFacts` é tratado como array de fact items com o shape
 * { subject, key, availability, conflicting }.
 *
 * Campos:
 * - metricas_ausentes: chaves dos fatos com availability === false.
 * - total_coletadas: quantidade total de fact items recebidos.
 * - total_ausentes: quantidade de fact items com availability === false.
 * - total_conflitantes: quantidade de fact items com conflicting === true.
 * - coleta_executada: true se `structuredFacts` foi de fato recebido
 *   (array, mesmo vazio) — apenas indica que a etapa de coleta rodou,
 *   não que os dados são suficientes.
 *
 * Não faz: não calcula confiança, não decide se os dados bastam, não
 * recomenda mercado, não define stake, não julga qualidade dos dados —
 * essas decisões pertencem a camadas superiores (Nexus/BetBuilder).
 */

function getMetricasAusentes(facts) {
  return [
    ...new Set(
      facts
        .filter((fact) => fact && fact.availability === false)
        .map((fact) => fact.key || fact.subject)
        .filter(Boolean)
    )
  ];
}

export function buildGate(structuredFacts) {
  const coletaExecutada = Array.isArray(structuredFacts);
  const facts = coletaExecutada ? structuredFacts : [];

  const metricasAusentes = getMetricasAusentes(facts);
  const totalAusentes = facts.filter((fact) => fact && fact.availability === false).length;
  const totalConflitantes = facts.filter((fact) => fact && fact.conflicting === true).length;

  return {
    metricas_ausentes: metricasAusentes,
    total_coletadas: facts.length,
    total_ausentes: totalAusentes,
    total_conflitantes: totalConflitantes,
    coleta_executada: coletaExecutada
  };
}
