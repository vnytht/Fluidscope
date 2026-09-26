import { evaluateReading } from './qualityBands'
import { sampleHasHazard } from './hazards'

export const DEFAULT_FILTERS = {
  view: 'all',
  sourceType: [],
  contamination: [],
  hazards: [],
  season: [],
  dateFrom: '',
  dateTo: '',
  timeFrom: '',
  timeTo: '',
  sessionId: 'all',
}

export const SEASONS = ['winter', 'spring', 'summer', 'autumn']

// Meteorological seasons for mainland Portugal / Viana do Castelo (IPMA).
export const VIANA_SEASON_MONTHS = {
  winter: [11, 0, 1],
  spring: [2, 3, 4],
  summer: [5, 6, 7],
  autumn: [8, 9, 10],
}

const LIST_KEYS = ['sourceType', 'contamination', 'hazards', 'season']

export function asFilterList(value) {
  if (value == null || value === 'all' || value === '') return []
  return Array.isArray(value) ? value.filter(Boolean) : [value]
}

export function isFilterActive(value) {
  return asFilterList(value).length > 0
}

export function toggleFilterValue(list, value, exclusive = []) {
  const current = asFilterList(list)
  if (current.includes(value)) return current.filter((item) => item !== value)
  return [...current.filter((item) => !exclusive.includes(item)), value]
}

export function emptyFilters(overrides = {}) {
  return { ...DEFAULT_FILTERS, ...overrides }
}

export function clearFilterField(filters, key) {
  if (key === 'when') {
    return emptyFilters({
      ...filters,
      season: [],
      dateFrom: '',
      dateTo: '',
      timeFrom: '',
      timeTo: '',
    })
  }
  if (LIST_KEYS.includes(key)) return emptyFilters({ ...filters, [key]: [] })
  return emptyFilters({ ...filters, [key]: 'all' })
}

export function monthToSeason(monthIndex) {
  return (
    SEASONS.find((season) => VIANA_SEASON_MONTHS[season].includes(monthIndex)) ?? 'autumn'
  )
}

function sampleDate(sample) {
  const raw = sample.sampledAt || sample.createdAt
  const date = raw ? new Date(raw) : null
  return date && !Number.isNaN(date.getTime()) ? date : null
}

function combineDateTime(dateValue, timeValue, endOfDay) {
  if (!dateValue && !timeValue) return null
  const datePart = dateValue || '1970-01-01'
  const timePart = timeValue || (endOfDay ? '23:59' : '00:00')
  return new Date(`${datePart}T${timePart}:00`)
}

function matchesDateTime(date, filters) {
  const hasDate = Boolean(filters.dateFrom || filters.dateTo)
  const hasTime = Boolean(filters.timeFrom || filters.timeTo)
  if (!hasDate && !hasTime) return true
  if (!date) return false

  if (hasDate) {
    const fromDate = filters.dateFrom || (filters.timeFrom ? filters.dateTo : null)
    const toDate = filters.dateTo || (filters.timeTo ? filters.dateFrom : null)
    const from = combineDateTime(fromDate, filters.timeFrom, false)
    const to = combineDateTime(toDate, filters.timeTo, true)
    const time = date.getTime()
    if (from && !Number.isNaN(from.getTime()) && time < from.getTime()) return false
    if (to && !Number.isNaN(to.getTime()) && time > to.getTime()) return false
    return true
  }

  const minutes = date.getHours() * 60 + date.getMinutes()
  if (filters.timeFrom) {
    const [h, m] = filters.timeFrom.split(':').map(Number)
    if (minutes < h * 60 + m) return false
  }
  if (filters.timeTo) {
    const [h, m] = filters.timeTo.split(':').map(Number)
    if (minutes > h * 60 + m) return false
  }
  return true
}

function readingIsUnsafe(reading) {
  return evaluateReading(reading.measureId, reading.value).safe === false
}

function hasUnsafeReading(sample, measureIds = null) {
  return (sample.readings ?? []).some((reading) => {
    if (measureIds && !measureIds.includes(reading.measureId)) return false
    return readingIsUnsafe(reading)
  })
}

function matchesContamination(sample, contamination) {
  const selected = asFilterList(contamination)
  if (!selected.length) return true

  const wantUnsafe = selected.includes('unsafe')
  const measures = selected.filter((item) => item !== 'unsafe')
  const readings = sample.readings ?? []

  if (wantUnsafe && measures.length) return hasUnsafeReading(sample, measures)
  if (wantUnsafe) return hasUnsafeReading(sample)
  return measures.some((id) => readings.some((reading) => reading.measureId === id))
}

function matchesHazards(sample, hazards) {
  const selected = asFilterList(hazards)
  if (!selected.length) return true

  const has = sampleHasHazard(sample)
  if (selected.includes('none')) return !has
  if (selected.includes('any')) return has
  return selected.some((id) => (sample.hazards ?? []).includes(id))
}

export function sampleMatchesFilters(sample, filters) {
  const sourceTypes = asFilterList(filters.sourceType)
  if (sourceTypes.length && !sourceTypes.includes(sample.sourceType)) return false
  if (filters.sessionId !== 'all' && filters.sessionId && sample.sessionId !== filters.sessionId) {
    return false
  }
  if (!matchesContamination(sample, filters.contamination)) return false
  if (!matchesHazards(sample, filters.hazards)) return false

  const date = sampleDate(sample)
  const seasons = asFilterList(filters.season)
  if (seasons.length) {
    if (!date || !seasons.includes(monthToSeason(date.getMonth()))) return false
  }
  if (!matchesDateTime(date, filters)) return false
  return true
}

export function applyFilters(samples, filters) {
  return samples.filter((sample) => sampleMatchesFilters(sample, filters))
}

export function countActiveFilters(filters) {
  let count = 0
  count += asFilterList(filters.sourceType).length
  count += asFilterList(filters.contamination).length
  count += asFilterList(filters.hazards).length
  count += asFilterList(filters.season).length
  if (filters.dateFrom || filters.dateTo) count += 1
  if (filters.timeFrom || filters.timeTo) count += 1
  if (filters.sessionId && filters.sessionId !== 'all') count += 1
  return count
}

export function isDefaultFilters(filters) {
  return countActiveFilters(filters) === 0
}
