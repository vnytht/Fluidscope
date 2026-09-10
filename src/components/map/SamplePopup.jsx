import { SOURCE_TYPE_LABELS } from '../../lib/sourceTypeLabels'
import { HAZARD_TYPES, sampleHasHazard } from '../../lib/hazards'
import { formatReadingDisplay } from '../../lib/readings'
import { getCatchment, shortCatchmentName } from '../../lib/catchments'
import './SamplePopup.css'

export default function SamplePopup({ sample, qualityMeasures, relatedCount }) {
  const typeLabels = SOURCE_TYPE_LABELS[sample.sourceType]
  const title = typeLabels?.en ?? sample.sourceType
  const subtitle = typeLabels?.pt

  const readingsLine = sample.readings
    .map((reading) => {
      const { name, value, unit } = formatReadingDisplay(reading, qualityMeasures)
      return `${name} ${value}${unit ? ` ${unit}` : ''}`
    })
    .join(' · ')

  const hazardsLine = sampleHasHazard(sample)
    ? sample.hazards
        .map((id) => HAZARD_TYPES.find((h) => h.id === id)?.en ?? id)
        .join(', ')
    : null

  const catchment = getCatchment(sample.catchmentId)

  return (
    <div className="sample-popup">
      <div className="sample-popup-head">
        <p className="sample-popup-title">{title}</p>
        {subtitle && <p className="sample-popup-subtitle">{subtitle}</p>}
      </div>

      {readingsLine && <p className="sample-popup-line">{readingsLine}</p>}

      {hazardsLine && <p className="sample-popup-line sample-popup-line--hazard">{hazardsLine}</p>}

      {relatedCount > 0 && (
        <p className="sample-popup-linked">
          <span className="sample-popup-linked-dot" style={{ background: catchment.color }} />
          {relatedCount + 1} linked · {shortCatchmentName(catchment.name)}
        </p>
      )}
    </div>
  )
}
