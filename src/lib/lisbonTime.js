export const LISBON_TZ = 'Europe/Lisbon'

export function formatLisbonDateTime(iso, locale = 'pt-PT') {
  if (!iso) return ''
  return new Intl.DateTimeFormat(locale, {
    timeZone: LISBON_TZ,
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(new Date(iso))
}

export function formatLisbonDate(iso, locale = 'pt-PT') {
  if (!iso) return ''
  return new Intl.DateTimeFormat(locale, {
    timeZone: LISBON_TZ,
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).format(new Date(iso))
}
