import { createContext, useCallback, useContext, useMemo, useState } from 'react'
import {
  DEFAULT_QUALITY_MEASURES,
  DEFAULT_WATERSHED_ID,
  SEED_CHAT_MESSAGES,
  SEED_CHAT_THREADS,
  SEED_SAMPLES,
  SEED_SESSIONS,
} from '../lib/mockData'
import { assignCatchment } from '../lib/catchments'
import { getHydrologyAssignment, hydrateSampleHydrology } from '../lib/hydrology'
import { attachChatPlace, communityThreadId } from '../lib/chatStructure'
import { getApaAssignment } from '../lib/apaCatchments'

// PROTOTYPE STATE — everything here lives in memory only. It stands in for
// Supabase Auth + Postgres so we can test the user flow before wiring up a
// real backend. Reloading the page wipes it; that's expected.

const AppStateContext = createContext(null)

function makeSessionId() {
  return `session-${Date.now().toString(36)}`
}

export function AppStateProvider({ children }) {
  const [user, setUser] = useState(null)
  const [samples, setSamples] = useState(() => SEED_SAMPLES.map(hydrateSampleHydrology))
  const [sessions, setSessions] = useState(SEED_SESSIONS)
  const [currentSessionId, setCurrentSessionId] = useState(null)
  const [qualityMeasures, setQualityMeasures] = useState(DEFAULT_QUALITY_MEASURES)
  const [chatThreads, setChatThreads] = useState(SEED_CHAT_THREADS)
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
    const hydrology = getHydrologyAssignment(sample.position)
    const apa = getApaAssignment(sample.position)
    setSamples((prev) => [
      ...prev,
      attachChatPlace({
        id: `sample-${Date.now().toString(36)}`,
        sessionId: currentSessionId,
        watershedId: activeWatershedId,
        catchmentId: hydrology.basinId ?? assignCatchment(sample.position),
        hydrology,
        apa,
        createdAt: new Date().toISOString(),
        ...sample,
      }),
    ])
  }

  function updateSample(id, patch) {
    setSamples((prev) =>
      prev.map((s) => {
        if (s.id !== id) return s
        const next = { ...s, ...patch }
        if (patch.position) {
          next.hydrology = getHydrologyAssignment(patch.position)
          next.catchmentId = next.hydrology.basinId ?? assignCatchment(patch.position)
          next.apa = getApaAssignment(patch.position)
          Object.assign(next, attachChatPlace(next))
        }
        return next
      }),
    )
  }

  function createThread({ basinId, townId, subject, title, placeId, placeLabel, text }) {
    const now = new Date().toISOString()
    const thread = {
      id: `thread-${Date.now().toString(36)}`,
      kind: 'topic',
      basinId,
      townId,
      subject,
      title: title?.trim() || '',
      placeId: placeId || null,
      placeLabel: placeLabel || null,
      author: user?.email ?? 'You',
      createdAt: now,
    }
    const message = {
      id: `msg-${Date.now().toString(36)}`,
      threadId: thread.id,
      author: thread.author,
      text: text.trim(),
      createdAt: now,
    }
    setChatThreads((prev) => [thread, ...prev])
    setChatMessages((prev) => [...prev, message])
    return thread
  }

  const ensureCommunityThread = useCallback((townId) => {
    const id = communityThreadId(townId)
    setChatThreads((prev) => {
      if (prev.some((thread) => thread.id === id)) return prev
      return [
        ...prev,
        {
          id,
          kind: 'community',
          basinId: 'lima',
          townId,
          subject: 'status',
          title: '',
          placeId: null,
          placeLabel: null,
          author: 'WaterScope',
          createdAt: new Date().toISOString(),
        },
      ]
    })
    return id
  }, [])

  function replyToThread(threadId, text) {
    setChatMessages((prev) => [
      ...prev,
      {
        id: `msg-${Date.now().toString(36)}`,
        threadId,
        author: user?.email ?? 'You',
        text: text.trim(),
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
      chatThreads,
      chatMessages,
      createThread,
      ensureCommunityThread,
      replyToThread,
      activeWatershedId,
      setActiveWatershedId,
    }),
    [user, samples, sessions, currentSessionId, qualityMeasures, chatThreads, chatMessages, activeWatershedId, ensureCommunityThread],
  )

  return <AppStateContext.Provider value={value}>{children}</AppStateContext.Provider>
}

export function useAppState() {
  const ctx = useContext(AppStateContext)
  if (!ctx) throw new Error('useAppState must be used within AppStateProvider')
  return ctx
}
