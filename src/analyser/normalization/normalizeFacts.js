/**
 * analyser/normalization/normalizeFacts.js
 * Camada 2 do Analyser — Normalization.
 *
 * Pega o resultado bruto da Collection (uma fonte = um status +
 * payload bruto) e transforma em `structuredFacts`: uma lista plana de
 * facts atômicos, cada um com provenance, availability, conflicting e
 * timestamp — exatamente o contrato pedido. Fonte que falhou (ou
 * provider ainda não implementado) não gera fact nenhum; vira um
 * `gap`, que a Investigation usa depois pra montar Limitações/Open
 * Questions. Nada aqui é interpretado além da própria estruturação —
 * decidir o que é "sinal" é trabalho da Investigation.
 */
import { normalizarOddsEmFacts } from "./normalizers/oddsNormalizer.js";

// Um normalizer por provider da Collection. Provider sem normalizer
// aqui (porque ainda não foi implementado na Collection, ver
// src/analyser/collection/providers/*) cai automaticamente em `gaps`
// — nenhuma outra parte deste arquivo muda quando o provider real for
// integrado, só se adiciona a entrada correspondente aqui.
const NORMALIZERS = {
  oddsApi: normalizarOddsEmFacts,
};

// Diferença relativa acima da qual dois facts do mesmo `key` (mesmo
// mercado + outcome, fontes diferentes) são marcados como conflitantes.
const TOLERANCIA_RELATIVA_CONFLITO = 0.05;

/**
 * Agrupa facts por `key` e marca `conflicting`/`conflictingWith` pra
 * quem destoa da mediana do grupo. Só faz sentido comparar valores
 * numéricos do mesmo tipo de fact (por isso agrupamos por key, não
 * cross-mercado).
 */
function marcarConflitos(facts) {
  const grupos = new Map();
  for (const fact of facts) {
    if (!grupos.has(fact.key)) grupos.set(fact.key, []);
    grupos.get(fact.key).push(fact);
  }

  for (const grupo of grupos.values()) {
    if (grupo.length < 2) continue;

    const valores = grupo.map((f) => f.value).slice().sort((a, b) => a - b);
    const mediana = valores[Math.floor(valores.length / 2)];

    for (const fact of grupo) {
      const desvioRelativo = mediana !== 0 ? Math.abs(fact.value - mediana) / Math.abs(mediana) : 0;

      if (desvioRelativo > TOLERANCIA_RELATIVA_CONFLITO) {
        fact.conflicting = true;
        fact.conflictingWith = grupo
          .filter((outro) => {
            if (outro === fact) return false;
            const desvioOutro = mediana !== 0 ? Math.abs(outro.value - mediana) / Math.abs(mediana) : 0;
            return desvioOutro <= TOLERANCIA_RELATIVA_CONFLITO;
          })
          .map((outro) => outro.provenance);
      }
    }
  }
}

/**
 * @param {object} collectionResult - saída de collectMatchData.js
 * @returns {{
 *   matchInput: object,
 *   normalizedAt: string,
 *   structuredFacts: object[],
 *   gaps: Array<{ provider: string, reason: string }>
 * }}
 */
export function normalizeFacts(collectionResult) {
  const structuredFacts = [];
  const gaps = [];

  for (const source of collectionResult.sources) {
    if (source.status !== "ok") {
      gaps.push({ provider: source.provider, reason: source.error });
      continue;
    }

    const normalizer = NORMALIZERS[source.provider];
    if (!normalizer) {
      gaps.push({
        provider: source.provider,
        reason: `Sem normalizer implementado para o provider "${source.provider}".`,
      });
      continue;
    }

    structuredFacts.push(...normalizer(source));
  }

  marcarConflitos(structuredFacts);

  console.log(
    `[Normalization] ${structuredFacts.length} fact(s) estruturado(s), ${gaps.length} gap(s) de dados.`
  );

  return {
    matchInput: collectionResult.matchInput,
    normalizedAt: new Date().toISOString(),
    structuredFacts,
    gaps,
  };
}
