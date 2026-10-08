// Discrete reading bands from the strip scale — not pad colour.
// Limits: EU 2020/2184 as applied in Portugal by Decreto-Lei 69/2023 where a
// parametric value exists; otherwise WHO (or US EPA where noted).
// A value exactly on the limit is green. Last strip mark may be "or higher" (+).
// Parameters with no limit (EU, WHO, or Portugal) are number-only, no colours.

function formatHalfStep(value) {
  return Number.isInteger(value) ? String(value) : value.toFixed(1)
}

function formatStepValue(value, step) {
  const decimals = (String(step).split('.')[1] || '').length
  const rounded = decimals ? Number(value.toFixed(decimals)) : value
  return String(rounded)
}

function phSafety(position) {
  if (position >= 6.5 && position <= 9.5) {
    return { safety: 'safe', verdict: 'Within the EU drinking-water pH range (6.5–9.5).' }
  }
  if (position < 6.5) {
    return { safety: 'concern', verdict: 'Below the EU pH range — can corrode pipes and affect taste.' }
  }
  return { safety: 'concern', verdict: 'Above the EU pH range — may affect taste or plumbing.' }
}

function buildPhBands() {
  const bands = []
  for (let i = 0; i <= 28; i += 1) {
    const position = i / 2
    const showLabel =
      position === 0 ||
      position === 6.5 ||
      position === 7 ||
      position === 9.5 ||
      position === 14 ||
      position % 2 === 0
    bands.push({
      value: formatHalfStep(position),
      position,
      showLabel,
      ...phSafety(position),
    })
  }
  return bands
}

function buildLinearScale({
  min = 0,
  max,
  step,
  orHigher = false,
  unit,
  scaleText,
  standardText,
  safeEnd,
  safeStart = 0,
}) {
  const count = Math.round((max - min) / step)
  const labelEvery = count > 10 ? Math.ceil(count / 6) : 1
  const bands = []
  for (let i = 0; i <= count; i += 1) {
    const position = Number((min + i * step).toFixed(6))
    const isLast = i === count
    const raw = formatStepValue(position, step)
    const atLimit = safeEnd != null && (position === safeStart || position === safeEnd)
    const inSafe = safeEnd != null && position >= safeStart && position <= safeEnd
    bands.push({
      value: isLast && orHigher ? `${raw}+` : raw,
      position,
      orHigher: Boolean(isLast && orHigher),
      safety: safeEnd == null ? undefined : inSafe ? 'safe' : 'concern',
      showLabel: i === 0 || isLast || atLimit || i % labelEvery === 0,
    })
  }
  return {
    min,
    max,
    unit,
    scaleText,
    standardText,
    safeRange: safeEnd == null ? null : { start: safeStart, end: safeEnd },
    bands,
  }
}

const WHO_RISK_BANDS = [
  {
    value: 'low',
    position: 0,
    safety: 'safe',
    labelKey: 'whoRisk.low',
    label: 'Low risk / Safe',
  },
  {
    value: 'int-probably-safe',
    position: 1,
    safety: 'concern',
    labelKey: 'whoRisk.intProbablySafe',
    label: 'Intermediate risk / Probably safe',
  },
  {
    value: 'int-possibly-safe',
    position: 2,
    safety: 'concern',
    labelKey: 'whoRisk.intPossiblySafe',
    label: 'Intermediate risk / Possibly safe',
  },
  {
    value: 'high-possibly-unsafe',
    position: 3,
    safety: 'concern',
    labelKey: 'whoRisk.highPossiblyUnsafe',
    label: 'High risk / Possibly unsafe',
  },
  {
    value: 'high-probably-unsafe',
    position: 4,
    safety: 'concern',
    labelKey: 'whoRisk.highProbablyUnsafe',
    label: 'High risk / Probably unsafe',
  },
  {
    value: 'unsafe',
    position: 5,
    safety: 'concern',
    labelKey: 'whoRisk.unsafe',
    label: 'Unsafe',
  },
]

function whoRiskScale(standardText) {
  return {
    kind: 'categories',
    min: 0,
    max: 5,
    unit: '',
    scaleText: 'WHO health-risk categories',
    standardText,
    safeRange: { start: 0, end: 0 },
    bands: WHO_RISK_BANDS,
  }
}

export const MEASURE_SCALES = {
  ph: {
    min: 0,
    max: 14,
    unit: '',
    scaleText: '0–14, every 0.5',
    standardText: '6.5–9.5 (EU 2020/2184 · DL 69/2023)',
    safeRange: { start: 6.5, end: 9.5 },
    safeLabel: 'Safe limit',
    bands: buildPhBands(),
  },
  nitrate: buildLinearScale({
    max: 100,
    step: 10,
    orHigher: true,
    unit: 'ppm',
    scaleText: '0–100+, every 10 ppm',
    standardText: '0–50 ppm (EU 2020/2184 · DL 69/2023)',
    safeEnd: 50,
  }),
  ecoli: whoRiskScale('Low risk / Safe (EU: 0 per 100 mL)'),
  coliforms: whoRiskScale('Low risk / Safe (EU: 0 per 100 mL, indicator limit)'),
  conductivity: buildLinearScale({
    max: 3000,
    step: 500,
    orHigher: true,
    unit: 'µS/cm',
    scaleText: '0–3,000+, every 500 µS/cm',
    standardText: '0–2,500 µS/cm (EU 2020/2184 · DL 69/2023)',
    safeEnd: 2500,
  }),
  tds: buildLinearScale({
    max: 1500,
    step: 300,
    orHigher: true,
    unit: 'ppm',
    scaleText: '0–1,500+, every 300 ppm',
    standardText: '0–1,000 ppm (WHO taste guidance; no EU limit)',
    safeEnd: 1000,
  }),
  arsenic: buildLinearScale({
    max: 20,
    step: 5,
    orHigher: true,
    unit: 'µg/L',
    scaleText: '0–20+, every 5 µg/L',
    standardText: '0–10 µg/L (EU, total arsenic)',
    safeEnd: 10,
  }),
  no2n: buildLinearScale({
    max: 0.3,
    step: 0.05,
    orHigher: true,
    unit: 'ppm',
    scaleText: '0–0.3+, every 0.05 ppm',
    standardText: '0–0.15 ppm (EU 0.5 ppm nitrite, converted)',
    safeEnd: 0.15,
  }),
  no3n: buildLinearScale({
    max: 25,
    step: 5,
    orHigher: true,
    unit: 'ppm',
    scaleText: '0–25+, every 5 ppm',
    standardText: '0–11.3 ppm (EU 50 ppm nitrate, converted)',
    safeEnd: 11.3,
  }),
  chlorineFree: buildLinearScale({
    max: 6,
    step: 0.5,
    orHigher: true,
    unit: 'ppm',
    scaleText: '0–6+, every 0.5 ppm',
    standardText: '0–5 ppm (WHO; no EU limit). 0 is normal for springs and fountains.',
    safeEnd: 5,
  }),
  chlorineTotal: buildLinearScale({
    max: 6,
    step: 0.5,
    orHigher: true,
    unit: 'ppm',
    scaleText: '0–6+, every 0.5 ppm',
    standardText: '0–4 ppm (US EPA; no EU or WHO limit)',
    safeEnd: 4,
  }),
  copper: buildLinearScale({
    max: 3,
    step: 0.5,
    orHigher: true,
    unit: 'ppm',
    scaleText: '0–3+, every 0.5 ppm',
    standardText: '0–2 ppm (EU 2020/2184 · DL 69/2023)',
    safeEnd: 2,
  }),
  iron: buildLinearScale({
    max: 0.5,
    step: 0.1,
    orHigher: true,
    unit: 'ppm',
    scaleText: '0–0.5+, every 0.1 ppm',
    standardText: '0–0.2 ppm (EU indicator limit)',
    safeEnd: 0.2,
  }),
  lead: buildLinearScale({
    max: 20,
    step: 5,
    orHigher: true,
    unit: 'µg/L',
    scaleText: '0–20+, every 5 µg/L',
    standardText: '0–10 µg/L (EU; drops to 5 from 2036)',
    safeEnd: 10,
  }),
  cyanuric: buildLinearScale({
    max: 80,
    step: 10,
    orHigher: true,
    unit: 'ppm',
    scaleText: '0–80+, every 10 ppm',
    standardText: '0–40 ppm (WHO; no EU limit)',
    safeEnd: 40,
  }),
}

/** @deprecated use getMeasureScale */
export const QUALITY_BAND_OPTIONS = Object.fromEntries(
  Object.entries(MEASURE_SCALES).map(([id, scale]) => [id, scale.bands]),
)

export function getMeasureScale(measureId) {
  return MEASURE_SCALES[measureId] ?? null
}

export function getBandOptions(measureId) {
  return getMeasureScale(measureId)?.bands ?? null
}

export function getBandByValue(measureId, value) {
  const bands = getBandOptions(measureId)
  if (!bands || value == null || value === '') return null
  const raw = String(value).trim()
  return (
    bands.find((band) => band.value === raw) ??
    bands.find((band) => band.value === `${raw}+`) ??
    bands.find((band) => String(band.position) === raw.replace(/\+$/, '')) ??
    null
  )
}

export function formatBandValue(measureId, value, t) {
  const band = getBandByValue(measureId, value)
  if (!band) return value
  if (band.labelKey && t) {
    const translated = t(band.labelKey)
    if (translated !== band.labelKey) return translated
  }
  return band.label ?? band.value
}

export function positionToPercent(position, scale) {
  return ((position - scale.min) / (scale.max - scale.min)) * 100
}

export function getSafeRangeStyle(scale) {
  if (!scale.safeRange) return null
  const left = positionToPercent(scale.safeRange.start, scale)
  const right = positionToPercent(scale.safeRange.end, scale)
  return { left, width: Math.max(right - left, 2) }
}

export function isInSafeRange(position, scale) {
  if (!scale.safeRange || position == null) return false
  return position >= scale.safeRange.start && position <= scale.safeRange.end
}

/** Public health references — not app copy; opens authoritative external pages. */
export const PUBLIC_INFO_LINKS = {
  ph: {
    label: 'USGS — pH and water',
    url: 'https://www.usgs.gov/special-topics/water-science-school/science/ph-and-water',
  },
  nitrate: {
    label: 'WHO Guidelines for drinking-water quality',
    url: 'https://www.who.int/publications/i/item/9789240045064',
  },
  ecoli: {
    label: 'WHO Guidelines for drinking-water quality',
    url: 'https://www.who.int/publications/i/item/9789240045064',
  },
  coliforms: {
    label: 'WHO Guidelines for drinking-water quality',
    url: 'https://www.who.int/publications/i/item/9789240045064',
  },
  conductivity: {
    label: 'USGS — conductivity and water',
    url: 'https://www.usgs.gov/special-topics/water-science-school/science/conductivity-electrical-conductance-and-water',
  },
  tds: {
    label: 'WHO Guidelines for drinking-water quality',
    url: 'https://www.who.int/publications/i/item/9789240045064',
  },
  arsenic: {
    label: 'WHO — arsenic',
    url: 'https://www.who.int/news-room/fact-sheets/detail/arsenic',
  },
  no2n: {
    label: 'EU 2020/2184 — drinking water',
    url: 'https://eur-lex.europa.eu/eli/dir/2020/2184/oj',
  },
  no3n: {
    label: 'WHO Guidelines for drinking-water quality',
    url: 'https://www.who.int/publications/i/item/9789240045064',
  },
  hardness: {
    label: 'Águas do Alto Minho — qualidade da água',
    url: 'https://adam.pt/atividade/qualidade-da-agua',
  },
  chlorineFree: {
    label: 'WHO Guidelines for drinking-water quality',
    url: 'https://www.who.int/publications/i/item/9789240045064',
  },
  chlorineTotal: {
    label: 'WHO Guidelines for drinking-water quality',
    url: 'https://www.who.int/publications/i/item/9789240045064',
  },
  copper: {
    label: 'WHO Guidelines for drinking-water quality',
    url: 'https://www.who.int/publications/i/item/9789240045064',
  },
  iron: {
    label: 'EU 2020/2184 — drinking water',
    url: 'https://eur-lex.europa.eu/eli/dir/2020/2184/oj',
  },
  lead: {
    label: 'WHO — lead poisoning and health',
    url: 'https://www.who.int/news-room/fact-sheets/detail/lead-poisoning-and-health',
  },
  cyanuric: {
    label: 'WHO — sodium dichloroisocyanurate',
    url: 'https://cdn.who.int/media/docs/default-source/wash-documents/water-safety-and-quality/chemical-fact-sheets-2022/sodium-dichloroisocyanurate-fact-sheet-2022.pdf',
  },
}

export function sampleReadingSafety(sample, qualityMeasures) {
  const readings = sample?.readings ?? []
  if (!readings.length) return 'unknown'
  const outside = readings.some((reading) => {
    const measure = qualityMeasures?.find((m) => m.id === reading.measureId)
    const { safe, band } = evaluateReading(reading.measureId, reading.value, measure)
    if (safe === false) return true
    return band?.safety === 'caution' || band?.safety === 'concern'
  })
  return outside ? 'not-safe' : 'safe'
}

export function normalizePresence(value) {
  const raw = String(value ?? '').trim().toLowerCase()
  if (raw === 'present' || raw === 'yes' || raw === 'detected') return 'present'
  if (raw === 'absent' || raw === 'no' || raw === 'not detected' || raw === 'nd') return 'absent'
  return null
}

function evaluatePresence(value, measure) {
  const presence = normalizePresence(value)
  if (!presence) return { safe: null, band: null, scale: null }
  const presentIsUnsafe = measure?.presentMeans !== 'safe'
  const unsafe = presence === 'present' ? presentIsUnsafe : !presentIsUnsafe
  return {
    safe: !unsafe,
    band: {
      value: presence,
      safety: unsafe ? 'concern' : 'safe',
      verdict: presence === 'present' ? 'Detected.' : 'Not detected.',
    },
    scale: { kind: 'presence' },
  }
}

export function evaluateReading(measureId, value, measure) {
  const scale = getMeasureScale(measureId)
  if (scale?.safeRange && value != null && value !== '') {
    const band = getBandByValue(measureId, value)
    if (band) {
      return {
        safe: isInSafeRange(band.position, scale),
        band,
        scale,
      }
    }
  }
  if (measure?.kind === 'presence' || normalizePresence(value)) {
    return evaluatePresence(value, measure)
  }
  if (
    measure?.kind === 'numeric' ||
    (measure?.kind !== 'presence' && value != null && value !== '' && Number.isFinite(Number(value)))
  ) {
    return { safe: null, band: null, scale: { kind: 'numeric' } }
  }
  return { safe: null, band: null, scale }
}
