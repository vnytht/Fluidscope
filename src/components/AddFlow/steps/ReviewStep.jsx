import { formatCoords } from '../../../lib/mapConfig'
import { evaluateReading, PUBLIC_INFO_LINKS } from '../../../lib/qualityBands'
import { formatReadingDisplay } from '../../../lib/readings'
import { hazardName, measureName, sourceTypeName } from '../../../lib/i18n'
import { useLanguage } from '../../../context/LanguageContext'
import { IconAlert, IconBeaker, IconMapPin } from '../../ui/Icons'

export default function ReviewStep({
  location,
  sourceType,
  sourceDetails,
  readings,
  hazards,
  qualityMeasures,
  onEdit,
}) {
  const { locale, t } = useLanguage()
  const sourceName = sourceTypeName(sourceType, locale)
  const place = location ? formatCoords(location) : t('review.notSet')
  const depthLine = sourceDetails?.depthMeters
    ? t('review.depthValue', { n: sourceDetails.depthMeters })
    : null

  const rows = readings.map((reading) => {
    const display = formatReadingDisplay(reading, qualityMeasures)
    const { safe, band } = evaluateReading(reading.measureId, reading.value)
    const publicLink = PUBLIC_INFO_LINKS[reading.measureId]
    return {
      id: reading.measureId,
      name: measureName(reading.measureId, display.name, t),
      value: `${display.value}${display.unit ? ` ${display.unit}` : ''}`,
      safe,
      publicLink,
      band,
    }
  })
  const unsafeReadings = rows.filter((r) => r.safe === false)
  const hazardsLine =
    hazards.length === 0
      ? t('review.noneReported')
      : hazards.map((id) => hazardName(id, locale)).join(', ')

  return (
    <div className="flow-step review-step">
      <h2>{t('review.title')}</h2>
      <p className="flow-hint review-lead">{t('review.lead')}</p>

      {unsafeReadings.length > 0 && (
        <div className="review-alert" role="alert">
          <div className="review-alert-head">
            <span className="review-alert-icon" aria-hidden="true">
              <IconAlert size={20} />
            </span>
            <div>
              <p className="review-alert-title">
                {unsafeReadings.length === 1 ? t('review.unsafeOne') : t('review.unsafeMany')}
              </p>
              <p className="review-alert-copy">{t('review.unsafeCopy')}</p>
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
                    {t(`public.${reading.id}`)}
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
            <span className="review-row-label">{t('review.location')}</span>
            <span className="review-row-value review-row-value--with-icon">
              <IconMapPin size={16} aria-hidden="true" />
              {place}
            </span>
          </div>
          <button type="button" className="review-row-edit" onClick={() => onEdit('location')}>
            {t('review.edit')}
          </button>
        </div>

        <div className="review-row">
          <div className="review-row-copy">
            <span className="review-row-label">{t('review.source')}</span>
            <span className="review-row-value">{sourceName}</span>
          </div>
          <button type="button" className="review-row-edit" onClick={() => onEdit('sourceType')}>
            {t('review.edit')}
          </button>
        </div>

        {depthLine && (
          <div className="review-row">
            <div className="review-row-copy">
              <span className="review-row-label">{t('review.depth')}</span>
              <span className="review-row-value">{depthLine}</span>
            </div>
            <button type="button" className="review-row-edit" onClick={() => onEdit('sourceType')}>
              {t('review.edit')}
            </button>
          </div>
        )}

        <div className="review-row review-row--readings">
          <div className="review-row-copy">
            <span className="review-row-label">{t('review.readings')}</span>
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
                    <span className="review-reading-badge review-reading-badge--safe">
                      {t('review.safe')}
                    </span>
                  )}
                  {reading.safe === false && (
                    <span className="review-reading-badge review-reading-badge--unsafe">
                      {t('review.outside')}
                    </span>
                  )}
                </li>
              ))}
            </ul>
          </div>
          <button type="button" className="review-row-edit" onClick={() => onEdit('quality')}>
            {t('review.edit')}
          </button>
        </div>

        <div className="review-row">
          <div className="review-row-copy">
            <span className="review-row-label">{t('review.hazards')}</span>
            <span className="review-row-value">{hazardsLine}</span>
          </div>
          <button type="button" className="review-row-edit" onClick={() => onEdit('hazard')}>
            {t('review.edit')}
          </button>
        </div>
      </div>
    </div>
  )
}
