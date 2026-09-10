import { MapContainer, TileLayer } from 'react-leaflet'
import {
  BASEMAPS,
  DEFAULT_BASEMAP,
  DEFAULT_ZOOM,
  MAX_ZOOM,
  MIN_ZOOM,
  WATERSHED_BOUNDS,
  WATERSHED_CENTER,
} from '../lib/mapConfig'
import './WatershedMap.css'

// Full-screen base map for the watershed. `children` is where map-context
// components mount (location picker, sample markers) — anything that needs
// react-leaflet hooks like useMapEvents has to live inside MapContainer.
export default function WatershedMap({ children }) {
  const basemap = BASEMAPS[DEFAULT_BASEMAP]

  return (
    <MapContainer
      className="watershed-map"
      center={WATERSHED_CENTER}
      zoom={DEFAULT_ZOOM}
      minZoom={MIN_ZOOM}
      maxZoom={MAX_ZOOM}
      maxBounds={WATERSHED_BOUNDS}
      maxBoundsViscosity={0.6}
      zoomControl={false}
      attributionControl={true}
    >
      <TileLayer
        url={basemap.url}
        attribution={basemap.attribution}
        maxZoom={basemap.maxZoom}
      />
      {children}
    </MapContainer>
  )
}
