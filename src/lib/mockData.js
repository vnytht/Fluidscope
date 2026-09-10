// PROTOTYPE DATA — in-memory only, wiped on reload. Stands in for Supabase.

export const WATERSHED_GROUPS = [
  { id: 'lima-viana', name: 'Lima — Viana do Castelo' },
  { id: 'neiva', name: 'Neiva' },
  { id: 'coura', name: 'Coura' },
]

export const DEFAULT_WATERSHED_ID = 'lima-viana'

export const SOURCE_TYPES = [
  'Mina (mine)',
  'Dug well',
  'Borehole',
  'Spring',
  'Shared reservoir',
  'Private reservoir',
]

export const DEFAULT_QUALITY_MEASURES = [
  { id: 'nitrate', name: 'Nitrate', scale: '0 / 10 / 25 / 50 / 100+ mg/L' },
  { id: 'ph', name: 'pH', scale: '5.5 / 6.5 / 7 / 8 / 9' },
]

// A couple of seeded samples + one past session, so filters and the map
// have something to work with before the user adds anything themselves.
export const SEED_SESSIONS = [
  { id: 'session-seed-1', label: 'Field day — 12 Jul' },
]

export const SEED_SAMPLES = [
  {
    id: 'seed-1',
    sessionId: 'session-seed-1',
    watershedId: 'lima-viana',
    catchmentId: 'catchment-estoraos',
    position: [41.706, -8.79],
    sourceType: 'Dug well',
    readings: [{ measureId: 'nitrate', value: '25' }, { measureId: 'ph', value: '5.5' }],
    hazards: ['septic', 'agriculture'],
    createdAt: '2026-07-12T10:15:00Z',
  },
  {
    id: 'seed-2',
    sessionId: 'session-seed-1',
    watershedId: 'lima-viana',
    catchmentId: 'catchment-estoraos',
    position: [41.685, -8.815],
    sourceType: 'Spring',
    readings: [{ measureId: 'nitrate', value: '0' }, { measureId: 'ph', value: '7' }],
    hazards: [],
    createdAt: '2026-07-12T11:02:00Z',
  },
  {
    id: 'seed-3',
    sessionId: 'session-seed-1',
    watershedId: 'lima-viana',
    catchmentId: 'catchment-lima-lower',
    position: [41.72, -8.83],
    sourceType: 'Borehole',
    readings: [{ measureId: 'ph', value: '6.5' }],
    hazards: [],
    createdAt: '2026-07-12T11:40:00Z',
  },
  {
    id: 'seed-4',
    sessionId: 'session-seed-1',
    watershedId: 'lima-viana',
    catchmentId: 'catchment-estoraos',
    position: [41.698, -8.802],
    sourceType: 'Mina (mine)',
    readings: [{ measureId: 'nitrate', value: '10' }],
    hazards: [],
    createdAt: '2026-07-12T12:10:00Z',
  },
]

export const SEED_CHAT_MESSAGES = [
  {
    id: 'msg-1',
    watershedId: 'lima-viana',
    author: 'Sofia (moderator)',
    text: 'Reminder: sample within a day or two of rain if you can — readings shift fast around here.',
    createdAt: '2026-07-11T09:00:00Z',
  },
  {
    id: 'msg-2',
    watershedId: 'lima-viana',
    catchmentId: 'catchment-estoraos',
    author: 'Tiago',
    text: 'Well by the old mill tested high nitrate again today.',
    createdAt: '2026-07-12T11:05:00Z',
  },
  {
    id: 'msg-2b',
    watershedId: 'lima-viana',
    catchmentId: 'catchment-estoraos',
    author: 'Ana',
    text: 'Same here after the rain — spring uphill looks fine though.',
    createdAt: '2026-07-12T14:20:00Z',
  },
  {
    id: 'msg-3',
    watershedId: 'neiva',
    author: 'Marta',
    text: 'Spring near Castelo do Neiva looks clear this week, pH steady at 7.',
    createdAt: '2026-07-10T08:30:00Z',
  },
]
