import { describe, it, expect } from "vitest";
import { normalizeFacts } from "./normalizeFacts.js";

function coletaComOdds(bookmakers) {
  return {
    matchInput: { home_team: "Flamengo", away_team: "Palmeiras", sport: "futebol", league: "Brasileirão Série A" },
    collectedAt: "2026-08-06T23:00:00Z",
    sources: [
      {
        provider: "oddsApi",
        status: "ok",
        data: {
          id: "abc123",
          home_team: "Flamengo",
          away_team: "Palmeiras",
          bookmakers,
        },
        error: null,
        fetchedAt: "2026-08-06T23:00:00Z",
      },
      { provider: "statsProvider", status: "error", data: null, error: "[statsProvider] não implementado", fetchedAt: "2026-08-06T23:00:00Z" },
      { provider: "injuriesProvider", status: "error", data: null, error: "[injuriesProvider] não implementado", fetchedAt: "2026-08-06T23:00:00Z" },
      { provider: "headToHeadProvider", status: "error", data: null, error: "[headToHeadProvider] não implementado", fetchedAt: "2026-08-06T23:00:00Z" },
    ],
  };
}

describe("normalizeFacts (camada de Normalization)", () => {
  it("gera um fact por (bookmaker, mercado, outcome) com provenance/availability/conflicting/timestamp", () => {
    const agora = new Date().toISOString();
    const coleta = coletaComOdds([
      { key: "betfair", last_update: agora, markets: [{ key: "h2h", outcomes: [{ name: "Flamengo", price: 2.1 }] }] },
    ]);

    const resultado = normalizeFacts(coleta);

    expect(resultado.structuredFacts).toHaveLength(1);
    const fact = resultado.structuredFacts[0];
    expect(fact).toMatchObject({
      key: "odds.h2h.Flamengo",
      market: "h2h",
      outcome: "Flamengo",
      value: 2.1,
      provenance: "oddsApi:betfair",
      availability: "live",
      conflicting: false,
    });
    expect(fact.timestamp).toBe(agora);
  });

  it("marca stale quando a odd está desatualizada há mais de 30min", () => {
    const antiga = new Date(Date.now() - 60 * 60 * 1000).toISOString();
    const coleta = coletaComOdds([
      { key: "betfair", last_update: antiga, markets: [{ key: "h2h", outcomes: [{ name: "Flamengo", price: 2.1 }] }] },
    ]);
    const resultado = normalizeFacts(coleta);
    expect(resultado.structuredFacts[0].availability).toBe("stale");
  });

  it("marca conflicting=true quando uma casa destoa da mediana das outras", () => {
    const agora = new Date().toISOString();
    const coleta = coletaComOdds([
      { key: "betfair", last_update: agora, markets: [{ key: "h2h", outcomes: [{ name: "Flamengo", price: 2.1 }] }] },
      { key: "bet365", last_update: agora, markets: [{ key: "h2h", outcomes: [{ name: "Flamengo", price: 2.05 }] }] },
      { key: "pinnacle", last_update: agora, markets: [{ key: "h2h", outcomes: [{ name: "Flamengo", price: 2.8 }] }] }, // destoante
    ]);

    const resultado = normalizeFacts(coleta);
    const pinnacle = resultado.structuredFacts.find((f) => f.provenance === "oddsApi:pinnacle");
    const betfair = resultado.structuredFacts.find((f) => f.provenance === "oddsApi:betfair");

    expect(pinnacle.conflicting).toBe(true);
    expect(betfair.conflicting).toBe(false);
    expect(pinnacle.conflictingWith).toContain("oddsApi:betfair");
  });

  it("registra gap pra cada fonte que falhou (ex: providers ainda não implementados)", () => {
    const coleta = coletaComOdds([]);
    const resultado = normalizeFacts(coleta);

    expect(resultado.gaps).toHaveLength(3);
    expect(resultado.gaps.map((g) => g.provider).sort()).toEqual(
      ["headToHeadProvider", "injuriesProvider", "statsProvider"].sort()
    );
  });

  it("não inventa fact pra fonte sem normalizer implementado", () => {
    const coleta = coletaComOdds([]);
    coleta.sources.push({ provider: "providerDesconhecido", status: "ok", data: {}, error: null, fetchedAt: "x" });

    const resultado = normalizeFacts(coleta);
    expect(resultado.structuredFacts).toHaveLength(0);
    expect(resultado.gaps.some((g) => g.provider === "providerDesconhecido")).toBe(true);
  });
});
