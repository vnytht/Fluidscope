function bearingDeg(from, to) {
  const dLng = ((to[0] - from[0]) * Math.PI) / 180
  const lat1 = (from[1] * Math.PI) / 180
  const lat2 = (to[1] * Math.PI) / 180
  const y = Math.sin(dLng) * Math.cos(lat2)
  const x = Math.cos(lat1) * Math.sin(lat2) - Math.sin(lat1) * Math.cos(lat2) * Math.cos(dLng)
  return (Math.atan2(y, x) * 180) / Math.PI
}

function lineLength(coords) {
  let sum = 0
  for (let i = 1; i < coords.length; i += 1) {
    const dx = coords[i][0] - coords[i - 1][0]
    const dy = coords[i][1] - coords[i - 1][1]
    sum += Math.hypot(dx, dy)
  }
  return sum
}

function pointAlongLngLat(coords, t) {
  if (coords.length < 2) return null
  const target = lineLength(coords) * t
  let walked = 0
  for (let i = 1; i < coords.length; i += 1) {
    const a = coords[i - 1]
    const b = coords[i]
    const step = Math.hypot(b[0] - a[0], b[1] - a[1])
    if (walked + step >= target || i === coords.length - 1) {
      const u = step === 0 ? 0 : Math.min(1, (target - walked) / step)
      return {
        lngLat: [a[0] + (b[0] - a[0]) * u, a[1] + (b[1] - a[1]) * u],
        deg: bearingDeg(a, b),
      }
    }
    walked += step
  }
  return null
}

function offsetLngLat([lng, lat], deg, distDeg) {
  const rad = (deg * Math.PI) / 180
  const dLat = Math.cos(rad) * distDeg
  const dLng = (Math.sin(rad) * distDeg) / Math.max(0.2, Math.cos((lat * Math.PI) / 180))
  return [lng + dLng, lat + dLat]
}

/** Filled triangle on the channel: tip downhill, base across the line. */
function arrowPolygon(lngLat, deg, size) {
  const tip = offsetLngLat(lngLat, deg, size * 0.58)
  const back = offsetLngLat(lngLat, deg, -size * 0.42)
  const left = offsetLngLat(back, deg + 90, size * 0.4)
  const right = offsetLngLat(back, deg - 90, size * 0.4)
  return [[left, tip, right, left]]
}

function featureOrder(feature) {
  const raw = feature.properties?.stream_order ?? feature.properties?.river_rank ?? feature.properties?.ORD_STRA
  const order = Number(raw)
  return Number.isFinite(order) ? order : 1
}

export function buildArrowCollection(streams, zoom, options = {}) {
  if (!streams?.features) return { type: 'FeatureCollection', features: [] }

  const minOrder = options.minOrder ?? 0
  const maxPerLine = options.maxPerLine ?? 14
  const size = (options.size ?? 0.0028) * 2 ** (11 - zoom)
  const spacing = Math.max(0.002, size * (options.spacingScale ?? 2.8))
  const features = []

  streams.features.forEach((feature, index) => {
    if (featureOrder(feature) < minOrder) return
    const coords = feature.geometry?.coordinates
    if (!coords || coords.length < 2 || typeof coords[0][0] !== 'number') return
    const length = lineLength(coords)
    if (length < spacing * 0.35) return

    const count = Math.max(1, Math.min(maxPerLine, Math.floor(length / spacing)))
    for (let i = 1; i <= count; i += 1) {
      const t = count === 1 ? 0.55 : i / (count + 1)
      const placed = pointAlongLngLat(coords, Math.min(0.92, Math.max(0.12, t)))
      if (!placed) continue
      features.push({
        type: 'Feature',
        properties: { reversed: feature.properties?.reversed === true, parent: index },
        geometry: { type: 'Polygon', coordinates: arrowPolygon(placed.lngLat, placed.deg, size) },
      })
    }
  })

  return { type: 'FeatureCollection', features }
}

export function mergeFeatureCollections(...collections) {
  return {
    type: 'FeatureCollection',
    features: collections.flatMap((collection) => collection?.features ?? []),
  }
}
