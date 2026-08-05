/**
 * WeatherProvider — placeholder. Vendor real ainda não escolhido.
 */
export function criarWeatherProviderPlaceholder() {
  return {
    providerName: 'weather-provider-placeholder',
    async getWeather(_matchInput) {
      throw new Error('WeatherProvider: nenhum vendor real configurado. Injete um mock para dev/teste.');
    },
  };
}
