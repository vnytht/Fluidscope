import { useEffect, useMemo, useState } from 'react'
import { GeoJSON, Pane } from 'react-leaflet'
import { getBasinsBbox } from '../../lib/hydrology'

const DATA_URL = `${import.meta.env.BASE_URL}data/dem_flow_ticks.geojson`

function lineBbox(geometry) {
  const coords = geometry?.type === 'LineString' ? geometry.coordinates : []
  if (coords.length < 2) return null
  const lngs = coords.map((c) => c[0])
  const lats = coords.map((c) => c[1])
  return {
    west: Math.min(...lngs),
    south: Math.min(...lats),
    east: Math.max(...lngs),
    north: Math.max(...lats),
  }
}

function overlaps(a, b) {
  return !(a.east < b.west || a.west > b.east || a.north < b.south || a.south > b.north)
}

export default function TerrainFlowLayer({ active, basinIds, fallbackPosition }) {
  const [ticks, setTicks] = useState(null)

  useEffect(() => {
    if (!active || ticks) return undefined
    const controller = new AbortController()
    fetch(DATA_URL, { signal: controller.signal })
      .then((response) => {
        if (!response.ok) throw new Error('Unable to load terrain flow ticks')
        return response.json()
      })
      .then(setTicks)
      .catch((error) => {
        if (error.name !== 'AbortError') console.error(error)
      })
    return () => controller.abort()
  }, [active, ticks])

  const bbox = useMemo(() => {
    const basinBox = getBasinsBbox(basinIds)
    if (basinBox) return basinBox
    if (!fallbackPosition) return null
    const [lat, lng] = fallbackPosition
    const pad = 0.04
    return { west: lng - pad, south: lat - pad, east: lng + pad, north: lat + pad }
  }, [basinIds, fallbackPosition])

  const clipped = useMemo(() => {
    if (!ticks || !bbox) return null
    return {
      type: 'FeatureCollection',
      features: ticks.features.filter((feature) => {
        const box = lineBbox(feature.geometry)
        return box && overlaps(box, bbox)
      }),
    }
  }, [ticks, bbox])

  if (!active || !clipped) return null

  return (
    <Pane name="terrain-flow-ticks" style={{ zIndex: 350 }}>
      <GeoJSON
        key={`ticks-${(basinIds ?? []).join('-')}`}
        data={clipped}
        style={{
          color: '#14343c',
          weight: 2.6,
          opacity: 0.8,
          lineCap: 'round',
        }}
        interactive={false}
      />
    </Pane>
  )
}
