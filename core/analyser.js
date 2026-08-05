import { collectMatchData } from '../modules/collectMatchData.js';
import { normalizeFacts, normalizeOdds, normalizeNewsFacts, markConflicts } from '../modules/normalizeFacts.js';
import { investigateMarkets } from '../modules/marketAnalysis.js';

import { buildExecutiveSummary } from '../builders/executiveSummaryBuilder.js';
import { buildTelegramCard } from '../builders/telegramCardBuilder.js';
import { buildMdm } from '../builders/mdmBuilder.js';

import { assembleOutput } from '../outputAssembler.js';
export async function runAnalyser(matchInput, { sportRegistry, clock = { now: () => new Date() } }) {
  const sportModule = sportRegistry.get(matchInput.sport);
  const now = clock.now();
  const retrievedAt = now.toISOString();

  const { rawStats, rawOdds, rawWeather, newsFacts } = await collectMatchData(matchInput, sportModule.providers);

  const statsProvenance = { provider: sportModule.providers.statsProvider.providerName, retrieved_at: retrievedAt };
  const weatherProvenance = { provider: sportModule.providers.weatherProvider.providerName, retrieved_at: retrievedAt };
  const oddsProvenance = { provider: sportModule.providers.oddsProvider.providerName, retrieved_at: retrievedAt };

  let structuredFacts = normalizeFacts({
    rawStats,
    rawWeather,
    sportSchema: sportModule.schema,
    statsProvenance,
    weatherProvenance,
  });

  structuredFacts.lesoes = normalizeNewsFacts(newsFacts, retrievedAt);

  // Conflito é verificado dentro de cada domínio (facts do mesmo subject+key)
  for (const domain of Object.keys(structuredFacts)) {
    structuredFacts[domain] = markConflicts(structuredFacts[domain]);
  }

  const oddsFacts = normalizeOdds(rawOdds, oddsProvenance);

  const dossie = investigateMarkets(structuredFacts);

  const executiveSummary = buildExecutiveSummary(matchInput, structuredFacts, dossie);
  const telegramCard = buildTelegramCard(matchInput, dossie);
  const mdm = buildMdm(matchInput, structuredFacts, oddsFacts, dossie, retrievedAt);

  return assembleOutput({ executiveSummary, telegramCard, mdm });
}
