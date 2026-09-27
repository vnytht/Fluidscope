export const SOURCE_USAGES = [
  'drinking',
  'swimming',
  'garden',
  'crops',
  'shower',
  'dishes',
  'laundry',
  'other',
]

export function asUsageList(value) {
  return Array.isArray(value) ? value.filter((id) => SOURCE_USAGES.includes(id)) : []
}

export function allUsagesSelected(list) {
  const current = asUsageList(list)
  return SOURCE_USAGES.every((id) => current.includes(id))
}

export function toggleUsage(list, id) {
  const current = asUsageList(list)
  if (current.includes(id)) return current.filter((item) => item !== id)
  return [...current, id]
}

export function toggleAllUsages(list) {
  return allUsagesSelected(list) ? [] : [...SOURCE_USAGES]
}
