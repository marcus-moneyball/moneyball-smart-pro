/**
 * runAnalyser.test.js
 *
 * Testa a orquestração pura do fluxo (ordem das chamadas, dados
 * passados entre etapas) usando deps falsas — nunca chama providers,
 * IA ou builders reais. Isso mantém o teste rápido, determinístico e
 * desacoplado da implementação interna de cada etapa.
 */

import { describe, it, expect, vi } from "vitest";
import { runAnalyser, runBuildOutputs } from "../analyser/runAnalyser.js";

function buildFakeDeps(overrides = {}) {
  const rawData = { stats: { home: {} }, odds: { moneyline: [] } };
  const structuredFacts = [{ subject: "team_form", key: "forma_recente", value: "boa", availability: true }];
  const dossie = { markets: {} };

  return {
    collectData: vi.fn().mockResolvedValue(rawData),
    normalizeFacts: vi.fn().mockReturnValue(structuredFacts),
    investigate: vi.fn().mockResolvedValue(dossie),
    buildExecutiveSummary: vi.fn().mockReturnValue("Resumo executivo de teste"),
    buildTelegramCard: vi.fn().mockReturnValue("Card telegram de teste"),
    buildMdm: vi.fn().mockReturnValue({ metadata: { methodology_version: "nexus_futebol_2.0" } }),
    __rawData: rawData,
    __structuredFacts: structuredFacts,
    __dossie: dossie,
    ...overrides
  };
}

describe("runAnalyser", () => {
  const matchInput = {
    homeTeam: "Flamengo",
    awayTeam: "Palmeiras",
    competition: "Brasileirão",
    date: "2026-08-10"
  };

  it("executa as 4 etapas na ordem certa, passando os dados corretos entre elas", async () => {
    const deps = buildFakeDeps();

    const resultado = await runAnalyser(matchInput, deps);

    expect(deps.collectData).toHaveBeenCalledWith(matchInput);
    expect(deps.normalizeFacts).toHaveBeenCalledWith(deps.__rawData);
    expect(deps.investigate).toHaveBeenCalledWith(deps.__structuredFacts, matchInput);

    expect(deps.buildExecutiveSummary).toHaveBeenCalledWith(deps.__structuredFacts, deps.__dossie);
    expect(deps.buildTelegramCard).toHaveBeenCalledWith(deps.__structuredFacts, deps.__dossie);
    expect(deps.buildMdm).toHaveBeenCalledWith(
      matchInput,
      deps.__structuredFacts,
      deps.__rawData.odds,
      deps.__dossie,
      expect.any(String)
    );

    expect(resultado).toEqual({
      resumoExecutivo: "Resumo executivo de teste",
      cardTelegram: "Card telegram de teste",
      mdm: { metadata: { methodology_version: "nexus_futebol_2.0" } }
    });
  });

  it("devolve exatamente as 3 chaves esperadas pelo frontend", async () => {
    const deps = buildFakeDeps();
    const resultado = await runAnalyser(matchInput, deps);

    expect(Object.keys(resultado).sort()).toEqual(["cardTelegram", "mdm", "resumoExecutivo"]);
  });

  it("propaga erro explícito se uma etapa falhar (sem mascarar com fallback silencioso)", async () => {
    const deps = buildFakeDeps({
      investigate: vi.fn().mockRejectedValue(new Error("investigação falhou"))
    });

    await expect(runAnalyser(matchInput, deps)).rejects.toThrow("investigação falhou");
  });

  it("runBuildOutputs isoladamente monta os 3 artefatos a partir de um dossiê já pronto", () => {
    const deps = buildFakeDeps();
    const resultado = runBuildOutputs(
      matchInput,
      deps.__structuredFacts,
      deps.__rawData.odds,
      deps.__dossie,
      "2026-08-05T12:00:00Z",
      deps
    );

    expect(resultado.resumoExecutivo).toBe("Resumo executivo de teste");
    expect(resultado.cardTelegram).toBe("Card telegram de teste");
    expect(resultado.mdm).toEqual({ metadata: { methodology_version: "nexus_futebol_2.0" } });
  });
});
