import { useEffect, useMemo, useState } from 'react'
import { AppStateProvider, useAppState } from './context/AppStateContext'
import LoginScreen from './components/auth/LoginScreen'
import WatershedMap from './components/WatershedMap'
import LocationPicker from './components/map/LocationPicker'
import SampleMarkers from './components/map/SampleMarkers'
import AddFlowSheet from './components/AddFlow/AddFlowSheet'
import SourceDetailSheet from './components/source/SourceDetailSheet'
import FilterBar from './components/FilterBar'
import ChatPanel from './components/chat/ChatPanel'
import CatchmentHighlight from './components/map/CatchmentHighlight'
import SourceHistoryUxOptions from './pages/SourceHistoryUxOptions'
import { IconChat, IconPlus } from './components/ui/Icons'
import './App.css'

const DEFAULT_FILTERS = { sessionId: 'all', sourceType: 'all', measureId: 'all' }

function useHashRoute() {
  const [hash, setHash] = useState(() => window.location.hash)
  useEffect(() => {
    const onHash = () => setHash(window.location.hash)
    window.addEventListener('hashchange', onHash)
    return () => window.removeEventListener('hashchange', onHash)
  }, [])
  return hash
}

// PROTOTYPE — throwaway UX-flow build. State is fake/in-memory
// (AppStateContext), not a real backend. See src/context/AppStateContext.jsx.
function AppGate() {
  const { user, samples, sessions, qualityMeasures } = useAppState()
  const [flowActive, setFlowActive] = useState(true)
  const [flowStep, setFlowStep] = useState('location')
  const [pendingLocation, setPendingLocation] = useState(null)
  const [editSampleId, setEditSampleId] = useState(null)
  const [panRequest, setPanRequest] = useState(null)
  const [filters, setFilters] = useState(DEFAULT_FILTERS)
  const [chatOpen, setChatOpen] = useState(false)
  const [chatCatchmentId, setChatCatchmentId] = useState(null)
  const [selectedSampleId, setSelectedSampleId] = useState(null)

  const filteredSamples = useMemo(
    () =>
      samples.filter((s) => {
        if (filters.sessionId !== 'all' && s.sessionId !== filters.sessionId) return false
        if (filters.sourceType !== 'all' && s.sourceType !== filters.sourceType) return false
        if (
          filters.measureId !== 'all' &&
          !s.readings.some((r) => r.measureId === filters.measureId)
        )
          return false
        return true
      }),
    [samples, filters],
  )

  const selectedSample = filteredSamples.find((s) => s.id === selectedSampleId) ?? null
  const relatedSamples = selectedSample
    ? samples.filter(
        (s) => s.catchmentId === selectedSample.catchmentId && s.id !== selectedSample.id,
      )
    : []
  const editingSample = editSampleId ? samples.find((s) => s.id === editSampleId) : null
  const showSourceDetail = Boolean(selectedSample && !flowActive && !chatOpen)

  if (!user) {
    return <LoginScreen />
  }

  function closeFlow() {
    setFlowActive(false)
    setPendingLocation(null)
    setEditSampleId(null)
  }

  function openFlow() {
    setPendingLocation(null)
    setFlowStep('location')
    setEditSampleId(null)
    setFlowActive(true)
    setSelectedSampleId(null)
  }

  function startEdit(sample) {
    setSelectedSampleId(null)
    setEditSampleId(sample.id)
    setPendingLocation(sample.position)
    setFlowStep('location')
    setFlowActive(true)
  }

  function closeChat() {
    setChatOpen(false)
    setChatCatchmentId(null)
  }

  function handleFlowSaved(sampleId) {
    if (sampleId) setSelectedSampleId(sampleId)
  }

  return (
    <>
      <WatershedMap>
        <SampleMarkers
          samples={filteredSamples}
          selectedId={selectedSampleId}
          onSelect={setSelectedSampleId}
        />
        <CatchmentHighlight selectedSample={selectedSample} relatedSamples={relatedSamples} />
        <LocationPicker
          active={flowActive}
          editable={flowActive && flowStep === 'location'}
          location={pendingLocation}
          onPick={setPendingLocation}
          panRequest={panRequest}
        />
      </WatershedMap>

      {!flowActive && (
        <FilterBar
          sessions={sessions}
          qualityMeasures={qualityMeasures}
          filters={filters}
          onChange={setFilters}
          resultCount={filteredSamples.length}
          totalCount={samples.length}
        />
      )}

      {showSourceDetail && (
        <SourceDetailSheet
          sample={selectedSample}
          relatedSamples={relatedSamples}
          qualityMeasures={qualityMeasures}
          sessions={sessions}
          onClose={() => setSelectedSampleId(null)}
          onEdit={() => startEdit(selectedSample)}
        />
      )}

      {flowActive && (
        <AddFlowSheet
          editSampleId={editSampleId}
          initialData={editingSample}
          location={pendingLocation}
          onLocationChange={setPendingLocation}
          onPanRequest={(coords) => setPanRequest({ coords, id: Date.now() })}
          onClose={closeFlow}
          onStepChange={setFlowStep}
          onSaved={handleFlowSaved}
        />
      )}

      {!flowActive && !chatOpen && !showSourceDetail && (
        <button
          type="button"
          className="fab-chat"
          onClick={() => setChatOpen(true)}
          aria-label="Open chat"
        >
          <IconChat />
        </button>
      )}

      {!flowActive && (
        <button type="button" className="fab-add" onClick={openFlow} aria-label="Add a source">
          <IconPlus />
        </button>
      )}

      {chatOpen && (
        <ChatPanel catchmentId={chatCatchmentId} onClose={closeChat} />
      )}
    </>
  )
}

export default function App() {
  const hash = useHashRoute()

  if (hash === '#history-ux') {
    return <SourceHistoryUxOptions />
  }

  return (
    <AppStateProvider>
      <div className="app-shell">
        <AppGate />
      </div>
    </AppStateProvider>
  )
}
