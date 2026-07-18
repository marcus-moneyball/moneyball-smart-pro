// ============================================================
// scanner/scanner.js — busca manual de UMA partida específica,
// via o novo endpoint /match do Worker:
//
//   GET {SCANNER_BASE_URL}/match?sport=..&league=..&home_team=..&away_team=..&date=..
//
// Substitui o antigo modo de varredura automática (que ainda existe
// no Worker em /scanner?tenant=, só não é mais usado por aqui).
// ============================================================
import { alertaErro, alertaAviso, copiarTexto, baixarJSON } from "/moneyball-smart-pro/shared/ui.js";
const SCANNER_BASE_URL = "https://moneyball-scanner.marcusvalves7.workers.dev";

// Ligas configuradas no Worker (config/leagues.json) — mantenha isso em
// sincronia se adicionar/remover ligas do lado do Worker.
const LIGAS_POR_ESPORTE = {
    mlb: [{ id: "mlb_main", label: "MLB" }],
    nba: [{ id: "nba_main", label: "NBA" }],
    soccer: [
        { id: "brazil_serie_a", label: "Brasileirão" },
        { id: "england_premier", label: "Premier League" },
        { id: "champions", label: "Champions League" },
    ],
};

const ESPORTES = [
    { id: "mlb", label: "Beisebol (MLB)", icon: "fa-baseball" },
    { id: "soccer", label: "Futebol", icon: "fa-futbol" },
    { id: "nba", label: "Basquete (NBA)", icon: "fa-basketball" },
];

let ultimoMDM = null;

function buildScannerForm() {
    const container = document.getElementById("view-scanner");
    container.innerHTML = `
        <div class="bg-base-panel border border-base-border rounded-2xl p-6 space-y-4">
            <h2 class="text-sm font-semibold text-slate-300">1. Buscar a partida</h2>

            <div class="space-y-1">
                <label class="text-[10px] text-slate-500 font-bold tracking-widest">ESPORTE</label>
                <select id="scanner-esporte" class="w-full bg-base-bg p-2.5 rounded-lg border border-base-border text-white text-sm">
                    ${ESPORTES.map(e => `<option value="${e.id}">${e.label}</option>`).join("")}
                </select>
            </div>

            <div class="space-y-1">
                <label class="text-[10px] text-slate-500 font-bold tracking-widest">LIGA</label>
                <select id="scanner-liga" class="w-full bg-base-bg p-2.5 rounded-lg border border-base-border text-white text-sm"></select>
            </div>

            <div class="grid grid-cols-2 gap-3">
                <div class="space-y-1">
                    <label class="text-[10px] text-slate-500 font-bold tracking-widest">TIME CASA</label>
                    <input type="text" id="scanner-home" placeholder="Ex: NY Mets" class="w-full bg-base-bg p-2.5 rounded-lg border border-base-border text-white text-sm">
                </div>
                <div class="space-y-1">
                    <label class="text-[10px] text-slate-500 font-bold tracking-widest">TIME VISITANTE</label>
                    <input type="text" id="scanner-away" placeholder="Ex: Philadelphia Phillies" class="w-full bg-base-bg p-2.5 rounded-lg border border-base-border text-white text-sm">
                </div>
            </div>

            <div class="space-y-1">
                <label class="text-[10px] text-slate-500 font-bold tracking-widest">DATA DO JOGO (OPCIONAL — só ajuda a desempatar se houver mais de 1 jogo entre os mesmos times)</label>
                <input type="date" id="scanner-date" class="w-full bg-base-bg p-2.5 rounded-lg border border-base-border text-white text-sm">
            </div>

            <button onclick="window.__buscarPartida()" id="scanner-btn"
                class="w-full py-3.5 bg-accent hover:bg-accent-dim font-bold rounded-xl text-white shadow-lg shadow-accent/20 transition-all flex items-center justify-center gap-2">
                <i class="fa-solid fa-satellite-dish"></i> Buscar Partida
            </button>
        </div>

        <div id="scanner-output" class="mt-4"></div>
    `;

    const selectEsporte = document.getElementById("scanner-esporte");
    const selectLiga = document.getElementById("scanner-liga");

    function atualizarLigas() {
        const ligas = LIGAS_POR_ESPORTE[selectEsporte.value] || [];
        selectLiga.innerHTML = ligas.map(l => `<option value="${l.id}">${l.label}</option>`).join("");
    }

    selectEsporte.addEventListener("change", atualizarLigas);
    atualizarLigas();
}

async function buscarPartida() {
    const sport = document.getElementById("scanner-esporte").value;
    const league = document.getElementById("scanner-liga").value;
    const homeTeam = document.getElementById("scanner-home").value.trim();
    const awayTeam = document.getElementById("scanner-away").value.trim();
    const date = document.getElementById("scanner-date").value; // já vem YYYY-MM-DD ou ""
    const btn = document.getElementById("scanner-btn");
    const output = document.getElementById("scanner-output");

    if (!homeTeam || !awayTeam) {
        output.innerHTML = alertaErro("Preencha os nomes dos dois times antes de buscar.");
        return;
    }

    btn.disabled = true;
    btn.innerHTML = `<i class="fa-solid fa-spinner fa-spin"></i> Buscando...`;
    output.innerHTML = `<p class="text-slate-500 text-sm text-center py-4">Consultando o Scanner...</p>`;

    const params = new URLSearchParams({ sport, league, home_team: homeTeam, away_team: awayTeam });
    if (date) params.set("date", date);

    try {
        const response = await fetch(`${SCANNER_BASE_URL}/match?${params.toString()}`);
        const data = await response.json();

        if (!response.ok) {
            throw new Error(data?.detalhe || data?.erro || `HTTP ${response.status}`);
        }

        ultimoMDM = data;
        renderizarMDM(data);
    } catch (err) {
        console.error("Erro no Scanner:", err);
        output.innerHTML = alertaErro(`Não consegui encontrar essa partida. ${err.message}`);
    } finally {
        btn.disabled = false;
        btn.innerHTML = `<i class="fa-solid fa-satellite-dish"></i> Buscar Partida`;
    }
}

function renderizarMDM(mdm) {
    const output = document.getElementById("scanner-output");
    const m = mdm.match || {};
    const jsonTexto = JSON.stringify(mdm, null, 2);

    output.innerHTML = `
        <div class="bg-base-panel border border-base-border rounded-2xl p-6 space-y-3">
            <h2 class="text-sm font-semibold text-slate-300">2. MDM encontrado</h2>
            <div class="text-sm">
                <span class="font-bold text-white">${m.home_team} vs ${m.away_team}</span>
                <span class="text-slate-500 text-xs"> · ${(m.sport || "").toUpperCase()} · Interest Score ${mdm.interest_score ?? "?"}</span>
            </div>
            <pre id="scanner-json" class="w-full max-h-80 overflow-auto bg-base-bg p-3 rounded-lg border border-base-border font-mono text-xs text-emerald-400 whitespace-pre-wrap">${jsonTexto}</pre>
            <div class="grid grid-cols-2 gap-3">
                <button id="scanner-copy-btn" class="py-2.5 bg-base-card border border-base-border rounded-xl text-sm font-semibold text-slate-300 hover:bg-white/5 transition-all flex items-center justify-center gap-2">
                    <i class="fa-solid fa-copy"></i> Copiar JSON
                </button>
                <button id="scanner-download-btn" class="py-2.5 bg-base-card border border-base-border rounded-xl text-sm font-semibold text-slate-300 hover:bg-white/5 transition-all flex items-center justify-center gap-2">
                    <i class="fa-solid fa-download"></i> Baixar JSON
                </button>
            </div>
            <button id="scanner-usar-betbuilder-btn" class="w-full py-2.5 bg-accent/15 border border-accent/30 rounded-xl text-sm font-semibold text-accent hover:bg-accent/25 transition-all flex items-center justify-center gap-2">
                <i class="fa-solid fa-arrow-right"></i> Usar no BetBuilder
            </button>
            <p class="text-[11px] text-slate-600 pt-1">Isso leva pra aba BetBuilder com o MDM já preenchido — você ainda escolhe quando clicar em "Analisar com Groq" (nada é enviado automaticamente).</p>
        </div>
    `;

    document.getElementById("scanner-copy-btn").addEventListener("click", (e) => copiarTexto(jsonTexto, e.currentTarget));
    document.getElementById("scanner-download-btn").addEventListener("click", () => baixarJSON(`mdm-${m.home_team || "partida"}.json`, mdm));
    document.getElementById("scanner-usar-betbuilder-btn").addEventListener("click", () => {
        window.__preencherBetBuilder(mdm);
        window.__selecionarAppTab("betbuilder");
    });
}

window.__buscarPartida = buscarPartida;

export function initScanner() {
    buildScannerForm();
}
