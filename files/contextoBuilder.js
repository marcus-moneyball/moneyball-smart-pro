/**
 * contextoBuilder.js
 *
 * Responsabilidade única: montar `contexto_interpretado` lendo SOMENTE
 * fatos que já existem em `structuredFacts`. Nunca busca dado novo,
 * nunca estima, nunca preenche com texto genérico quando o fato não
 * existe — nesse caso o campo fica "".
 *
 * `structuredFacts` é tratado como um array de fact items no formato já
 * usado no restante do Analyser: { subject, key, value, availability }.
 * Se o seu shape divergir, ajuste apenas os SUBJECT_KEYWORDS abaixo.
 *
 * Não faz: não decide se o desfalque/clima "importa" para o jogo, não
 * gera hipótese, não atribui banda de confiança — isso é análise
 * coletiva/investigação, não este builder.
 */

const SUBJECT_KEYWORDS = {
  impacto_desfalques: ["injuries", "injury", "desfalque", "lesao", "lesão", "suspension"],
  friccao_fisica_ritmo: ["fixture_congestion", "rest_days", "travel", "fadiga", "ritmo", "back_to_back"],
  clima_estadio: ["weather", "clima", "stadium", "estadio", "estádio"]
};

function factMatches(fact, keywords) {
  const haystack = `${fact?.subject ?? ""} ${fact?.key ?? ""}`.toLowerCase();
  return keywords.some((kw) => haystack.includes(kw.toLowerCase()));
}

function collectField(structuredFacts, keywords) {
  if (!Array.isArray(structuredFacts)) return "";

  const matches = structuredFacts.filter(
    (fact) => fact && fact.availability !== false && factMatches(fact, keywords)
  );

  if (matches.length === 0) return "";

  // Concatena os valores textuais disponíveis, sem interpretar ou resumir.
  return matches
    .map((fact) => (typeof fact.value === "string" ? fact.value : JSON.stringify(fact.value)))
    .filter(Boolean)
    .join("; ");
}

export function buildContext(structuredFacts) {
  return {
    impacto_desfalques: collectField(structuredFacts, SUBJECT_KEYWORDS.impacto_desfalques),
    friccao_fisica_ritmo: collectField(structuredFacts, SUBJECT_KEYWORDS.friccao_fisica_ritmo),
    clima_estadio: collectField(structuredFacts, SUBJECT_KEYWORDS.clima_estadio),
    detalhes_contexto: ""
  };
}
