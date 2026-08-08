import { runPipeline } from "./src/pipeline/runPipeline.js";
import { chamarGroqRest } from "./src/core/groqAdapter.js";
import { SYSTEM_PROMPT_RADAR } from "./src/prompts/radarPrompt.js";
import { SYSTEM_PROMPT_BETBUILDER } from "./src/prompts/betBuilderPrompt.js";
import { validarPodio } from "./src/core/validarPodio.js";
import { renderGhost } from "./src/renderers/renderGhost.js";
import { renderTelegram } from "./src/renderers/renderTelegram.js";

function jsonResponse(body, status = 200) {
  return new Response(JSON.stringify(body, null, 2), {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Access-Control-Allow-Origin": "*",
    },
  });
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (url.pathname === "/radar" && request.method === "POST") {
      try {
        const { jsonBruto } = await request.json();
        if (!jsonBruto) {
          return jsonResponse({ erro: "Campo 'jsonBruto' ausente no corpo da requisição." }, 400);
        }

        const userContent = typeof jsonBruto === "string" ? jsonBruto : JSON.stringify(jsonBruto);

        const { resposta } = await chamarGroqRest(env, {
          systemPrompt: SYSTEM_PROMPT_RADAR,
          userContent,
          temperature: 0.2,
          formato: "texto",
        });

        return jsonResponse({ markdown: resposta });
      } catch (e) {
        return jsonResponse({ erro: "Falha no Radar", detalhe: e.message }, 500);
      }
    }

    if (url.pathname === "/betbuilder" && request.method === "POST") {
      try {
        const { dossie } = await request.json();
        if (!dossie) {
          return jsonResponse({ erro: "Campo 'dossie' ausente no corpo da requisição." }, 400);
        }

        const userContent = typeof dossie === "string" ? dossie : JSON.stringify(dossie);

        const { resposta } = await chamarGroqRest(env, {
          systemPrompt: SYSTEM_PROMPT_BETBUILDER,
          userContent,
          temperature: 0.2,
        });

        const validacao = validarPodio(resposta);
        if (!validacao.ok) {
          return jsonResponse({ erro: "Groq devolveu um pódio fora do contrato.", detalhe: validacao.erro, bruto: resposta }, 502);
        }

        return jsonResponse({ podio: resposta });
      } catch (e) {
        return jsonResponse({ erro: "Falha no BetBuilder", detalhe: e.message }, 500);
      }
    }

    if (url.pathname === "/publicar" && request.method === "POST") {
      try {
        const payload = await request.json();

        if (!payload?.partida || !payload?.podio) {
          return jsonResponse({ erro: "Campos 'partida' e 'podio' são obrigatórios." }, 400);
        }

        const validacao = validarPodio(payload.podio);
        if (!validacao.ok) {
          return jsonResponse({ erro: "Pódio fora do contrato — publicação abortada.", detalhe: validacao.erro }, 400);
        }

        const [ghost, telegram] = await Promise.all([
          renderGhost(payload, env),
          renderTelegram(payload, env),
        ]);

        return jsonResponse({ ghost, telegram });
      } catch (e) {
        return jsonResponse({ erro: "Falha ao publicar", detalhe: e.message }, 500);
      }
    }

    if (url.pathname === "/test-pipeline") {
      try {
        const resultado = await runPipeline(env);

        return jsonResponse(resultado);
      } catch (e) {
        return jsonResponse(
          {
            erro: "Falha no CortexEngine",
            detalhe: e.message,
            stack: e.stack,
          },
          500
        );
      }
    }

    return new Response(
      "CortexEngine online.\n\nUse:\n/test-pipeline",
      { status: 200 }
    );
  },
};