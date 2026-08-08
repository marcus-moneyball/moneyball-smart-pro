import { describe, it, expect, vi, afterEach } from "vitest";
import { chamarGroqRest } from "./groqAdapter.js";

describe("chamarGroqRest — opção formato", () => {
  const fetchOriginal = global.fetch;
  afterEach(() => {
    global.fetch = fetchOriginal;
    vi.restoreAllMocks();
  });

  function mockRespostaGroq(conteudo) {
    global.fetch = vi.fn(async () => ({
      ok: true,
      json: async () => ({ choices: [{ message: { content: conteudo } }] }),
    }));
  }

  it("formato padrão (json) continua fazendo parse — comportamento existente preservado", async () => {
    mockRespostaGroq('{"campo": "valor"}');
    const { resposta } = await chamarGroqRest(
      { GROQ_API_KEY: "x" },
      { systemPrompt: "s", userContent: "u" }
    );
    expect(resposta).toEqual({ campo: "valor" });
  });

  it("formato 'texto' devolve a resposta crua, sem parse", async () => {
    mockRespostaGroq("### Rank 1 — Time A x Time B\nmarkdown livre");
    const { resposta } = await chamarGroqRest(
      { GROQ_API_KEY: "x" },
      { systemPrompt: "s", userContent: "u", formato: "texto" }
    );
    expect(resposta).toBe("### Rank 1 — Time A x Time B\nmarkdown livre");
  });

  it("lança erro claro se GROQ_API_KEY ausente", async () => {
    await expect(
      chamarGroqRest({}, { systemPrompt: "s", userContent: "u" })
    ).rejects.toThrow(/GROQ_API_KEY/);
  });
});
