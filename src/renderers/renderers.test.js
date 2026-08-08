import { describe, it, expect, vi, afterEach } from "vitest";
import { renderGhost } from "./renderGhost.js";
import { renderTelegram } from "./renderTelegram.js";

const PAYLOAD = {
  partida: { home_team: "Flamengo", away_team: "Palmeiras", liga: "Brasileirão Série A" },
  podio: {
    perfil_geral: "Jogo com ritmo alto esperado.",
    pernas_elegiveis: [
      { medalha: "Ouro", mercado: "Chutes no Gol", selecao: "Over 4.5", odd: 1.85, motivo: "xG divergente." },
      { medalha: "Prata", mercado: "Escanteios", selecao: "Over 9.5", odd: 1.95, motivo: "Volume consistente." },
      { medalha: "Bronze", mercado: "Resultado", selecao: "Flamengo", odd: 2.05, motivo: "Cenário macro favorável." },
    ],
  },
};

describe("renderGhost + renderTelegram — schema novo do pódio", () => {
  const fetchOriginal = global.fetch;
  afterEach(() => {
    global.fetch = fetchOriginal;
    vi.restoreAllMocks();
  });

  it("renderGhost monta o HTML com as 3 pernas e publica via ghostService", async () => {
    global.fetch = vi.fn(async () => ({
      ok: true,
      json: async () => ({ posts: [{ id: "post123" }] }),
    }));

    const resultado = await renderGhost(PAYLOAD, {
      GHOST_ADMIN_API_KEY: "abc123:deadbeef",
      GHOST_API_URL: "https://blog.teste.com",
    });

    expect(resultado.ok).toBe(true);
    const corpoEnviado = JSON.parse(global.fetch.mock.calls[0][1].body);
    expect(corpoEnviado.posts[0].title).toContain("Flamengo x Palmeiras");
    expect(corpoEnviado.posts[0].html).toContain("Chutes no Gol");
    expect(corpoEnviado.posts[0].html).toContain("Escanteios");
    expect(corpoEnviado.posts[0].html).toContain("Resultado");
  });

  it("renderTelegram monta a mensagem com as 3 medalhas e envia via telegramService", async () => {
    global.fetch = vi.fn(async () => ({
      ok: true,
      json: async () => ({ ok: true, result: { message_id: 42 } }),
    }));

    const resultado = await renderTelegram(PAYLOAD, {
      TELEGRAM_BOT_TOKEN: "token123",
      TELEGRAM_CHAT_ID: "-100123",
    });

    expect(resultado.ok).toBe(true);
    const corpoEnviado = JSON.parse(global.fetch.mock.calls[0][1].body);
    expect(corpoEnviado.text).toContain("🥇");
    expect(corpoEnviado.text).toContain("🥈");
    expect(corpoEnviado.text).toContain("🥉");
  });

  it("renderGhost falha graciosamente sem quebrar se GHOST_ADMIN_API_KEY ausente", async () => {
    const resultado = await renderGhost(PAYLOAD, {});
    expect(resultado.ok).toBe(false);
  });
});
