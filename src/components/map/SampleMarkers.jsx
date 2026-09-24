import { useMemo } from 'react'
import { Marker } from 'react-leaflet'
import { getCatchment } from '../../lib/catchments'
import { downstreamIcon, iconForSample, relatedIcon, selectedIcon, upstreamIcon } from './markerIcons'

export default function SampleMarkers({ samples, selectedId, onSelect, impactAnalysis }) {
  const relations = useMemo(() => impactAnalysis?.relationBySampleId ?? {}, [impactAnalysis])
  const hasSelection = Boolean(selectedId)

  return samples.map((sample) => {
    const isSelected = sample.id === selectedId
    const relation = relations[sample.id]
    const icon = isSelected
      ? selectedIcon(sample)
      : relation === 'upstream'
        ? upstreamIcon(sample)
        : relation === 'downstream'
        ? downstreamIcon(sample)
        : relation === 'same-apa' || relation === 'same-basin'
        ? relatedIcon(sample, getCatchment(sample.catchmentId).color)
        : iconForSample(sample)

    return (
      <Marker
        key={sample.id}
        position={sample.position}
        icon={icon}
        opacity={hasSelection && !isSelected && !relation ? 0.38 : 1}
        eventHandlers={{
          click: () => onSelect?.(sample.id),
        }}
      />
    )
  })
}
