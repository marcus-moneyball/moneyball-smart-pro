const GROQ_MODEL_PADRAO = "openai/gpt-oss-120b";

const GROQ_URL = "https://api.groq.com/openai/v1/chat/completions";

/**
 * @param {object} env
 * @param {object} opcoes
 * @param {string} opcoes.systemPrompt
 * @param {string} opcoes.userContent
 * @param {string} [opcoes.model]
 * @param {number} [opcoes.temperature]
 * @param {"json"|"texto"} [opcoes.formato] - "json" (padrão, comportamento
 *   original: faz parse da resposta como JSON) ou "texto" (devolve a
 *   resposta crua, pra prompts que respondem em markdown livre, como o
 *   Radar). Callers existentes não passam esse campo, então continuam
 *   se comportando exatamente como antes.
 */
export async function chamarGroqRest(env, opcoes) {

  const apiKey = env.GROQ_API_KEY;

  if (!apiKey) {
    throw new Error("GROQ_API_KEY não configurada no Worker.");
  }

  const formato = opcoes.formato ?? "json";

  const response = await fetch(GROQ_URL, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${apiKey}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      model: opcoes.model || GROQ_MODEL_PADRAO,
      temperature: opcoes.temperature ?? 0.3,
      messages: [
        {
          role: "system",
          content: opcoes.systemPrompt
        },
        {
          role: "user",
          content: opcoes.userContent
        }
      ]
    })
  });

  if (!response.ok) {
    const erro = await response.text();
    throw new Error(`Groq falhou (${response.status}): ${erro}`);
  }

  const bruto = await response.json();

  const texto = bruto.choices?.[0]?.message?.content;

  if (!texto) {
    throw new Error("Groq respondeu vazio.");
  }

  if (formato === "texto") {
    return { resposta: texto, raciocinio: null, bruto };
  }

  let resposta;

  try {

    resposta = JSON.parse(
      texto
        .replace(/```json/g, "")
        .replace(/```/g, "")
        .trim()
    );

  } catch {

    throw new Error("Groq não retornou JSON válido.");

  }

  return {

    resposta,

    raciocinio: null,

    bruto

  };

}