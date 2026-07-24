/**
 * core/knowledgeStore.js
 * Single Source of Truth do Cortex. Persiste todo Knowledge Package
 * antes de qualquer distribuição (comportamento fail-closed: se isso
 * falhar, o CortexEngine não distribui — ver arquitetura-cortex-definitiva.md).
 *
 * Backend: Cloudflare KV. Requer no wrangler.toml um binding chamado
 * KNOWLEDGE_KV:
 *
 *   [[kv_namespaces]]
 *   binding = "KNOWLEDGE_KV"
 *   id = "<criado via 'wrangler kv namespace create KNOWLEDGE_KV'>"
 */

const PREFIXO_CHAVE = "kp:"; // knowledge package

function chaveDe(analysisId) {
  return `${PREFIXO_CHAVE}${analysisId}`;
}

/**
 * Persiste o Knowledge Package. Idempotente — persistir o mesmo
 * analysis_id de novo sobrescreve (não duplica).
 *
 * @param {object} env - precisa de env.KNOWLEDGE_KV
 * @param {object} knowledgePackage - precisa ter analysis_id
 * @returns {{ ok: boolean, analysis_id?: string, erro?: string }}
 */
export async function persistir(env, knowledgePackage) {
  if (!env.KNOWLEDGE_KV) {
    return { ok: false, erro: "KNOWLEDGE_KV não configurado (binding ausente no wrangler.toml)." };
  }
  if (!knowledgePackage?.analysis_id) {
    return { ok: false, erro: "Knowledge Package sem analysis_id — não pode ser persistido." };
  }

  try {
    await env.KNOWLEDGE_KV.put(chaveDe(knowledgePackage.analysis_id), JSON.stringify(knowledgePackage));
    return { ok: true, analysis_id: knowledgePackage.analysis_id };
  } catch (e) {
    console.error("Falha ao persistir Knowledge Package:", e.message);
    return { ok: false, erro: e.message };
  }
}

/**
 * Recupera um Knowledge Package já persistido.
 * @returns {object|null}
 */
export async function buscar(env, analysisId) {
  if (!env.KNOWLEDGE_KV) throw new Error("KNOWLEDGE_KV não configurado.");
  const bruto = await env.KNOWLEDGE_KV.get(chaveDe(analysisId));
  return bruto ? JSON.parse(bruto) : null;
}

/**
 * Enriquece um Knowledge Package já existente com os campos de auditoria
 * pós-jogo (resultado_real, erro_classificado, ipn, feedback_metodologico).
 * NÃO cria um artefato novo — atualiza o bloco "auditoria" in-place.
 *
 * Este método pertence ao Cortex Audit Engine (fase futura, ainda não
 * implementada) — fica pronto na interface, mas sem lógica de chamada
 * automática nesta fase.
 *
 * @param {object} dadosAuditoria - { resultado_real?, erro_classificado?, ipn?, feedback_metodologico? }
 */
export async function enriquecer(env, analysisId, dadosAuditoria) {
  const pacote = await buscar(env, analysisId);
  if (!pacote) {
    return { ok: false, erro: `Knowledge Package "${analysisId}" não encontrado.` };
  }

  pacote.auditoria = { ...pacote.auditoria, ...dadosAuditoria };

  return persistir(env, pacote);
}
