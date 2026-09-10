import { getMeasureScale } from './qualityBands'

export function resolveMeasure(measureId, qualityMeasures) {
  return (
    qualityMeasures.find((m) => m.id === measureId) ?? {
      id: measureId,
      name: measureId,
      scale: '',
    }
  )
}

export function formatReadingDisplay(reading, qualityMeasures) {
  const measure = resolveMeasure(reading.measureId, qualityMeasures)
  const unit = getMeasureScale(measure.id)?.unit ?? ''
  return {
    name: measure.name,
    value: reading.value,
    unit,
  }
}
