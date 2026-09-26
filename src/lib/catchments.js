import { findBasinForPosition, getBasinName } from './hydrology'

export const CATCHMENTS = [
  { id: 'catchment-estoraos', name: 'Rio Estorãos catchment', color: '#1f4e8c' },
  { id: 'catchment-lima-lower', name: 'Lower Lima catchment', color: '#4f86c6' },
]

export function getCatchment(id) {
  const legacy = CATCHMENTS.find((c) => c.id === id)
  if (legacy) return legacy
  const value = String(id ?? 'unmapped')
  let hash = 0
  for (const character of value) hash = (hash * 31 + character.charCodeAt(0)) >>> 0
  const colors = ['#1f4e8c', '#4f86c6', '#2a6499', '#7aa3cf', '#3d6fa8']
  return { id: value, name: getBasinName(value), color: colors[hash % colors.length] }
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
export function assignCatchment(position) {
  const basin = findBasinForPosition(position)
  return basin ? String(basin.properties.HYBAS_ID) : 'unmapped'
}
