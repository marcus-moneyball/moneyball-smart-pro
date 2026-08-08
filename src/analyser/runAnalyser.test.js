import { describe, it, expect, vi, afterEach } from "vitest";
import { Analyser } from "./runAnalyser.js";

describe("Analyser.run() — orquestração completa das 4 camadas", () => {
  const fetchOriginal = global.fetch;

  afterEach(() => {
    global.fetch = fetchOriginal;
    vi.restoreAllMocks();
  });

  it("roda Collection → Normalization → Investigation → Builders de ponta a ponta", async () => {
    global.fetch = vi.fn(async () => ({
      ok: true,
      status: 200,
      json: async () => [
        {
          id: "abc123",
          home_team: "Flamengo",
          away_team: "Palmeiras",
          commence_time: "2026-08-10T20:00:00Z",
          bookmakers: [
            {
              key: "betfair",
              last_update: new Date().toISOString(),
              markets: [{ key: "h2h", outcomes: [{ name: "Flamengo", price: 2.0 }, { name: "Palmeiras", price: 2.0 }] }],
            },
          ],
        },
      ],
    }));

    const matchInput = {
      home_team: "Flamengo",
      away_team: "Palmeiras",
      sport: "futebol",
      league: "Brasileirão Série A",
    };

    const resultado = await Analyser.run(matchInput, { ODDS_API_KEY: "chave_de_teste" });

    // Collection realmente rodou
    expect(resultado.coleta.sources.find((s) => s.provider === "oddsApi").status).toBe("ok");

    // Normalization realmente rodou sobre a coleta
    expect(resultado.normalizado.structuredFacts.length).toBeGreaterThan(0);
    expect(resultado.normalizado.gaps.length).toBe(3); // stats/injuries/h2h ainda TODO

    // Investigation realmente rodou sobre os facts normalizados
    expect(resultado.dossie.mercados[0].mercado).toBe("h2h");
    expect(resultado.dossie.mercados[0].baseline.probabilidadeNormalizada.Flamengo).toBeCloseTo(0.5, 5);

    // Builders realmente formataram o dossiê
    expect(resultado.executiveSummary).toContain("Flamengo x Palmeiras");
    expect(resultado.telegramCard).toContain("*Flamengo x Palmeiras*");
    expect(resultado.mdm.analysisId).toBeDefined();
    expect(resultado.mdm.mercados).toHaveLength(1);
  });

  it("não quebra o pipeline mesmo sem nenhuma API key configurada", async () => {
    const matchInput = {
      home_team: "Flamengo",
      away_team: "Palmeiras",
      sport: "futebol",
      league: "Brasileirão Série A",
    };

    const resultado = await Analyser.run(matchInput, {});

    expect(resultado.coleta.sources.every((s) => s.status === "error")).toBe(true);
    expect(resultado.normalizado.structuredFacts).toHaveLength(0);
    expect(resultado.dossie.mercados).toHaveLength(0);
    expect(resultado.dossie.limitacoesGerais.length).toBe(4);
    expect(resultado.mdm.mercados).toHaveLength(0);
  });
});
