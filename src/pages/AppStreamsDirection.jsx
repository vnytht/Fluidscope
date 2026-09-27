import { useEffect, useMemo, useState } from 'react'
import { GeoJSON, MapContainer, Pane, TileLayer, useMap } from 'react-leaflet'
import L from 'leaflet'
import { BASEMAPS, DEFAULT_ZOOM, MAX_ZOOM, MIN_ZOOM, WATERSHED_BOUNDS, WATERSHED_CENTER } from '../lib/mapConfig'
import { buildArrowCollection } from '../lib/streamArrows'
import './AppStreamsDirection.css'

const DATA_BASE = `${import.meta.env.BASE_URL}data/`

function useGeoJson(filename) {
  const [data, setData] = useState(null)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const controller = new AbortController()
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

function apaStyle(feature) {
  const order = Number(feature.properties?.stream_order ?? feature.properties?.river_rank ?? 1)
  const weight = order >= 5 ? 3.4 : order >= 3 ? 2.4 : 1.6
  return {
    color: '#4F86C6',
    weight,
    opacity: order >= 3 ? 0.88 : 0.62,
    lineCap: 'round',
    fill: false,
  }
}

function osmStyle(feature) {
  const type = feature.properties?.waterway
  return {
    color: '#7AA3C9',
    weight: type === 'river' ? 1.6 : 1,
    opacity: type === 'river' ? 0.28 : 0.16,
    lineCap: 'round',
    fill: false,
  }
}

function ArrowHeads({ collection }) {
  const map = useMap()
  const [zoom, setZoom] = useState(() => map.getZoom())
  const renderer = useMemo(() => L.canvas({ padding: 0.5 }), [])

  useEffect(() => {
    const onZoom = () => setZoom(map.getZoom())
    map.on('zoomend', onZoom)
    return () => map.off('zoomend', onZoom)
  }, [map])

  const minOrder = zoom < 11 ? 3 : 1
  const arrows = useMemo(
    () =>
      buildArrowCollection(collection, zoom, {
        minOrder,
        maxPerLine: zoom < 13 ? 10 : 16,
        spacingScale: zoom < 12 ? 3.1 : 2.6,
        size: 0.003,
      }),
    [collection, zoom, minOrder],
  )

  if (!arrows.features.length) return null

  return (
    <Pane name="app-stream-arrows" style={{ zIndex: 430 }}>
      <GeoJSON
        key={`arrows-${arrows.features.length}-${zoom}`}
        data={arrows}
        renderer={renderer}
        style={{
          color: '#4F86C6',
          fillColor: '#4F86C6',
          fillOpacity: 0.92,
          weight: 0.4,
          lineJoin: 'round',
        }}
        interactive={false}
      />
    </Pane>
  )
}

export default function AppStreamsDirection() {
  const apa = useGeoJson('apa_rivers_viana.geojson')
  const osm = useGeoJson('osm_rivers_viana_oriented.geojson')
  const bodies = useGeoJson('water_bodies_viana.geojson')
  const ready = Boolean(apa.data && osm.data)
  const basemap = BASEMAPS.opentopo

  return (
    <div className="asdir">
      <aside className="asdir-panel">
        <p className="asdir-kicker">Lab · main map unchanged</p>
        <h1>App streams + direction</h1>
        <p>
          Same rivers as the live map. Arrows sit only on official APA channels and get sparser when
          you zoom out.
        </p>
        <ul>
          <li>
            <strong>Arrows</strong> — slim darts on APA reaches, downhill via <code>next_down_id</code>.
          </li>
          <li>
            <strong>Faint OSM</strong> — context only, no extra arrows (avoids a double layer).
          </li>
        </ul>
        <p className="asdir-note">
          Direction is the mapped channel, not a live raindrop trace.
        </p>
        {(apa.loading || osm.loading) && <p className="asdir-note">Loading streams…</p>}
        {(apa.error || osm.error) && <p className="asdir-error">{apa.error || osm.error}</p>}
        {ready && (
          <p className="asdir-note">
            {apa.data.features.length.toLocaleString()} APA · {osm.data.features.length.toLocaleString()} OSM
          </p>
        )}
        <a className="asdir-back" href="/">
          Back to map
        </a>
        <a className="asdir-back" href="/#stream-flow">
          DEM arrow lab
        </a>
      </aside>

      <div className="asdir-map">
        <MapContainer
          className="asdir-map-el"
          center={WATERSHED_CENTER}
          zoom={DEFAULT_ZOOM}
          minZoom={MIN_ZOOM}
          maxZoom={MAX_ZOOM}
          maxBounds={WATERSHED_BOUNDS}
          zoomControl={false}
        >
          <TileLayer url={basemap.url} attribution={basemap.attribution} maxZoom={basemap.maxZoom} />
          {bodies.data && (
            <Pane name="asdir-bodies" style={{ zIndex: 310 }}>
              <GeoJSON
                data={bodies.data}
                style={{
                  color: '#4F86C6',
                  weight: 1.2,
                  opacity: 0.55,
                  fillColor: '#4F86C6',
                  fillOpacity: 0.2,
                }}
                interactive={false}
              />
            </Pane>
          )}
          {osm.data && (
            <Pane name="asdir-osm" style={{ zIndex: 318 }}>
              <GeoJSON data={osm.data} style={osmStyle} interactive={false} />
            </Pane>
          )}
          {apa.data && (
            <Pane name="asdir-apa" style={{ zIndex: 325 }}>
              <GeoJSON data={apa.data} style={apaStyle} interactive={false} />
            </Pane>
          )}
          {apa.data && <ArrowHeads collection={apa.data} />}
        </MapContainer>
      </div>
    </div>
  )
}
