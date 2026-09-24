import { GeoJSON, Pane } from 'react-leaflet'
import apaBasins from '../../data/apa_basins_rh1_viana.geojson?raw'
import apaSubBasins from '../../data/apa_subbasins_rh1_viana.geojson?raw'
import { APA_BASIN_COLORS } from '../../lib/apaCatchments'

// Official APA / PGRH RH1 (Minho e Lima) catchments from SNIAmb
// "Bacias de Massas de Água". Basins = Lima, Minho, Neiva, Costeiras.
// Sub-basins = the 70 named water-body catchments (Estorãos, Vez, Coura…).
const basins = JSON.parse(apaBasins)
const subBasins = JSON.parse(apaSubBasins)

export default function BasinLayers({ showBasins, showSubBasins }) {
  if (!showBasins && !showSubBasins) return null

  return (
    <>
      {showBasins && (
        <Pane name="hydro-basins" style={{ zIndex: 220 }}>
          <GeoJSON
            data={basins}
            style={(feature) => {
              const color = APA_BASIN_COLORS[feature.properties?.name] ?? '#2f6f7a'
              return {
                color,
                weight: 2.6,
                opacity: 0.9,
                fillColor: color,
                fillOpacity: 0.14,
              }
            }}
            interactive={false}
          />
        </Pane>
      )}
      {showSubBasins && (
        <Pane name="hydro-sub-basins" style={{ zIndex: 230 }}>
          <GeoJSON
            data={subBasins}
            style={{
              color: '#2c4a52',
              weight: 1.1,
              opacity: 0.7,
              fillColor: '#7ea0aa',
              fillOpacity: 0.05,
            }}
            interactive={false}
          />
        </Pane>
      )}
    </>
  )
}
