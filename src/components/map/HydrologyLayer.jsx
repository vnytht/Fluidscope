import { GeoJSON, Pane } from 'react-leaflet'
import { APA_BASIN_COLORS, getApaBasinFeature, getApaSubBasinFeature } from '../../lib/apaCatchments'

export default function HydrologyLayer({ apa }) {
  const subBasin = apa?.code ? getApaSubBasinFeature(apa.code) : null
  const basin = apa?.basin ? getApaBasinFeature(apa.basin) : null
  if (!subBasin && !basin) return null

  const color = APA_BASIN_COLORS[apa.basinName] ?? '#1f6f7a'

  return (
    <>
      {basin && (
        <Pane name="apa-selected-basin" style={{ zIndex: 240 }}>
          <GeoJSON
            key={`apa-basin-${apa.basin}`}
            data={basin}
            style={{
              color,
              weight: 1.6,
              opacity: 0.55,
              fillColor: color,
              fillOpacity: 0.06,
            }}
            interactive={false}
          />
        </Pane>
      )}
      {subBasin && (
        <Pane name="apa-selected-subbasin" style={{ zIndex: 245 }}>
          <GeoJSON
            key={`apa-sub-${apa.code}`}
            data={subBasin}
            style={{
              color,
              weight: 2.2,
              opacity: 0.8,
              fillColor: color,
              fillOpacity: 0.12,
            }}
            interactive={false}
          />
        </Pane>
      )}
    </>
  )
}
