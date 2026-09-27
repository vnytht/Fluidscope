import { useEffect, useMemo, useState } from 'react'
import { CircleMarker, GeoJSON, MapContainer, Pane, useMap } from 'react-leaflet'
import L from 'leaflet'
import { WATERSHED_BOUNDS, WATERSHED_CENTER } from '../lib/mapConfig'
import { buildArrowCollection } from '../lib/streamArrows'
import './StreamFlowLab.css'

const DATA_BASE = `${import.meta.env.BASE_URL}data/`
const COLOR_OK = '#4fc4dd'
const COLOR_FIX = '#e08a52'

const NETWORKS = [
  {
    id: 't1000',
    label: 'DEM streams · coarse',
    file: 'dem_streams_t1000_oriented.geojson',
    note: 'Same network as the HTML arrows demo (t1000).',
  },
  {
    id: 't500',
    label: 'DEM streams · medium',
    file: 'dem_streams_t500_oriented.geojson',
    note: '5,034 lines. Heavier.',
  },
  {
    id: 'osm',
    label: 'OSM rivers · oriented',
    file: 'osm_rivers_viana_oriented.geojson',
    note: 'Named waterways, direction corrected.',
  },
  {
    id: 'hydro',
    label: 'HydroRIVERS',
    file: 'rivers_by_basin.geojson',
    note: 'Has NEXT_DOWN. No reversed flag.',
  },
]

function useGeoJson(filename) {
  const [data, setData] = useState(null)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const controller = new AbortController()
    setLoading(true)
    setError('')
    setData(null)
    fetch(`${DATA_BASE}${filename}`, { signal: controller.signal })
      .then((response) => {
        if (!response.ok) throw new Error(`Could not load ${filename}`)
        return response.json()
      })
      .then((json) => {
        setData(json)
        setLoading(false)
      })
      .catch((err) => {
        if (err.name === 'AbortError') return
        setError(err.message)
        setLoading(false)
      })
    return () => controller.abort()
  }, [filename])

  return { data, error, loading }
}

function auditNetwork(collection) {
  if (!collection?.features) {
    return { count: 0, withAcc: 0, growing: 0, reversed: 0, bboxOk: false }
  }
  let withAcc = 0
  let growing = 0
  let reversed = 0
  let minLat = 90
  let maxLat = -90
  let minLng = 180
  let maxLng = -180

  for (const feature of collection.features) {
    const props = feature.properties ?? {}
    if (props.reversed === true) reversed += 1
    if (props.acc_start != null && props.acc_end != null) {
      withAcc += 1
      if (Number(props.acc_end) >= Number(props.acc_start)) growing += 1
    }
    const coords = feature.geometry?.coordinates
    const first = Array.isArray(coords?.[0]) && typeof coords[0][0] === 'number' ? coords[0] : null
    if (first) {
      minLng = Math.min(minLng, first[0])
      maxLng = Math.max(maxLng, first[0])
      minLat = Math.min(minLat, first[1])
      maxLat = Math.max(maxLat, first[1])
    }
  }

  return {
    count: collection.features.length,
    withAcc,
    growing,
    reversed,
    bboxOk: minLat > 41.2 && maxLat < 42.2 && minLng > -9.3 && maxLng < -8.1,
  }
}

function streamColor(feature) {
  return feature.properties?.reversed === true ? COLOR_FIX : COLOR_OK
}

function streamWeight(feature) {
  const acc = Number(feature.properties?.acc_end)
  if (!Number.isFinite(acc)) {
    const order = Number(feature.properties?.ORD_STRA)
    return order >= 3 ? 2.2 : 1.3
  }
  if (acc > 4000) return 2.4
  if (acc > 800) return 1.7
  return 1.3
}

function FitWhen({ collection, enabled }) {
  const map = useMap()
  useEffect(() => {
    if (!enabled || !collection?.features?.length) return
    const layer = L.geoJSON(collection)
    const bounds = layer.getBounds()
    if (bounds.isValid()) map.fitBounds(bounds, { padding: [36, 36], maxZoom: 13 })
  }, [collection, enabled, map])
  return null
}

function StreamNetwork({ data, mode }) {
  const map = useMap()
  const [zoom, setZoom] = useState(() => map.getZoom())
  const renderer = useMemo(() => L.canvas({ padding: 0.5 }), [])

  useEffect(() => {
    const onZoom = () => setZoom(map.getZoom())
    map.on('zoomend', onZoom)
    return () => map.off('zoomend', onZoom)
  }, [map])

  const arrows = useMemo(
    () => (mode === 'arrows' ? buildArrowCollection(data, zoom) : null),
    [data, mode, zoom],
  )
  if (!data) return null

  return (
    <>
      <Pane name="sf-streams" style={{ zIndex: 420 }}>
        <GeoJSON
          key={`lines-${mode}-${data.features.length}`}
          data={data}
          renderer={renderer}
          style={(feature) => ({
            color: streamColor(feature),
            weight: streamWeight(feature),
            opacity: 0.92,
            lineCap: 'round',
            fill: false,
            className: mode === 'flow' ? 'sf-flow-line' : undefined,
          })}
          interactive={false}
        />
      </Pane>
      {arrows && (
        <Pane name="sf-arrows" style={{ zIndex: 430 }}>
          <GeoJSON
            key={`arrows-${arrows.features.length}`}
            data={arrows}
            renderer={renderer}
            style={(feature) => {
              const color = feature.properties?.reversed ? COLOR_FIX : COLOR_OK
              return {
                color,
                fillColor: color,
                fillOpacity: 0.92,
                weight: 0.4,
                lineJoin: 'round',
              }
            }}
            interactive={false}
          />
        </Pane>
      )}
    </>
  )
}

export default function StreamFlowLab() {
  const [networkId, setNetworkId] = useState('t1000')
  const [mode, setMode] = useState('arrows')
  const [showExample, setShowExample] = useState(false)
  const network = NETWORKS.find((item) => item.id === networkId) ?? NETWORKS[0]
  const streams = useGeoJson(network.file)
  const catchment = useGeoJson('catchment_of_point.geojson')
  const downstream = useGeoJson('downstream_path_of_point.geojson')
  const health = useMemo(() => auditNetwork(streams.data), [streams.data])
  const origin = downstream.data?.features?.[0]?.geometry?.coordinates?.[0]

  return (
    <div className="sf-lab">
      <aside className="sf-panel">
        <p className="sf-kicker">Lab · main map unchanged</p>
        <h1>Stream flow preview</h1>
        <p className="sf-lead">
          Outline arrows sit on the oriented streams. They point downhill because the GeoJSON
          vertices already run upstream → downstream.
        </p>

        <div className="sf-legend">
          <span>
            <i style={{ background: COLOR_OK }} />
            Cyan — already downhill
          </span>
          <span>
            <i style={{ background: COLOR_FIX }} />
            Orange — flipped when built
          </span>
        </div>

        <h2>Network</h2>
        <div className="sf-choices">
          {NETWORKS.map((item) => (
            <button
              key={item.id}
              type="button"
              className={item.id === networkId ? 'is-on' : ''}
              onClick={() => setNetworkId(item.id)}
            >
              {item.label}
            </button>
          ))}
        </div>
        <p className="sf-note">{network.note}</p>

        <h2>Visual</h2>
        <div className="sf-choices">
          <button type="button" className={mode === 'arrows' ? 'is-on' : ''} onClick={() => setMode('arrows')}>
            Outline arrows
          </button>
          <button type="button" className={mode === 'flow' ? 'is-on' : ''} onClick={() => setMode('flow')}>
            Moving dash
          </button>
          <button type="button" className={mode === 'plain' ? 'is-on' : ''} onClick={() => setMode('plain')}>
            Plain lines
          </button>
        </div>

        <label className="sf-check">
          <input
            type="checkbox"
            checked={showExample}
            onChange={(e) => setShowExample(e.target.checked)}
          />
          Example catchment + downhill path
        </label>

        <h2>Data check</h2>
        {streams.loading && <p className="sf-note">Loading {network.file}…</p>}
        {streams.error && <p className="sf-error">{streams.error}</p>}
        {!streams.loading && streams.data && (
          <ul className="sf-audit">
            <li>
              <strong>{health.count.toLocaleString()}</strong> features
            </li>
            <li>
              Accumulation grows downhill:{' '}
              <strong>
                {health.withAcc
                  ? `${Math.round((health.growing / health.withAcc) * 100)}%`
                  : 'n/a'}
              </strong>
              {health.withAcc ? ` (${health.growing}/${health.withAcc})` : ''}
            </li>
            <li>
              Lines flipped when built: <strong>{health.reversed.toLocaleString()}</strong>
            </li>
            <li>
              In Viana box: <strong>{health.bboxOk ? 'yes' : 'check coords'}</strong>
            </li>
          </ul>
        )}

        <a className="sf-back" href="/">
          Back to map
        </a>
      </aside>

      <div className="sf-map">
        <MapContainer
          className="sf-map-el"
          center={WATERSHED_CENTER}
          zoom={11}
          minZoom={9}
          maxZoom={16}
          maxBounds={WATERSHED_BOUNDS}
          zoomControl={false}
        >
          <StreamNetwork data={streams.data} mode={mode} />
          {showExample && catchment.data && (
            <Pane name="sf-catchment" style={{ zIndex: 410 }}>
              <GeoJSON
                data={catchment.data}
                style={{
                  color: '#C45C4A',
                  weight: 1.6,
                  fillColor: '#E46A58',
                  fillOpacity: 0.22,
                }}
                interactive={false}
              />
            </Pane>
          )}
          {showExample && downstream.data && (
            <Pane name="sf-down" style={{ zIndex: 440 }}>
              <GeoJSON
                data={downstream.data}
                style={{
                  color: '#C45C4A',
                  weight: 4,
                  className: 'sf-flow-line sf-flow-line--path',
                }}
                interactive={false}
              />
            </Pane>
          )}
          {showExample && origin && (
            <CircleMarker
              center={[origin[1], origin[0]]}
              radius={7}
              pathOptions={{ color: '#C45C4A', fillColor: '#fff', fillOpacity: 1, weight: 3 }}
            />
          )}
          <FitWhen collection={showExample ? catchment.data : streams.data} enabled />
        </MapContainer>
      </div>
    </div>
  )
}
