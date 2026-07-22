/**
 * core/assimetriaFilter.js
 *
 * Etapa 1 (filtro barato) do Scanner de Oportunidades.
 * Puramente matemático — não chama nenhum provider de stats nem IA.
 * Objetivo: reduzir a rodada inteira só aos eventos que valem o custo
 * da Etapa 2 (getStats + Nexus).
 *
 * Método: no-vig fair odds (remove o overround de cada casa) + mediana
 * entre casas como consenso de mercado. Dois sinais compõem o piso:
 *   - edge_aparente: melhor odd disponível paga mais que o consenso sugere.
 *   - dispersao_mercado: as casas discordam muito entre si nesse outcome.
 */

// Limiares configuráveis — não hardcoded na lógica, mesmo padrão da
// tolerância do Sinal/Ruído no Nexus. Calibrar com dado real depois.
export const EDGE_MINIMO = 0.02; // 2%
export const DISPERSAO_MINIMA = 0.03; // 3 pontos percentuais

function mediana(valores) {
  const ordenado = [...valores].sort((a, b) => a - b);
  const meio = Math.floor(ordenado.length / 2);
  return ordenado.length % 2 === 0
    ? (ordenado[meio - 1] + ordenado[meio]) / 2
    : ordenado[meio];
}

function arredondar(n, casas = 4) {
  const fator = 10 ** casas;
  return Math.round(n * fator) / fator;
}

/**
 * Remove o overround de UM mercado de UMA casa, devolvendo a
 * probabilidade "justa" (fair) de cada outcome desse mercado.
 * Retorna null se a soma das probabilidades brutas for inválida.
 */
function calcularFairOddsPorCasa(market) {
  if (!market?.outcomes?.length) return null;

  const probsBrutas = market.outcomes.map((o) => ({
    name: o.name,
    prob: o.price > 0 ? 1 / o.price : 0,
  }));

  const overround = probsBrutas.reduce((soma, o) => soma + o.prob, 0);
  if (overround <= 0) return null;

  return probsBrutas.map((o) => ({ name: o.name, fair: o.prob / overround }));
}

/**
 * Agrupa as cotações de todas as casas de um evento por mercado e por
 * outcome, já com a probabilidade fair calculada por casa.
 * Retorna Map<mercado, Map<outcomeName, [{casa, price, fair}]>>
 */
function agruparPorMercadoEOutcome(event) {
  const porMercado = new Map();

  for (const bookmaker of event.bookmakers || []) {
    for (const market of bookmaker.markets || []) {
      const fairPorOutcome = calcularFairOddsPorCasa(market);
      if (!fairPorOutcome) continue;

      if (!porMercado.has(market.key)) porMercado.set(market.key, new Map());
      const porOutcome = porMercado.get(market.key);

      market.outcomes.forEach((outcome, i) => {
        if (!outcome.price || outcome.price <= 1) return; // odd inválida/ausente

        if (!porOutcome.has(outcome.name)) porOutcome.set(outcome.name, []);
        porOutcome.get(outcome.name).push({
          casa: bookmaker.key,
          price: outcome.price,
          fair: fairPorOutcome[i].fair,
        });
      });
    }
  }

  return porMercado;
}

/**
 * Filtro barato principal.
 *
 * @param {object[]} events - eventos crus do fetchEvents (The Odds API)
 * @param {object} opcoes
 * @param {string} [opcoes.league] - id/nome da liga (repassado pelo scannerEngine, não inferido aqui)
 * @param {number} [opcoes.edgeMinimo] - override do piso de edge_aparente
 * @param {number} [opcoes.dispersaoMinima] - override do piso de dispersao_mercado
 * @returns {object[]} AssimetriaSignal[] — só os outcomes que sobreviveram ao piso
 */
export function assimetriaFilter(events, opcoes = {}) {
  const edgeMinimo = opcoes.edgeMinimo ?? EDGE_MINIMO;
  const dispersaoMinima = opcoes.dispersaoMinima ?? DISPERSAO_MINIMA;
  const league = opcoes.league ?? null;

  const sinais = [];

  for (const event of events) {
    const porMercado = agruparPorMercadoEOutcome(event);

    for (const [mercado, porOutcome] of porMercado.entries()) {
      for (const [outcome, cotacoes] of porOutcome.entries()) {
        if (cotacoes.length === 0) continue;

        const fairValues = cotacoes.map((c) => c.fair);
        const consenso = mediana(fairValues);

        const melhor = cotacoes.reduce(
          (max, c) => (c.price > max.price ? c : max),
          cotacoes[0]
        );

        const edgeAparente = melhor.price * consenso - 1;

        // Dispersão só faz sentido com 2+ casas — com 1 casa só, fica 0
        // (o evento ainda pode sobreviver via edge_aparente sozinho).
        const dispersaoMercado =
          cotacoes.length > 1
            ? Math.max(...fairValues.map((f) => Math.abs(f - consenso)))
            : 0;

        const passaEdge = edgeAparente >= edgeMinimo;
        const passaDispersao = dispersaoMercado >= dispersaoMinima;
        const sobrevive = passaEdge || passaDispersao;

        if (!sobrevive) continue; // só retornamos quem sobreviveu ao piso

        sinais.push({
          event_id: event.id,
          home_team: event.home_team,
          away_team: event.away_team,
          commence_time: event.commence_time,
          sport: event.sport_key,
          league,
          mercado,
          outcome,
          consenso: arredondar(consenso),
          melhor_odd: melhor.price,
          melhor_casa: melhor.casa,
          edge_aparente: arredondar(edgeAparente),
          dispersao_mercado: arredondar(dispersaoMercado),
          sobrevive: true,
          motivo: passaEdge && passaDispersao ? "ambos" : passaEdge ? "edge" : "dispersao",
        });
      }
    }
  }

  return sinais;
}

/**
 * Agrupa AssimetriaSignal[] por event_id — usado pelo scannerEngine pra
 * decidir quais eventos completos avançam pra Etapa 2 (getStats), e pra
 * anexar os sinais que justificaram a sobrevivência no MDM final.
 *
 * @param {object[]} sinais - saída de assimetriaFilter
 * @returns {Map<string, object[]>} event_id -> AssimetriaSignal[]
 */
export function eventosComSinal(sinais) {
  const mapa = new Map();
  for (const s of sinais) {
    if (!mapa.has(s.event_id)) mapa.set(s.event_id, []);
    mapa.get(s.event_id).push(s);
  }
  return mapa;
}
