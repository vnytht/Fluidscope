import { useEffect, useRef, useState } from 'react'
import { Marker, Tooltip, useMap, useMapEvents } from 'react-leaflet'
import { formatCoords, reverseGeocode } from '../../lib/mapConfig'
import { placementPinIcon } from './markerIcons'

// Pin stays on the map for the whole add flow. `editable` is only true on the
// location step — after Continue it becomes a fixed preview until Back.
export default function LocationPicker({ active, editable, location, onPick, panRequest }) {
  const map = useMap()
  const dragging = useRef(false)
  const [placeLabel, setPlaceLabel] = useState('')
  const [labelLoading, setLabelLoading] = useState(false)

  useEffect(() => {
    if (!editable) return
    if (!location) {
      onPick([map.getCenter().lat, map.getCenter().lng])
    }
  }, [editable, location, map, onPick])

  useEffect(() => {
    if (editable && panRequest) {
      onPick(panRequest.coords)
      map.flyTo(panRequest.coords, Math.max(map.getZoom(), 15))
    }
  }, [panRequest, editable, map, onPick])

  useEffect(() => {
    if (!active || !location) return
    setPlaceLabel(formatCoords(location))
    const controller = new AbortController()
    const timer = setTimeout(async () => {
      setLabelLoading(true)
      try {
        const label = await reverseGeocode(location, controller.signal)
        setPlaceLabel(label)
      } catch {
        setPlaceLabel(formatCoords(location))
      } finally {
        setLabelLoading(false)
      }
    }, 450)
    return () => {
      clearTimeout(timer)
      controller.abort()
    }
  }, [active, location])

  useMapEvents({
    click(e) {
      if (!editable || dragging.current) return
      onPick([e.latlng.lat, e.latlng.lng])
    },
  })

  if (!active || !location) return null

  const tooltipText = labelLoading ? 'Finding place…' : placeLabel

  return (
    <Marker
      position={location}
      icon={placementPinIcon}
      draggable={editable}
      zIndexOffset={1000}
      eventHandlers={
        editable
          ? {
              dragstart() {
                dragging.current = true
                map.dragging.disable()
              },
              drag(e) {
                const { lat, lng } = e.target.getLatLng()
                onPick([lat, lng])
              },
              dragend(e) {
                map.dragging.enable()
                const { lat, lng } = e.target.getLatLng()
                onPick([lat, lng])
                setTimeout(() => {
                  dragging.current = false
                }, 0)
              },
            }
          : undefined
      }
    >
      <Tooltip permanent direction="top" offset={[0, -42]} className="placement-pin-tooltip">
        {tooltipText}
      </Tooltip>
    </Marker>
  )
}
