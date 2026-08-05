/**
 * Analyser — única porta pública. Por fora, ninguém enxerga
 * providers, coleta, normalização ou investigação — só isto.
 */
import { runAnalyser } from './analyser.js';

export function criarAnalyser({ sportRegistry, clock }) {
  if (!sportRegistry) throw new Error('Analyser: sportRegistry é obrigatório');

  return {
    async run(matchInput) {
      if (!matchInput || !matchInput.sport || !matchInput.home_team || !matchInput.away_team) {
        throw new Error('Analyser: matchInput inválido');
      }
      return runAnalyser(matchInput, { sportRegistry, clock });
    },
  };
}
