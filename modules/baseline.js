/**
 * Baseline — extrai, dos fact items já normalizados, os valores que
 * servem de referência de "forma recente" por time. Não recalcula
 * nada — a janela (últimos 10 jogos etc.) já é definida no momento
 * da coleta (contrato do StatsProvider). Este módulo só localiza os
 * fatos certos para a etapa seguinte (deviationTrigger).
 */
export function getBaselineValue(formaRecenteFacts, subject, key) {
  const fact = formaRecenteFacts.find((f) => f.subject === subject && f.key === key);
  return fact ?? null;
}
