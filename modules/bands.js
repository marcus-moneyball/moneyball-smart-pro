/**
 * Bandas — verde/amarela/vermelha, conforme o Código Nexus já
 * validado pelo usuário em projetos anteriores:
 *   verde   = normalidade validada (desvio pequeno)
 *   amarela = divergência leve
 *   vermelha = colapso estatístico / desvio agressivo
 *
 * Limiares definidos como ponto de partida razoável — ajustáveis
 * depois com dado real, não são um valor sagrado.
 */
const GREEN_MAX = 0.15;
const YELLOW_MAX = 0.30;

export function classifyBand(deviationResult) {
  if (deviationResult.deviation_pct === null) return 'indefinida';
  if (deviationResult.deviation_pct <= GREEN_MAX) return 'verde';
  if (deviationResult.deviation_pct <= YELLOW_MAX) return 'amarela';
  return 'vermelha';
}

/** Pior banda entre um conjunto (vermelha > amarela > indefinida > verde) */
export function worstBand(bands) {
  const order = ['vermelha', 'amarela', 'indefinida', 'verde'];
  for (const level of order) {
    if (bands.includes(level)) return level;
  }
  return 'indefinida';
}
