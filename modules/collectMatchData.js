/**
 * Coleta — chama os providers do esporte em paralelo, devolve dado
 * bruto. Nenhuma normalização, nenhuma decisão acontece aqui.
 */
export async function collectMatchData(matchInput, { statsProvider, oddsProvider, weatherProvider, newsExtractor, eventIdForOdds }) {
  const [rawStats, rawOdds, rawWeather, newsFacts] = await Promise.all([
    statsProvider.getMatchStats(matchInput).catch(() => null), // Fail-Open: ausência de stats não derruba o resto
    eventIdForOdds ? oddsProvider.getOdds(eventIdForOdds).catch(() => null) : Promise.resolve(null),
    weatherProvider.getWeather(matchInput).catch(() => null),
    newsExtractor ? newsExtractor.extractFacts(matchInput).catch(() => []) : Promise.resolve([]),
  ]);

  return { rawStats, rawOdds, rawWeather, newsFacts };
}
