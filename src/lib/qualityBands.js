// Discrete reading bands from the strip scale — not pad colour.
// Units for N species are as nitrogen (NO₃-N / NO₂-N), matching field kits.

function formatHalfStep(value) {
  return Number.isInteger(value) ? String(value) : value.toFixed(1)
}

function phSafety(position) {
  if (position >= 6.5 && position <= 8.5) {
    return { safety: 'safe', verdict: 'Within the WHO drinking-water pH range.' }
  }
  if (position >= 6 && position < 6.5) {
    return { safety: 'caution', verdict: 'Slightly acidic — common here, below the WHO range.' }
  }
  if (position > 8.5 && position <= 9) {
    return { safety: 'caution', verdict: 'Slightly alkaline — above the WHO range.' }
  }
  if (position < 6) {
    return { safety: 'concern', verdict: 'Acidic — can corrode pipes and affect taste.' }
  }
  return { safety: 'concern', verdict: 'Alkaline — may affect taste or plumbing.' }
}

function buildPhBands() {
  const bands = []
  for (let i = 0; i <= 28; i += 1) {
    const position = i / 2
    const showLabel = position === 0 || position === 6.5 || position === 7 || position === 8.5 || position === 14 || position % 2 === 0
    bands.push({
      value: formatHalfStep(position),
      position,
      showLabel,
      ...phSafety(position),
    })
  }
  return bands
}

export const MEASURE_SCALES = {
  nitrate: {
    min: 0,
    max: 50,
    unit: 'ppm',
    scaleText: '0, 5, 10, 25, 50',
    standardText: '10 ppm as N (EPA) · EU 50 mg/L as NO₃',
    safeRange: { start: 0, end: 10 },
    safeLabel: 'Safe limit',
    bands: [
      { value: '0', position: 0, safety: 'safe', verdict: 'Within safe limits for drinking.' },
      { value: '5', position: 5, safety: 'safe', verdict: 'Acceptable for drinking.' },
      { value: '10', position: 10, safety: 'safe', verdict: 'At the EPA limit as NO₃-N.' },
      {
        value: '25',
        position: 25,
        safety: 'caution',
        verdict: 'Elevated — not ideal for daily drinking, especially for infants.',
      },
      {
        value: '50',
        position: 50,
        safety: 'concern',
        verdict: 'High — avoid drinking, especially for children.',
      },
    ],
  },
  nitrite: {
    min: 0,
    max: 10,
    unit: 'ppm',
    scaleText: '0, 0.5, 1, 5, 10',
    standardText: '1 ppm as N (EPA) · EU 0.5 mg/L as NO₂',
    safeRange: { start: 0, end: 1 },
    safeLabel: 'Safe limit',
    bands: [
      { value: '0', position: 0, safety: 'safe', verdict: 'Within safe limits for drinking.' },
      { value: '0.5', position: 0.5, safety: 'safe', verdict: 'Below the EPA limit as NO₂-N.' },
      { value: '1', position: 1, safety: 'safe', verdict: 'At the EPA limit as NO₂-N.' },
      {
        value: '5',
        position: 5,
        safety: 'concern',
        verdict: 'High nitrite — do not drink.',
      },
      {
        value: '10',
        position: 10,
        safety: 'concern',
        verdict: 'Very high nitrite — not safe for drinking.',
      },
    ],
  },
  ph: {
    min: 0,
    max: 14,
    unit: '',
    scaleText: '0–14, every 0.5',
    standardText: '6.5–8.5 (WHO)',
    safeRange: { start: 6.5, end: 8.5 },
    safeLabel: 'Safe limit',
    bands: buildPhBands(),
  },
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
  return getBandOptions(measureId)?.find((b) => b.value === value) ?? null
}

export function positionToPercent(position, scale) {
  return ((position - scale.min) / (scale.max - scale.min)) * 100
}

export function getSafeRangeStyle(scale) {
  if (!scale.safeRange) return null
  const left = positionToPercent(scale.safeRange.start, scale)
  const right = positionToPercent(scale.safeRange.end, scale)
  return { left, width: right - left }
}

export function isInSafeRange(position, scale) {
  if (!scale.safeRange || position == null) return false
  return position >= scale.safeRange.start && position <= scale.safeRange.end
}

/** Public health references — not app copy; opens authoritative external pages. */
export const PUBLIC_INFO_LINKS = {
  nitrate: {
    label: 'EPA — nitrate in drinking water',
    url: 'https://www.epa.gov/ground-water-and-drinking-water/national-primary-drinking-water-regulations',
  },
  nitrite: {
    label: 'EPA — nitrite in drinking water',
    url: 'https://www.epa.gov/ground-water-and-drinking-water/national-primary-drinking-water-regulations',
  },
  ph: {
    label: 'WHO — drinking-water quality',
    url: 'https://www.who.int/news-room/fact-sheets/detail/drinking-water',
  },
}

export function sampleReadingSafety(sample) {
  const readings = sample?.readings ?? []
  if (!readings.length) return 'unknown'
  const outside = readings.some((reading) => {
    const { safe, band } = evaluateReading(reading.measureId, reading.value)
    if (safe === false) return true
    return band?.safety === 'caution' || band?.safety === 'concern'
  })
  return outside ? 'not-safe' : 'safe'
}

export function evaluateReading(measureId, value) {
  const scale = getMeasureScale(measureId)
  if (!scale || value == null || value === '') {
    return { safe: null, band: null, scale: null }
  }
  const band = getBandByValue(measureId, value)
  if (!band) return { safe: null, band: null, scale }
  return {
    safe: isInSafeRange(band.position, scale),
    band,
    scale,
  }
}
