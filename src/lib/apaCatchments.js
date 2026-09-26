import apaBasinsRaw from '../data/apa_basins_rh1_viana.geojson?raw'
import apaSubBasinsRaw from '../data/apa_subbasins_rh1_viana.geojson?raw'

const apaBasins = JSON.parse(apaBasinsRaw)
const apaSubBasins = JSON.parse(apaSubBasinsRaw)

export const APA_BASIN_COLORS = {
  Lima: '#1f4e8c',
  Minho: '#4f86c6',
  Neiva: '#2a6499',
  Costeiras: '#7aa3cf',
}

const basinByCode = new Map(
  apaBasins.features.map((feature) => [String(feature.properties.code), feature]),
)
const subBasinByCode = new Map(
  apaSubBasins.features.map((feature) => [String(feature.properties.code), feature]),
)

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

export function getApaAssignment([lat, lng]) {
  const point = [lng, lat]
  for (const feature of apaSubBasins.features) {
    if (!pointInGeometry(point, feature.geometry)) continue
    const basinFeature = basinByCode.get(String(feature.properties.basin))
    return {
      code: String(feature.properties.code),
      name: feature.properties.name,
      subBasin: feature.properties.subBasin,
      basin: feature.properties.basin,
      basinName: basinFeature?.properties.name ?? feature.properties.basin,
    }
  }
  return null
}

export function getApaSubBasinFeature(code) {
  return subBasinByCode.get(String(code)) ?? null
}

export function getApaBasinFeature(basinCode) {
  return basinByCode.get(String(basinCode)) ?? null
}

export function analyzeApaNeighbours(origin, samples) {
  const assignment = origin.apa ?? getApaAssignment(origin.position)
  const neighbours = []
  const relationBySampleId = {}

  if (!assignment?.code) {
    return { assignment: null, neighbours, relationBySampleId }
  }

  for (const sample of samples) {
    if (sample.id === origin.id) continue
    const other = sample.apa ?? getApaAssignment(sample.position)
    if (other?.code === assignment.code) {
      neighbours.push(sample)
      relationBySampleId[sample.id] = 'same-apa'
    }
  }

  return { assignment, neighbours, relationBySampleId }
}
