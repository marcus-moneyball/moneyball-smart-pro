/**
 * core/validarPodio.js
 * Valida a saída da Groq pro schema do pódio antes de deixar seguir
 * pro /publicar. Falha explícito (fail-fast) em vez de deixar um
 * pódio incompleto ou fora de ordem chegar no Telegram/Ghost.
 */
const ORDEM_MEDALHAS = ["Ouro", "Prata", "Bronze"];

/**
 * @param {object} podio - resposta já parseada da Groq
 * @returns {{ ok: boolean, erro?: string }}
 */
export function validarPodio(podio) {
  if (!podio || typeof podio !== "object") {
    return { ok: false, erro: "Pódio ausente ou não é um objeto." };
  }

  if (typeof podio.perfil_geral !== "string" || podio.perfil_geral.trim() === "") {
    return { ok: false, erro: "Campo 'perfil_geral' ausente ou vazio." };
  }

  if (!Array.isArray(podio.pernas_elegiveis) || podio.pernas_elegiveis.length !== 3) {
    return {
      ok: false,
      erro: `'pernas_elegiveis' precisa ter exatamente 3 itens (recebido: ${Array.isArray(podio.pernas_elegiveis) ? podio.pernas_elegiveis.length : "não é array"}).`,
    };
  }

  for (let i = 0; i < 3; i++) {
    const perna = podio.pernas_elegiveis[i];
    const medalhaEsperada = ORDEM_MEDALHAS[i];

    if (!perna || typeof perna !== "object") {
      return { ok: false, erro: `Perna na posição ${i} (esperada: ${medalhaEsperada}) ausente ou inválida.` };
    }
    if (perna.medalha !== medalhaEsperada) {
      return {
        ok: false,
        erro: `Perna na posição ${i} devia ser "${medalhaEsperada}", veio "${perna.medalha}".`,
      };
    }
    for (const campo of ["mercado", "selecao", "motivo"]) {
      if (typeof perna[campo] !== "string" || perna[campo].trim() === "") {
        return { ok: false, erro: `Perna "${medalhaEsperada}" com campo "${campo}" ausente ou vazio.` };
      }
    }
    if (typeof perna.odd !== "number" || perna.odd <= 1) {
      return { ok: false, erro: `Perna "${medalhaEsperada}" com "odd" ausente ou inválida (${perna.odd}).` };
    }
  }

  return { ok: true };
}
