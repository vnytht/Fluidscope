import { useEffect, useState } from 'react'
import { GeoJSON, ImageOverlay, Pane } from 'react-leaflet'

const BOUNDS = [
  [41.54986111111111, -8.90013888888889],
  [42.15013888888889, -8.099861111111112],
]

const CONTOURS_URL = `${import.meta.env.BASE_URL}data/viana_contours.geojson`
const ELEVATION_URL = `${import.meta.env.BASE_URL}data/viana_elevation.png`

export default function ElevationLayer({ active }) {
  const [contours, setContours] = useState(null)

  useEffect(() => {
    if (!active || contours) return undefined
    const controller = new AbortController()
    fetch(CONTOURS_URL, { signal: controller.signal })
      .then((response) => {
        if (!response.ok) throw new Error('Unable to load contours')
        return response.json()
      })
      .then(setContours)
      .catch((error) => {
        if (error.name !== 'AbortError') console.error(error)
      })
    return () => controller.abort()
  }, [active, contours])

  if (!active) return null

  return (
    <>
      <Pane name="elevation-dem" style={{ zIndex: 250 }}>
        <ImageOverlay url={ELEVATION_URL} bounds={BOUNDS} opacity={0.48} zIndex={250} />
      </Pane>
      {contours && (
        <Pane name="elevation-contours" style={{ zIndex: 260 }}>
          <GeoJSON
            data={contours}
            style={(feature) => ({
              color: '#5a7a88',
              weight: Number(feature.properties?.elev_m) >= 400 ? 1.3 : 0.9,
              opacity: 0.55,
              fill: false,
            })}
            interactive={false}
          />
        </Pane>
      )}
    </>
  )
}
