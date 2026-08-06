/**
 * core/aiProvider.js
 * Wrapper fino sobre geminiAdapter.js (já existente) — só molda a saída
 * pro formato exato que o CortexEngine espera. Nenhuma lógica de IA nova.
 *
 * Como o CortexEngine chama aiProvider(payload) sem passar env, usamos
 * uma factory: criarAIProvider(env) devolve a função já "fechada" sobre
 * env, no formato que o CortexEngine espera receber via injeção.
 */
import { chamarGeminiRest } from "./geminiAdapter.js";
import { chamarGroqRest } from "./groqAdapter.js";

export function criarAIProvider(env) {
  const provider = (env.AI_PROVIDER || "gemini").toLowerCase();

  switch (provider) {
    case "groq":
      console.log("[AI Provider] Utilizando GROQ");
      return async (payload) => {
        return chamarGroqRest(env, payload);
      };

    case "gemini":
    default:
      console.log("[AI Provider] Utilizando GEMINI");
      return async (payload) => {
        return chamarGeminiRest(env, payload);
      };
  }
}