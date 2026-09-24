// PROTOTYPE — read-only exploration of three ways to inspect basin-level source relationships.
// Switch layouts with ?variant=A, ?variant=B, or ?variant=C. No app route or data is changed.
import { useEffect, useMemo, useRef, useState } from 'react'
import { createRoot } from 'react-dom/client'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { SEED_SAMPLES } from '../lib/mockData'
import {
  getDownstreamBasinPath,
  getHydrologyAssignment,
  getUpstreamBasinIds,
  getWatershedGeoJson,
} from '../lib/hydrology'
import './AffectedSourcesPrototype.css'

const samples = SEED_SAMPLES.map((sample, index) => ({
  ...sample,
  name: ['Carreço well', 'Viana spring', 'Areosa borehole', 'Meadela mine', 'Inland spring', 'Valley well', 'Lower-valley borehole'][index],
  basinId: getHydrologyAssignment(sample.position).basinId,
}))

const variants = [
  { id: 'A', name: 'Map explorer' },
  { id: 'B', name: 'Source triage' },
  { id: 'C', name: 'Evidence view' },
]

const colors = {
  selected: '#d65849',
  upstream: '#168396',
  downstream: '#d08a28',
  same: '#775b9b',
  other: '#83939b',
}

function kmBetween(a, b) {
  const radians = (value) => value * Math.PI / 180
  const dLat = radians(b[0] - a[0])
  const dLng = radians(b[1] - a[1])
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(radians(a[0])) * Math.cos(radians(b[0])) * Math.sin(dLng / 2) ** 2
  return 6371 * 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h))
}

function classify(selected) {
  const originId = selected.basinId
  const upstream = new Set(getUpstreamBasinIds(originId))
  const downstream = new Set(getDownstreamBasinPath(originId).basinIds.slice(1))
  return samples.map((sample) => {
    let relation = 'other'
    if (sample.id === selected.id) relation = 'selected'
    else if (!sample.basinId || !originId) relation = 'other'
    else if (sample.basinId === originId) relation = 'same'
    else if (upstream.has(sample.basinId)) relation = 'upstream'
    else if (downstream.has(sample.basinId)) relation = 'downstream'
    return { ...sample, relation, distanceKm: kmBetween(sample.position, selected.position) }
  })
}

export function PrototypeMap({ selected, classified, filter, radius, onSelect, variant }) {
  const host = useRef(null)
  const mapRef = useRef(null)
  const layersRef = useRef(null)

  useEffect(() => {
    const map = L.map(host.current, { zoomControl: false, attributionControl: true }).setView([41.65, -8.66], 10)
    L.tileLayer('https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png', {
      maxZoom: 17,
      attribution: '© OpenTopoMap · © OpenStreetMap contributors',
    }).addTo(map)
    L.control.zoom({ position: 'bottomright' }).addTo(map)
    mapRef.current = map
    layersRef.current = L.layerGroup().addTo(map)
    return () => map.remove()
  }, [host, mapRef, layersRef])

  useEffect(() => {
    if (!mapRef.current || !layersRef.current) return
    const layer = layersRef.current
    layer.clearLayers()
    const upstream = getUpstreamBasinIds(selected.basinId)
    const downstream = getDownstreamBasinPath(selected.basinId).basinIds.slice(1)
    const ids = [selected.basinId, ...upstream, ...downstream].filter(Boolean)
    const active = new Set(ids.map(String))
    L.geoJSON(getWatershedGeoJson(ids), {
      style: (feature) => {
        const id = String(feature.properties.HYBAS_ID)
        const relation = id === selected.basinId ? 'selected' : upstream.includes(id) ? 'upstream' : 'downstream'
        return { color: colors[relation], weight: relation === 'selected' ? 3 : 1.7, fillColor: colors[relation], fillOpacity: relation === 'selected' ? .17 : .12 }
      },
      interactive: false,
    }).addTo(layer)

    if (filter === 'nearby') {
      L.circle(selected.position, { radius: radius * 1000, color: '#476a7b', weight: 1.4, dashArray: '6 7', fillColor: '#4ca5b1', fillOpacity: .08, interactive: false }).addTo(layer)
    }

    classified.forEach((sample) => {
      const inRadius = sample.distanceKm <= radius
      const relevant = filter === 'all' || (filter === 'nearby' ? inRadius : sample.relation === filter) || sample.relation === 'selected'
      const marker = L.circleMarker(sample.position, {
        radius: sample.relation === 'selected' ? 11 : 8,
        color: '#ffffff', weight: 2.8,
        fillColor: colors[sample.relation], fillOpacity: relevant ? 1 : .35,
        opacity: relevant ? 1 : .55,
      }).addTo(layer)
      marker.bindTooltip(`${sample.name} · ${sample.relation === 'selected' ? 'selected' : labelFor(sample.relation)}`, { direction: 'top' })
      marker.on('click', () => onSelect(sample.id))
    })

    if (active.size && variant !== 'C') {
      const bounds = L.geoJSON(getWatershedGeoJson(ids)).getBounds()
      if (bounds.isValid()) mapRef.current.fitBounds(bounds.pad(.1), { maxZoom: 12, animate: false })
    } else {
      mapRef.current.setView(selected.position, 11, { animate: false })
    }
  }, [selected, classified, filter, radius, onSelect, variant, layersRef, mapRef])

  useEffect(() => {
    if (!mapRef.current) return undefined
    const timer = setTimeout(() => mapRef.current?.invalidateSize(), 100)
    return () => clearTimeout(timer)
  }, [variant, mapRef])

  return <div className="as-map" ref={host} aria-label="Topographic map of source and surface catchment relationships" />
}

function labelFor(relation) {
  return {
    upstream: 'upstream basin',
    downstream: 'downstream basin',
    same: 'same basin · peer',
    other: 'no mapped basin link',
  }[relation] ?? relation
}

function relationExplanation(relation) {
  return {
    upstream: 'Its basin drains toward the selected basin. This does not prove a well-to-well connection.',
    downstream: 'The selected basin drains toward this basin. This does not prove this well receives its water.',
    same: 'Both pins fall inside one mapped basin. Their order within it is unknown.',
    other: 'No basin-to-basin path links these pins in the loaded map.',
  }[relation]
}

export function SourceRow({ sample, active, onSelect }) {
  return (
    <button className={`as-source-row ${active ? 'is-active' : ''}`} type="button" onClick={() => onSelect(sample.id)}>
      <span className="as-source-dot" style={{ '--dot': colors[sample.relation] }} />
      <span className="as-source-main"><strong>{sample.name}</strong><small>{sample.sourceType} · {sample.distanceKm.toFixed(1)} km away</small></span>
      <span className="as-relation">{sample.relation === 'selected' ? 'Selected' : labelFor(sample.relation)}</span>
    </button>
  )
}

export function App() {
  const initialVariant = new URLSearchParams(window.location.search).get('variant')
  const [variant, setVariant] = useState(variants.some((item) => item.id === initialVariant) ? initialVariant : 'A')
  const [selectedId, setSelectedId] = useState('seed-6')
  const [filter, setFilter] = useState('all')
  const [radius, setRadius] = useState(8)
  const selected = samples.find((sample) => sample.id === selectedId) ?? samples[5]
  const classified = useMemo(() => classify(selected), [selected])
  const visible = classified.filter((sample) => sample.relation !== 'selected' && (filter === 'all' || (filter === 'nearby' ? sample.distanceKm <= radius : sample.relation === filter)))
  const counts = Object.fromEntries(['upstream', 'downstream', 'same', 'other'].map((key) => [key, classified.filter((sample) => sample.relation === key).length]))
  const upstream = getUpstreamBasinIds(selected.basinId)
  const downstream = getDownstreamBasinPath(selected.basinId).basinIds.slice(1)
  const radiusMatches = classified.filter((sample) => sample.relation !== 'selected' && sample.distanceKm <= radius)

  function chooseVariant(next) {
    setVariant(next)
    const url = new URL(window.location.href)
    url.searchParams.set('variant', next)
    history.replaceState(null, '', url)
  }

  useEffect(() => {
    function onKey(event) {
      if (event.target.closest('input,textarea,select,[contenteditable]')) return
      if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return
      const index = variants.findIndex((item) => item.id === variant)
      chooseVariant(variants[(index + (event.key === 'ArrowRight' ? 1 : variants.length - 1)) % variants.length].id)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [variant])

  const map = <PrototypeMap selected={selected} classified={classified} filter={filter} radius={radius} onSelect={setSelectedId} variant={variant} />
  const sourceList = <div className="as-source-list">{visible.length ? visible.map((sample) => <SourceRow key={sample.id} sample={sample} active={false} onSelect={setSelectedId} />) : <p className="as-empty">No other source matches this view. Try a wider radius or another filter.</p>}</div>
  const controls = <div className="as-controls">
    <label htmlFor="as-source-select">Selected source</label>
    <select id="as-source-select" value={selectedId} onChange={(event) => setSelectedId(event.target.value)}>
      {samples.map((sample) => <option value={sample.id} key={sample.id}>{sample.name}</option>)}
    </select>
    <div className="as-filter-title">Show sources</div>
    <div className="as-filters" role="group" aria-label="Relationship filter">
      {[
        ['all', 'All'], ['upstream', `May affect · ${counts.upstream}`], ['downstream', `May be downstream · ${counts.downstream}`],
        ['same', `Same basin · ${counts.same}`], ['nearby', `Nearby · ${radiusMatches.length}`], ['other', `Unknown · ${counts.other}`],
      ].map(([key, label]) => <button className={filter === key ? 'is-active' : ''} type="button" key={key} onClick={() => setFilter(key)}>{label}</button>)}
    </div>
    <label className="as-radius-label" htmlFor="as-radius">Nearby radius <strong>{radius} km</strong></label>
    <input id="as-radius" type="range" min="1" max="30" value={radius} onChange={(event) => setRadius(Number(event.target.value))} />
    <p className="as-help">The radius is only a proximity search. Its edge and contents do not represent a water path.</p>
  </div>

  return <div className={`as-page as-variant-${variant}`}>
    <header className="as-header">
      <div><div className="as-kicker">WATERSCOPE / THROWAWAY PROTOTYPE</div><h1>Which sources might share a surface drainage route?</h1><p>Select a pin, switch views, and compare basin links with simple proximity.</p></div>
      <div className="as-header-status"><span className="as-live-dot" /> Real basin topology · 7 sample pins<br /><small>Not a groundwater or contamination model</small></div>
    </header>

    {variant === 'A' && <main className="as-layout as-layout-A">
      <section className="as-map-panel"><div className="as-map-heading"><strong>Surface landscape</strong><span>Tap any pin to inspect</span></div>{map}<div className="as-map-key"><span><i style={{ background: colors.selected }} />Selected</span><span><i style={{ background: colors.upstream }} />Upstream basin</span><span><i style={{ background: colors.downstream }} />Downstream basin</span><span><i style={{ background: colors.same }} />Same basin</span></div></section>
      <aside className="as-side">{controls}<div className="as-section-head"><h2>Matching sources</h2><span>{visible.length}</span></div>{sourceList}</aside>
    </main>}

    {variant === 'B' && <main className="as-layout as-layout-B">
      <section className="as-triage"><div className="as-triage-head"><span className="as-kicker">SOURCE TRIAGE</span><h2>{selected.name}</h2><p>Start from the source list. Each relationship stays qualified at basin scale.</p></div>{controls}<div className="as-section-head"><h2>Review candidates</h2><span>{visible.length}</span></div>{sourceList}</section>
      <section className="as-map-panel"><div className="as-map-heading"><strong>Map evidence</strong><span>Terrain basemap + connected basins</span></div>{map}<div className="as-map-key"><span><i style={{ background: colors.selected }} />Selected</span><span><i style={{ background: colors.upstream }} />Upstream</span><span><i style={{ background: colors.downstream }} />Downstream</span></div></section>
    </main>}

    {variant === 'C' && <main className="as-layout as-layout-C">
      <div className="as-evidence-top">{controls}</div>
      <div className="as-evidence-grid">
        <section className="as-evidence"><span className="as-kicker">EVIDENCE, NOT IMPACT</span><h2>What the map can actually say</h2>
          <div className="as-evidence-stat"><strong>{upstream.length}</strong><span>mapped basins drain toward this basin</span></div>
          <div className="as-evidence-stat"><strong>{downstream.length}</strong><span>mapped basins lie downstream from it</span></div>
          <div className="as-evidence-stat"><strong>{counts.same}</strong><span>other pins share this basin, with no within-basin order</span></div>
          <div className="as-evidence-note">{selected.id === 'seed-6' ? 'This inland example has sources in both upstream and downstream basins. Switch to the Areosa borehole to see the coastal case with no in-map upstream or downstream basin.' : 'Coastal and small basins may show only the selected area. That is a data limit, not evidence of no local drainage.'}</div>
          {sourceList}
        </section>
        <section className="as-map-panel"><div className="as-map-heading"><strong>Check the geography</strong><span>Click pins to challenge the result</span></div>{map}</section>
      </div>
    </main>}

    <section className="as-verdict"><div><span className="as-kicker">CURRENT RESULT</span><h2>{selected.name}: {counts.upstream} upstream, {counts.downstream} downstream, {counts.same} same-basin peers</h2><p>{filter === 'nearby' ? `${radiusMatches.length} sources are within ${radius} km. Proximity does not create a hydrological link.` : filter === 'all' ? 'Counts come from 53 connected HydroBASINS polygons, not a point-level elevation trace.' : filter === 'other' ? 'These sources lack a mapped basin path to the selected source.' : relationExplanation(filter)}</p></div><div className="as-verdict-badge">Basin-scale signal<br /><strong>Connection uncertain</strong></div></section>

    <footer className="as-footer">This demo uses the project’s real seed pins and HydroBASINS `NEXT_DOWN` links over OpenTopoMap terrain tiles. It does not yet classify wells using a high-resolution DEM or validated APA river topology.</footer>
    {import.meta.env.DEV && <nav className="as-switcher" aria-label="Prototype layouts"><button type="button" onClick={() => chooseVariant(variants[(variants.findIndex((item) => item.id === variant) + 2) % 3].id)} aria-label="Previous layout">←</button><span>{variant} — {variants.find((item) => item.id === variant).name}</span><button type="button" onClick={() => chooseVariant(variants[(variants.findIndex((item) => item.id === variant) + 1) % 3].id)} aria-label="Next layout">→</button></nav>}
  </div>
}

createRoot(document.querySelector('#prototype-root')).render(<App />)
