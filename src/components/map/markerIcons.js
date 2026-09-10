import L from 'leaflet'
import { sampleHasHazard } from '../../lib/hazards'

// Small coloured dot icons — hazards drive the colour (green = no known hazard,
// coral = at least one nearby hazard reported).
function dotIcon(color, { pending = false } = {}) {
  const size = pending ? 26 : 20
  return L.divIcon({
    className: 'ws-marker',
    html: `<span class="ws-marker-dot${pending ? ' ws-marker-dot--pending' : ''}" style="--dot-color:${color}"></span>`,
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
  })
}

export const hazardIcon = dotIcon('var(--ws-coral)')
export const safeIcon = dotIcon('var(--ws-green)')
export const pendingIcon = dotIcon('var(--ws-accent)', { pending: true })

export function iconForSample(sample) {
  return sampleHasHazard(sample) ? hazardIcon : safeIcon
}

const markerColor = (sample) => (sampleHasHazard(sample) ? 'var(--ws-coral)' : 'var(--ws-green)')

export function relatedIcon(sample, catchmentColor) {
  return L.divIcon({
    className: 'ws-marker',
    html: `<span class="ws-marker-dot ws-marker-dot--related" style="--dot-color:${markerColor(sample)}; --ring-color:${catchmentColor}"></span>`,
    iconSize: [28, 28],
    iconAnchor: [14, 14],
  })
}

export function selectedIcon(sample) {
  return L.divIcon({
    className: 'ws-marker',
    html: `<span class="ws-marker-dot ws-marker-dot--selected" style="--dot-color:${markerColor(sample)}"></span>`,
    iconSize: [24, 24],
    iconAnchor: [12, 12],
  })
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
