import { useEffect, useMemo, useState } from 'react'
import { AppStateProvider, useAppState } from './context/AppStateContext'
import { LanguageProvider, useLanguage } from './context/LanguageContext'
import LanguageToggle from './components/ui/LanguageToggle'
import LoginScreen from './components/auth/LoginScreen'
import ProfileSheet from './components/auth/ProfileSheet'
import WatershedMap from './components/WatershedMap'
import LocationPicker from './components/map/LocationPicker'
import SampleMarkers from './components/map/SampleMarkers'
import HazardMarkers from './components/map/HazardMarkers'
import AddFlowSheet from './components/AddFlow/AddFlowSheet'
import SourceDetailSheet from './components/source/SourceDetailSheet'
import HazardDetailSheet from './components/source/HazardDetailSheet'
import FilterBar from './components/FilterBar'
import ChatPanel from './components/chat/ChatPanel'
import HydrologyLayer from './components/map/HydrologyLayer'
import ElevationLayer from './components/map/ElevationLayer'
import DetailedWaterLayer from './components/map/DetailedWaterLayer'
import BasinLayers from './components/map/BasinLayers'
import BasinFlowOrderLayer from './components/map/BasinFlowOrderLayer'
import MapLayersControl from './components/map/MapLayersControl'
import SourceHistoryUxOptions from './pages/SourceHistoryUxOptions'
import FlowVizOptions from './pages/FlowVizOptions'
import StreamFlowLab from './pages/StreamFlowLab'
import AppStreamsDirection from './pages/AppStreamsDirection'
import { IconChat, IconPlus, IconUser } from './components/ui/Icons'
import { analyzeDownstreamImpact } from './lib/hydrology'
import { analyzeApaNeighbours } from './lib/apaCatchments'
import { DEFAULT_FILTERS, applyFilters, applyHazardFilters, isDefaultFilters } from './lib/filters'
import { DEFAULT_MAP_LAYERS } from './lib/mapLayers'
import { hazardPlacementIcon } from './components/map/markerIcons'
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

const SHOW_LABS = import.meta.env.DEV || import.meta.env.VITE_SHOW_LABS === 'true'

function AppGate() {
  const { t } = useLanguage()
  const {
    user,
    ready,
    samples,
    mapHazards,
    qualityMeasures,
    canEditSample,
    canDeletePins,
    deleteSample,
    deleteMapHazard,
  } = useAppState()
  const [flowActive, setFlowActive] = useState(true)
  const [profileOpen, setProfileOpen] = useState(false)
  const [flowStep, setFlowStep] = useState('location')
  const [pendingLocation, setPendingLocation] = useState(null)
  const [editSampleId, setEditSampleId] = useState(null)
  const [panRequest, setPanRequest] = useState(null)
  const [filters, setFilters] = useState(DEFAULT_FILTERS)
  const [mapLayers, setMapLayers] = useState(DEFAULT_MAP_LAYERS)
  const [chatOpen, setChatOpen] = useState(false)
  const [selectedSampleId, setSelectedSampleId] = useState(null)
  const [selectedHazardId, setSelectedHazardId] = useState(null)
  const [hazardPlaces, setHazardPlaces] = useState({})
  const [placingHazardId, setPlacingHazardId] = useState(null)

  const filteredSamples = useMemo(() => applyFilters(samples, filters), [samples, filters])
  const filteredHazards = useMemo(
    () => applyHazardFilters(mapHazards, filters),
    [mapHazards, filters],
  )
  const draftHazards = useMemo(
    () =>
      Object.entries(hazardPlaces)
        .filter(([typeId, position]) => position && typeId !== placingHazardId)
        .map(([typeId, position]) => ({ id: `draft-${typeId}`, typeId, position })),
    [hazardPlaces, placingHazardId],
  )

  const selectedSample = filteredSamples.find((s) => s.id === selectedSampleId) ?? null
  const selectedHazard = mapHazards.find((h) => h.id === selectedHazardId) ?? null
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
  const showHazardDetail = Boolean(selectedHazard && !flowActive && !chatOpen && !showSourceDetail)

  if (!ready) {
    return (
      <div className="login-screen">
        <p className="login-note">{t('login.loading')}</p>
      </div>
    )
  }

  if (!user) {
    return <LoginScreen />
  }

  function closeFlow() {
    setFlowActive(false)
    setPendingLocation(null)
    setEditSampleId(null)
    setHazardPlaces({})
    setPlacingHazardId(null)
  }

  function openFlow() {
    setPendingLocation(null)
    setFlowStep('location')
    setEditSampleId(null)
    setFlowActive(true)
    setSelectedSampleId(null)
    setSelectedHazardId(null)
    setHazardPlaces({})
    setPlacingHazardId(null)
  }

  function startEdit(sample) {
    if (!canEditSample(sample)) return
    setSelectedSampleId(null)
    setSelectedHazardId(null)
    setEditSampleId(sample.id)
    setPendingLocation(sample.position)
    setFlowStep('location')
    setFlowActive(true)
  }

  function selectSample(id) {
    setSelectedHazardId(null)
    setSelectedSampleId(id)
  }

  function selectHazard(id) {
    if (String(id).startsWith('draft-')) return
    setSelectedSampleId(null)
    setSelectedHazardId(id)
    setChatOpen(false)
    setProfileOpen(false)
    closeFlow()
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
        <BasinFlowOrderLayer active={mapLayers.flowOrder} />
        <DetailedWaterLayer
          active={mapLayers.streams}
          emphasized={!isDefaultFilters(filters)}
        />
        <HydrologyLayer apa={flowActive ? null : impactAnalysis?.apa?.assignment} />
        <SampleMarkers
          samples={filteredSamples}
          selectedId={selectedSampleId}
          onSelect={selectSample}
          impactAnalysis={impactAnalysis}
          qualityMeasures={qualityMeasures}
        />
        <HazardMarkers
          hazards={[...filteredHazards, ...draftHazards]}
          selectedId={selectedHazardId}
          onSelect={selectHazard}
        />
        <LocationPicker
          active={flowActive}
          editable={flowActive && flowStep === 'location'}
          location={pendingLocation}
          onPick={setPendingLocation}
          panRequest={flowStep === 'location' ? panRequest : null}
        />
        <LocationPicker
          active={flowActive && flowStep === 'hazard' && Boolean(placingHazardId && hazardPlaces[placingHazardId])}
          editable
          autoCenter={false}
          location={placingHazardId ? hazardPlaces[placingHazardId] : null}
          onPick={(coords) => {
            if (!placingHazardId) return
            setHazardPlaces((prev) => ({ ...prev, [placingHazardId]: coords }))
          }}
          panRequest={flowStep === 'hazard' ? panRequest : null}
          icon={hazardPlacementIcon}
          tooltipPrefix={t('hazard.place')}
        />
      </WatershedMap>

      {!flowActive && (
        <FilterBar
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
          canEdit={canEditSample(selectedSample)}
          canDelete={canDeletePins}
          onClose={() => setSelectedSampleId(null)}
          onEdit={() => startEdit(selectedSample)}
          onDelete={async () => {
            await deleteSample(selectedSample.id)
            setSelectedSampleId(null)
          }}
        />
      )}

      {showHazardDetail && (
        <HazardDetailSheet
          hazard={selectedHazard}
          samples={samples}
          canDelete={canDeletePins}
          onClose={() => setSelectedHazardId(null)}
          onDelete={async () => {
            await deleteMapHazard(selectedHazard.id)
            setSelectedHazardId(null)
          }}
        />
      )}

      {flowActive && (
        <AddFlowSheet
          editSampleId={editSampleId}
          initialData={editingSample}
          location={pendingLocation}
          onLocationChange={setPendingLocation}
          onPanRequest={(coords) => setPanRequest({ coords, id: Date.now() })}
          hazardPlaces={hazardPlaces}
          placingHazardId={placingHazardId}
          onHazardPlacesChange={setHazardPlaces}
          onPlacingHazardChange={setPlacingHazardId}
          onClose={closeFlow}
          onStepChange={setFlowStep}
          onSaved={handleFlowSaved}
        />
      )}

      {!flowActive && !chatOpen && !showSourceDetail && !showHazardDetail && (
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

      <button
        type="button"
        className="profile-btn"
        onClick={() => setProfileOpen(true)}
        aria-label={t('profile.open')}
      >
        <IconUser />
      </button>

      {profileOpen && <ProfileSheet onClose={() => setProfileOpen(false)} />}

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
          {SHOW_LABS && hash === '#history-ux' ? (
            <SourceHistoryUxOptions />
          ) : SHOW_LABS && hash === '#flow-viz' ? (
            <FlowVizOptions />
          ) : SHOW_LABS && hash === '#stream-flow' ? (
            <StreamFlowLab />
          ) : SHOW_LABS && hash === '#app-streams' ? (
            <AppStreamsDirection />
          ) : (
            <AppGate />
          )}
        </div>
      </AppStateProvider>
    </LanguageProvider>
  )
}
