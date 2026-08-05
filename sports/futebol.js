/**
 * Schema — Futebol. Define, por domínio, quais campos são esperados.
 * Puramente estrutural (nomes e tipos) — nenhuma ponderação aqui.
 */
export const SPORT_ID = 'soccer';

export const FIELDS = {
  forma_recente: ['goals_scored_last_10', 'goals_conceded_last_10', 'xg_last_10', 'xga_last_10'],
  h2h: ['h2h_last_5_home_wins', 'h2h_last_5_away_wins', 'h2h_last_5_draws'],
  contexto: ['league_position', 'rest_days', 'is_away_travel_long', 'match_importance'],
  clima: ['temperature_c', 'wind_kph', 'rain_probability'],
  especifico_esporte: ['formation', 'expected_lineup_strength'],
};

export const REQUIRED_SUBJECTS = ['home_team', 'away_team'];
