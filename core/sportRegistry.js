export function criarSportRegistry(sportModules) {
  return {
    get(sportId) {
      const mod = sportModules[sportId];
      if (!mod) throw new Error(`Analyser: nenhum sport module registrado para sport "${sportId}"`);
      return mod;
    },
  };
}
