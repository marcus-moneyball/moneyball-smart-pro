/**
 * fingerprintBuilder.js
 *
 * Responsabilidade única: extrair do `matchInput` a identificação básica
 * da partida (times, competição, data). Não normaliza, não enriquece,
 * não consulta providers — só lê o que já veio no input do Analyser.
 *
 * ATENÇÃO: os nomes de campo abaixo (homeTeam/awayTeam/competition/date)
 * são os nomes mais comuns usados no restante do ecossistema Moneyball.
 * Se o seu `matchInput` real usar outras chaves, ajuste apenas o mapa
 * `FIELD_ALIASES` abaixo — o resto do arquivo não precisa mudar.
 *
 * Não faz: não busca dado que não esteja em matchInput, não inventa
 * valor, nunca lança erro por campo ausente (cai em "").
 */

const FIELD_ALIASES = {
  equipe_casa: ["homeTeam", "home_team", "equipe_casa", "mandante"],
  equipe_visitante: ["awayTeam", "away_team", "equipe_visitante", "visitante"],
  competicao: ["competition", "league", "competicao", "campeonato"],
  data: ["date", "matchDate", "data", "kickoff", "kickoff_time"]
};

function pickFirst(source, keys) {
  if (!source) return "";
  for (const key of keys) {
    const value = source[key];
    if (value !== undefined && value !== null && value !== "") {
      return value;
    }
  }
  return "";
}

export function buildFingerprint(matchInput) {
  return {
    equipe_casa: pickFirst(matchInput, FIELD_ALIASES.equipe_casa),
    equipe_visitante: pickFirst(matchInput, FIELD_ALIASES.equipe_visitante),
    competicao: pickFirst(matchInput, FIELD_ALIASES.competicao),
    data: pickFirst(matchInput, FIELD_ALIASES.data)
  };
}
