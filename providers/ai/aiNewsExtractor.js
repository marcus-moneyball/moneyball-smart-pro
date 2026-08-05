/**
 * NewsProvider — extrai fatos (lesões, desfalques, suspensões) de texto
 * livre via AI Provider. Uso restrito ao "Princípio do Scanner" que já
 * vinha valendo: só extração/estruturação, nunca interpretação.
 *
 * `aiProvider` é injetado — este arquivo não sabe se é Groq, Gemini,
 * ou qualquer outro (mesma regra de sempre: modelo é infraestrutura).
 */
export function criarAiNewsExtractor({ aiProvider, newsSearchClient }) {
  if (!aiProvider) throw new Error('NewsExtractor: aiProvider é obrigatório');
  if (!newsSearchClient) throw new Error('NewsExtractor: newsSearchClient é obrigatório');

  return {
    async extractFacts(matchInput) {
      const articles = await newsSearchClient.search(matchInput);
      const results = [];
      for (const article of articles) {
        const extracted = await aiProvider.extract({
          instructions: 'Extraia apenas fatos objetivos de lesão/desfalque/suspensão/retorno, sem opinião ou julgamento.',
          text: article.text,
        });
        for (const item of extracted) {
          results.push({ ...item, sourceRef: article.url });
        }
      }
      return results;
    },
  };
}
