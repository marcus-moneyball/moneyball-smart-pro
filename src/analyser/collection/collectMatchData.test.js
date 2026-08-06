import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { collectMatchData } from "./collectMatchData.js";

const MATCH_INPUT = {
  home_team: "Flamengo",
  away_team: "Palmeiras",
  sport: "futebol",
  league: "Brasileirão Série A",
};

const EVENTO_ODDS_API_MOCK = {
  id: "abc123",
  sport_key: "soccer_brazil_campeonato",
  commence_time: "2026-08-10T20:00:00Z",
  home_team: "Flamengo",
  away_team: "Palmeiras",
  bookmakers: [
    {
      key: "betfair",
      title: "Betfair",
      last_update: "2026-08-06T12:00:00Z",
      markets: [{ key: "h2h", outcomes: [{ name: "Flamengo", price: 2.1 }] }],
    },
  ],
};

describe("collectMatchData (camada de Collection)", () => {
  const fetchOriginal = global.fetch;

  beforeEach(() => {
    global.fetch = vi.fn(async () => ({
      ok: true,
      status: 200,
      json: async () => [EVENTO_ODDS_API_MOCK],
    }));
  });

  afterEach(() => {
    global.fetch = fetchOriginal;
    vi.restoreAllMocks();
  });

  it("valida matchInput e lança erro fail-fast se faltar campo obrigatório", async () => {
    const invalido = { home_team: "Flamengo", sport: "futebol", league: "Brasileirão Série A" };
    await expect(collectMatchData(invalido, {})).rejects.toThrow(/away_team/);
  });

  it("coleta odds reais com sucesso e isola os providers ainda não implementados", async () => {
    const resultado = await collectMatchData(MATCH_INPUT, { ODDS_API_KEY: "chave_de_teste" });

    const odds = resultado.sources.find((s) => s.provider === "oddsApi");
    expect(odds.status).toBe("ok");
    expect(odds.data).toEqual(EVENTO_ODDS_API_MOCK);

    for (const nome of ["statsProvider", "injuriesProvider", "headToHeadProvider"]) {
      const fonte = resultado.sources.find((s) => s.provider === nome);
      expect(fonte.status).toBe("error");
      expect(fonte.error).toMatch(/não implementado/);
    }
  });

  it("não interrompe a coleta quando falta a API key — cada fonte falha isolada", async () => {
    const resultado = await collectMatchData(MATCH_INPUT, {});
    expect(resultado.sources).toHaveLength(4);
    expect(resultado.sources.every((s) => s.status === "error")).toBe(true);
  });

  it("lança erro explícito pra liga não mapeada, sem tentar adivinhar o sport_key", async () => {
    const semLigaMapeada = { ...MATCH_INPUT, league: "Liga Inexistente" };
    const resultado = await collectMatchData(semLigaMapeada, { ODDS_API_KEY: "chave_de_teste" });
    const odds = resultado.sources.find((s) => s.provider === "oddsApi");
    expect(odds.status).toBe("error");
    expect(odds.error).toMatch(/não está mapeada/);
  });

  it("não interpreta os dados — devolve o evento bruto da Odds API sem transformação", async () => {
    const resultado = await collectMatchData(MATCH_INPUT, { ODDS_API_KEY: "chave_de_teste" });
    const odds = resultado.sources.find((s) => s.provider === "oddsApi");
    // Nenhum campo derivado/calculado deve existir — só o que a API devolveu.
    expect(Object.keys(odds.data).sort()).toEqual(
      Object.keys(EVENTO_ODDS_API_MOCK).sort()
    );
  });
});
