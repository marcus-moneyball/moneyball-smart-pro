/**
 * analyser/runAnalyser.js
 * Ponto de entrada do Analyser. Orquestra as quatro camadas, cada uma
 * já testada isoladamente:
 *
 *   matchInput
 *     → Collection      (collectMatchData.js)
 *     → Normalization    (normalizeFacts.js)
 *     → Investigation     (investigate.js — método Nexus determinístico)
 *     → Builders            (buildExecutiveSummary / buildTelegramCard / buildMdm)
 *
 * Esta função não implementa lógica nova — só encadeia o que já existe
 * em cada camada, na ordem definida. Nenhuma camada é pulada, nenhuma
 * é chamada fora de ordem.
 */
import { collectMatchData } from "./collection/collectMatchData.js";
import { normalizeFacts } from "./normalization/normalizeFacts.js";
import { investigate } from "./investigation/investigate.js";
import { buildExecutiveSummary } from "./builders/buildExecutiveSummary.js";
import { buildTelegramCard } from "./builders/buildTelegramCard.js";
import { buildMdm } from "./builders/buildMdm.js";

/**
 * @param {import('./collection/matchInput.js').MatchInput} matchInput
 * @param {object} env - env do Worker (secrets/keys de cada provider)
 * @returns {Promise<{
 *   matchInput: object,
 *   coleta: object,
 *   normalizado: object,
 *   dossie: object,
 *   executiveSummary: string,
 *   telegramCard: string,
 *   mdm: object
 * }>}
 */
export async function run(matchInput, env) {
  const coleta = await collectMatchData(matchInput, env);
  const normalizado = normalizeFacts(coleta);
  const dossie = investigate(normalizado);

  return {
    matchInput,
    coleta,
    normalizado,
    dossie,
    executiveSummary: buildExecutiveSummary(dossie),
    telegramCard: buildTelegramCard(dossie),
    mdm: buildMdm(dossie),
  };
}

export const Analyser = { run };
