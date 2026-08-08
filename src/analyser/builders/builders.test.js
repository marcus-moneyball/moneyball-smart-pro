import { describe, it, expect } from "vitest";
import { buildExecutiveSummary } from "./buildExecutiveSummary.js";
import { buildTelegramCard } from "./buildTelegramCard.js";
import { buildMdm } from "./buildMdm.js";

const DOSSIE_MOCK = {
  matchInput: { home_team: "Flamengo", away_team: "Palmeiras", sport: "futebol", league: "Brasileirão Série A" },
  investigatedAt: "2026-08-06T23:00:00Z",
  metodologia: "nexus_investigacao_v1_deterministico",
  mercados: [
    {
      mercado: "h2h",
      baseline: {
        medianaPorOutcome: { Flamengo: 2.0, Palmeiras: 2.0 },
        probabilidadeNormalizada: { Flamengo: 0.5, Palmeiras: 0.5 },
        overround: 0,
      },
      banda: {
        Flamengo: { min: 1.95, max: 2.05, mediana: 2.0, amplitudeRelativa: 0.025, nFontes: 3 },
        Palmeiras: { min: 1.95, max: 2.05, mediana: 2.0, amplitudeRelativa: 0.025, nFontes: 3 },
      },
      deviationTrigger: { acionado: false, detalhes: [] },
      evidenciasFavoraveis: ['Convergência entre 3 fonte(s) para "Flamengo" (amplitude de 2.5%) — mercado alinhado.'],
      evidenciasContrarias: [],
      limitacoes: ['Sem dado de "statsProvider" disponível para esta leitura (não implementado).'],
      openQuestions: ["Com statsProvider indisponíveis, o que dessas fontes mudaria essa leitura se estivesse disponível?"],
    },
  ],
  limitacoesGerais: ['Sem dado de "statsProvider" disponível para esta leitura (não implementado).'],
};

describe("Builders (camada 4 — só formatam o Dossiê)", () => {
  it("buildExecutiveSummary produz texto com os dados do dossiê, sem inventar nada", () => {
    const texto = buildExecutiveSummary(DOSSIE_MOCK);
    expect(texto).toContain("Flamengo x Palmeiras");
    expect(texto).toContain("50.0%");
    expect(texto).toContain("não acionado");
    expect(texto).toContain("statsProvider");
  });

  it("buildTelegramCard produz markdown curto com os outcomes e o trigger", () => {
    const card = buildTelegramCard(DOSSIE_MOCK);
    expect(card).toContain("*Flamengo x Palmeiras*");
    expect(card).toContain("Flamengo: 50.0%");
    expect(card).toContain("✅ não acionado");
    expect(card).toContain("não é recomendação de aposta");
  });

  it("buildMdm produz JSON estruturado com analysisId e todos os mercados", () => {
    const mdm = buildMdm(DOSSIE_MOCK);
    expect(mdm.analysisId).toBeDefined();
    expect(mdm.partida).toEqual({
      mandante: "Flamengo",
      visitante: "Palmeiras",
      esporte: "futebol",
      liga: "Brasileirão Série A",
    });
    expect(mdm.mercados).toHaveLength(1);
    expect(mdm.mercados[0].mercado).toBe("h2h");
    expect(mdm.limitacoesGerais).toHaveLength(1);
  });

  it("nenhum builder tem EV, aposta ou stake no output", () => {
    const textoResumo = buildExecutiveSummary(DOSSIE_MOCK);
    const textoCard = buildTelegramCard(DOSSIE_MOCK);
    const mdm = JSON.stringify(buildMdm(DOSSIE_MOCK));

    for (const termo of ["expected value", " ev ", "stake", "aposte"]) {
      expect(textoResumo.toLowerCase()).not.toContain(termo);
      expect(textoCard.toLowerCase()).not.toContain(termo);
      expect(mdm.toLowerCase()).not.toContain(termo);
    }
  });
});
