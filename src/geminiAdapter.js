/**
 * geminiAdapter.js
 * Ponte entre o Cortex e a API do Gemini — REST/fetch nativo, sem SDK.
 *
 * Duas camadas aqui, de propósito:
 *   1. chamarGeminiRest(): caller genérico e reutilizável (qualquer prompt
 *      estruturado + qualquer schema de saída). Extraído aqui pra não
 *      duplicar a lógica de thinking/parsing que já existe em
 *      intelligenceEngine.js — se você ainda não migrou aquele arquivo
 *      pra usar este adapter, vale fazer isso depois, pra ter só um
 *      lugar que sabe conversar com o Gemini.
 *   2. analisarPartida(): wrapper de conveniência que já devolve o
 *      formato padronizado { score, mercado, justificativa_tatica }.
 *
 * Requer no Worker: GOOG_API_KEY (secret).
 */

const GEMINI_MODEL_PADRAO = "gemini-3.1-pro-preview";
const GEMINI_URL_BASE = "https://generativelanguage.googleapis.com/v1beta/models";

/**
 * Caller genérico — monta a chamada, separa "thought" de resposta final,
 * faz parse do JSON. Lança erro se algo sair fora do esperado (quem
 * chama decide como tratar: try/catch no Cortex).
 *
 * @param {object} env
 * @param {object} opcoes
 * @param {string} opcoes.systemPrompt
 * @param {string} opcoes.userContent
 * @param {string} [opcoes.model]
 * @param {"LOW"|"MEDIUM"|"HIGH"} [opcoes.thinkingLevel]
 * @param {number} [opcoes.maxOutputTokens]
 * @param {number} [opcoes.temperature]
 * @returns {{ resposta: object, raciocinio: string, bruto: object }}
 */
export async function chamarGeminiRest(env, opcoes) {
  const apiKey = env.GOOG_API_KEY;
  if (!apiKey) throw new Error("GOOG_API_KEY não configurada no Worker.");

  const model = opcoes.model ?? GEMINI_MODEL_PADRAO;
  const url = `${GEMINI_URL_BASE}/${model}:generateContent?key=${apiKey}`;

  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      systemInstruction: { parts: [{ text: opcoes.systemPrompt }] },
      contents: [{ role: "user", parts: [{ text: opcoes.userContent }] }],
      generationConfig: {
        temperature: opcoes.temperature ?? 0.3,
        maxOutputTokens: opcoes.maxOutputTokens ?? 8192,
        responseMimeType: "application/json",
        thinkingConfig: {
          thinkingLevel: opcoes.thinkingLevel ?? "MEDIUM",
          includeThoughts: true,
        },
      },
    }),
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`Gemini falhou (${response.status}): ${errText.slice(0, 300)}`);
  }

  const bruto = await response.json();
  const parts = bruto.candidates?.[0]?.content?.parts || [];

  const raciocinio = parts.filter((p) => p.thought).map((p) => p.text).join("\n\n").trim();
  const textoResposta = parts.filter((p) => !p.thought).map((p) => p.text).join("").trim();

  if (!textoResposta) {
    throw new Error("Resposta do Gemini veio vazia (thinking pode ter consumido todo o budget).");
  }

  let resposta;
  try {
    resposta = JSON.parse(textoResposta.replace(/```json|```/g, "").trim());
  } catch (e) {
    throw new Error("O Gemini não devolveu um JSON válido.");
  }

  return { resposta, raciocinio, bruto };
}

/**
 * Wrapper de conveniência: monta o prompt combinando a instrução
 * estruturada + as estatísticas da partida, chama o Gemini, e valida/
 * normaliza a saída no formato { score, mercado, justificativa_tatica }.
 *
 * @param {object} env
 * @param {string} promptEstruturado - instrução/metodologia (ex: trecho do Nexus)
 * @param {object} estatisticas - dados da partida (MatchSnapshot ou parte dele)
 * @param {object} [opcoes] - repassado pro chamarGeminiRest (model, thinkingLevel, etc.)
 */
export async function analisarPartida(env, promptEstruturado, estatisticas, opcoes = {}) {
  const systemPrompt = `${promptEstruturado}

Responda SOMENTE com um JSON válido, sem markdown, exatamente neste formato:
{"score": number, "mercado": "string", "justificativa_tatica": "string"}`;

  const userContent = `Estatísticas da partida:\n${JSON.stringify(estatisticas)}`;

  const { resposta, raciocinio } = await chamarGeminiRest(env, {
    ...opcoes,
    systemPrompt,
    userContent,
  });

  // Normaliza — garante que os 3 campos sempre existem, mesmo que o
  // modelo omita algum por engano, pra quem consome não precisar
  // ficar checando undefined toda vez.
  return {
    score: typeof resposta.score === "number" ? resposta.score : null,
    mercado: resposta.mercado ?? null,
    justificativa_tatica: resposta.justificativa_tatica ?? null,
    raciocinio: raciocinio || null,
  };
}
