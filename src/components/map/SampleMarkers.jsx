import { useMemo } from 'react'
import { Marker } from 'react-leaflet'
import { downstreamIcon, iconForSample, relatedIcon, selectedIcon, upstreamIcon } from './markerIcons'

export default function SampleMarkers({ samples, selectedId, onSelect, impactAnalysis, qualityMeasures }) {
  const relations = useMemo(() => impactAnalysis?.relationBySampleId ?? {}, [impactAnalysis])
  const hasSelection = Boolean(selectedId)

  return samples.map((sample) => {
    const isSelected = sample.id === selectedId
    const relation = relations[sample.id]
    const icon = isSelected
      ? selectedIcon(sample, qualityMeasures)
      : relation === 'upstream'
        ? upstreamIcon(sample, qualityMeasures)
        : relation === 'downstream'
          ? downstreamIcon(sample, qualityMeasures)
        : relation === 'same-apa' || relation === 'same-basin'
        ? relatedIcon(sample, qualityMeasures)
        : iconForSample(sample, qualityMeasures)

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
