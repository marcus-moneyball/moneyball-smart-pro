/**
 * triagemRoute.js
 *
 * Handler HTTP pra etapa de triagem: devolve o JSON da rodada (lista de
 * jogos candidatos) que o frontend usa pra montar os cards clicáveis.
 * Roteador-agnóstico, igual investigarRoute.js.
 *
 * Aceita GET simples. Se no futuro a triagem precisar de parâmetros
 * (ex: qual competição escanear), eles chegam via querystring e são
 * repassados como `input` pro runTriagem — sem validação rígida aqui,
 * já que hoje o provider decide sozinho o escopo da rodada.
 */

import { runTriagem } from "../triagem/runTriagem.js";

function jsonResponse(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Access-Control-Allow-Origin": "*"
    }
  });
}

export async function handleTriagem(request) {
  const url = new URL(request.url);
  const input = Object.fromEntries(url.searchParams.entries());

  try {
    const rodada = await runTriagem(input);
    return jsonResponse(rodada, 200);
  } catch (err) {
    return jsonResponse(
      { error: "Falha ao gerar a triagem da rodada.", detail: err?.message ?? String(err) },
      500
    );
  }
}

/**
 * Exemplo de integração no entry point do Worker, junto com /investigar:
 *
 * import { handleTriagem } from "./routes/triagemRoute.js";
 * import { handleInvestigar } from "./routes/investigarRoute.js";
 *
 * export default {
 *   async fetch(request, env, ctx) {
 *     const url = new URL(request.url);
 *
 *     if (url.pathname === "/triagem" && request.method === "GET") {
 *       return handleTriagem(request);
 *     }
 *     if (url.pathname === "/investigar" && request.method === "POST") {
 *       return handleInvestigar(request);
 *     }
 *
 *     // ...resto das rotas existentes
 *   }
 * };
 */
