/**
 * core/scanner.js
 * MODO STUB DE TESTE — devolve um MatchSnapshot fixo, sem chamar
 * nenhuma IA nem fonte externa. Objetivo: validar o pipeline completo
 * sem gastar a chamada real do Scanner (prompt v10.1 via Gemini).
 *
 * Quando quiser trocar pelo Scanner real, a assinatura é a mesma —
 * troque só o corpo da função por uma chamada ao geminiAdapter com o
 * prompt v10.1 como systemPrompt.
 *
 * @param {object} item - vindo do Radar: { home_team, away_team, sport, league }
 * @returns {Promise<object>} MatchSnapshot
 */
export async function scanner(item) {
  console.log(`[Scanner:STUB] Gerando MatchSnapshot fixo pra ${item.home_team} x ${item.away_team}`);

  return {
    partida: {
      esporte: item.sport ?? "futebol",
      competicao: item.league ?? "Liga de Teste",
      evento: `${item.home_team} x ${item.away_team}`,
      data: new Date().toISOString(),
    },
    ctx: {
      desfalques: [],
      estilo: { posse_media: 55, ppda: 10.2 },
      janela_encaixe: "estabilizado",
    },
    mercados: [
      {
        nome: "Moneyline (1X2)",
        linha: null,
        odds: { casa: 2.1, empate: 3.4, visitante: 3.2 },
        proj: { xg_casa: 1.6, xg_visitante: 1.1 },
        interf: { ppda_combinado: 10.2 },
        cond: { dias_descanso_casa: 5, dias_descanso_visitante: 4 },
        base: { n: 10, sequencia_l5: [1.2, 1.8, 1.4, 2.0, 1.6], tendencia: "ascendente" },
        vs: { ultimos_confrontos: "3V-1E-1D" },
      },
    ],
    market_intelligence: { disponivel: false },
    gate: { confianca: "alta", busca_realizada: false, metricas_ausentes: [] },
  };
}
