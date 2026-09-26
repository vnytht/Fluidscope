import L from 'leaflet'
import { sampleHasHazard } from '../../lib/hazards'
import { sampleReadingSafety } from '../../lib/qualityBands'

const SAFE_SHAPE = `<svg class="ws-pin-shape" viewBox="0 0 16 16" aria-hidden="true"><circle cx="8" cy="8" r="6.5" fill="#448D49" stroke="#fff" stroke-width="2.5"/></svg>`
const NOT_SAFE_SHAPE = `<svg class="ws-pin-shape" viewBox="0 0 16 16" aria-hidden="true"><polygon points="8,0.6 15.4,8 8,15.4 0.6,8" fill="#C85032" stroke="#fff" stroke-width="2.5" stroke-linejoin="round"/></svg>`
const HAZARD_BADGE = `<svg class="ws-pin-hazard" viewBox="0 0 16 16" aria-hidden="true"><polygon points="8,1 15.3,14.5 0.7,14.5" fill="#E7B137" stroke="#fff" stroke-width="2" stroke-linejoin="round"/><polygon points="8,2.6 13.2,13.2 2.8,13.2" fill="none" stroke="#714A00" stroke-width=".8"/><rect x="7.3" y="5.5" width="1.4" height="4.6" rx=".7" fill="#1E2A30"/><circle cx="8" cy="12.1" r=".85" fill="#1E2A30"/></svg>`

function pinHtml(sample, extraClass = '') {
  const notSafe = sampleReadingSafety(sample) === 'not-safe'
  const badge = sampleHasHazard(sample) ? HAZARD_BADGE : ''
  return `<span class="ws-pin ${extraClass}">${notSafe ? NOT_SAFE_SHAPE : SAFE_SHAPE}${badge}</span>`
}

function pinIcon(sample, extraClass = '', size = 24) {
  return L.divIcon({
    className: 'ws-marker',
    html: pinHtml(sample, extraClass),
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
  })
}

function dotIcon(color, { pending = false } = {}) {
  const size = pending ? 26 : 20
  return L.divIcon({
    className: 'ws-marker',
    html: `<span class="ws-marker-dot${pending ? ' ws-marker-dot--pending' : ''}" style="--dot-color:${color}"></span>`,
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
  })
}

export const hazardIcon = pinIcon({ readings: [{ measureId: 'nitrate', value: '25' }], hazards: ['septic'] })
export const safeIcon = pinIcon({ readings: [{ measureId: 'nitrate', value: '0' }], hazards: [] })
export const pendingIcon = dotIcon('var(--ws-accent)', { pending: true })

export function iconForSample(sample) {
  return pinIcon(sample)
}

export function relatedIcon(sample) {
  return pinIcon(sample, 'ws-pin--related')
}

export function upstreamIcon(sample) {
  return pinIcon(sample)
}

export function downstreamIcon(sample) {
  return pinIcon(sample)
}

export function selectedIcon(sample) {
  return pinIcon(sample, 'ws-pin--selected', 26)
}

const PLACEMENT_PIN_SVG = `<svg class="ws-placement-pin" viewBox="0 0 34 40" aria-hidden="true">
  <path d="M17 0C7.6 0 0 7.6 0 17c0 12 17 23 17 23s17-11 17-23C34 7.6 26.4 0 17 0z" fill="var(--ws-accent)"/>
  <circle cx="17" cy="17" r="6.5" fill="white"/>
</svg>`

export const placementPinIcon = L.divIcon({
  className: 'ws-marker ws-marker--placement',
  html: PLACEMENT_PIN_SVG,
  iconSize: [34, 40],
  iconAnchor: [17, 40],
})
