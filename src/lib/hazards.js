// Nearby hazard types for crowd-sourced point-source mapping — septic tanks
// and similar sources aren't officially mapped in this watershed.
export const HAZARD_ACTIVITY = {
  active: {
    id: 'active',
    label: 'Active',
    hint: 'Likely affecting water now — leaking, grazing, recent spraying.',
  },
  passive: {
    id: 'passive',
    label: 'Passive',
    hint: 'Nearby — runoff or seepage may matter over time.',
  },
}

export const HAZARD_TYPES = [
  {
    id: 'septic',
    activity: 'active',
    pt: 'Fossa séptica',
    en: 'Septic tank',
  },
  {
    id: 'livestock',
    activity: 'active',
    pt: 'Gado',
    en: 'Livestock',
  },
  {
    id: 'spraying',
    activity: 'active',
    pt: 'Pulverização',
    en: 'Crop spraying',
  },
  {
    id: 'agriculture',
    activity: 'passive',
    pt: 'Área agrícola',
    en: 'Agriculture',
  },
  {
    id: 'mine',
    activity: 'passive',
    pt: 'Mina abandonada',
    en: 'Abandoned mine',
  },
  {
    id: 'industry',
    activity: 'passive',
    pt: 'Indústria',
    en: 'Industry',
  },
  {
    id: 'eucalyptus',
    activity: 'passive',
    pt: 'Plantação de eucalipto',
    en: 'Eucalyptus plantation',
  },
]

export function hazardsByActivity(activity) {
  return HAZARD_TYPES.filter((h) => h.activity === activity)
}

export function hazardLabel(typeId) {
  const type = HAZARD_TYPES.find((h) => h.id === typeId)
  if (!type) return typeId
  return `${type.pt} · ${type.en}`
}

export function sampleHasHazard(sample) {
  if (Array.isArray(sample.hazards)) return sample.hazards.length > 0
  return sample.risk === true
}

export function formatSampleHazards(sample) {
  if (!sampleHasHazard(sample)) return 'None known'
  return sample.hazards.map((id) => hazardLabel(id)).join('; ')
}
