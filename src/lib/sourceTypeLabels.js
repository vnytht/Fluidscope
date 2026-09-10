// Bilingual labels for water source types (PT + EN). Keys match SOURCE_TYPES ids.
export const SOURCE_TYPE_LABELS = {
  'Mina (mine)': { pt: 'Mina', en: 'Mine' },
  'Dug well': { pt: 'Poço escavado', en: 'Dug well' },
  Borehole: { pt: 'Furo', en: 'Borehole' },
  Spring: { pt: 'Nascente', en: 'Spring' },
  'Shared reservoir': { pt: 'Reservatório partilhado', en: 'Shared reservoir' },
  'Private reservoir': { pt: 'Reservatório privado', en: 'Private reservoir' },
}

export function formatSourceTypeLabel(type) {
  const labels = SOURCE_TYPE_LABELS[type]
  if (!labels) return type
  return `${labels.pt} · ${labels.en}`
}
