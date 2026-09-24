// Viana do Castelo, Portugal — the watershed this platform serves.
export const WATERSHED_CENTER = [41.6946, -8.8305]
export const DEFAULT_ZOOM = 12
export const MIN_ZOOM = 9
export const MAX_ZOOM = 18

// Rough bounds around the district, so the map can't be panned off into the
// Atlantic. Generous on purpose — the watershed edges aren't drawn yet.
export const WATERSHED_BOUNDS = [
  [41.35, -9.15],
  [42.05, -8.25],
]

// Both tile sets are free and key-less. They're donated infrastructure with no
// SLA, so we never bulk-prefetch tiles.
export const BASEMAPS = {
  osm: {
    label: 'Street',
    url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
    attribution:
      '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    maxZoom: 19,
  },
  topo: {
    label: 'Terrain',
    url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Topo_Map/MapServer/tile/{z}/{y}/{x}',
    attribution:
      'Tiles &copy; Esri &mdash; Esri, DeLorme, NAVTEQ, TomTom, Intermap, USGS, FAO, NPS',
    maxZoom: 16,
  },
  hillshade: {
    label: 'Hillshade',
    url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Shaded_Relief/MapServer/tile/{z}/{y}/{x}',
    attribution: 'Tiles &copy; Esri',
    maxZoom: 13,
  },
}

export const DEFAULT_BASEMAP = 'osm'

// PROTOTYPE fallback — real device geolocation is often unavailable in a
// sandboxed preview (denied permission, no GPS, etc). Rather than dead-end
// the "Use my location" step on an error, drop the pin near the watershed
// center with a little jitter so the flow keeps moving.
export function mockDeviceLocation() {
  const [lat, lng] = WATERSHED_CENTER
  const jitter = () => (Math.random() - 0.5) * 0.03
  return [lat + jitter(), lng + jitter()]
}

// Free, keyless geocoding via OSM Nominatim — biased toward the watershed's
// bounding box so "Braga" doesn't win over a same-named street here. Low
// volume, prototype use only; respects Nominatim's usage policy (no bulk
// queries, one request per user action).
export async function geocodePlace(query) {
  const [[south, west], [north, east]] = [
    [WATERSHED_BOUNDS[0][0], WATERSHED_BOUNDS[0][1]],
    [WATERSHED_BOUNDS[1][0], WATERSHED_BOUNDS[1][1]],
  ]
  const params = new URLSearchParams({
    format: 'jsonv2',
    q: query,
    limit: '1',
    viewbox: `${west},${north},${east},${south}`,
    bounded: '0',
  })
  const res = await fetch(`https://nominatim.openstreetmap.org/search?${params}`)
  if (!res.ok) throw new Error('Search failed — try again.')
  const results = await res.json()
  if (!results.length) throw new Error('No matches. Try a different search.')
  return [Number(results[0].lat), Number(results[0].lon)]
}

export function formatCoords([lat, lng]) {
  return `${lat.toFixed(4)}°, ${lng.toFixed(4)}°`
}

// Short place name for the pin label — one request per pin stop, prototype volume only.
export async function reverseGeocode([lat, lng], signal) {
  const params = new URLSearchParams({
    format: 'jsonv2',
    lat: String(lat),
    lon: String(lng),
    zoom: '14',
  })
  const res = await fetch(`https://nominatim.openstreetmap.org/reverse?${params}`, {
    signal,
    headers: { 'Accept-Language': 'en,pt' },
  })
  if (!res.ok) throw new Error('Reverse geocode failed')
  const data = await res.json()
  const address = data.address ?? {}
  return (
    address.village ||
    address.town ||
    address.city ||
    address.municipality ||
    address.suburb ||
    address.neighbourhood ||
    data.display_name?.split(',')[0] ||
    formatCoords([lat, lng])
  )
}
