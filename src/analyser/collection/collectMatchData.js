/**
 * analyser/collection/collectMatchData.js
 * Camada 1 do Analyser — Collection.
 *
 * Responsabilidade única: receber um matchInput, chamar todos os
 * providers registrados pra aquele esporte, e devolver o que cada um
 * respondeu — sem interpretar, classificar, normalizar ou descartar
 * nada disso. Isso é trabalho da camada de Normalization (próxima).
 *
 * Cada provider roda isolado: a falha de um (inclusive "não
 * implementado ainda", ver providers/statsProvider.js etc.) não
 * derruba os outros. O resultado de cada um vem marcado com
 * status/erro/timestamp — é esse metadado bruto que a Normalization
 * vai usar depois pra montar `provenance` e `availability` de cada
 * fact, então nada aqui pode ser perdido ou resumido.
 */
import { validarMatchInput } from "./matchInput.js";
import { buscarOddsReais } from "./providers/oddsProvider.js";
import { buscarEstatisticasTime } from "./providers/statsProvider.js";
import { buscarDesfalques } from "./providers/injuriesProvider.js";
import { buscarConfrontosDiretos } from "./providers/headToHeadProvider.js";

// Registro dos providers a chamar por coleta. Adicionar um provider
// novo (ex: weatherProvider.js pra esportes ao ar livre) = acrescentar
// uma linha aqui — nenhuma outra parte deste arquivo muda.
const PROVIDERS = [
  { nome: "oddsApi", coletar: buscarOddsReais },
  { nome: "statsProvider", coletar: buscarEstatisticasTime },
  { nome: "injuriesProvider", coletar: buscarDesfalques },
  { nome: "headToHeadProvider", coletar: buscarConfrontosDiretos },
];

/**
 * @param {import('./matchInput.js').MatchInput} matchInput
 * @param {object} env - env do Worker (secrets/keys de cada provider)
 * @returns {Promise<{
 *   matchInput: object,
 *   collectedAt: string,
 *   duracaoMs: number,
 *   sources: Array<{ provider: string, status: 'ok'|'error', data: object|null, error: string|null, fetchedAt: string }>
 * }>}
 */
export async function collectMatchData(matchInput, env) {
  validarMatchInput(matchInput);

  const inicio = Date.now();
  console.log(`[Collection] Coletando dados para ${matchInput.home_team} x ${matchInput.away_team} (${matchInput.league})`);

  const resultados = await Promise.allSettled(
    PROVIDERS.map((provider) => provider.coletar(matchInput, env))
  );

  const sources = resultados.map((resultado, indice) => {
    const nomeProvider = PROVIDERS[indice].nome;
    const fetchedAt = new Date().toISOString();

    if (resultado.status === "fulfilled") {
      console.log(`[Collection] ✔ ${nomeProvider} coletado.`);
      return { provider: nomeProvider, status: "ok", data: resultado.value, error: null, fetchedAt };
    }

    console.warn(`[Collection] ✘ ${nomeProvider} falhou: ${resultado.reason?.message ?? resultado.reason}`);
    return {
      provider: nomeProvider,
      status: "error",
      data: null,
      error: resultado.reason?.message ?? String(resultado.reason),
      fetchedAt,
    };
  });

  const duracaoMs = Date.now() - inicio;
  const sucesso = sources.filter((s) => s.status === "ok").length;
  console.log(`[Collection] Concluído em ${duracaoMs}ms — ${sucesso}/${sources.length} fonte(s) com sucesso.`);

  return {
    matchInput,
    collectedAt: new Date().toISOString(),
    duracaoMs,
    sources,
  };
}
