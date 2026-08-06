/**
 * runTriagem.test.js
 *
 * Testa só a orquestração (repasse de input/output) com um provider
 * falso — nunca chama IA ou dados reais.
 */

import { describe, it, expect, vi } from "vitest";
import { runTriagem } from "../triagem/runTriagem.js";

const RODADA_FAKE = {
  rodada: "Copa do Brasil 2026 - Oitavas de Final (Jogos de Volta - 05 e 06 de Agosto)",
  total_jogos_analisados: 6,
  total_jogos_selecionados: 1,
  jogos: [
    {
      rank: 1,
      confronto: "Grêmio x Mirassol",
      assimetria_detectada: "texto de teste",
      hipoteses: ["Grêmio ML (Moneyline)"]
    }
  ]
};

describe("runTriagem", () => {
  it("repassa o input pro provider e devolve o JSON de rodada sem alterar nada", async () => {
    const generateTriagem = vi.fn().mockResolvedValue(RODADA_FAKE);
    const input = { competicao: "Copa do Brasil" };

    const resultado = await runTriagem(input, { generateTriagem });

    expect(generateTriagem).toHaveBeenCalledWith(input);
    expect(resultado).toEqual(RODADA_FAKE);
  });

  it("funciona sem input explícito (provider decide o escopo sozinho)", async () => {
    const generateTriagem = vi.fn().mockResolvedValue(RODADA_FAKE);

    const resultado = await runTriagem(undefined, { generateTriagem });

    expect(generateTriagem).toHaveBeenCalledWith({});
    expect(resultado.jogos).toHaveLength(1);
  });

  it("propaga erro do provider sem mascarar", async () => {
    const generateTriagem = vi.fn().mockRejectedValue(new Error("provider indisponível"));

    await expect(runTriagem({}, { generateTriagem })).rejects.toThrow("provider indisponível");
  });
});
