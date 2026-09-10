import { useMemo, useState } from 'react'
import { Marker } from 'react-leaflet'
import { getCatchment, groupByCatchment } from '../../lib/catchments'
import { iconForSample, relatedIcon, selectedIcon } from './markerIcons'

export default function SampleMarkers({ samples, selectedId, onSelect }) {
  const catchmentGroups = useMemo(() => groupByCatchment(samples), [samples])
  const selectedSample = samples.find((s) => s.id === selectedId)
  const relatedIds = selectedSample
    ? new Set(
        (catchmentGroups[selectedSample.catchmentId] ?? [])
          .filter((s) => s.id !== selectedId)
          .map((s) => s.id),
      )
    : new Set()

  return samples.map((sample) => {
    const isSelected = sample.id === selectedId
    const isRelated = relatedIds.has(sample.id)
    const icon = isSelected
      ? selectedIcon(sample)
      : isRelated
        ? relatedIcon(sample, getCatchment(sample.catchmentId).color)
        : iconForSample(sample)

    return (
      <Marker
        key={sample.id}
        position={sample.position}
        icon={icon}
        eventHandlers={{
          click: () => onSelect?.(sample.id),
        }}
      />
    )
  })
}
