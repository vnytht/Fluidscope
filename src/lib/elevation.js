const cache = new Map()

export function elevationCacheKey(position) {
  const lat = position?.[0]
  const lng = position?.[1]
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null
  return `${lat.toFixed(5)},${lng.toFixed(5)}`
}

/** Ground elevation at a lat/lng. Open-Meteo DEM (Copernicus / SRTM), same family as OSM terrain maps. */
export async function fetchElevationMeters(position, signal) {
  const key = elevationCacheKey(position)
  if (!key) return null
  if (cache.has(key)) return cache.get(key)

  const params = new URLSearchParams({
    latitude: String(position[0]),
    longitude: String(position[1]),
  })
  const res = await fetch(`https://api.open-meteo.com/v1/elevation?${params}`, { signal })
  if (!res.ok) throw new Error('elevation')
  const data = await res.json()
  const meters = Number(data.elevation?.[0])
  const value = Number.isFinite(meters) ? Math.round(meters) : null
  cache.set(key, value)
  return value
}
