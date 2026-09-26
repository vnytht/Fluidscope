import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { GeoJSON, ImageOverlay, Pane, TileLayer } from 'react-leaflet'
import { useLanguage } from '../../context/LanguageContext'
import './ElevationLayer.css'

const BOUNDS = [
  [41.54986111111111, -8.90013888888889],
  [42.15013888888889, -8.099861111111112],
]

const CONTOURS_URL = `${import.meta.env.BASE_URL}data/viana_contours.geojson`
const ELEVATION_URL = `${import.meta.env.BASE_URL}data/viana_elevation.png`

export default function ElevationLayer({ active }) {
  const { t } = useLanguage()
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
      <Pane name="elevation-topo" style={{ zIndex: 235, filter: 'brightness(0.82) saturate(1.05)' }}>
        <TileLayer
          url="https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png"
          attribution='Map data: © <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>, SRTM | Style: © <a href="https://opentopomap.org">OpenTopoMap</a> (CC-BY-SA)'
          maxZoom={17}
          opacity={0.68}
        />
      </Pane>
      <Pane name="elevation-dem" style={{ zIndex: 250, filter: 'brightness(0.86)' }}>
        <ImageOverlay url={ELEVATION_URL} bounds={BOUNDS} opacity={0.28} zIndex={250} />
      </Pane>
      {contours && (
        <Pane name="elevation-contours" style={{ zIndex: 260 }}>
          <GeoJSON
            data={contours}
            style={(feature) => ({
              color: '#3a5360',
              weight: Number(feature.properties?.elev_m) >= 400 ? 1.1 : 0.7,
              opacity: 0.48,
              fill: false,
            })}
            interactive={false}
          />
        </Pane>
      )}
      {createPortal(
        <aside className="elevation-legend" aria-label={t('elevLegend.label')}>
          <p className="elevation-legend-title">{t('elevLegend.label')}</p>
          <div className="elevation-legend-bar" aria-hidden="true" />
          <div className="elevation-legend-stops">
            <span>{t('elevLegend.sea')}</span>
            <span>100 m</span>
            <span>300 m</span>
            <span>{t('elevLegend.high')}</span>
          </div>
          <p className="elevation-legend-note">{t('elevLegend.note')}</p>
        </aside>,
        document.body,
      )}
    </>
  )
}
