import { Marker, Tooltip } from 'react-leaflet'
import { hazardName } from '../../lib/i18n'
import { useLanguage } from '../../context/LanguageContext'
import { standaloneHazardIcon } from './markerIcons'

export default function HazardMarkers({ hazards, selectedId, onSelect }) {
  const { locale } = useLanguage()
  if (!hazards?.length) return null

  return hazards.map((hazard) => {
    const isDraft = String(hazard.id).startsWith('draft-')
    return (
      <Marker
        key={hazard.id}
        position={hazard.position}
        icon={standaloneHazardIcon}
        zIndexOffset={hazard.id === selectedId ? 520 : 400}
        eventHandlers={
          isDraft || !onSelect
            ? undefined
            : {
                click: () => onSelect(hazard.id),
              }
        }
      >
        <Tooltip direction="top" offset={[0, -18]}>
          {hazardName(hazard.typeId, locale)}
        </Tooltip>
      </Marker>
    )
  })
}
