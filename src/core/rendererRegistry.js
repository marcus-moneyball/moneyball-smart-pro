/**
 * core/rendererRegistry.js
 * Recebe o Knowledge Package (já persistido) e decide quais renderers
 * executar. O CortexEngine nunca conhece Ghost/Telegram/Bet Builder
 * diretamente — só conversa com o Registry.
 *
 * Execução SEQUENCIAL nesta fase (facilita observabilidade/debug —
 * evoluir pra paralelo depois é só trocar o for por Promise.all, sem
 * mudar a interface).
 */

/**
 * @typedef {(knowledgePackage: object, env: object) => Promise<{ok: boolean, [key: string]: any}>} RendererFn
 */

export function criarRendererRegistry() {
  /** @type {Map<string, RendererFn>} */
  const renderers = new Map();

  /**
   * Registra um renderer pelo nome. Cada renderer precisa seguir o
   * contrato: (knowledgePackage, env) => Promise<{ ok, ... }>
   */
  function registrar(nome, fn) {
    if (typeof fn !== "function") {
      throw new Error(`Renderer "${nome}" precisa ser uma função.`);
    }
    renderers.set(nome, fn);
  }

  /**
   * Executa os renderers ativos, um por um. Falha de um nunca impede
   * os outros — cada chamada é isolada em try/catch, e o relatório
   * completo é sempre devolvido, mesmo com falhas parciais.
   *
   * @param {object} knowledgePackage
   * @param {object} env
   * @param {object} config - ex: { ghost: true, telegram: true, betBuilder: false }
   * @returns {{ renderer: string, ok: boolean, detalhe?: any, erro?: string }[]}
   */
  async function executar(knowledgePackage, env, config = {}) {
    const relatorio = [];

    for (const [nome, fn] of renderers.entries()) {
      const ativo = config[nome] ?? true; // por padrão, ativo se registrado e não desligado explicitamente
      if (!ativo) {
        relatorio.push({ renderer: nome, ok: null, detalhe: "desativado nesta execução" });
        continue;
      }

      try {
        const resultado = await fn(knowledgePackage, env);
        relatorio.push({ renderer: nome, ok: resultado?.ok ?? false, detalhe: resultado });
      } catch (e) {
        console.error(`Renderer "${nome}" falhou:`, e.message);
        relatorio.push({ renderer: nome, ok: false, erro: e.message });
      }
    }

    return relatorio;
  }

  return { registrar, executar };
}
