/**
 * Fact item — shape padrão usado em todo o Analyser.
 * {
 *   fact_id, subject, key, value, availability, conflicting,
 *   provenance: { provider, retrieved_at, source_ref, extraction_method }
 * }
 */
export function createFact({ subject, key, value, provenance, conflicting = false }) {
  if (!provenance || !provenance.provider || !provenance.retrieved_at) {
    throw new Error(`createFact: provenance.provider e provenance.retrieved_at são obrigatórios (${subject}.${key})`);
  }
  return {
    fact_id: `${subject}_${key}`,
    subject,
    key,
    value,
    availability: true,
    conflicting,
    provenance: {
      provider: provenance.provider,
      retrieved_at: provenance.retrieved_at,
      source_ref: provenance.source_ref ?? null,
      extraction_method: provenance.extraction_method ?? 'direct_api',
    },
  };
}

export function createAbsentFact({ subject, key, provenance }) {
  return {
    fact_id: `${subject}_${key}`,
    subject,
    key,
    value: null,
    availability: false,
    conflicting: false,
    provenance: {
      provider: provenance.provider,
      retrieved_at: provenance.retrieved_at,
      source_ref: provenance.source_ref ?? null,
      extraction_method: provenance.extraction_method ?? 'direct_api',
    },
  };
}

/** Marca conflicting:true quando dois facts do mesmo subject+key divergem em valor. */
export function markConflicts(facts) {
  const groups = new Map();
  for (const f of facts) {
    const id = `${f.subject}::${f.key}`;
    if (!groups.has(id)) groups.set(id, []);
    groups.get(id).push(f);
  }
  for (const group of groups.values()) {
    const withValue = group.filter((f) => f.availability);
    const distinct = new Set(withValue.map((f) => JSON.stringify(f.value)));
    if (distinct.size > 1) for (const f of withValue) f.conflicting = true;
  }
  return facts;
}
