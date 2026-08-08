import { describe, it, expect } from "vitest";
import { investigate } from "./investigate.js";

function normalizadoComFacts(facts, gaps = []) {
  return {
    matchInput: { home_team: "Flamengo", away_team: "Palmeiras", sport: "futebol", league: "Brasileirão Série A" },
    normalizedAt: "2026-08-06T23:00:00Z",
    structuredFacts: facts,
    gaps,
  };
}

const GAPS_PADRAO = [
  { provider: "statsProvider", reason: "não implementado" },
  { provider: "injuriesProvider", reason: "não implementado" },
  { provider: "headToHeadProvider", reason: "não implementado" },
];

describe("investigate (Investigador — método Nexus determinístico)", () => {
  it("calcula baseline (probabilidade implícita normalizada) a partir da mediana das odds", () => {
    const facts = [
      { key: "odds.h2h.Flamengo", market: "h2h", outcome: "Flamengo", value: 2.0, provenance: "oddsApi:a", availability: "live", conflicting: false, conflictingWith: [], timestamp: "t" },
      { key: "odds.h2h.Palmeiras", market: "h2h", outcome: "Palmeiras", value: 2.0, provenance: "oddsApi:a", availability: "live", conflicting: false, conflictingWith: [], timestamp: "t" },
    ];
    const dossie = investigate(normalizadoComFacts(facts, GAPS_PADRAO));
    const h2h = dossie.mercados.find((m) => m.mercado === "h2h");

    expect(h2h.baseline.probabilidadeNormalizada.Flamengo).toBeCloseTo(0.5, 5);
    expect(h2h.baseline.probabilidadeNormalizada.Palmeiras).toBeCloseTo(0.5, 5);
    expect(h2h.baseline.overround).toBeCloseTo(0, 5);
  });

  it("banda reflete min/max/mediana e aciona deviationTrigger quando há fact conflicting", () => {
    const facts = [
      { key: "odds.h2h.Flamengo", market: "h2h", outcome: "Flamengo", value: 2.0, provenance: "oddsApi:a", availability: "live", conflicting: false, conflictingWith: ["oddsApi:b"], timestamp: "t" },
      { key: "odds.h2h.Flamengo", market: "h2h", outcome: "Flamengo", value: 2.05, provenance: "oddsApi:b", availability: "live", conflicting: false, conflictingWith: ["oddsApi:a"], timestamp: "t" },
      { key: "odds.h2h.Flamengo", market: "h2h", outcome: "Flamengo", value: 3.0, provenance: "oddsApi:c", availability: "live", conflicting: true, conflictingWith: ["oddsApi:a", "oddsApi:b"], timestamp: "t" },
    ];
    const dossie = investigate(normalizadoComFacts(facts, GAPS_PADRAO));
    const h2h = dossie.mercados.find((m) => m.mercado === "h2h");

    expect(h2h.banda.Flamengo.min).toBe(2.0);
    expect(h2h.banda.Flamengo.max).toBe(3.0);
    expect(h2h.deviationTrigger.acionado).toBe(true);
    expect(h2h.deviationTrigger.detalhes[0].provenance).toBe("oddsApi:c");
  });

  it("gera evidência favorável quando a banda é estreita (convergência)", () => {
    const facts = [
      { key: "odds.h2h.Flamengo", market: "h2h", outcome: "Flamengo", value: 2.0, provenance: "oddsApi:a", availability: "live", conflicting: false, conflictingWith: [], timestamp: "t" },
      { key: "odds.h2h.Flamengo", market: "h2h", outcome: "Flamengo", value: 2.01, provenance: "oddsApi:b", availability: "live", conflicting: false, conflictingWith: [], timestamp: "t" },
    ];
    const dossie = investigate(normalizadoComFacts(facts, GAPS_PADRAO));
    const h2h = dossie.mercados.find((m) => m.mercado === "h2h");
    expect(h2h.evidenciasFavoraveis.length).toBeGreaterThan(0);
    expect(h2h.evidenciasContrarias.length).toBe(0);
  });

  it("limitações e open questions vêm dos gaps reais, não são genéricas", () => {
    const facts = [
      { key: "odds.h2h.Flamengo", market: "h2h", outcome: "Flamengo", value: 2.0, provenance: "oddsApi:a", availability: "live", conflicting: false, conflictingWith: [], timestamp: "t" },
    ];
    const dossie = investigate(normalizadoComFacts(facts, GAPS_PADRAO));
    const h2h = dossie.mercados.find((m) => m.mercado === "h2h");

    expect(h2h.limitacoes).toHaveLength(3);
    expect(h2h.limitacoes.some((l) => l.includes("statsProvider"))).toBe(true);
    expect(dossie.limitacoesGerais).toHaveLength(3);
    expect(h2h.openQuestions.some((q) => q.includes("indisponíveis"))).toBe(true);
  });

  it("nunca calcula EV, aposta ou stake — só as chaves de conhecimento estruturado", () => {
    const facts = [
      { key: "odds.h2h.Flamengo", market: "h2h", outcome: "Flamengo", value: 2.0, provenance: "oddsApi:a", availability: "live", conflicting: false, conflictingWith: [], timestamp: "t" },
    ];
    const dossie = investigate(normalizadoComFacts(facts, GAPS_PADRAO));
    const h2h = dossie.mercados.find((m) => m.mercado === "h2h");

    const chaves = Object.keys(h2h);
    expect(chaves).toEqual(
      expect.arrayContaining(["mercado", "baseline", "banda", "deviationTrigger", "evidenciasFavoraveis", "evidenciasContrarias", "limitacoes", "openQuestions"])
    );
    expect(chaves).not.toEqual(expect.arrayContaining(["ev", "expectedValue", "aposta", "stake", "recomendacao"]));
  });
});
