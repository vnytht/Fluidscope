import { useEffect, useMemo, useState } from 'react'
import { GeoJSON, Pane, useMap } from 'react-leaflet'
import { getBasinsBbox } from '../../lib/hydrology'
import { buildArrowCollection } from '../../lib/streamArrows'

const DATA_BASE = `${import.meta.env.BASE_URL}data/`

function useGeoJson(filename, enabled = true) {
  const [data, setData] = useState(null)

  useEffect(() => {
    if (!enabled || data) return undefined
    const controller = new AbortController()
    fetch(`${DATA_BASE}${filename}`, { signal: controller.signal })
      .then((response) => {
        if (!response.ok) throw new Error(`Unable to load ${filename}`)
        return response.json()
      })
      .then(setData)
      .catch((error) => {
        if (error.name !== 'AbortError') console.error(error)
      })
    return () => controller.abort()
  }, [data, enabled, filename])

  return data
}

function geometryBbox(geometry) {
  const coordinates = []
  const walk = (value) => {
    if (!Array.isArray(value) || value.length === 0) return
    if (typeof value[0] === 'number') {
      coordinates.push(value)
      return
    }
    value.forEach(walk)
  }
  walk(geometry?.coordinates)
  if (!coordinates.length) return null
  return coordinates.reduce(
    (bounds, [lng, lat]) => ({
      west: Math.min(bounds.west, lng),
      south: Math.min(bounds.south, lat),
      east: Math.max(bounds.east, lng),
      north: Math.max(bounds.north, lat),
    }),
    { west: Infinity, south: Infinity, east: -Infinity, north: -Infinity },
  )
}

function overlaps(a, b) {
  return !(a.east < b.west || a.west > b.east || a.north < b.south || a.south > b.north)
}

function clipToBbox(collection, bbox) {
  if (!collection || !bbox) return collection
  return {
    type: 'FeatureCollection',
    features: collection.features.filter((feature) => {
      const featureBox = geometryBbox(feature.geometry)
      return featureBox && overlaps(featureBox, bbox)
    }),
  }
}

function apaRiverCore(feature, emphasized) {
  const order = Number(feature.properties?.stream_order ?? feature.properties?.river_rank ?? 1)
  const boost = emphasized ? 1.35 : 1
  const weight = (order >= 5 ? 3.4 : order >= 3 ? 2.4 : 1.6) * boost
  return { order, weight }
}

function apaRiverHaloStyle(feature, emphasized) {
  const { weight } = apaRiverCore(feature, emphasized)
  return {
    color: '#DCE7F2',
    weight: weight + 5,
    opacity: emphasized ? 0.55 : 0.38,
    lineCap: 'round',
    lineJoin: 'round',
  }
}

function StreamArrows({ rivers }) {
  const map = useMap()
  const [zoom, setZoom] = useState(() => map.getZoom())

  useEffect(() => {
    const onZoom = () => setZoom(map.getZoom())
    map.on('zoomend', onZoom)
    return () => map.off('zoomend', onZoom)
  }, [map])

  const minOrder = zoom < 11 ? 3 : 1
  const arrows = useMemo(
    () =>
      buildArrowCollection(rivers, zoom, {
        minOrder,
        maxPerLine: zoom < 13 ? 10 : 16,
        spacingScale: zoom < 12 ? 3.1 : 2.6,
        size: zoom < 13 ? 0.003 : 0.0052,
      }),
    [rivers, zoom, minOrder],
  )

  if (!arrows.features.length) return null

  return (
    <Pane name="official-waterway-arrows" style={{ zIndex: 328 }}>
      <GeoJSON
        key={`stream-arrows-${arrows.features.length}-${zoom}`}
        data={arrows}
        style={{
          color: '#4F86C6',
          weight: 0.8,
          opacity: 1,
          fill: true,
          fillColor: '#4F86C6',
          fillOpacity: 1,
          lineJoin: 'round',
        }}
        interactive={false}
      />
    </Pane>
  )
}

function apaRiverStyle(feature, emphasized) {
  const { order, weight } = apaRiverCore(feature, emphasized)
  return {
    color: '#4F86C6',
    weight,
    opacity: emphasized ? (order >= 3 ? 0.95 : 0.72) : order >= 3 ? 0.82 : 0.55,
    lineCap: 'round',
    lineJoin: 'round',
  }
}

export default function DetailedWaterLayer({ active, basinIds, emphasized = false }) {
  const officialRivers = useGeoJson('apa_rivers_viana.geojson', active)
  const waterBodies = useGeoJson('water_bodies_viana.geojson', active)
  const osmRivers = useGeoJson('osm_rivers_viana.geojson', active)
  const bbox = useMemo(
    () => (active && basinIds?.length ? getBasinsBbox(basinIds) : null),
    [active, basinIds],
  )
  const clippedRivers = useMemo(
    () => (bbox ? clipToBbox(officialRivers, bbox) : officialRivers),
    [officialRivers, bbox],
  )
  const clippedBodies = useMemo(
    () => (bbox ? clipToBbox(waterBodies, bbox) : waterBodies),
    [waterBodies, bbox],
  )
  const clippedOsm = useMemo(
    () => (bbox ? clipToBbox(osmRivers, bbox) : osmRivers),
    [osmRivers, bbox],
  )

  if (!active) return null

  return (
    <>
      <Pane name="water-bodies" style={{ zIndex: 310 }}>
        {clippedBodies && (
          <GeoJSON
            key={`water-bodies-${emphasized ? 'on' : 'off'}-${(basinIds ?? []).join('-')}`}
            data={clippedBodies}
            style={{
              color: '#4F86C6',
              weight: emphasized ? 1.6 : 1.2,
              opacity: emphasized ? 0.75 : 0.55,
              fillColor: '#4F86C6',
              fillOpacity: emphasized ? 0.28 : 0.2,
            }}
            interactive={false}
          />
        )}
      </Pane>

      <Pane name="mapped-waterways-halo" style={{ zIndex: 316 }}>
        {clippedOsm && (
          <GeoJSON
            key={`osm-halo-${emphasized ? 'on' : 'off'}-${(basinIds ?? []).join('-')}`}
            data={clippedOsm}
            style={(feature) => {
              const type = feature.properties?.waterway
              const core = (type === 'river' ? 2.2 : 1.4) * (emphasized ? 1.3 : 1)
              return {
                color: '#DCE7F2',
                weight: core + 4,
                opacity: emphasized ? 0.42 : 0.28,
                lineCap: 'round',
              }
            }}
            interactive={false}
          />
        )}
      </Pane>

      <Pane name="mapped-waterways" style={{ zIndex: 318 }}>
        {clippedOsm && (
          <GeoJSON
            key={`osm-waterways-${emphasized ? 'on' : 'off'}-${(basinIds ?? []).join('-')}`}
            data={clippedOsm}
            style={(feature) => {
              const type = feature.properties?.waterway
              return {
                color: '#4F86C6',
                weight: (type === 'river' ? 2.2 : 1.4) * (emphasized ? 1.3 : 1),
                opacity: type === 'river' ? (emphasized ? 0.7 : 0.48) : emphasized ? 0.45 : 0.32,
                lineCap: 'round',
              }
            }}
            interactive={false}
          />
        )}
      </Pane>

      <Pane name="official-waterways-halo" style={{ zIndex: 322 }}>
        {clippedRivers && (
          <GeoJSON
            key={`official-halo-${emphasized ? 'on' : 'off'}-${(basinIds ?? []).join('-')}`}
            data={clippedRivers}
            style={(feature) => apaRiverHaloStyle(feature, emphasized)}
            interactive={false}
          />
        )}
      </Pane>

      <Pane name="official-waterways" style={{ zIndex: 325 }}>
        {clippedRivers && (
          <GeoJSON
            key={`official-waterways-${emphasized ? 'on' : 'off'}-${(basinIds ?? []).join('-')}`}
            data={clippedRivers}
            style={(feature) => apaRiverStyle(feature, emphasized)}
            interactive={false}
          />
        )}
      </Pane>
      {clippedRivers && <StreamArrows rivers={clippedRivers} />}
    </>
  )
}
