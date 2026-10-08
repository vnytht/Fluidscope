import { sampleHasHazard } from '../../lib/hazards'
import { formatReadingDisplay } from '../../lib/readings'
import { getCatchment, shortCatchmentName } from '../../lib/catchments'
import { hazardName, measureName, sourceTypeName } from '../../lib/i18n'
import { useLanguage } from '../../context/LanguageContext'
import './SamplePopup.css'

export default function SamplePopup({ sample, qualityMeasures, relatedCount }) {
  const { locale, t } = useLanguage()
  const title = sourceTypeName(sample.sourceType, locale)

  const readingsLine = sample.readings
    .map((reading) => {
      const { name, value, unit } = formatReadingDisplay(reading, qualityMeasures, t)
      return `${measureName(reading.measureId, name, t)} ${value}${unit ? ` ${unit}` : ''}`
    })
    .join(' · ')

  const hazardsLine = sampleHasHazard(sample)
    ? sample.hazards.map((id) => hazardName(id, locale)).join(', ')
    : null

  const catchment = getCatchment(sample.catchmentId)

  return (
    <div className="sample-popup">
      <div className="sample-popup-head">
        <p className="sample-popup-title">{title}</p>
      </div>

      {readingsLine && <p className="sample-popup-line">{readingsLine}</p>}

      {hazardsLine && <p className="sample-popup-line sample-popup-line--hazard">{hazardsLine}</p>}

      {relatedCount > 0 && (
        <p className="sample-popup-linked">
          <span className="sample-popup-linked-dot" style={{ background: catchment.color }} />
          {t('popup.linked', {
            count: relatedCount + 1,
            name: shortCatchmentName(catchment.name),
          })}
        </p>
      )}
    </div>
  )
}
