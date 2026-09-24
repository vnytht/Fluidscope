import { evaluateReading } from './qualityBands'

/** Hypothetical past tests for prototype demos — keyed by sample id. */
const MOCK_HISTORY_BY_SAMPLE = {
  'seed-1': [
    {
      id: 'seed-1-h0',
      testedAt: '2026-07-12T10:15:00Z',
      sessionId: 'session-seed-1',
      readings: [
        { measureId: 'nitrate', value: '25' },
        { measureId: 'ph', value: '5.5' },
      ],
      hazards: ['septic', 'agriculture'],
      rainfallMm72h: 18,
      isCurrent: true,
    },
    {
      id: 'seed-1-h1',
      testedAt: '2026-05-03T09:40:00Z',
      sessionId: 'session-mock-2',
      readings: [
        { measureId: 'nitrate', value: '10' },
        { measureId: 'ph', value: '5.5' },
      ],
      hazards: ['septic'],
      rainfallMm72h: 6,
    },
    {
      id: 'seed-1-h2',
      testedAt: '2026-03-18T11:20:00Z',
      sessionId: 'session-mock-1',
      readings: [
        { measureId: 'nitrate', value: '10' },
        { measureId: 'ph', value: '6.5' },
      ],
      hazards: [],
      rainfallMm72h: 42,
    },
    {
      id: 'seed-1-h3',
      testedAt: '2025-11-02T08:55:00Z',
      sessionId: 'session-mock-0',
      readings: [
        { measureId: 'nitrate', value: '0' },
        { measureId: 'ph', value: '6.5' },
      ],
      hazards: [],
      rainfallMm72h: 12,
    },
  ],
  'seed-2': [
    {
      id: 'seed-2-h0',
      testedAt: '2026-07-12T11:02:00Z',
      sessionId: 'session-seed-1',
      readings: [
        { measureId: 'nitrate', value: '0' },
        { measureId: 'ph', value: '7' },
      ],
      hazards: [],
      rainfallMm72h: 18,
      isCurrent: true,
    },
    {
      id: 'seed-2-h1',
      testedAt: '2026-04-21T10:10:00Z',
      sessionId: 'session-mock-1',
      readings: [
        { measureId: 'nitrate', value: '0' },
        { measureId: 'ph', value: '7' },
      ],
      hazards: [],
      rainfallMm72h: 8,
    },
  ],
}

const EXTRA_SESSIONS = [
  { id: 'session-mock-0', label: 'Autumn walk — 2 Nov 2025' },
  { id: 'session-mock-1', label: 'Spring check — 18 Mar 2026' },
  { id: 'session-mock-2', label: 'Dry spell — 3 May 2026' },
]

function formatDateLabel(iso, dateLocale = 'en-GB') {
  return new Date(iso).toLocaleDateString(dateLocale, {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}

function formatDateShort(iso, dateLocale = 'en-GB') {
  return new Date(iso).toLocaleDateString(dateLocale, { day: 'numeric', month: 'short' })
}

function sessionLabel(sessionId, sessions) {
  const all = [...sessions, ...EXTRA_SESSIONS]
  return all.find((s) => s.id === sessionId)?.label ?? 'Field session'
}

function buildEntry(raw, sessions, dateLocale) {
  return {
    ...raw,
    dateLabel: formatDateLabel(raw.testedAt, dateLocale),
    dateShort: formatDateShort(raw.testedAt, dateLocale),
    sessionName: sessionLabel(raw.sessionId, sessions),
  }
}

export function buildSourceTimeline(sample, sessions = [], dateLocale = 'en-GB') {
  const preset = MOCK_HISTORY_BY_SAMPLE[sample.id]
  if (preset) {
    return preset.map((entry) => buildEntry(entry, sessions, dateLocale)).sort(
      (a, b) => new Date(b.testedAt) - new Date(a.testedAt),
    )
  }

  return [
    buildEntry(
      {
        id: `${sample.id}-current`,
        testedAt: sample.createdAt ?? new Date().toISOString(),
        sessionId: sample.sessionId,
        readings: sample.readings,
        hazards: sample.hazards ?? [],
        rainfallMm72h: null,
        isCurrent: true,
      },
      sessions,
      dateLocale,
    ),
  ]
}

export function formatReadingRows(readings, qualityMeasures) {
  return readings.map((reading) => {
    const measure = qualityMeasures.find((m) => m.id === reading.measureId)
    const name = measure?.name ?? reading.measureId
    const { safe } = evaluateReading(reading.measureId, reading.value)
    const scale = measure?.id
    const unit =
      reading.measureId === 'nitrate' ? 'mg/L' : reading.measureId === 'ph' ? '' : ''
    return {
      id: reading.measureId,
      name,
      value: `${reading.value}${unit ? ` ${unit}` : ''}`,
      safe,
      scale,
    }
  })
}

export function countUnsafeReadings(readings) {
  return readings.filter((r) => evaluateReading(r.measureId, r.value).safe === false).length
}

export function lastRecordingSummary(timeline) {
  const last = timeline[0]
  if (!last) return null
  const preview = formatReadingRows(last.readings, [
    { id: 'nitrate', name: 'Nitrate' },
    { id: 'ph', name: 'pH' },
  ])
    .map((r) => `${r.name} ${r.value}`)
    .join(' · ')
  return {
    dateLabel: last.dateLabel,
    dateShort: last.dateShort,
    count: timeline.length,
    preview,
    unsafe: countUnsafeReadings(last.readings) > 0,
  }
}
