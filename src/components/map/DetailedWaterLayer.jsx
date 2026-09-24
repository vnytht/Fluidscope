import { useEffect, useMemo, useState } from 'react'
import { GeoJSON, Pane } from 'react-leaflet'
import { getBasinsBbox } from '../../lib/hydrology'

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

function apaRiverStyle(feature) {
  const order = Number(feature.properties?.stream_order ?? feature.properties?.river_rank ?? 1)
  const weight = order >= 5 ? 2.4 : order >= 3 ? 1.6 : 1.05
  return {
    color: '#1a7a92',
    weight,
    opacity: order >= 3 ? 0.55 : 0.32,
    lineCap: 'round',
  }
}

export default function DetailedWaterLayer({ active, basinIds }) {
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
            key={`water-bodies-${(basinIds ?? []).join('-')}`}
            data={clippedBodies}
            style={{
              color: '#5eb3c4',
              weight: 0.8,
              opacity: 0.45,
              fillColor: '#8fd0dc',
              fillOpacity: 0.18,
            }}
            interactive={false}
          />
        )}
      </Pane>

      <Pane name="mapped-waterways" style={{ zIndex: 318 }}>
        {clippedOsm && (
          <GeoJSON
            key={`osm-waterways-${(basinIds ?? []).join('-')}`}
            data={clippedOsm}
            style={(feature) => {
              const type = feature.properties?.waterway
              return {
                color: '#3d9aaa',
                weight: type === 'river' ? 1.6 : 1,
                opacity: type === 'river' ? 0.4 : 0.22,
                lineCap: 'round',
              }
            }}
            interactive={false}
          />
        )}
      </Pane>

      <Pane name="official-waterways" style={{ zIndex: 325 }}>
        {clippedRivers && (
          <GeoJSON
            key={`official-waterways-${(basinIds ?? []).join('-')}`}
            data={clippedRivers}
            style={apaRiverStyle}
            interactive={false}
          />
        )}
      </Pane>
    </>
  )
}
