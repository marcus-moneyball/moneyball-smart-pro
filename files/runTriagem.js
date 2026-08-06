/**
 * runTriagem.js
 *
 * Orquestrador da etapa QUE VEM ANTES do Analyser: varre uma rodada e
 * devolve a lista de jogos candidatos com a assimetria detectada em
 * cada um (o JSON de "rodada" que você já tem um exemplo pronto).
 *
 * Responsabilidade: só ranquear/filtrar jogos candidatos e explicar
 * POR QUE cada um foi selecionado (score_triagem, criterios,
 * assimetria_detectada, evidencias, hipoteses). Não investiga a fundo
 * nenhum jogo — isso é exclusivamente o Analyser, disparado depois,
 * por partida, quando o usuário clica num jogo da lista.
 *
 * Mesmo padrão de DI do runAnalyser.js: `deps` tem default apontando
 * pra implementação real, sobrescrevível nos testes.
 *
 * AJUSTE NECESSÁRIO: o import abaixo assume que existe (ou vai existir)
 * um provider responsável por gerar esse JSON — hoje, pelo shape do seu
 * exemplo (fontes_consultadas, criterios_utilizados, prints de odds),
 * isso cheira a uma chamada de IA com busca, no mesmo espírito do MIE.
 * Troque o caminho/nome pela implementação real quando ela existir;
 * a assinatura (input -> JSON de rodada) é o que importa.
 */

import { generateTriagem } from "../core/triagemProvider.js";

const defaultDeps = { generateTriagem };

/**
 * @param {object} input - contexto da rodada a ser escaneada (ex: { competicao, janela_dias }).
 *   Opcional/flexível: o provider decide internamente que jogos existem
 *   nessa janela — este orquestrador não sabe nada sobre onde os dados
 *   de calendário vêm.
 */
export async function runTriagem(input = {}, deps = defaultDeps) {
  return deps.generateTriagem(input);
}
