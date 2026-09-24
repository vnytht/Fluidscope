import { useEffect } from 'react'
import { useMap } from 'react-leaflet'
import { getBasinsBbox } from '../../lib/hydrology'

export default function FitSelectedBasin({ basinIds, enabled }) {
  const map = useMap()

  useEffect(() => {
    if (!enabled) return
    const bbox = getBasinsBbox(basinIds)
    if (!bbox) return
    map.fitBounds(
      [
        [bbox.south, bbox.west],
        [bbox.north, bbox.east],
      ],
      { padding: [28, 28], maxZoom: 14, animate: true },
    )
  }, [basinIds, enabled, map])

  return null
}
