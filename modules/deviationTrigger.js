/**
 * Gatilho de Desvio — compara resultado observado (ex: gols marcados)
 * contra a métrica preditiva equivalente (ex: xG), por esporte.
 * Puramente numérico — a classificação em banda acontece em bands.js.
 */
export function computeDeviation(observedFact, predictiveFact) {
  if (!observedFact?.availability || !predictiveFact?.availability) {
    return { deviation_pct: null, reason: 'dados insuficientes para comparar' };
  }
  const observed = observedFact.value;
  const predictive = predictiveFact.value;
  if (predictive === 0) return { deviation_pct: null, reason: 'métrica preditiva é zero, divisão indefinida' };

  const deviationPct = Math.abs(observed - predictive) / predictive;
  return { deviation_pct: deviationPct, observed, predictive };
}
