// ============================================================
// betbuilder/betbuilder.js — módulo independente. Lógica IDÊNTICA
// à versão anterior do index.html único, só reorganizada em
// módulo. Nenhuma regra de negócio foi alterada aqui.
// ============================================================
import { alertaErro, alertaAviso } from "../shared/ui.js";

// ============================================================
// 1. CONFIG — cada esporte define seus mercados de interesse.
//    O Groq usa essa lista pra saber o que analisar e não sair
//    do escopo.
// ============================================================
const MODULES = {
    beisebol: {
        label: "Beisebol",
        icon: "fa-baseball",
        mercados: ["Runs (Total)", "Moneyline", "Handicap (Run Line)", "Strikeouts", "Outs Registrados", "Hits"],
        parametros: "WHIP do pitcher, OPS do ataque adversário, média de strikeouts por jogo, soma de ERA do titular + bullpen (últimas 10 partidas), histórico recente de outs/hits permitidos",
        margensSeguranca: {
            "Moneyline": { valor: 5, unidade: "% de probabilidade implícita", comparacao: "probabilidade implícita das odds vs. probabilidade real projetada" },
        },
        requisitosMinimos: [
            { label: "ERA ou WHIP do Starting Pitcher", palavrasChave: ["era", "whip"] },
            // K% temporariamente removido do bloqueio — confirmar se o Scanner/MDM
            // realmente coleta esse dado antes de reativar como requisito obrigatório.
        ],
    },
    futebol: {
        label: "Futebol",
        icon: "fa-futbol",
        mercados: ["Gols (Over/Under)", "Moneyline (1X2)", "Handicap Asiático", "Half Time / Full Time", "Escanteios", "Chutes a Gol", "Cartões"],
        parametros: "xG (gols esperados) de cada time, xG no primeiro tempo, média de escanteios e cartões por jogo, posse de bola",
        margensSeguranca: {
            "Handicap Asiático": { valor: 0.25, unidade: "gols de diferença vs. xG esperado", comparacao: "linha do handicap vs. diferença de xG projetada entre os times" },
            "Gols (Over/Under)": { valor: 0.40, unidade: "gols vs. média de xG total", comparacao: "linha de gols vs. soma do xG projetado dos dois times" },
        },
        requisitosMinimos: [
            { label: "Forma recente (últimas 5 partidas)", palavrasChave: ["forma_recente", "forma recente", "últimos 5", "ultimas 5", "últimas 5"] },
            { label: "Confrontos diretos (H2H)", palavrasChave: ["h2h", "confronto direto", "confrontos diretos"] },
        ],
    },
    basquete: {
        label: "Basquete",
        icon: "fa-basketball",
        mercados: ["Moneyline", "Handicap (Spread)", "Totais (Over/Under)", "Estatísticas Individuais", "Pontos", "Rebotes", "Assistências"],
        parametros: "Pace (ritmo de jogo), eficiência ofensiva/defensiva combinada, médias individuais de pontos/rebotes/assistências dos jogadores-chave",
        margensSeguranca: {
            "Moneyline": { valor: 5, unidade: "pontos de Edge (diferença entre sua projeção de placar e a linha implícita do moneyline)", comparacao: "edge em pontos entre a projeção do sistema e o que o moneyline implica" },
            "Handicap (Spread)": { valor: 2.5, unidade: "pontos (devido à volatilidade)", comparacao: "linha do spread vs. diferença de pontos projetada" },
            "Totais (Over/Under)": { valor: 3.5, unidade: "pontos de discrepância", comparacao: "linha de totais vs. total de pontos projetado" },
        },
        requisitosMinimos: [
            { label: "Média de pontos (últimos 10 jogos)", palavrasChave: ["pontos_por_jogo", "pontos por jogo", "ppg"] },
            { label: "Net Rating ou estatística de eficiência", palavrasChave: ["net_rating", "net rating", "offensive_rating", "defensive_rating", "eficiencia", "eficiência"] },
        ],
    },
};

// ============================================================
// PROTOCOLO DE VALIDAÇÃO DE DADOS — checagem determinística em
// código, roda ANTES de chamar o Groq. Bloqueia de fato a
// análise se faltar algum dado mínimo, e mostra isso na tela
// (não só no console).
// ============================================================
function validarDadosMinimos(dadosOdds, modulo) {
    const requisitos = modulo.requisitosMinimos || [];
    const textoBusca = JSON.stringify(dadosOdds).toLowerCase();
    const faltando = requisitos
        .filter(req => !req.palavrasChave.some(p => textoBusca.includes(p.toLowerCase())))
        .map(req => req.label);
    return { ok: faltando.length === 0, faltando };
}

// Checagem rápida: sem rastro nenhum de odds/linha, é bem provável que só o
// Dossiê (MIE) foi colado, sem o MDM — sem isso não dá pra calcular nada.
function temIndicioDeMDM(dadosOdds) {
    const texto = JSON.stringify(dadosOdds).toLowerCase();
    return ["market_data", "\"odds", "\"line", "\"linha", "mdm", "odds_home", "odds_casa"].some(p => texto.includes(p));
}

let sportAtivo = "beisebol";

function buildSportTabs() {
    const container = document.getElementById("sport-tabs");
    container.innerHTML = Object.entries(MODULES).map(([id, m]) => `
        <button onclick="window.__selecionarSport('${id}')" id="sporttab-${id}"
            class="sport-tab py-3 rounded-xl border text-sm font-semibold flex flex-col items-center gap-1 transition-all">
            <i class="fa-solid ${m.icon}"></i>
            <span>${m.label}</span>
        </button>
    `).join("");
}

function selecionarSport(id) {
    sportAtivo = id;
    document.querySelectorAll(".sport-tab").forEach(btn => {
        btn.classList.remove("bg-accent/15", "text-accent", "border-accent/40");
        btn.classList.add("bg-base-panel", "text-slate-400", "border-base-border");
    });
    const activeBtn = document.getElementById("sporttab-" + id);
    activeBtn.classList.remove("bg-base-panel", "text-slate-400", "border-base-border");
    activeBtn.classList.add("bg-accent/15", "text-accent", "border-accent/40");
}

// ============================================================
// 2. PROMPT — instrui o Groq a comparar os dados colados com os
//    parâmetros treinados e devolver o bilhete estruturado.
// ============================================================
function montarSystemPrompt(modulo) {
    const margens = modulo.margensSeguranca || {};
    const mercadosComPiso = Object.keys(margens);
    const mercadosSemPiso = modulo.mercados.filter(m => !mercadosComPiso.includes(m));

    const listaPisos = mercadosComPiso.map(m => {
        const r = margens[m];
        return `- ${m}: mín. ${r.valor} ${r.unidade} (${r.comparacao})`;
    }).join("\n");

    const listaSemPiso = mercadosSemPiso.length
        ? `Sem piso definido ainda: ${mercadosSemPiso.join(", ")} — reporte margem_minima_exigida: null, não invente piso.`
        : "";

    return `Bet Builder: Motor de Decisão Quantitativa de ${modulo.label}. Você NÃO investiga, NÃO interpreta notícia, NÃO gera hipótese — isso já vem pronto no Dossiê Investigativo (produzido pelo MIE). Sua função é só: calcular projeção, probabilidade, EV, margem, robustez e ranquear.

ENTRADA: você recebe o MDM (dados quantitativos/odds — sempre presente) e, OPCIONALMENTE, o Dossiê Investigativo do MIE, organizado por mercado (ex: "markets.moneyline", "markets.total_runs"), cada um com evidences, conflicts, limitations, open_questions, public_attention e hypothesis (com supporting_evidence_ids/contradicting_evidence_ids). Se o Dossiê não vier, analise só com o MDM normalmente — não é obrigatório e não é erro a ausência dele. Os nomes de mercado do dossiê podem vir em formato diferente do nosso (ex: "moneyline" ou "total_runs") — associe pelo SIGNIFICADO ao mercado correspondente da nossa lista, não exija string idêntica.

REGRA CRÍTICA DE SEPARAÇÃO: margem_calculada, probabilidade_estimada e expected_value SÓ podem vir de números presentes no MDM. É PROIBIDO transformar hypothesis.statement, public_attention ou qualquer narrativa do Dossiê diretamente em número de probabilidade ou EV — isso seria inventar dado. O Dossiê só pode influenciar robustez_score e o texto do motivo_estatistico, nunca os números centrais do cálculo.

CONFLITO MDM x DOSSIÊ: se o Dossiê sugerir algo que pareça contradizer o que os números do MDM indicam, NÃO escolha um lado. Registre o conflito no motivo_estatistico (cite o id se houver) e reduza robustez_score refletindo a incerteza — mas continue calculando margem/probabilidade só a partir do MDM.

DADO AUSENTE: se algum parâmetro (ex: K%) não estiver no MDM, trate como limitação — calcule com o que houver disponível, não invente o valor, e não exija que o Dossiê supra essa lacuna.

MERCADOS (só estes): ${modulo.mercados.join(", ")}
PARÂMETROS QUANTITATIVOS: ${modulo.parametros}

PISOS DE MARGEM (obrigatório calcular contra estes valores):
${listaPisos}
${listaSemPiso}

HIERARQUIA DE PESO (nunca inverta): 1) números do MDM — únicos que definem margem_calculada/probabilidade_estimada/expected_value; 2) evidence_ledger e investigation_cards do Dossiê — só ajustam robustez_score, dentro de ±15 pontos; 3) narrativa pública/mídia do Dossiê — puramente informativo, nunca move nenhum número.

REGRAS:
1. Procure linha/odds no MDM, mesmo em texto livre.
2. Encaixe: só use linha que exista de fato no MDM (múltiplas linhas ofertadas). Nunca invente linha que a casa não oferece.
3. ZONA DE VALOR: projeção ≈ linha = valor baixo real, mesmo com EV levemente positivo — reprove com justificativa, não force encaixe.
4. ANTI-FABRICAÇÃO: proibido inventar ajuste hipotético sem número concreto no MDM. Se a projeção direta não bate o piso, reprove.
5. CONFLITO: se o dossiê daquele mercado tiver "conflicts" (evidências que se contradizem), cite o id do conflito no motivo e reduza robustez proporcionalmente — mas não descarte só por causa disso se o número do MDM ainda for sólido.
6. ROBUSTEZ (0-100): baseie em hypothesis.supporting_evidence_ids (mais evidência de apoio = maior robustez) menos hypothesis.contradicting_evidence_ids e conflicts daquele mercado. Muitas "limitations"/"open_questions" no dossiê indicam incerteza — reduza robustez proporcionalmente. Sem dossiê pra aquele mercado, calcule robustez só com o MDM.
7. EV = (probabilidade_estimada/100 × odd_decimal) - 1. Sem odd decimal, expected_value: null. EV é um componente, nunca o juiz único.
8. Verifique conflito lógico entre picks (ex: Over de um time + Under do total); se houver, priorize maior robustez_score e explique em resumo_tecnico.
9. linha_final SEMPRE com nome real do time/jogador do MDM — nunca "casa"/"visitante"/"Time A"/"home". Mercados sem lado (Totais/Runs): "Over 8.5" basta.
10. Reporte TODOS os mercados em analise_completa, sem pular nenhum. JSON puro, sem markdown, sem "confianca"/"motivo" soltos.
11. CONCISÃO: motivo_estatistico entre 100-150 caracteres — cite o número-chave do MDM e, se usou, o ID da evidência do Dossiê (ex: "E3"). Não repita números já nos outros campos. resumo_tecnico: no máximo 2 frases curtas.
12. AUDITABILIDADE: qualquer menção ao dossiê no motivo_estatistico precisa citar o id exato (ex: "E3", "C1") tirado de evidences/conflicts daquele mercado — nunca parafrasear hypothesis.statement ou public_attention sem referência rastreável.

FORMATO:
{"resumo_tecnico":"string","analise_completa":[{"mercado":"","linha_original":"","linha_final":"","ajuste_aplicado":bool,"linha_mercado_usada":"","probabilidade_estimada":num,"expected_value":num|null,"robustez_score":num,"margem_calculada":num,"margem_minima_exigida":num|null,"unidade":"","atinge_piso":bool,"motivo_estatistico":""}]}

Trate tudo como probabilidade, nunca garanta resultado.`;
}

// ============================================================
// 3. CHAMADA AO GROQ
// ============================================================
async function analisarComGroq() {
    const apiKey = document.getElementById("groq-key").value.trim();
    const raw = document.getElementById("json-input").value.trim();
    const btn = document.getElementById("analisar-btn");
    const display = document.getElementById("display-area");

    if (!apiKey) {
        display.innerHTML = alertaErro("Cole sua Groq API Key na seção de configuração acima primeiro.");
        return;
    }
    if (!raw) {
        display.innerHTML = alertaErro("Cole o JSON de odds antes de analisar.");
        return;
    }

    let dadosOdds;
    try {
        dadosOdds = JSON.parse(raw);
    } catch (e) {
        display.innerHTML = alertaErro("O JSON colado está com formato inválido. Confira se copiou tudo certinho.");
        return;
    }

    const modulo = MODULES[sportAtivo];

    // Checagem de esporte incompatível: se o JSON colado informa um esporte
    // diferente da aba selecionada, avisa antes de gastar uma chamada de API.
    if (dadosOdds.esporte && dadosOdds.esporte.toLowerCase() !== sportAtivo.toLowerCase()) {
        display.innerHTML = alertaErro(
            `O JSON colado é de "${dadosOdds.esporte}", mas a aba selecionada é "${modulo.label}". Troque a aba pro esporte certo antes de analisar.`
        );
        return;
    }

    if (!temIndicioDeMDM(dadosOdds)) {
        display.innerHTML = alertaAviso(
            "PARECE QUE FALTA O MDM",
            `<p class="text-xs">Não encontrei nenhuma odd/linha no JSON colado — isso costuma acontecer quando só o Dossiê (MIE) é colado, sem o MDM junto. Sem odds/linhas não dá pra calcular margem nem EV de nenhum mercado.</p>
             <p class="text-[11px] text-amber-500/60 pt-1">Cola os dois juntos, ex: { "mdm": {...}, "dossie": {...} }.</p>`
        );
        return;
    }

    const validacaoDados = validarDadosMinimos(dadosOdds, modulo);
    if (!validacaoDados.ok) {
        display.innerHTML = alertaAviso(
            "DADOS INSUFICIENTES — AGUARDANDO MAIS INFORMAÇÕES",
            `<p class="text-xs text-amber-400/80">Faltando no JSON colado:</p>
             <ul class="text-xs list-disc list-inside space-y-1">${validacaoDados.faltando.map(f => `<li>${f}</li>`).join("")}</ul>
             <p class="text-[11px] text-amber-500/60 pt-1">Não chamei o Groq — sem esses dados a análise sairia sem base estatística suficiente.</p>`
        );
        return;
    }

    btn.disabled = true;
    btn.innerHTML = `<i class="fa-solid fa-spinner fa-spin"></i> Analisando com Groq...`;
    display.innerHTML = `<p class="text-slate-500 text-sm text-center py-4">Consultando o Groq...</p>`;

    try {
        const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${apiKey}`,
            },
            body: JSON.stringify({
                model: "qwen/qwen3.6-27b",
                temperature: 0.1,
                max_tokens: 4096,
                reasoning_effort: "none",
                messages: [
                    { role: "system", content: montarSystemPrompt(modulo) },
                    { role: "user", content: JSON.stringify(dadosOdds) },
                ],
                response_format: { type: "json_object" },
            }),
        });

        if (!response.ok) {
            const errText = await response.text();
            throw new Error(`HTTP ${response.status}: ${errText.slice(0, 200)}`);
        }

        const data = await response.json();
        const conteudo = data.choices?.[0]?.message?.content;
        if (!conteudo) throw new Error("Resposta do Groq veio vazia.");

        const parsed = JSON.parse(conteudo.replace(/```json|```/g, "").trim());
        renderizarBilhete(parsed, modulo);
    } catch (err) {
        console.error("Erro na análise Groq:", err);
        display.innerHTML = alertaErro(`Não consegui completar a análise. ${err.message}`);
    } finally {
        btn.disabled = false;
        btn.innerHTML = `<i class="fa-solid fa-bolt"></i> Analisar com Groq`;
    }
}

// ============================================================
// 4. CÁLCULO DE CONFIABILIDADE — 3 níveis (alta/média/baixa),
//    calculados no código a partir da margem e da probabilidade.
//    Isso substitui o corte binário rígido de antes: em vez de
//    "passa/não passa", tudo aparece, só que classificado.
// ============================================================
function calcularConfiabilidade(item, modulo) {
    const piso = (modulo.margensSeguranca || {})[item.mercado];
    const prob = Number(item.probabilidade_estimada);
    const margem = Number(item.margem_calculada);
    const temProb = !isNaN(prob);
    const temMargem = !isNaN(margem);

    // Sem piso definido pro mercado: confiança baseada só na probabilidade
    if (!piso) {
        if (!temProb) return { tier: "indefinida", label: "SEM DADO SUFICIENTE" };
        if (prob >= 65) return { tier: "alta", label: "ALTA CONFIABILIDADE" };
        if (prob >= 55) return { tier: "media", label: "MÉDIA CONFIABILIDADE" };
        if (prob >= 45) return { tier: "baixa", label: "BAIXA CONFIABILIDADE" };
        return { tier: "descartada", label: "SEM VALOR ESTATÍSTICO" };
    }

    if (!temMargem) return { tier: "indefinida", label: "MARGEM NÃO INFORMADA" };

    const razao = margem / piso.valor; // quanto da margem mínima foi atingido (1.0 = bateu o piso exato)
    const probOk65 = temProb && prob >= 65;
    const probOk55 = temProb && prob >= 55;

    if (razao >= 1.3 && probOk65) return { tier: "alta", label: "ALTA CONFIABILIDADE" };
    if (razao >= 1.0 && probOk55) return { tier: "alta", label: "ALTA CONFIABILIDADE" };
    if (razao >= 1.0) return { tier: "media", label: "MÉDIA CONFIABILIDADE" };
    if (razao >= 0.6 && probOk55) return { tier: "media", label: "MÉDIA CONFIABILIDADE" };
    if (razao >= 0.4) return { tier: "baixa", label: "BAIXA CONFIABILIDADE" };
    return { tier: "descartada", label: "SEM VALOR ESTATÍSTICO" };
}

const CONFIABILIDADE_STYLE = {
    alta: { bg: "bg-conf-alta/15", text: "text-conf-alta", border: "border-conf-alta/30" },
    media: { bg: "bg-conf-media/15", text: "text-conf-media", border: "border-conf-media/30" },
    baixa: { bg: "bg-orange-500/15", text: "text-orange-400", border: "border-orange-500/30" },
    descartada: { bg: "bg-conf-baixa/15", text: "text-conf-baixa", border: "border-conf-baixa/30" },
    indefinida: { bg: "bg-slate-700/20", text: "text-slate-400", border: "border-slate-700/40" },
};

function cardMercado(item, modulo) {
    const confiab = calcularConfiabilidade(item, modulo);
    const v = CONFIABILIDADE_STYLE[confiab.tier];
    const margemTxt = item.margem_calculada !== undefined && item.margem_calculada !== null
        ? `${item.margem_calculada} ${item.unidade || ""}`.trim()
        : "não informada";
    const pisoTxt = item.margem_minima_exigida !== null && item.margem_minima_exigida !== undefined
        ? `mínimo exigido: ${item.margem_minima_exigida} ${item.unidade || ""}`.trim()
        : "sem piso definido";
    const direcao = item.linha_final || item.direcao_sugerida || item.direcao || "";
    const motivo = item.motivo_estatistico || item.motivo || "";
    const prob = item.probabilidade_estimada !== undefined ? `${item.probabilidade_estimada}%` : "não informada";
    const evTxt = item.expected_value !== undefined && item.expected_value !== null ? `EV: ${(item.expected_value * 100).toFixed(1)}%` : null;
    const robustezTxt = item.robustez_score !== undefined && item.robustez_score !== null ? `Robustez: ${item.robustez_score}/100` : null;
    return `
        <div class="p-4 bg-base-card rounded-xl border ${v.border}">
            <div class="flex justify-between items-start gap-2">
                <span class="font-bold text-white text-sm">${item.mercado}</span>
                <span class="text-[10px] font-bold px-2 py-1 rounded-lg ${v.bg} ${v.text} shrink-0">${confiab.label}</span>
            </div>
            <div class="text-accent font-black text-lg mt-1">${direcao}</div>
            ${item.ajuste_aplicado ? `<div class="text-[11px] text-conf-media mt-1">⚙️ Encaixe forçado: linha original era "${item.linha_original}"</div>` : ""}
            <div class="text-xs text-slate-400 mt-1.5">Margem calculada: <span class="font-semibold text-slate-300">${margemTxt}</span> <span class="text-slate-600">(${pisoTxt})</span></div>
            <div class="text-xs text-slate-400">Probabilidade estimada: <span class="font-semibold text-slate-300">${prob}</span></div>
            ${(evTxt || robustezTxt) ? `<div class="text-xs text-slate-400">${[evTxt, robustezTxt].filter(Boolean).join(" · ")}</div>` : ""}
            ${item.linha_mercado_usada ? `<div class="text-[11px] text-slate-600 mt-1">Linha usada: ${item.linha_mercado_usada}</div>` : ""}
            <div class="text-xs text-slate-500 mt-1.5 leading-relaxed">${motivo}</div>
        </div>`;
}

// ============================================================
// 5. RENDERIZAÇÃO DO BILHETE + ANÁLISE COMPLETA (transparência)
// ============================================================
const ORDEM_TIER = { alta: 0, media: 1, baixa: 2, descartada: 3, indefinida: 4 };

function renderizarBilhete(data, modulo) {
    const display = document.getElementById("display-area");
    const analiseCompleta = data.analise_completa || [];

    // O bilhete final é montado aqui, no código — não depende do Groq decidir
    // sozinho o que "vale a pena". Tudo que não for "descartada" ou "indefinida"
    // aparece no bilhete, ordenado da confiabilidade mais alta pra mais baixa.
    const comConfiabilidade = analiseCompleta.map(item => ({ item, confiab: calcularConfiabilidade(item, modulo) }));
    const bilhete = comConfiabilidade
        .filter(({ confiab }) => confiab.tier === "alta" || confiab.tier === "media" || confiab.tier === "baixa")
        .sort((a, b) => ORDEM_TIER[a.confiab.tier] - ORDEM_TIER[b.confiab.tier])
        .map(({ item }) => item);

    display.innerHTML = `
        <div class="bg-base-panel border border-base-border rounded-2xl p-6 space-y-4 animate-in fade-in duration-300">
            <div class="flex items-center gap-2">
                <span class="w-6 h-6 rounded-full bg-accent/20 text-accent text-xs font-bold flex items-center justify-center">2</span>
                <h2 class="text-sm font-semibold text-slate-300">Bilhete Sugerido</h2>
            </div>

            <p class="text-sm italic text-slate-400 border-l-2 border-accent pl-3">${data.resumo_tecnico || ""}</p>

            <div class="space-y-3">
                ${bilhete.length === 0
                    ? `<p class="text-sm text-slate-500 text-center py-4">Nenhum mercado teve valor estatístico suficiente nesse jogo — veja a análise completa abaixo pra entender o porquê.</p>`
                    : bilhete.map(item => cardMercado(item, modulo)).join("")
                }
            </div>

            ${analiseCompleta.length > 0 ? `
                <details class="pt-2 border-t border-base-border">
                    <summary class="cursor-pointer text-xs font-semibold text-slate-400">Ver análise completa (${analiseCompleta.length} mercado(s) avaliados, incluindo os descartados)</summary>
                    <div class="space-y-3 mt-3">
                        ${analiseCompleta.map(item => cardMercado(item, modulo)).join("")}
                    </div>
                </details>
            ` : ""}

            <p class="text-[10px] text-slate-600 pt-2 border-t border-base-border">Isso é apoio à análise baseado em dados, não garantia de resultado.</p>
        </div>
    `;
}

// ============================================================
// MARKUP + INIT — monta a UI do BetBuilder dentro de #view-betbuilder
// ============================================================
function buildBetBuilderMarkup() {
    const container = document.getElementById("view-betbuilder");
    container.innerHTML = `
        <div class="space-y-6">
            <div id="sport-tabs" class="grid grid-cols-3 gap-2"></div>

            <details class="bg-base-panel border border-base-border rounded-2xl p-4" open>
                <summary class="cursor-pointer text-sm font-semibold text-slate-300 flex items-center gap-2">
                    <i class="fa-solid fa-key text-accent"></i> Configuração da API Groq
                </summary>
                <div class="mt-4 space-y-2">
                    <label class="text-[10px] text-slate-500 font-bold tracking-widest">GROQ API KEY (só fica na memória do navegador, nunca é salva no arquivo)</label>
                    <input type="password" id="groq-key" placeholder="gsk_..." class="w-full bg-base-bg p-2.5 rounded-lg border border-base-border text-white text-sm font-mono">
                    <p class="text-[11px] text-slate-600">Como o repositório é público no GitHub, a chave NUNCA deve ficar escrita no código. Cole aqui toda vez que abrir a página — ela não é salva em lugar nenhum, nem enviada pra nenhum lugar além da API do Groq.</p>
                </div>
            </details>

            <div class="bg-base-panel border border-base-border rounded-2xl p-6 space-y-3">
                <div class="flex items-center gap-2">
                    <span class="w-6 h-6 rounded-full bg-accent/20 text-accent text-xs font-bold flex items-center justify-center">1</span>
                    <label class="text-sm font-semibold text-slate-300">Cole o JSON (MDM, ou MDM + Dossiê)</label>
                </div>
                <textarea id="json-input" class="w-full h-40 bg-base-bg p-3 rounded-lg border border-base-border font-mono text-xs text-emerald-400" placeholder='{ "mdm": {...}, "dossie": {...} }'></textarea>
                <button onclick="window.__analisarComGroq()" id="analisar-btn" class="w-full py-3.5 bg-accent hover:bg-accent-dim font-bold rounded-xl text-white shadow-lg shadow-accent/20 transition-all flex items-center justify-center gap-2">
                    <i class="fa-solid fa-bolt"></i> Analisar com Groq
                </button>
            </div>

            <div id="display-area"></div>
        </div>
    `;
}

// Expostos pros onclick inline do HTML acima
window.__selecionarSport = selecionarSport;
window.__analisarComGroq = analisarComGroq;

// ============================================================
// PONTE COM O SCANNER — função pública que só preenche o campo de
// entrada e seleciona o esporte certo. Não conhece nada da lógica
// interna do Scanner, só recebe o MDM já pronto.
// ============================================================
const MAPA_ESPORTE_SCANNER_PARA_BETBUILDER = { mlb: "beisebol", soccer: "futebol", nba: "basquete" };

function preencherComMDM(mdm) {
    const sportScanner = mdm?.match?.sport;
    const sportBetBuilder = MAPA_ESPORTE_SCANNER_PARA_BETBUILDER[sportScanner];
    if (sportBetBuilder && MODULES[sportBetBuilder]) {
        selecionarSport(sportBetBuilder);
    }
    document.getElementById("json-input").value = JSON.stringify(mdm, null, 2);
    document.getElementById("display-area").innerHTML = "";
}
window.__preencherBetBuilder = preencherComMDM;

export function initBetBuilder() {
    buildBetBuilderMarkup();
    buildSportTabs();
    selecionarSport("beisebol");
}
