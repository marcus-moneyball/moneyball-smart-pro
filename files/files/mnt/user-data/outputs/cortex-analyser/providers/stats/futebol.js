/**
 * StatsProvider — Futebol (placeholder)
 * Vendor real ainda não escolhido. Falha explicitamente se usado sem
 * mock — nunca inventa dado. Troque por implementação real depois;
 * nada além deste arquivo muda.
 */
export function criarStatsProviderFutebolPlaceholder() {
  return {
    providerName: 'stats-provider-placeholder',
    async getMatchStats(_matchInput) {
      throw new Error(
        'StatsProvider (futebol): nenhum vendor real configurado. Injete um mock para dev/teste.'
      );
    },
  };
}
