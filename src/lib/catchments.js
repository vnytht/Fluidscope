// PROTOTYPE — a real catchment boundary would come from DEM-based watershed
// delineation: QGIS + a free elevation dataset (Copernicus GLO-30 DEM, ~30m
// res, covers Portugal) using its Processing Toolbox — fill sinks, compute
// flow direction, then flow accumulation, pick a pour point on the stream,
// run "watershed" to get the upstream polygon. That pipeline isn't wired up
// here; this file fakes its *output* (a catchment id per sample) so the UX
// of "these sources share the same underlying water" can be designed and
// tested before the real GIS work happens.
export const CATCHMENTS = [
  { id: 'catchment-estoraos', name: 'Rio Estorãos catchment', color: '#6b4fa0' },
  { id: 'catchment-lima-lower', name: 'Lower Lima catchment', color: '#c76b3c' },
]

export function getCatchment(id) {
  return CATCHMENTS.find((c) => c.id === id) ?? CATCHMENTS[0]
}

export function shortCatchmentName(name) {
  return name.replace(/^Rio /, '').replace(/ catchment$/i, '')
}

export function groupByCatchment(samples) {
  const groups = {}
  for (const s of samples) {
    if (!groups[s.catchmentId]) groups[s.catchmentId] = []
    groups[s.catchmentId].push(s)
  }
  return groups
}

// Stand-in for real delineation: assign a new sample to whichever existing
// sample is geographically nearest, and inherit its catchment.
export function assignCatchment(position, existingSamples) {
  if (existingSamples.length === 0) return CATCHMENTS[0].id
  let nearest = existingSamples[0]
  let nearestDist = Infinity
  for (const s of existingSamples) {
    const d = (s.position[0] - position[0]) ** 2 + (s.position[1] - position[1]) ** 2
    if (d < nearestDist) {
      nearestDist = d
      nearest = s
    }
  }
  return nearest.catchmentId
}
