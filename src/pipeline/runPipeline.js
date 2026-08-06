/**
 * runPipeline.js
 * Ambiente de teste do CortexEngine — executa o pipeline completo com
 * um Radar stub (devolve 1 partida fixa) + Scanner stub (MatchSnapshot
 * fixo), mas AI Provider, Knowledge Package Builder, Knowledge Store e
 * Renderer Registry rodam de verdade (menos Ghost/Telegram, que só
 * chamam de verdade se as secrets estiverem configuradas no env).
 *
 * Como rodar:
 *   1. Dentro do Worker: exponha uma rota temporária no index.js, ex:
 *        if (url.pathname === "/test-pipeline") return jsonResponse(await runPipeline(env));
 *   2. Localmente (Node 18+): defina GOOG_API_KEY no ambiente e rode
 *        node runPipeline.js  (com um bloco no final que chama runPipeline({GOOG_API_KEY: process.env.GOOG_API_KEY}))
 */
import { criarCortexEngine } from "../core/cortexEngine.js";
import { scanner } from "../core/scanner.js";
import { contextBuilder } from "../core/contextBuilder.js";
import { criarAIProvider } from "../core/aiProvider.js";
import { construirKnowledgePackage } from "../core/knowledgePackageBuilder.js";
import * as knowledgeStore from "../core/knowledgeStore.js";
import { criarRendererRegistry } from "../core/rendererRegistry.js";

import { renderGhost } from "../renderers/renderGhost.js";
import { renderTelegram } from "../renderers/renderTelegram.js";
import { renderBetBuilder } from "../renderers/renderBetBuilder.js";

import { nexusV1 } from "../methodologies/nexusV1.js";

const PARTIDA_DE_TESTE = {
  home_team: "Time A",
  away_team: "Time B",
  sport: "futebol",
  league: "Liga de Teste",
};

// Radar stub — devolve sempre a mesma partida de teste, ignora critérios.
async function radarStub(_criterios) {
  console.log("[Radar:STUB] Devolvendo 1 partida de teste fixa.");
  return [PARTIDA_DE_TESTE];
}

export async function runPipeline(env, configRenderers = { renderGhost: false, renderTelegram: false, renderBetBuilder: true }) {
  const inicio = Date.now();

  const rendererRegistry = criarRendererRegistry();
  rendererRegistry.registrar("renderGhost", renderGhost);
  rendererRegistry.registrar("renderTelegram", renderTelegram);
  rendererRegistry.registrar("renderBetBuilder", renderBetBuilder);
  
  console.log("METODOLOGIA RECEBIDA:", nexusV1);

  const cortexEngine = criarCortexEngine({
    radar: radarStub,
    scanner,
    contextBuilder,
    aiProvider: criarAIProvider(env),
    knowledgePackageBuilder: construirKnowledgePackage,
    knowledgeStore,
    rendererRegistry,
    versoes: nexusV1,
  });

  console.log("========================================");
  console.log("  RUN PIPELINE — teste end-to-end do Cortex");
  console.log("========================================");

  const resultados = await cortexEngine.executar(env, { liga: "teste" }, configRenderers);

  const duracaoMs = Date.now() - inicio;

  console.log("\n----------------------------------------");
  console.log("  RELATÓRIO FINAL");
  console.log("----------------------------------------");

  for (const r of resultados) {
    console.log(`\nPartida: ${r.partida}`);
    console.log(`  Status geral: ${r.ok ? "✔ sucesso" : "✘ falha"}`);

    if (!r.ok) {
      console.log(`  Etapa que falhou: ${r.etapa}`);
      console.log(`  Erro: ${r.erro}`);
      continue;
    }

    console.log(`  analysis_id: ${r.analysis_id}`);
    console.log(`  Renderers:`);
    for (const rend of r.renderers) {
      const status = rend.ok === null ? "− desativado" : rend.ok ? "✔ sucesso" : "✘ falha";
      console.log(`    ${rend.renderer}: ${status}${rend.erro ? ` (${rend.erro})` : ""}`);
    }
  }

  console.log("\n----------------------------------------");
  console.log(`Tempo total: ${duracaoMs}ms`);
  console.log(`Partidas processadas: ${resultados.length}`);
  console.log(`Sucesso: ${resultados.filter((r) => r.ok).length}`);
  console.log(`Falha: ${resultados.filter((r) => !r.ok).length}`);
  console.log("========================================\n");

  return { resultados, duracaoMs };
}
