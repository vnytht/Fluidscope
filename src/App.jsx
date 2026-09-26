import { useEffect, useMemo, useState } from 'react'
import { AppStateProvider, useAppState } from './context/AppStateContext'
import { LanguageProvider, useLanguage } from './context/LanguageContext'
import LanguageToggle from './components/ui/LanguageToggle'
import LoginScreen from './components/auth/LoginScreen'
import WatershedMap from './components/WatershedMap'
import LocationPicker from './components/map/LocationPicker'
import SampleMarkers from './components/map/SampleMarkers'
import AddFlowSheet from './components/AddFlow/AddFlowSheet'
import SourceDetailSheet from './components/source/SourceDetailSheet'
import FilterBar from './components/FilterBar'
import ChatPanel from './components/chat/ChatPanel'
import HydrologyLayer from './components/map/HydrologyLayer'
import ElevationLayer from './components/map/ElevationLayer'
import DetailedWaterLayer from './components/map/DetailedWaterLayer'
import BasinLayers from './components/map/BasinLayers'
import MapLayersControl from './components/map/MapLayersControl'
import SourceHistoryUxOptions from './pages/SourceHistoryUxOptions'
import FlowVizOptions from './pages/FlowVizOptions'
import { IconChat, IconPlus } from './components/ui/Icons'
import { analyzeDownstreamImpact } from './lib/hydrology'
import { analyzeApaNeighbours } from './lib/apaCatchments'
import { DEFAULT_FILTERS, applyFilters, isDefaultFilters } from './lib/filters'
import { DEFAULT_MAP_LAYERS } from './lib/mapLayers'
import './App.css'

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
  const { t } = useLanguage()
  const { user, samples, sessions, qualityMeasures } = useAppState()
  const [flowActive, setFlowActive] = useState(true)
  const [flowStep, setFlowStep] = useState('location')
  const [pendingLocation, setPendingLocation] = useState(null)
  const [editSampleId, setEditSampleId] = useState(null)
  const [panRequest, setPanRequest] = useState(null)
  const [filters, setFilters] = useState(DEFAULT_FILTERS)
  const [mapLayers, setMapLayers] = useState(DEFAULT_MAP_LAYERS)
  const [chatOpen, setChatOpen] = useState(false)
  const [selectedSampleId, setSelectedSampleId] = useState(null)

  const filteredSamples = useMemo(() => applyFilters(samples, filters), [samples, filters])

  const selectedSample = filteredSamples.find((s) => s.id === selectedSampleId) ?? null
  const impactAnalysis = useMemo(() => {
    if (!selectedSample) return null
    const hydro = analyzeDownstreamImpact(selectedSample, samples)
    const apa = analyzeApaNeighbours(selectedSample, samples)
    return {
      ...hydro,
      apa,
      sameBasinSamples: apa.neighbours,
      localBasinSamples: apa.neighbours,
      relationBySampleId: { ...hydro.relationBySampleId, ...apa.relationBySampleId },
    }
  }, [selectedSample, samples])
  const relatedSamples = impactAnalysis?.localBasinSamples ?? []
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
  }

  function handleFlowSaved(sampleId) {
    if (sampleId) setSelectedSampleId(sampleId)
  }

  return (
    <>
      <WatershedMap>
        <ElevationLayer active={mapLayers.elevation} />
        <BasinLayers
          showBasins={mapLayers.basins}
          showSubBasins={mapLayers.subBasins}
        />
        <DetailedWaterLayer
          active={mapLayers.streams}
          emphasized={!isDefaultFilters(filters)}
        />
        <HydrologyLayer apa={flowActive ? null : impactAnalysis?.apa?.assignment} />
        <SampleMarkers
          samples={filteredSamples}
          selectedId={selectedSampleId}
          onSelect={setSelectedSampleId}
          impactAnalysis={impactAnalysis}
        />
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

      {!flowActive && (
        <MapLayersControl layers={mapLayers} onChange={setMapLayers} />
      )}

      {showSourceDetail && (
        <SourceDetailSheet
          sample={selectedSample}
          relatedSamples={relatedSamples}
          impactAnalysis={impactAnalysis}
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
          aria-label={t('fab.chat')}
        >
          <IconChat />
          <span>{t('fab.chatLabel')}</span>
        </button>
      )}

      {!flowActive && (
        <button type="button" className="fab-add" onClick={openFlow} aria-label={t('fab.add')}>
          <IconPlus />
        </button>
      )}

      {showSourceDetail && (
        <div className="hydrology-map-key" aria-label={t('mapKey.label')}>
          <span><i className="hydrology-map-key__elev" />{t('mapKey.elevation')}</span>
          <span><i className="hydrology-map-key__river" />{t('mapKey.rivers')}</span>
          <span><i className="hydrology-map-key__contour" />{t('mapKey.contour')}</span>
          <span><i className="hydrology-map-key__here" />{t('mapKey.here')}</span>
        </div>
      )}

      {chatOpen && (
        <ChatPanel onClose={closeChat} />
      )}
    </>
  )
}

export default function App() {
  const hash = useHashRoute()

  return (
    <LanguageProvider>
      <AppStateProvider>
        <div className="app-shell">
          <LanguageToggle />
          {hash === '#history-ux' ? (
            <SourceHistoryUxOptions />
          ) : hash === '#flow-viz' ? (
            <FlowVizOptions />
          ) : (
            <AppGate />
          )}
        </div>
      </AppStateProvider>
    </LanguageProvider>
  )
}
