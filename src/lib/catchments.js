import { findBasinForPosition, getBasinName } from './hydrology'

export const CATCHMENTS = [
  { id: 'catchment-estoraos', name: 'Rio Estorãos catchment', color: '#6b4fa0' },
  { id: 'catchment-lima-lower', name: 'Lower Lima catchment', color: '#c76b3c' },
]

export function getCatchment(id) {
  const legacy = CATCHMENTS.find((c) => c.id === id)
  if (legacy) return legacy
  const value = String(id ?? 'unmapped')
  let hash = 0
  for (const character of value) hash = (hash * 31 + character.charCodeAt(0)) >>> 0
  const colors = ['#277f8e', '#6b4fa0', '#397f5e', '#a2642f', '#526fa5']
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
