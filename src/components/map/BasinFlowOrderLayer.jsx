import { useEffect, useMemo, useState } from 'react'
import { createPortal } from 'react-dom'
import { GeoJSON, Pane, useMap } from 'react-leaflet'
import {
  getBasinFlowNetworkGeoJson,
  getBasinHopCount,
  getMaxBasinHops,
  getWatershedGeoJson,
} from '../../lib/hydrology'
import { buildArrowCollection } from '../../lib/streamArrows'
import { useLanguage } from '../../context/LanguageContext'
import './BasinFlowOrderLayer.css'

const basins = getWatershedGeoJson()
const network = getBasinFlowNetworkGeoJson()
const maxHops = getMaxBasinHops()

function hopFill(hops) {
  const t = maxHops === 0 ? 0 : hops / maxHops
  const r = Math.round(232 + (22 - 232) * t)
  const g = Math.round(196 + (90 - 196) * t)
  const b = Math.round(140 + (99 - 140) * t)
  return `rgb(${r}, ${g}, ${b})`
}

function hopStroke(hops) {
  const t = maxHops === 0 ? 0 : hops / maxHops
  const r = Math.round(176 + (14 - 176) * t)
  const g = Math.round(132 + (62 - 132) * t)
  const b = Math.round(78 + (78 - 78) * t)
  return `rgb(${r}, ${g}, ${b})`
}

function FlowArrows() {
  const map = useMap()
  const [zoom, setZoom] = useState(() => map.getZoom())

  useEffect(() => {
    const onZoom = () => setZoom(map.getZoom())
    map.on('zoomend', onZoom)
    return () => map.off('zoomend', onZoom)
  }, [map])

  const arrows = useMemo(
    () =>
      buildArrowCollection(network, zoom, {
        minOrder: 0,
        maxPerLine: 1,
        spacingScale: 1.2,
        size: zoom < 10 ? 0.0075 : zoom < 12 ? 0.0048 : 0.0034,
        keepShort: true,
      }),
    [zoom],
  )

  if (!arrows.features.length) return null

  return (
    <Pane name="basin-flow-arrows" style={{ zIndex: 237 }}>
      <GeoJSON
        key={`basin-flow-arrows-${arrows.features.length}-${zoom}`}
        data={arrows}
        style={{
          color: '#f4efe4',
          weight: 1.6,
          opacity: 1,
          fill: true,
          fillColor: '#102c34',
          fillOpacity: 1,
          lineJoin: 'round',
        }}
        interactive={false}
      />
    </Pane>
  )
}

export default function BasinFlowOrderLayer({ active }) {
  const { t } = useLanguage()
  if (!active) return null

  return (
    <>
      <Pane name="basin-flow-fills" style={{ zIndex: 232 }}>
        <GeoJSON
          data={basins}
          style={(feature) => {
            const hops = getBasinHopCount(feature.properties?.HYBAS_ID)
            return {
              color: hopStroke(hops),
              weight: 1.15,
              opacity: 0.85,
              fillColor: hopFill(hops),
              fillOpacity: 0.38,
            }
          }}
          interactive={false}
        />
      </Pane>
      <Pane name="basin-flow-links-halo" style={{ zIndex: 234 }}>
        <GeoJSON
          data={network}
          style={{
            color: '#f4efe4',
            weight: 6,
            opacity: 0.92,
            lineCap: 'round',
          }}
          interactive={false}
        />
      </Pane>
      <Pane name="basin-flow-links" style={{ zIndex: 235 }}>
        <GeoJSON
          data={network}
          style={{
            color: '#102c34',
            weight: 2.3,
            opacity: 0.95,
            lineCap: 'round',
          }}
          interactive={false}
        />
      </Pane>
      <FlowArrows />
      {createPortal(
        <aside className="flow-order-legend" aria-label={t('layers.flowOrder')}>
          <p className="flow-order-legend-title">{t('layers.flowOrder')}</p>
          <div className="flow-order-legend-bar" aria-hidden="true" />
          <div className="flow-order-legend-stops">
            <span>{t('flowOrder.coast')}</span>
            <span>{t('flowOrder.headwaters')}</span>
          </div>
          <p className="flow-order-legend-note">{t('flowOrder.note')}</p>
        </aside>,
        document.body,
      )}
    </>
  )
}
