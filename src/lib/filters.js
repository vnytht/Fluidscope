import { evaluateReading } from './qualityBands'
import { sampleHasHazard } from './hazards'

export const DEFAULT_FILTERS = {
  view: 'all',
  sourceType: 'all',
  contamination: 'all',
  hazards: 'all',
  season: 'all',
  dateFrom: '',
  dateTo: '',
  timeFrom: '',
  timeTo: '',
  sessionId: 'all',
}

export const SEASONS = ['winter', 'spring', 'summer', 'autumn']

export function emptyFilters(overrides = {}) {
  return { ...DEFAULT_FILTERS, ...overrides }
}

export function clearFilterField(filters, key) {
  if (key === 'when') {
    return emptyFilters({
      ...filters,
      season: 'all',
      dateFrom: '',
      dateTo: '',
      timeFrom: '',
      timeTo: '',
    })
  }
  return emptyFilters({ ...filters, [key]: 'all' })
}

export function monthToSeason(monthIndex) {
  if (monthIndex === 11 || monthIndex <= 1) return 'winter'
  if (monthIndex <= 4) return 'spring'
  if (monthIndex <= 7) return 'summer'
  return 'autumn'
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

function hasUnsafeReading(sample) {
  return (sample.readings ?? []).some((reading) => evaluateReading(reading.measureId, reading.value).safe === false)
}

function matchesContamination(sample, contamination) {
  if (contamination === 'all') return true
  const readings = sample.readings ?? []
  if (contamination === 'unsafe') return hasUnsafeReading(sample)
  if (contamination === 'nitrate') return readings.some((r) => r.measureId === 'nitrate')
  if (contamination === 'ph') return readings.some((r) => r.measureId === 'ph')
  return true
}

function matchesHazards(sample, hazards) {
  if (hazards === 'all') return true
  const has = sampleHasHazard(sample)
  if (hazards === 'any') return has
  if (hazards === 'none') return !has
  return (sample.hazards ?? []).includes(hazards)
}

export function sampleMatchesFilters(sample, filters) {
  if (filters.sourceType !== 'all' && sample.sourceType !== filters.sourceType) return false
  if (filters.sessionId !== 'all' && sample.sessionId !== filters.sessionId) return false
  if (!matchesContamination(sample, filters.contamination)) return false
  if (!matchesHazards(sample, filters.hazards)) return false

  const date = sampleDate(sample)
  if (filters.season !== 'all') {
    if (!date || monthToSeason(date.getMonth()) !== filters.season) return false
  }
  if (!matchesDateTime(date, filters)) return false
  return true
}

export function applyFilters(samples, filters) {
  return samples.filter((sample) => sampleMatchesFilters(sample, filters))
}

export function countActiveFilters(filters) {
  let count = 0
  if (filters.sourceType !== 'all') count += 1
  if (filters.contamination !== 'all') count += 1
  if (filters.hazards !== 'all') count += 1
  if (filters.season !== 'all') count += 1
  if (filters.dateFrom || filters.dateTo) count += 1
  if (filters.timeFrom || filters.timeTo) count += 1
  if (filters.sessionId !== 'all') count += 1
  return count
}

export function isDefaultFilters(filters) {
  return countActiveFilters(filters) === 0
}
