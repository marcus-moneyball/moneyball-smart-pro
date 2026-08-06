const GROQ_MODEL_PADRAO = "openai/gpt-oss-120b";

const GROQ_URL = "https://api.groq.com/openai/v1/chat/completions";

export async function chamarGroqRest(env, opcoes) {

  const apiKey = env.GROQ_API_KEY;

  if (!apiKey) {
    throw new Error("GROQ_API_KEY não configurada no Worker.");
  }

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