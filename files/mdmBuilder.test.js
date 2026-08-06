/**
 * mdmBuilder.test.js
 *
 * Escrito em sintaxe vitest/jest (describe/it/expect) — ambas compatíveis
 * com o mesmo código. Se o projeto usar outro runner, só adaptar os
 * imports de describe/it/expect.
 *
 * Cobre os 4 pontos obrigatórios do pedido:
 *   1. o MDM retorna todas as chaves esperadas
 *   2. campos ausentes ficam como null ou []
 *   3. nenhum campo de aposta aparece
 *   4. o MDM continua compatível com o output atual do Analyser
 */

import { describe, it, expect } from "vitest";
import { buildMdm } from "../builders/mdmBuilder.js";

const BETTING_FIELDS = [
  "picks",
  "pick",
  "bilhete",
  "bilhetes",
  "stake",
  "ev",
  "expected_value",
  "probabilidade_aposta",
  "recomendacao_mercado",
  "recomendacao_de_mercado"
];

function collectAllKeysDeep(obj, keys = new Set()) {
  if (obj === null || typeof obj !== "object") return keys;
  if (Array.isArray(obj)) {
    obj.forEach((item) => collectAllKeysDeep(item, keys));
    return keys;
  }
  Object.entries(obj).forEach(([key, value]) => {
    keys.add(key.toLowerCase());
    collectAllKeysDeep(value, keys);
  });
  return keys;
}

describe("buildMdm", () => {
  const matchInputCompleto = {
    homeTeam: "Flamengo",
    awayTeam: "Palmeiras",
    competition: "Brasileirão",
    date: "2026-08-10T21:30:00Z"
  };

  const structuredFactsCompletos = [
    { subject: "injuries", key: "desfalques_casa", value: "Zagueiro titular fora", availability: true },
    { subject: "weather", key: "clima_estadio", value: "Chuva leve prevista", availability: true },
    { subject: "fixture_congestion", key: "friccao_fisica_ritmo", value: "3 jogos em 7 dias", availability: true },
    { subject: "team_form", key: "forma_recente", value: null, availability: false },
    { subject: "lineup", key: "titular_atacante", value: "Divergência entre fontes", availability: true, conflicting: true }
  ];

  const dossieCompleto = {
    markets: {
      moneyline: {
        evidences: [{ id: "ev1", source: "provider_x", fact: "Time A venceu 4 dos últimos 5" }],
        conflicts: [{ id: "c1", description: "Fonte diverge sobre titular", involved_evidence: ["ev1"] }],
        hypothesis: {
          statement: "Mandante em vantagem de eficiência recente",
          supporting_evidence_ids: ["ev1"],
          contradicting_evidence_ids: [],
          logic_path: "baseline vs xG"
        }
      }
    },
    narrativa: "Confronto direto pela liderança"
  };

  it("1. retorna todas as chaves esperadas no nível raiz e nos sub-blocos", () => {
    const mdm = buildMdm(matchInputCompleto, structuredFactsCompletos, {}, dossieCompleto, "2026-08-05T12:00:00Z");

    expect(Object.keys(mdm)).toEqual(
      expect.arrayContaining([
        "metadata",
        "auditoria",
        "fingerprint_geral",
        "contexto_interpretado",
        "analise_coletiva",
        "analises_prop",
        "gate"
      ])
    );

    expect(mdm.metadata).toHaveProperty("methodology_version");

    expect(mdm.auditoria).toEqual(
      expect.objectContaining({
        analysis_id: expect.any(String),
        versao_metodologia: "nexus_futebol_2.0",
        timestamp: expect.any(String),
        resultado_real: null,
        erro_classificado: null
      })
    );

    expect(mdm.fingerprint_geral).toEqual(
      expect.objectContaining({
        equipe_casa: expect.any(String),
        equipe_visitante: expect.any(String),
        competicao: expect.any(String),
        data: expect.any(String)
      })
    );

    expect(mdm.contexto_interpretado).toEqual(
      expect.objectContaining({
        impacto_desfalques: expect.any(String),
        friccao_fisica_ritmo: expect.any(String),
        clima_estadio: expect.any(String),
        detalhes_contexto: expect.any(String)
      })
    );

    expect(mdm.analise_coletiva).toEqual(
      expect.objectContaining({
        modulos_evidencia: expect.any(Array),
        sintese_evidencias: expect.any(Array),
        hipoteses_concorrentes: expect.any(Array),
        assimetrias: expect.any(Array),
        validacao_cruzada: expect.any(Array)
      })
    );

    expect(Array.isArray(mdm.analises_prop)).toBe(true);

    expect(mdm.gate).toEqual(
      expect.objectContaining({
        metricas_ausentes: expect.any(Array),
        total_coletadas: expect.any(Number),
        total_ausentes: expect.any(Number),
        total_conflitantes: expect.any(Number),
        coleta_executada: expect.any(Boolean)
      })
    );
  });

  it("2. campos ausentes ficam como null ou [] quando não há matchInput/structuredFacts/dossie", () => {
    const mdm = buildMdm(undefined, undefined, undefined, undefined, undefined);

    expect(mdm.fingerprint_geral).toEqual({
      equipe_casa: "",
      equipe_visitante: "",
      competicao: "",
      data: ""
    });

    expect(mdm.contexto_interpretado).toEqual({
      impacto_desfalques: "",
      friccao_fisica_ritmo: "",
      clima_estadio: "",
      detalhes_contexto: ""
    });

    expect(mdm.analise_coletiva.modulos_evidencia).toEqual([]);
    expect(mdm.analise_coletiva.sintese_evidencias).toEqual([]);
    expect(mdm.analise_coletiva.hipoteses_concorrentes).toEqual([]);
    expect(mdm.analise_coletiva.resultado_principal).toBeNull();
    expect(mdm.analise_coletiva.deliberacao).toBeNull();
    expect(mdm.analise_coletiva.assimetrias).toEqual([]);
    expect(mdm.analise_coletiva.analise_precificacao).toBeNull();
    expect(mdm.analise_coletiva.validacao_cruzada).toEqual([]);
    expect(mdm.analise_coletiva.narrativa).toBeNull();
    expect(mdm.analise_coletiva.leitura_segmento_inicial).toBeNull();

    expect(mdm.analises_prop).toEqual([]);

    expect(mdm.gate).toEqual({
      metricas_ausentes: [],
      total_coletadas: 0,
      total_ausentes: 0,
      total_conflitantes: 0,
      coleta_executada: false
    });

    expect(mdm.auditoria.resultado_real).toBeNull();
    expect(mdm.auditoria.erro_classificado).toBeNull();
  });

  it("3. nenhum campo de aposta aparece em nenhum nível do MDM", () => {
    const mdm = buildMdm(matchInputCompleto, structuredFactsCompletos, { someOdds: 1.9 }, dossieCompleto, "2026-08-05T12:00:00Z");

    const allKeys = collectAllKeysDeep(mdm);

    BETTING_FIELDS.forEach((forbidden) => {
      expect(allKeys.has(forbidden)).toBe(false);
    });
  });

  it("4. permanece compatível com o output atual do Analyser (matchInput/structuredFacts/dossie reais)", () => {
    // Simula o formato já produzido pelo pipeline: coleta -> normalização -> investigação -> dossie
    const mdm = buildMdm(matchInputCompleto, structuredFactsCompletos, {}, dossieCompleto, "2026-08-05T12:00:00Z");

    expect(mdm.fingerprint_geral.equipe_casa).toBe("Flamengo");
    expect(mdm.fingerprint_geral.equipe_visitante).toBe("Palmeiras");
    expect(mdm.contexto_interpretado.impacto_desfalques).toContain("Zagueiro titular fora");
    expect(mdm.analise_coletiva.modulos_evidencia.length).toBeGreaterThan(0);
    expect(mdm.analise_coletiva.hipoteses_concorrentes[0].statement).toBe(
      "Mandante em vantagem de eficiência recente"
    );
    expect(mdm.analise_coletiva.narrativa).toBe("Confronto direto pela liderança");
    expect(mdm.gate.metricas_ausentes).toContain("forma_recente");
    expect(mdm.gate.total_coletadas).toBe(structuredFactsCompletos.length);
    expect(mdm.gate.total_ausentes).toBe(1);
    expect(mdm.gate.total_conflitantes).toBe(1);
    expect(mdm.gate.coleta_executada).toBe(true);
  });
});
