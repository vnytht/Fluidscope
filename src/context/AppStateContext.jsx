import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { DEFAULT_QUALITY_MEASURES, DEFAULT_WATERSHED_ID } from '../lib/mockData'
import { assignCatchment } from '../lib/catchments'
import { getHydrologyAssignment, hydrateSampleHydrology } from '../lib/hydrology'
import { attachChatPlace, communityThreadId } from '../lib/chatStructure'
import { getApaAssignment } from '../lib/apaCatchments'
import { api, failCode } from '../lib/api'

const AppStateContext = createContext(null)

function isStaffUser(user) {
  return user?.role === 'staff'
}

function canEditRecord(user, createdBy) {
  if (!user) return false
  if (isStaffUser(user)) return true
  return Boolean(createdBy) && createdBy === user.id
}

export function AppStateProvider({ children }) {
  const [ready, setReady] = useState(false)
  const [apiError, setApiError] = useState(null)
  const [user, setUser] = useState(null)
  const [activity, setActivity] = useState([])
  const [samples, setSamples] = useState([])
  const [mapHazards, setMapHazards] = useState([])
  const [qualityMeasures, setQualityMeasures] = useState(DEFAULT_QUALITY_MEASURES)
  const [chatThreads, setChatThreads] = useState([])
  const [chatMessages, setChatMessages] = useState([])
  const [activeWatershedId, setActiveWatershedId] = useState(DEFAULT_WATERSHED_ID)

  const applyBootstrap = useCallback((data) => {
    setUser(data.user ?? null)
    setSamples((data.samples ?? []).map(hydrateSampleHydrology))
    setMapHazards(data.hazards ?? [])
    setChatThreads(data.threads ?? [])
    setChatMessages(data.messages ?? [])
    setActivity(data.activity ?? [])
    setApiError(null)
  }, [])

  const refresh = useCallback(async () => {
    const data = await api.bootstrap()
    applyBootstrap(data)
    return data
  }, [applyBootstrap])

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      let lastErr = null
      for (let attempt = 0; attempt < 16 && !cancelled; attempt += 1) {
        try {
          const data = await api.bootstrap()
          if (!cancelled) applyBootstrap(data)
          lastErr = null
          break
        } catch (err) {
          lastErr = err
          if (err.status === 401) {
            if (!cancelled) {
              setUser(null)
              setApiError(null)
            }
            lastErr = null
            break
          }
          await new Promise((resolve) => setTimeout(resolve, 400))
        }
      }
      if (cancelled) return
      if (lastErr) setApiError(failCode(lastErr, 'offline'))
      setReady(true)
    })()
    return () => {
      cancelled = true
    }
  }, [applyBootstrap])

  const signup = useCallback(async ({ username, email, password, privacyAccepted }) => {
    try {
      await api.signup({ username, email, password, privacyAccepted })
      await refresh()
      return { ok: true }
    } catch (err) {
      return { ok: false, error: failCode(err) }
    }
  }, [refresh])

  const login = useCallback(async ({ identifier, username, email, password }) => {
    try {
      await api.login({ identifier, username, email, password })
      await refresh()
      return { ok: true }
    } catch (err) {
      return { ok: false, error: failCode(err) }
    }
  }, [refresh])

  const resetPassword = useCallback(async ({ email, password }) => {
    try {
      await api.resetPassword({ email, password })
      return { ok: true }
    } catch (err) {
      return { ok: false, error: failCode(err) }
    }
  }, [])

  const logout = useCallback(async () => {
    try {
      await api.logout()
    } catch {
      /* still clear local session */
    }
    setUser(null)
    setSamples([])
    setMapHazards([])
    setChatThreads([])
    setChatMessages([])
    setActivity([])
  }, [])

  async function addMapHazards(entries) {
    if (!entries?.length) return
    const created = await api.createHazards(entries)
    setMapHazards((prev) => [...prev, ...(created.hazards ?? [])])
    setActivity((prev) => [
      {
        id: `act-${Date.now().toString(36)}`,
        type: 'hazard_add',
        detail: `${entries.length}`,
        at: new Date().toISOString(),
        userId: user?.id ?? null,
        username: user?.username ?? null,
      },
      ...prev,
    ].slice(0, 200))
  }

  async function addSample(sample) {
    const hydrology = getHydrologyAssignment(sample.position)
    const apa = getApaAssignment(sample.position)
    const now = new Date().toISOString()
    const payload = attachChatPlace({
      watershedId: activeWatershedId,
      catchmentId: hydrology.basinId ?? assignCatchment(sample.position),
      hydrology,
      apa,
      createdAt: now,
      ...sample,
    })
    const created = await api.createSource(payload)
    setSamples((prev) => [...prev, hydrateSampleHydrology(created)])
    return created
  }

  async function updateSample(id, patch) {
    const current = samples.find((s) => s.id === id)
    if (!canEditRecord(user, current?.createdBy)) {
      throw Object.assign(new Error('forbidden'), { code: 'forbidden' })
    }
    let nextPatch = { ...patch, updatedAt: new Date().toISOString() }
    if (patch.position) {
      nextPatch.hydrology = getHydrologyAssignment(patch.position)
      nextPatch.catchmentId = nextPatch.hydrology.basinId ?? assignCatchment(patch.position)
      nextPatch.apa = getApaAssignment(patch.position)
      Object.assign(nextPatch, attachChatPlace({ ...current, ...nextPatch }))
    }
    const updated = await api.updateSource(id, nextPatch)
    setSamples((prev) => prev.map((s) => (s.id === id ? hydrateSampleHydrology(updated) : s)))
    return updated
  }

  async function deleteSample(id) {
    if (!isStaffUser(user)) {
      throw Object.assign(new Error('forbidden'), { code: 'forbidden' })
    }
    await api.deleteSource(id)
    setSamples((prev) => prev.filter((s) => s.id !== id))
  }

  async function deleteMapHazard(id) {
    if (!isStaffUser(user)) {
      throw Object.assign(new Error('forbidden'), { code: 'forbidden' })
    }
    await api.deleteHazard(id)
    setMapHazards((prev) => prev.filter((h) => h.id !== id))
  }

  async function createThread({ basinId, townId, subject, title, placeId, placeLabel, text }) {
    const created = await api.createThread({
      basinId,
      townId,
      subject,
      title,
      placeId,
      placeLabel,
      text,
    })
    setChatThreads((prev) => [created.thread, ...prev])
    setChatMessages((prev) => [...prev, created.message])
    return created.thread
  }

  const ensureCommunityThread = useCallback(async (townId) => {
    const id = communityThreadId(townId)
    if (chatThreads.some((thread) => thread.id === id)) return id
    const created = await api.ensureCommunity(townId)
    setChatThreads((prev) => (prev.some((thread) => thread.id === id) ? prev : [...prev, created.thread]))
    return id
  }, [chatThreads])

  async function replyToThread(threadId, text) {
    const message = await api.replyToThread(threadId, text)
    setChatMessages((prev) => [...prev, message])
    return message
  }

  const canEditSample = useCallback((sample) => canEditRecord(user, sample?.createdBy), [user])
  const canEditHazard = useCallback((hazard) => canEditRecord(user, hazard?.createdBy), [user])
  const canDeletePins = isStaffUser(user)

  const value = useMemo(
    () => ({
      ready,
      apiError,
      user,
      activity,
      login,
      signup,
      resetPassword,
      logout,
      samples,
      mapHazards,
      addMapHazards,
      qualityMeasures,
      addSample,
      updateSample,
      deleteSample,
      deleteMapHazard,
      canEditSample,
      canEditHazard,
      canDeletePins,
      chatThreads,
      chatMessages,
      createThread,
      ensureCommunityThread,
      replyToThread,
      activeWatershedId,
      setActiveWatershedId,
    }),
    [
      ready,
      apiError,
      user,
      activity,
      login,
      signup,
      resetPassword,
      logout,
      samples,
      mapHazards,
      qualityMeasures,
      chatThreads,
      chatMessages,
      activeWatershedId,
      ensureCommunityThread,
      canEditSample,
      canEditHazard,
      canDeletePins,
    ],
  )

  return <AppStateContext.Provider value={value}>{children}</AppStateContext.Provider>
}

export function useAppState() {
  const ctx = useContext(AppStateContext)
  if (!ctx) throw new Error('useAppState must be used within AppStateProvider')
  return ctx
}
