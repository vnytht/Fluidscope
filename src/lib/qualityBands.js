// Discrete reading bands for known test measures. Values are chosen from the
// strip scale — not from pad colour, which varies by kit and lighting.
export const MEASURE_SCALES = {
  nitrate: {
    min: 0,
    max: 100,
    majorStep: 10,
    minorStep: 5,
    unit: 'mg/L',
    endCap: true,
    safeRange: { start: 0, end: 10 },
    safeLabel: 'Safe limit',
    bands: [
      { value: '0', position: 0, safety: 'safe', verdict: 'Within safe limits for drinking.' },
      { value: '10', position: 10, safety: 'safe', verdict: 'Acceptable for drinking.' },
      {
        value: '25',
        position: 25,
        safety: 'caution',
        verdict: 'Elevated — limit for infants; not ideal for daily drinking.',
      },
      {
        value: '50',
        position: 50,
        safety: 'concern',
        verdict: 'High — avoid drinking, especially for children.',
      },
      {
        value: '100+',
        position: 100,
        safety: 'concern',
        verdict: 'Very high — not safe for drinking.',
      },
    ],
  },
  ph: {
    min: 5.5,
    max: 9,
    majorStep: 0.5,
    minorStep: 0.25,
    unit: '',
    endCap: false,
    safeRange: { start: 7, end: 8 },
    safeLabel: 'Safe limit',
    bands: [
      {
        value: '5.5',
        position: 5.5,
        safety: 'concern',
        verdict: 'Very acidic — can corrode pipes and affect taste.',
      },
      {
        value: '6.5',
        position: 6.5,
        safety: 'caution',
        verdict: 'Acidic — common in this region, below ideal for drinking.',
      },
      { value: '7', position: 7, safety: 'safe', verdict: 'Neutral — good for drinking.' },
      {
        value: '8',
        position: 8,
        safety: 'safe',
        verdict: 'Slightly alkaline — generally fine for drinking.',
      },
      {
        value: '9',
        position: 9,
        safety: 'caution',
        verdict: 'Alkaline — may affect taste or plumbing over time.',
      },
    ],
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
  ph: {
    label: 'WHO — drinking-water quality',
    url: 'https://www.who.int/news-room/fact-sheets/detail/drinking-water',
  },
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
