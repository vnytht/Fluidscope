import { formatBandValue, getMeasureScale, normalizePresence } from './qualityBands'

export function resolveMeasure(measureId, qualityMeasures) {
  return (
    qualityMeasures.find((m) => m.id === measureId) ?? {
      id: measureId,
      name: measureId,
      scale: '',
    }
  )
}

export function formatReadingDisplay(reading, qualityMeasures, t) {
  const measure = resolveMeasure(reading.measureId, qualityMeasures)
  const unit = getMeasureScale(measure.id)?.unit ?? measure.unit ?? ''
  const presence = normalizePresence(reading.value)
  const value =
    presence && t ? t(`quality.${presence}`) : formatBandValue(reading.measureId, reading.value, t)
  return {
    name: measure.name,
    value,
    unit,
    presence,
  }
}
