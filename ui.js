// ============================================================
// shared/ui.js — utilitários usados por Scanner e BetBuilder.
// Nada de lógica de negócio aqui, só UI/infra genérica.
// ============================================================

// Navegação entre as abas de topo (Scanner / BetBuilder / Configurações).
export function initAppTabs() {
    const tabs = [
        { id: "scanner", label: "Scanner", icon: "fa-satellite-dish" },
        { id: "betbuilder", label: "BetBuilder", icon: "fa-bolt" },
        { id: "config", label: "Configurações", icon: "fa-gear" },
    ];

    const container = document.getElementById("app-tabs");
    if (!container) return; // Proteção caso o DOM não esteja pronto

    container.innerHTML = tabs.map(t => `
        <button onclick="window.__selecionarAppTab('${t.id}')" id="apptab-${t.id}"
            class="app-tab py-3 rounded-xl border text-sm font-semibold flex flex-col items-center gap-1 transition-all">
            <i class="fa-solid ${t.icon}"></i>
            <span>${t.label}</span>
        </button>
    `).join("");

    window.__selecionarAppTab = (id) => {
        tabs.forEach(t => {
            const view = document.getElementById(`view-${t.id}`);
            if (view) view.classList.add("hidden");
            
            const btn = document.getElementById(`apptab-${t.id}`);
            if (btn) {
                btn.classList.remove("bg-accent/15", "text-accent", "border-accent/40");
                btn.classList.add("bg-base-panel", "text-slate-400", "border-base-border");
            }
        });
        
        const activeView = document.getElementById(`view-${id}`);
        if (activeView) activeView.classList.remove("hidden");
        
        const activeBtn = document.getElementById(`apptab-${id}`);
        if (activeBtn) {
            activeBtn.classList.remove("bg-base-panel", "text-slate-400", "border-base-border");
            activeBtn.classList.add("bg-accent/15", "text-accent", "border-accent/40");
        }
    };

    // Aba inicial
    window.__selecionarAppTab("scanner");
}

// Card de erro padrão (vermelho) — usado pelos dois módulos.
export function alertaErro(msg) {
    return `<div class="bg-red-950/40 border border-red-900 text-red-300 text-sm p-4 rounded-xl">⚠️ ${msg}</div>`;
}

// Card de aviso padrão (âmbar) — usado pelos dois módulos.
export function alertaAviso(titulo, corpoHtml) {
    return `
        <div class="bg-amber-950/30 border border-amber-800/40 text-amber-300 text-sm p-4 rounded-xl space-y-2">
            <p class="font-bold">⚠️ ${titulo}</p>
            ${corpoHtml}
        </div>`;
}

// Copia texto pra área de transferência, com feedback visual no botão.
export async function copiarTexto(texto, botaoEl) {
    try {
        await navigator.clipboard.writeText(texto);
        if (botaoEl) {
            const original = botaoEl.innerHTML;
            botaoEl.innerHTML = `<i class="fa-solid fa-check"></i> Copiado!`;
            setTimeout(() => { botaoEl.innerHTML = original; }, 1500);
        }
    } catch (err) {
        console.error("Erro ao copiar:", err);
        alert("Não consegui copiar automaticamente. Selecione o texto manualmente.");
    }
}

// Baixa um objeto como arquivo .json.
export function baixarJSON(nomeArquivo, dadosObj) {
    const blob = new Blob([JSON.stringify(dadosObj, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = nomeArquivo.endsWith(".json") ? nomeArquivo : `${nomeArquivo}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}
