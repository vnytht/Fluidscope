import watershedDataRaw from '../data/watershed_viana_district_lev12.geojson?raw'
import riverDataRaw from '../data/rivers_flow_network.geojson?raw'
import { sampleHasHazard } from './hazards'
import { evaluateReading } from './qualityBands'
import { getApaAssignment } from './apaCatchments'
import { attachChatPlace } from './chatStructure'

const watershedData = JSON.parse(watershedDataRaw)
const riverData = JSON.parse(riverDataRaw)

const normalizeId = (value) => (value == null ? null : String(Math.trunc(Number(value))))

const basinFeatures = watershedData.features
const basinById = new Map(
  basinFeatures.map((feature) => [normalizeId(feature.properties.HYBAS_ID), feature]),
)

const riversByBasin = new Map()
const riverById = new Map()
for (const feature of riverData.features) {
  const basinId = normalizeId(feature.properties.HYBAS_L12 ?? feature.properties.HYBAS_ID)
  if (!riversByBasin.has(basinId)) riversByBasin.set(basinId, [])
  riversByBasin.get(basinId).push(feature)
  riverById.set(normalizeId(feature.properties.HYRIV_ID), feature)
}

function pointInRing([x, y], ring) {
  let inside = false
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [xi, yi] = ring[i]
    const [xj, yj] = ring[j]
    const crosses = yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi
    if (crosses) inside = !inside
  }
  return inside
}

function pointInPolygon(point, coordinates) {
  if (!coordinates.length || !pointInRing(point, coordinates[0])) return false
  return !coordinates.slice(1).some((hole) => pointInRing(point, hole))
}

function pointInGeometry(point, geometry) {
  if (geometry.type === 'Polygon') return pointInPolygon(point, geometry.coordinates)
  if (geometry.type === 'MultiPolygon') {
    return geometry.coordinates.some((polygon) => pointInPolygon(point, polygon))
  }
  return false
}

export function findBasinForPosition([lat, lng]) {
  return basinFeatures.find((feature) => pointInGeometry([lng, lat], feature.geometry)) ?? null
}

function lineStrings(geometry) {
  if (geometry.type === 'LineString') return [geometry.coordinates]
  if (geometry.type === 'MultiLineString') return geometry.coordinates
  return []
}

function projectedPoint([lng, lat], referenceLat) {
  const radians = (referenceLat * Math.PI) / 180
  return [lng * 111.32 * Math.cos(radians), lat * 110.574]
}

function pointToSegmentKm(point, start, end) {
  const refLat = point[1]
  const [px, py] = projectedPoint(point, refLat)
  const [ax, ay] = projectedPoint(start, refLat)
  const [bx, by] = projectedPoint(end, refLat)
  const dx = bx - ax
  const dy = by - ay
  const lengthSquared = dx * dx + dy * dy
  const t = lengthSquared === 0 ? 0 : Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / lengthSquared))
  return { distanceKm: Math.hypot(px - (ax + t * dx), py - (ay + t * dy)), t }
}

function riverSnap([lat, lng], feature) {
  let best = { distanceKm: Infinity, progressKm: 0, lengthKm: 0 }
  let traversedKm = 0
  for (const line of lineStrings(feature.geometry)) {
    for (let index = 1; index < line.length; index += 1) {
      const segment = pointToSegmentKm([lng, lat], line[index - 1], line[index])
      const segmentLength = pointToSegmentKm(line[index - 1], line[index], line[index]).distanceKm
      if (segment.distanceKm < best.distanceKm) {
        best = {
          distanceKm: segment.distanceKm,
          progressKm: traversedKm + segment.t * segmentLength,
          lengthKm: 0,
        }
      }
      traversedKm += segmentLength
    }
  }
  best.lengthKm = traversedKm
  return best
}

export function getHydrologyAssignment(position) {
  const basin = findBasinForPosition(position)
  if (!basin) {
    return { basinId: null, riverId: null, riverDistanceKm: null, streamOrder: null }
  }

  const basinId = normalizeId(basin.properties.HYBAS_ID)
  const rivers = riversByBasin.get(basinId) ?? []
  let nearest = null
  let nearestSnap = { distanceKm: Infinity, progressKm: null, lengthKm: null }
  for (const river of rivers) {
    const snap = riverSnap(position, river)
    if (snap.distanceKm < nearestSnap.distanceKm) {
      nearest = river
      nearestSnap = snap
    }
  }

  return {
    basinId,
    pfafId: String(basin.properties.PFAF_ID ?? ''),
    riverId: nearest ? normalizeId(nearest.properties.HYRIV_ID) : null,
    nextRiverId: nearest ? normalizeId(nearest.properties.NEXT_DOWN) : null,
    riverDistanceKm: Number.isFinite(nearestSnap.distanceKm) ? nearestSnap.distanceKm : null,
    riverProgressKm: nearestSnap.progressKm,
    riverLengthKm: nearestSnap.lengthKm,
    streamOrder: nearest ? Number(nearest.properties.ORD_STRA) : null,
  }
}

export function hydrateSampleHydrology(sample) {
  const hydrology = getHydrologyAssignment(sample.position)
  return attachChatPlace({
    ...sample,
    catchmentId: hydrology.basinId ?? 'unmapped',
    hydrology,
    apa: getApaAssignment(sample.position),
  })
}

export function getBasinFeature(basinId) {
  return basinById.get(normalizeId(basinId)) ?? null
}

export function getBasinName(basinId) {
  const feature = getBasinFeature(basinId)
  if (!feature) return 'Outside mapped catchments'
  return `Sub-basin ${feature.properties.PFAF_ID}`
}

const basinsDrainingInto = new Map()
for (const feature of basinFeatures) {
  const basinId = normalizeId(feature.properties.HYBAS_ID)
  const nextId = normalizeId(feature.properties.NEXT_DOWN)
  if (!nextId || nextId === '0') continue
  if (!basinsDrainingInto.has(nextId)) basinsDrainingInto.set(nextId, [])
  basinsDrainingInto.get(nextId).push(basinId)
}

export function getUpstreamBasinIds(startBasinId) {
  const originId = normalizeId(startBasinId)
  const path = []
  const visited = new Set()
  const stack = [...(basinsDrainingInto.get(originId) ?? [])]

  while (stack.length) {
    const basinId = stack.pop()
    if (!basinId || visited.has(basinId)) continue
    visited.add(basinId)
    path.push(basinId)
    stack.push(...(basinsDrainingInto.get(basinId) ?? []))
  }

  return path
}

export function getDownstreamBasinPath(startBasinId) {
  const path = []
  const visited = new Set()
  let currentId = normalizeId(startBasinId)
  let exitsDataset = false

  while (currentId && currentId !== '0' && !visited.has(currentId)) {
    const feature = basinById.get(currentId)
    if (!feature) {
      exitsDataset = true
      break
    }
    path.push(currentId)
    visited.add(currentId)
    const nextId = normalizeId(feature.properties.NEXT_DOWN)
    if (nextId !== '0' && !basinById.has(nextId)) exitsDataset = true
    currentId = nextId
  }

  return { basinIds: path, exitsDataset }
}

const basinHopById = new Map()
let maxBasinHops = 0
for (const feature of basinFeatures) {
  const id = normalizeId(feature.properties.HYBAS_ID)
  const hops = Math.max(0, getDownstreamBasinPath(id).basinIds.length - 1)
  basinHopById.set(id, hops)
  if (hops > maxBasinHops) maxBasinHops = hops
}

export function getBasinHopCount(basinId) {
  return basinHopById.get(normalizeId(basinId)) ?? 0
}

export function getMaxBasinHops() {
  return maxBasinHops
}

export function getBasinFlowNetworkGeoJson() {
  const features = []
  for (const feature of basinFeatures) {
    const id = normalizeId(feature.properties.HYBAS_ID)
    const nextId = normalizeId(feature.properties.NEXT_DOWN)
    if (!nextId || nextId === '0' || !basinById.has(nextId)) continue
    const from = getBasinCenter(id)
    const to = getBasinCenter(nextId)
    if (!from || !to) continue
    features.push({
      type: 'Feature',
      properties: { from: id, to: nextId, hops: getBasinHopCount(id) },
      geometry: {
        type: 'LineString',
        coordinates: [
          [from[1], from[0]],
          [to[1], to[0]],
        ],
      },
    })
  }
  return { type: 'FeatureCollection', features }
}

export function getDownstreamRiverPath(startRiverId) {
  const path = []
  const visited = new Set()
  let currentId = normalizeId(startRiverId)
  while (currentId && currentId !== '0' && !visited.has(currentId)) {
    const feature = riverById.get(currentId)
    if (!feature) break
    path.push(currentId)
    visited.add(currentId)
    currentId = normalizeId(feature.properties.NEXT_DOWN)
  }
  return path
}

export function hasReportedIssue(sample) {
  if (sampleHasHazard(sample)) return true
  return sample.readings.some((reading) => {
    const evaluation = evaluateReading(reading.measureId, reading.value)
    return evaluation.band?.safety === 'caution' || evaluation.band?.safety === 'concern'
  })
}

export function analyzeDownstreamImpact(origin, samples) {
  const assignment = origin.hydrology?.basinId
    ? origin.hydrology
    : getHydrologyAssignment(origin.position)
  const { basinIds, exitsDataset } = getDownstreamBasinPath(assignment.basinId)
  const upstreamBasinIds = getUpstreamBasinIds(assignment.basinId)
  const downstreamIds = new Set(basinIds.slice(1))
  const upstreamIds = new Set(upstreamBasinIds)
  const localBasinSamples = []
  const sameBasinSamples = []
  const downstreamSamples = []
  const upstreamSamples = []
  const relationBySampleId = {}

  for (const sample of samples) {
    if (sample.id === origin.id) continue
    const sampleAssignment = sample.hydrology?.basinId
      ? sample.hydrology
      : getHydrologyAssignment(sample.position)
    if (!assignment.basinId || !sampleAssignment.basinId) continue

    if (sampleAssignment.basinId === assignment.basinId) {
      localBasinSamples.push(sample)
      sameBasinSamples.push(sample)
      relationBySampleId[sample.id] = 'same-basin'
    } else if (downstreamIds.has(sampleAssignment.basinId)) {
      downstreamSamples.push(sample)
      relationBySampleId[sample.id] = 'downstream'
    } else if (upstreamIds.has(sampleAssignment.basinId)) {
      upstreamSamples.push(sample)
      relationBySampleId[sample.id] = 'upstream'
    }
  }

  const contextBasinIds = [assignment.basinId, ...upstreamBasinIds, ...basinIds.slice(1)].filter(Boolean)

  return {
    originId: origin.id,
    originPosition: origin.position,
    originAssignment: assignment,
    basinIds,
    contextBasinIds,
    upstreamBasinIds,
    downstreamBasinIds: basinIds.slice(1),
    localBasinSamples,
    sameBasinSamples,
    upstreamSamples,
    downstreamSamples,
    relationBySampleId,
    exitsDataset,
    hasIssue: hasReportedIssue(origin),
  }
}

function outerRings(geometry) {
  if (geometry.type === 'Polygon') return [geometry.coordinates[0]]
  if (geometry.type === 'MultiPolygon') return geometry.coordinates.map((polygon) => polygon[0])
  return []
}

export function getBasinsBbox(basinIds) {
  const selected = (basinIds ?? []).map(normalizeId).filter(Boolean)
  if (!selected.length) return null

  const bounds = { minLat: Infinity, maxLat: -Infinity, minLng: Infinity, maxLng: -Infinity }
  for (const basinId of selected) {
    const feature = basinById.get(basinId)
    if (!feature) continue
    for (const ring of outerRings(feature.geometry)) {
      for (const [lng, lat] of ring) {
        bounds.minLat = Math.min(bounds.minLat, lat)
        bounds.maxLat = Math.max(bounds.maxLat, lat)
        bounds.minLng = Math.min(bounds.minLng, lng)
        bounds.maxLng = Math.max(bounds.maxLng, lng)
      }
    }
  }

  if (!Number.isFinite(bounds.minLat)) return null
  const pad = 0.02
  return {
    west: bounds.minLng - pad,
    south: bounds.minLat - pad,
    east: bounds.maxLng + pad,
    north: bounds.maxLat + pad,
  }
}

export function getBasinCenter(basinId) {
  const feature = getBasinFeature(basinId)
  if (!feature) return null
  const coordinates = outerRings(feature.geometry).flat()
  const bounds = coordinates.reduce(
    (result, [lng, lat]) => ({
      minLat: Math.min(result.minLat, lat),
      maxLat: Math.max(result.maxLat, lat),
      minLng: Math.min(result.minLng, lng),
      maxLng: Math.max(result.maxLng, lng),
    }),
    { minLat: Infinity, maxLat: -Infinity, minLng: Infinity, maxLng: -Infinity },
  )
  return [(bounds.minLat + bounds.maxLat) / 2, (bounds.minLng + bounds.maxLng) / 2]
}

export function getBasinFlowArrows(basinIds, maximum = 14) {
  const selected = (basinIds ?? []).map(normalizeId).filter(Boolean)
  const arrows = []

  for (const basinId of selected) {
    const nextId = normalizeId(getBasinFeature(basinId)?.properties.NEXT_DOWN)
    if (!nextId || nextId === '0') continue
    const from = getBasinCenter(basinId)
    const to = getBasinCenter(nextId)
    if (!from || !to) continue
    arrows.push({
      id: `${basinId}-${nextId}`,
      from,
      to,
      position: [from[0] + (to[0] - from[0]) * 0.4, from[1] + (to[1] - from[1]) * 0.4],
    })
  }

  if (arrows.length <= maximum) return arrows
  const step = Math.ceil(arrows.length / maximum)
  return arrows.filter((_, index) => index % step === 0)
}

export function getDownstreamEdges(basinIds) {
  const included = new Set(basinIds)
  return basinIds.flatMap((basinId) => {
    const feature = getBasinFeature(basinId)
    const nextId = normalizeId(feature?.properties.NEXT_DOWN)
    if (!nextId || !included.has(nextId)) return []
    return [{ from: basinId, to: nextId, positions: [getBasinCenter(basinId), getBasinCenter(nextId)] }]
  })
}

export function getWatershedGeoJson(basinIds = null) {
  const selected = basinIds ? new Set(basinIds.map(normalizeId)) : null
  return {
    type: 'FeatureCollection',
    features: selected
      ? basinFeatures.filter((feature) => selected.has(normalizeId(feature.properties.HYBAS_ID)))
      : basinFeatures,
  }
}

export function getRiverGeoJson(basinIds = null) {
  const selected = basinIds ? new Set(basinIds.map(normalizeId)) : null
  return {
    type: 'FeatureCollection',
    features: selected
      ? riverData.features.filter((feature) =>
          selected.has(normalizeId(feature.properties.HYBAS_L12 ?? feature.properties.HYBAS_ID)),
        )
      : riverData.features,
  }
}

export function getRiverGeoJsonByReachIds(reachIds) {
  const selected = new Set(reachIds.map(normalizeId))
  return {
    type: 'FeatureCollection',
    features: riverData.features.filter((feature) =>
      selected.has(normalizeId(feature.properties.HYRIV_ID)),
    ),
  }
}

export function getRiverFlowArrows(reachIds, maximum = 14) {
  const features = getRiverGeoJsonByReachIds(reachIds).features
  const step = Math.max(1, Math.ceil(features.length / maximum))
  return features.filter((_, index) => index % step === 0).flatMap((feature) => {
    const line = mainLineForGeometry(feature.geometry)
    if (line.length < 2) return []
    const index = Math.max(1, Math.floor(line.length / 2))
    const from = line[index - 1]
    const to = line[index]
    return [{
      id: normalizeId(feature.properties.HYRIV_ID),
      positions: [[from[1], from[0]], [to[1], to[0]]],
    }]
  })
}

function mainLineForGeometry(geometry) {
  if (geometry.type === 'LineString') return geometry.coordinates
  return geometry.coordinates.reduce((longest, line) => (line.length > longest.length ? line : longest), [])
}
