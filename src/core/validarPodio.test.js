import { describe, it, expect } from "vitest";
import { validarPodio } from "./validarPodio.js";

function podioValido() {
  return {
    perfil_geral: "Leitura tática do jogo.",
    pernas_elegiveis: [
      { medalha: "Ouro", mercado: "Strikeouts", selecao: "Over 7.5", odd: 1.85, motivo: "xFIP divergente." },
      { medalha: "Prata", mercado: "Chutes no Gol", selecao: "Over 3.5", odd: 1.95, motivo: "Volume consistente." },
      { medalha: "Bronze", mercado: "Resultado", selecao: "Casa", odd: 2.05, motivo: "Cenário macro favorável." },
    ],
  };
}

describe("validarPodio", () => {
  it("aceita um pódio bem formado", () => {
    expect(validarPodio(podioValido())).toEqual({ ok: true });
  });

  it("rejeita se não vier exatamente 3 pernas", () => {
    const podio = podioValido();
    podio.pernas_elegiveis.pop();
    const resultado = validarPodio(podio);
    expect(resultado.ok).toBe(false);
    expect(resultado.erro).toMatch(/exatamente 3/);
  });

  it("rejeita se a ordem das medalhas estiver errada", () => {
    const podio = podioValido();
    [podio.pernas_elegiveis[0], podio.pernas_elegiveis[1]] = [podio.pernas_elegiveis[1], podio.pernas_elegiveis[0]];
    const resultado = validarPodio(podio);
    expect(resultado.ok).toBe(false);
    expect(resultado.erro).toMatch(/devia ser "Ouro"/);
  });

  it("rejeita perfil_geral vazio", () => {
    const podio = podioValido();
    podio.perfil_geral = "";
    expect(validarPodio(podio).ok).toBe(false);
  });

  it("rejeita odd inválida", () => {
    const podio = podioValido();
    podio.pernas_elegiveis[0].odd = 0.9;
    const resultado = validarPodio(podio);
    expect(resultado.ok).toBe(false);
    expect(resultado.erro).toMatch(/odd/);
  });

  it("rejeita campo motivo vazio", () => {
    const podio = podioValido();
    podio.pernas_elegiveis[2].motivo = "";
    expect(validarPodio(podio).ok).toBe(false);
  });
});
