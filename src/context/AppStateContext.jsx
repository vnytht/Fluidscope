import { createContext, useContext, useMemo, useState } from 'react'
import {
  DEFAULT_QUALITY_MEASURES,
  DEFAULT_WATERSHED_ID,
  SEED_CHAT_MESSAGES,
  SEED_SAMPLES,
  SEED_SESSIONS,
} from '../lib/mockData'
import { assignCatchment } from '../lib/catchments'

// PROTOTYPE STATE — everything here lives in memory only. It stands in for
// Supabase Auth + Postgres so we can test the user flow before wiring up a
// real backend. Reloading the page wipes it; that's expected.

const AppStateContext = createContext(null)

function makeSessionId() {
  return `session-${Date.now().toString(36)}`
}

export function AppStateProvider({ children }) {
  const [user, setUser] = useState(null)
  const [samples, setSamples] = useState(SEED_SAMPLES)
  const [sessions, setSessions] = useState(SEED_SESSIONS)
  const [currentSessionId, setCurrentSessionId] = useState(null)
  const [qualityMeasures, setQualityMeasures] = useState(DEFAULT_QUALITY_MEASURES)
  const [chatMessages, setChatMessages] = useState(SEED_CHAT_MESSAGES)
  const [activeWatershedId, setActiveWatershedId] = useState(DEFAULT_WATERSHED_ID)

  function login(email) {
    setUser({ email })
    const newSession = { id: makeSessionId(), label: 'Today' }
    setSessions((prev) => [newSession, ...prev])
    setCurrentSessionId(newSession.id)
  }

  function logout() {
    setUser(null)
    setCurrentSessionId(null)
  }

  function addQualityMeasure(measure) {
    setQualityMeasures((prev) => [...prev, measure])
    return measure
  }

  function addSample(sample) {
    setSamples((prev) => [
      ...prev,
      {
        id: `sample-${Date.now().toString(36)}`,
        sessionId: currentSessionId,
        watershedId: activeWatershedId,
        // PROTOTYPE — stands in for real DEM-based watershed delineation.
        // See src/lib/catchments.js.
        catchmentId: assignCatchment(sample.position, prev),
        createdAt: new Date().toISOString(),
        ...sample,
      },
    ])
  }

  function updateSample(id, patch) {
    setSamples((prev) =>
      prev.map((s) => {
        if (s.id !== id) return s
        const next = { ...s, ...patch }
        if (patch.position) {
          next.catchmentId = assignCatchment(patch.position, prev.filter((x) => x.id !== id))
        }
        return next
      }),
    )
  }

  function sendMessage(watershedId, text, { catchmentId = null } = {}) {
    setChatMessages((prev) => [
      ...prev,
      {
        id: `msg-${Date.now().toString(36)}`,
        watershedId,
        catchmentId,
        author: user?.email ?? 'You',
        text,
        createdAt: new Date().toISOString(),
      },
    ])
  }

  const value = useMemo(
    () => ({
      user,
      login,
      logout,
      samples,
      sessions,
      currentSessionId,
      qualityMeasures,
      addQualityMeasure,
      addSample,
      updateSample,
      chatMessages,
      sendMessage,
      activeWatershedId,
      setActiveWatershedId,
    }),
    [user, samples, sessions, currentSessionId, qualityMeasures, chatMessages, activeWatershedId],
  )

  return <AppStateContext.Provider value={value}>{children}</AppStateContext.Provider>
}

export function useAppState() {
  const ctx = useContext(AppStateContext)
  if (!ctx) throw new Error('useAppState must be used within AppStateProvider')
  return ctx
}
