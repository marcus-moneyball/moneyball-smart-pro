/**
 * core/cortexEngine.js
 * Etapa 2. Orquestrador puro — não conhece Ghost, Telegram nem Bet
 * Builder, só conversa com RendererRegistry. Todas as dependências são
 * injetadas via parâmetro (nenhum import direto de implementação
 * concreta), respeitando os contratos congelados em
 * arquitetura-cortex-definitiva.md.
 *
 * Fluxo: Radar → Scanner → Context Builder → AI Provider →
 *        KnowledgePackageBuilder → KnowledgeStore.persistir (fail-closed) →
 *        RendererRegistry.executar (fail-open, isolado por renderer)
 */

/**
 * @param {object} deps
 * @param {(criterios: object) => Promise<object[]>} deps.radar
 * @param {(item: object) => Promise<object>} deps.scanner
 * @param {(snapshot: object, versoes: object) => Promise<{systemPrompt: string, userContent: string}>} deps.contextBuilder
 * @param {(payload: object) => Promise<{resposta: object, raciocinio: string, metadados: object}>} deps.aiProvider
 * @param {(respostaIA: object, metadados: object, snapshot: object, versoes: object) => {ok: boolean, knowledgePackage?: object, erro?: string, camposFaltando?: string[]}} deps.knowledgePackageBuilder
 * @param {{ persistir: Function }} deps.knowledgeStore
 * @param {{ executar: Function }} deps.rendererRegistry
 * @param {{ methodology_version: string, prompt_version: string }} deps.versoes
 */
export function criarCortexEngine(deps) {
  const {
    radar,
    scanner,
    contextBuilder,
    aiProvider,
    knowledgePackageBuilder,
    knowledgeStore,
    rendererRegistry,
    versoes,
  } = deps;

  /**
   * Executa o pipeline completo pra um conjunto de critérios (ex: uma
   * liga). Cada partida priorizada pelo Radar é processada isoladamente
   * — falha numa não derruba as outras.
   *
   * @param {object} env - env do Worker (KV, secrets)
   * @param {object} criterios - repassado pro Radar
   * @param {object} [configRenderers] - repassado pro RendererRegistry (ex: { ghost: true, telegram: false })
   * @returns {object[]} um resultado por partida processada
   */
  async function executar(env, criterios, configRenderers = {}) {
    console.log("[CortexEngine] Iniciando pipeline. Critérios:", criterios);

    let ranking;
    try {
      ranking = await radar(criterios);
      console.log(`[CortexEngine] Radar retornou ${ranking.length} partida(s) priorizada(s).`);
    } catch (e) {
      console.error("[CortexEngine] Radar falhou — pipeline interrompido:", e.message);
      return [];
    }

    const resultados = [];
    for (const item of ranking) {
      resultados.push(await processarPartida(env, item, configRenderers));
    }

    const sucesso = resultados.filter((r) => r.ok).length;
    console.log(`[CortexEngine] Pipeline concluído. ${sucesso}/${resultados.length} partida(s) com sucesso.`);

    return resultados;
  }

  /**
   * Processa UMA partida do início ao fim. Isolado: uma falha aqui não
   * afeta o processamento das outras partidas do ranking.
   */
  async function processarPartida(env, item, configRenderers) {
    const label = `${item.home_team ?? "?"} x ${item.away_team ?? "?"}`;

    try {
      console.log(`[CortexEngine] (${label}) → Scanner`);
      const snapshot = await scanner(item);

      console.log(`[CortexEngine] (${label}) → Context Builder`);
      const payload = await contextBuilder(snapshot, versoes);

      console.log(`[CortexEngine] (${label}) → AI Provider`);
      const { resposta, metadados } = await aiProvider(payload);

      console.log(`[CortexEngine] (${label}) → Knowledge Package Builder`);
      const construcao = knowledgePackageBuilder(resposta, metadados, snapshot, versoes);

      if (!construcao.ok) {
        console.error(`[CortexEngine] (${label}) Knowledge Package inválido:`, construcao.camposFaltando);
        return { partida: label, ok: false, etapa: "knowledgePackageBuilder", erro: construcao.erro };
      }
      const knowledgePackage = construcao.knowledgePackage;

      console.log(`[CortexEngine] (${label}) → Knowledge Store (${knowledgePackage.analysis_id})`);
      const persistencia = await knowledgeStore.persistir(env, knowledgePackage);

      if (!persistencia.ok) {
        // Fail-closed: falha na persistência aborta a distribuição desta
        // partida — não chama o RendererRegistry sem garantir rastreabilidade antes.
        console.error(`[CortexEngine] (${label}) Falha ao persistir — distribuição ABORTADA:`, persistencia.erro);
        return { partida: label, ok: false, etapa: "knowledgeStore", erro: persistencia.erro };
      }

      console.log(`[CortexEngine] (${label}) → Renderer Registry`);
      const relatorioRenderers = await rendererRegistry.executar(knowledgePackage, env, configRenderers);

      console.log(`[CortexEngine] (${label}) ✔ concluído — analysis_id: ${knowledgePackage.analysis_id}`);

      return {
        partida: label,
        ok: true,
        analysis_id: knowledgePackage.analysis_id,
        renderers: relatorioRenderers,
      };
    } catch (e) {
      // Cobre falha não tratada explicitamente em qualquer etapa acima
      // (ex: Scanner ou AI Provider lançando exceção) — isola a partida,
      // não derruba o restante do ranking.
      console.error(`[CortexEngine] (${label}) ✘ falha não tratada:`, e.message);
      return { partida: label, ok: false, etapa: "desconhecida", erro: e.message };
    }
  }

  return { executar };
}
