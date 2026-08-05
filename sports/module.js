import * as futebolSchema from './futebol.js';

/**
 * Agrupa providers + schema de Futebol no shape que o Analyser espera
 * do sportRegistry. Providers chegam via DI — este arquivo só monta
 * a composição, não decide qual vendor usar.
 */
export function criarFutebolSportModule({ statsProvider, oddsProvider, weatherProvider, newsExtractor, eventIdForOdds }) {
  return {
    schema: futebolSchema,
    providers: { statsProvider, oddsProvider, weatherProvider, newsExtractor, eventIdForOdds },
  };
}
