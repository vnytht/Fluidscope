export const CHAT_BASINS = [
  { id: 'lima', apaCode: 'PT01_LIMA', name: 'Lima' },
  { id: 'minho', apaCode: 'PT01_MINHO', name: 'Minho' },
  { id: 'neiva', apaCode: 'PT01_NEIVA', name: 'Neiva' },
  { id: 'costeiras', apaCode: 'PT01_COSTEIRAS', name: 'Costeiras' },
]

export const UNMAPPED_BASIN = { id: 'unmapped', apaCode: null, name: 'Outside APA' }

export const WHOLE_BASIN_TOWN_ID = 'whole-basin'

export const CHAT_TOWNS = [
  { id: 'viana', name: 'Viana do Castelo', center: [41.694, -8.837] },
  { id: 'caminha', name: 'Caminha', center: [41.876, -8.839] },
  { id: 'cerveira', name: 'Vila Nova de Cerveira', center: [41.941, -8.744] },
  { id: 'valenca', name: 'Valença', center: [42.028, -8.644] },
  { id: 'moncao', name: 'Monção', center: [42.079, -8.481] },
  { id: 'melgaco', name: 'Melgaço', center: [42.113, -8.26] },
  { id: 'paredes-coura', name: 'Paredes de Coura', center: [41.913, -8.56] },
  { id: 'ponte-lima', name: 'Ponte de Lima', center: [41.767, -8.583] },
  { id: 'ponte-barca', name: 'Ponte da Barca', center: [41.808, -8.309] },
  { id: 'arcos', name: 'Arcos de Valdevez', center: [41.847, -8.419] },
]

export const THREAD_SUBJECTS = [
  'hazard-alert',
  'hazard-discuss',
  'status',
  'investigation',
  'other',
]

export function basinIdFromApa(apa) {
  if (!apa?.basin) return UNMAPPED_BASIN.id
  const match = CHAT_BASINS.find((basin) => basin.apaCode === apa.basin)
  return match?.id ?? UNMAPPED_BASIN.id
}

export function getChatBasin(id) {
  if (id === UNMAPPED_BASIN.id) return UNMAPPED_BASIN
  return CHAT_BASINS.find((basin) => basin.id === id) ?? UNMAPPED_BASIN
}

export function getChatTown(id) {
  if (id === WHOLE_BASIN_TOWN_ID) return { id: WHOLE_BASIN_TOWN_ID, name: null }
  return CHAT_TOWNS.find((town) => town.id === id) ?? null
}

export function assignTown([lat, lng]) {
  let best = CHAT_TOWNS[0]
  let bestDist = Infinity
  for (const town of CHAT_TOWNS) {
    const dLat = lat - town.center[0]
    const dLng = lng - town.center[1]
    const dist = dLat * dLat + dLng * dLng
    if (dist < bestDist) {
      best = town
      bestDist = dist
    }
  }
  return best.id
}

export function attachChatPlace(sample) {
  return {
    ...sample,
    townId: sample.townId ?? (sample.position ? assignTown(sample.position) : null),
    basinChatId: sample.basinChatId ?? basinIdFromApa(sample.apa),
  }
}

export function placeLabelForSample(sample, fallback) {
  return sample.localName || sample.sourceType || fallback
}

export function samplesForChatPlace(samples, basinId, townId) {
  return samples.filter((sample) => {
    if (sample.basinChatId !== basinId) return false
    if (townId === WHOLE_BASIN_TOWN_ID) return true
    return sample.townId === townId
  })
}

export function threadsInScope(threads, basinId, townId) {
  return threads.filter((thread) => thread.basinId === basinId && thread.townId === townId)
}

export function lastMessageForThread(messages, threadId) {
  const owned = messages.filter((message) => message.threadId === threadId)
  if (!owned.length) return null
  return owned.reduce((latest, message) =>
    new Date(message.createdAt) > new Date(latest.createdAt) ? message : latest,
  )
}

export function messageCountForThread(messages, threadId) {
  return messages.filter((message) => message.threadId === threadId).length
}

export function townThreadCount(threads, basinId, townId) {
  return threads.filter((thread) => thread.basinId === basinId && thread.townId === townId).length
}

export function basinThreadCount(threads, basinId) {
  return threads.filter((thread) => thread.basinId === basinId).length
}
