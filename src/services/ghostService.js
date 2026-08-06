/**
 * ghostService.js
 * Publica o Prognóstico do Nexus como post no Ghost, via Admin API.
 *
 * Requer no Worker (wrangler secret put ...):
 *   GHOST_ADMIN_API_KEY   (formato "id:secret", do painel Integrations do Ghost)
 *   GHOST_API_URL         (ex: "https://seublog.ghost.io", sem barra no final)
 *
 * JWT gerado nativamente com Web Crypto (crypto.subtle) — sem depender
 * de nenhuma lib externa tipo "jsonwebtoken", que exigiria bundling.
 */

function base64UrlEncode(bytes) {
  let binary = "";
  for (const b of bytes) binary += String.fromCharCode(b);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function base64UrlEncodeString(str) {
  return base64UrlEncode(new TextEncoder().encode(str));
}

function hexParaBytes(hex) {
  const bytes = hex.match(/.{1,2}/g);
  if (!bytes) throw new Error("Secret do Ghost não parece estar em formato hexadecimal.");
  return new Uint8Array(bytes.map((b) => parseInt(b, 16)));
}

/**
 * Gera o JWT de curta duração (máx. 5 min, exigência do Ghost) pra
 * autenticar na Admin API. Erro mais comum: usar a secret como string
 * crua em vez de decodificar de hex antes de assinar — por isso o
 * `hexParaBytes` explícito abaixo.
 */
async function gerarTokenGhost(adminApiKey) {
  const [id, secret] = adminApiKey.split(":");
  if (!id || !secret) {
    throw new Error("GHOST_ADMIN_API_KEY inválida — formato esperado: 'id:secret'.");
  }

  const header = { alg: "HS256", typ: "JWT", kid: id };
  const agora = Math.floor(Date.now() / 1000);
  const payload = { iat: agora, exp: agora + 5 * 60, aud: "/admin/" };

  const headerB64 = base64UrlEncodeString(JSON.stringify(header));
  const payloadB64 = base64UrlEncodeString(JSON.stringify(payload));
  const dadosAssinar = `${headerB64}.${payloadB64}`;

  const chave = await crypto.subtle.importKey(
    "raw",
    hexParaBytes(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );

  const assinatura = await crypto.subtle.sign("HMAC", chave, new TextEncoder().encode(dadosAssinar));
  const assinaturaB64 = base64UrlEncode(new Uint8Array(assinatura));

  return `${dadosAssinar}.${assinaturaB64}`;
}

/**
 * Publica (ou salva como rascunho) um artigo no Ghost.
 *
 * @param {object} env - env do Worker
 * @param {object} artigo
 * @param {string} artigo.titulo
 * @param {string} artigo.html - conteúdo já em HTML (o Nexus formata antes de chamar isso)
 * @param {"draft"|"published"} [artigo.status] - default "draft"
 * @param {string[]} [artigo.tags]
 */
export async function publicarNoGhost(env, artigo) {
  const adminApiKey = env.GHOST_ADMIN_API_KEY;
  const apiUrl = env.GHOST_API_URL;

  if (!adminApiKey || !apiUrl) {
    console.error("Ghost não configurado (GHOST_ADMIN_API_KEY / GHOST_API_URL ausentes).");
    return { ok: false, erro: "Ghost não configurado." };
  }

  try {
    const token = await gerarTokenGhost(adminApiKey);

    const post = {
      title: artigo.titulo,
      status: artigo.status ?? "draft",
      tags: (artigo.tags ?? []).map((name) => ({ name })),
      html: artigo.html,
    };

    // `?source=html` faz o Ghost converter o HTML pro formato interno dele
    // (mobiledoc/lexical) automaticamente — evita ter que montar isso na mão.
    // Verifique contra a versão do seu Ghost se o endpoint mudar de nome
    // (Ghost já teve breaking changes de API entre v3/v4/v5).
    const response = await fetch(`${apiUrl}/ghost/api/admin/posts/?source=html`, {
      method: "POST",
      headers: {
        Authorization: `Ghost ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ posts: [post] }),
    });

    const data = await response.json();

    if (!response.ok) {
      const msg = data.errors?.[0]?.message || `HTTP ${response.status}`;
      console.error("Ghost recusou a publicação:", msg);
      return { ok: false, erro: msg };
    }

    return { ok: true, post: data.posts?.[0] };
  } catch (e) {
    console.error("Falha ao publicar no Ghost:", e.message);
    return { ok: false, erro: e.message };
  }
}
