/**
 * investigarRoute.js
 *
 * Handler HTTP para o botão "Investigar" do frontend: recebe os 4
 * campos do formulário, roda o Analyser completo e devolve os 3
 * artefatos em JSON.
 *
 * Roteador-agnóstico de propósito: só recebe um Request e devolve um
 * Response. Plugue no seu roteador atual (switch de pathname,
 * itty-router, Hono, etc) — ver exemplo de integração no fim do
 * arquivo, em comentário.
 */

import { runAnalyser } from "../analyser/runAnalyser.js";

function jsonResponse(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Access-Control-Allow-Origin": "*"
    }
  });
}

function validateMatchInput(payload) {
  const { homeTeam, awayTeam, competition, date } = payload || {};
  const faltando = [];

  if (!homeTeam) faltando.push("homeTeam");
  if (!awayTeam) faltando.push("awayTeam");
  if (!competition) faltando.push("competition");
  if (!date) faltando.push("date");

  return { valido: faltando.length === 0, faltando };
}

export async function handleInvestigar(request) {
  let payload;
  try {
    payload = await request.json();
  } catch {
    return jsonResponse({ error: "JSON inválido no corpo da requisição." }, 400);
  }

  const { valido, faltando } = validateMatchInput(payload);
  if (!valido) {
    return jsonResponse(
      { error: "Campos obrigatórios ausentes.", campos_ausentes: faltando },
      400
    );
  }

  const { homeTeam, awayTeam, competition, date } = payload;
  const matchInput = { homeTeam, awayTeam, competition, date };

  try {
    const resultado = await runAnalyser(matchInput);
    return jsonResponse(resultado, 200);
  } catch (err) {
    return jsonResponse(
      { error: "Falha ao executar o Analyser.", detail: err?.message ?? String(err) },
      500
    );
  }
}

/**
 * Exemplo de integração no entry point do Worker (index.js/worker.js):
 *
 * import { handleInvestigar } from "./routes/investigarRoute.js";
 *
 * export default {
 *   async fetch(request, env, ctx) {
 *     const url = new URL(request.url);
 *
 *     if (url.pathname === "/investigar" && request.method === "POST") {
 *       return handleInvestigar(request);
 *     }
 *
 *     // ...resto das rotas existentes, sem alteração
 *   }
 * };
 */
