import { formatCoords } from '../../../lib/mapConfig'
import { HAZARD_TYPES } from '../../../lib/hazards'
import { evaluateReading, PUBLIC_INFO_LINKS } from '../../../lib/qualityBands'
import { formatReadingDisplay } from '../../../lib/readings'
import { SOURCE_TYPE_LABELS } from '../../../lib/sourceTypeLabels'
import { IconAlert, IconBeaker, IconMapPin } from '../../ui/Icons'

function hazardsLabel(hazards) {
  if (hazards.length === 0) return 'None reported'
  return hazards.map((id) => HAZARD_TYPES.find((h) => h.id === id)?.en ?? id).join(', ')
}

function readingRows(readings, qualityMeasures) {
  return readings.map((reading) => {
    const display = formatReadingDisplay(reading, qualityMeasures)
    const { safe, band } = evaluateReading(reading.measureId, reading.value)
    const publicLink = PUBLIC_INFO_LINKS[reading.measureId]
    return {
      id: reading.measureId,
      name: display.name,
      value: `${display.value}${display.unit ? ` ${display.unit}` : ''}`,
      safe,
      publicLink,
      band,
    }
  })
}

export default function ReviewStep({
  location,
  sourceType,
  readings,
  hazards,
  qualityMeasures,
  onEdit,
}) {
  const sourceName = SOURCE_TYPE_LABELS[sourceType]?.en ?? sourceType
  const place = location ? formatCoords(location) : 'Not set'
  const rows = readingRows(readings, qualityMeasures)
  const unsafeReadings = rows.filter((r) => r.safe === false)

  return (
    <div className="flow-step review-step">
      <h2>Review</h2>
      <p className="flow-hint review-lead">
        Check everything before it goes on the community map.
      </p>

      {unsafeReadings.length > 0 && (
        <div className="review-alert" role="alert">
          <div className="review-alert-head">
            <span className="review-alert-icon" aria-hidden="true">
              <IconAlert size={20} />
            </span>
            <div>
              <p className="review-alert-title">
                {unsafeReadings.length === 1
                  ? 'This reading is outside safe limits'
                  : 'These readings are outside safe limits'}
              </p>
              <p className="review-alert-copy">
                Private wells in this region often exceed drinking-water guidelines. Consider
                retesting or avoiding use for drinking, especially for infants.
              </p>
            </div>
          </div>
          <ul className="review-alert-list">
            {unsafeReadings.map((reading) => (
              <li key={reading.id}>
                <span className="review-alert-reading">
                  <span className="review-status-dot review-status-dot--unsafe" aria-hidden="true" />
                  {reading.name} — {reading.value}
                </span>
                {reading.publicLink && (
                  <a
                    className="review-learn-more"
                    href={reading.publicLink.url}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    {reading.publicLink.label}
                    <span aria-hidden="true"> ↗</span>
                  </a>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="review-rows">
        <div className="review-row">
          <div className="review-row-copy">
            <span className="review-row-label">Location</span>
            <span className="review-row-value review-row-value--with-icon">
              <IconMapPin size={16} aria-hidden="true" />
              {place}
            </span>
          </div>
          <button type="button" className="review-row-edit" onClick={() => onEdit('location')}>
            Edit
          </button>
        </div>

        <div className="review-row">
          <div className="review-row-copy">
            <span className="review-row-label">Source</span>
            <span className="review-row-value">{sourceName}</span>
          </div>
          <button type="button" className="review-row-edit" onClick={() => onEdit('sourceType')}>
            Edit
          </button>
        </div>

        <div className="review-row review-row--readings">
          <div className="review-row-copy">
            <span className="review-row-label">Readings</span>
            <ul className="review-reading-list">
              {rows.map((reading) => (
                <li key={reading.id} className="review-reading-item">
                  <span
                    className={`review-status-dot${
                      reading.safe === true
                        ? ' review-status-dot--safe'
                        : reading.safe === false
                          ? ' review-status-dot--unsafe'
                          : ''
                    }`}
                    aria-hidden="true"
                  />
                  <span className="review-reading-name">
                    <IconBeaker size={14} aria-hidden="true" />
                    {reading.name}
                  </span>
                  <span className="review-reading-value">{reading.value}</span>
                  {reading.safe === true && (
                    <span className="review-reading-badge review-reading-badge--safe">Safe</span>
                  )}
                  {reading.safe === false && (
                    <span className="review-reading-badge review-reading-badge--unsafe">
                      Outside limit
                    </span>
                  )}
                </li>
              ))}
            </ul>
          </div>
          <button type="button" className="review-row-edit" onClick={() => onEdit('quality')}>
            Edit
          </button>
        </div>

        <div className="review-row">
          <div className="review-row-copy">
            <span className="review-row-label">Hazards nearby</span>
            <span className="review-row-value">{hazardsLabel(hazards)}</span>
          </div>
          <button type="button" className="review-row-edit" onClick={() => onEdit('hazard')}>
            Edit
          </button>
        </div>
      </div>
    </div>
  )
}
