import { runPipeline } from "./Runpipeline.js";

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