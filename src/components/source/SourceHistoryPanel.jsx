import { useMemo, useState } from 'react'
import { hazardName, measureName } from '../../lib/i18n'
import { useLanguage } from '../../context/LanguageContext'
import {
  buildSourceTimeline,
  countUnsafeReadings,
  formatReadingRows,
} from '../../lib/sourceHistory'
import { IconAlert, IconBeaker, IconClock } from '../ui/Icons'
import './SourceHistoryPanel.css'

function hazardSummary(hazardIds, locale) {
  if (!hazardIds?.length) return null
  return hazardIds.map((id) => hazardName(id, locale)).join(', ')
}

function ReadingList({ readings, qualityMeasures, compact = false, t }) {
  const rows = formatReadingRows(readings, qualityMeasures, t).map((row) => ({
    ...row,
    name: measureName(row.id, row.name, t),
  }))
  if (rows.length === 0) {
    return <p className="source-history-empty">{t('history.noReadingsLogged')}</p>
  }
  return (
    <ul className={`source-reading-list${compact ? ' source-reading-list--compact' : ''}`}>
      {rows.map((row) => (
        <li key={row.id} className="source-reading-item">
          <span
            className={`source-reading-dot${
              row.safe === true
                ? ' source-reading-dot--safe'
                : row.safe === false
                  ? ' source-reading-dot--unsafe'
                  : ''
            }`}
            aria-hidden="true"
          />
          <span className="source-reading-name">
            {!compact && <IconBeaker size={14} aria-hidden="true" />}
            {row.name}
          </span>
          <span className="source-reading-value">{row.value}</span>
          {row.safe === true && (
            <span className="source-reading-badge source-reading-badge--safe">{t('review.safe')}</span>
          )}
          {row.safe === false && (
            <span className="source-reading-badge source-reading-badge--unsafe">{t('review.outside')}</span>
          )}
        </li>
      ))}
    </ul>
  )
}

export default function SourceHistoryPanel({ sample, qualityMeasures }) {
  const { locale, dateLocale, t } = useLanguage()
  const timeline = useMemo(
    () => buildSourceTimeline(sample, dateLocale),
    [sample, dateLocale],
  )
  const lastRecording = timeline[0]
  const previousTests = timeline.slice(1)
  const [focusedId, setFocusedId] = useState(lastRecording?.id ?? null)

  const focusedEntry =
    timeline.find((entry) => entry.id === focusedId) ?? lastRecording ?? null
  const unsafeCount = lastRecording ? countUnsafeReadings(lastRecording.readings) : 0

  return (
    <div className="source-history-panel">
      <section className="source-history-section" aria-labelledby="source-last-recording">
        <div className="source-history-section-head">
          <h3 id="source-last-recording">{t('history.last')}</h3>
          {lastRecording && (
            <time className="source-history-when" dateTime={lastRecording.testedAt}>
              {lastRecording.dateLabel}
            </time>
          )}
        </div>

        {lastRecording ? (
          <div
            className={`source-last-card${unsafeCount > 0 ? ' source-last-card--alert' : ' source-last-card--ok'}`}
          >
            <div className="source-last-card-meta">
              <span className="source-last-card-session">
                {lastRecording.dateLabel}
              </span>
              {lastRecording.rainfallMm72h != null && (
                <span className="source-last-card-rain">
                  {t('history.rain72', { mm: lastRecording.rainfallMm72h })}
                </span>
              )}
            </div>
            <ReadingList
              readings={lastRecording.readings}
              qualityMeasures={qualityMeasures}
              t={t}
            />
            {hazardSummary(lastRecording.hazards, locale) && (
              <p className="source-last-card-hazards">
                <IconAlert size={14} aria-hidden="true" />
                {hazardSummary(lastRecording.hazards, locale)}
              </p>
            )}
          </div>
        ) : (
          <p className="source-history-empty">{t('history.noneYet')}</p>
        )}
      </section>

      {previousTests.length > 0 && (
        <section className="source-history-section" aria-labelledby="source-previous-dates">
          <div className="source-history-section-head">
            <h3 id="source-previous-dates">{t('history.previous')}</h3>
            <span className="source-history-count">{t('history.earlier', { count: previousTests.length })}</span>
          </div>
          <div className="source-date-scroll" role="list">
            {previousTests.map((entry) => (
              <button
                key={entry.id}
                type="button"
                role="listitem"
                className={`source-date-pill${focusedId === entry.id ? ' source-date-pill--active' : ''}`}
                onClick={() => setFocusedId(entry.id)}
                aria-pressed={focusedId === entry.id}
              >
                <span className="source-date-pill-day">{entry.dateShort}</span>
                <span className="source-date-pill-year">
                  {new Date(entry.testedAt).getFullYear()}
                </span>
              </button>
            ))}
          </div>
        </section>
      )}

      <section className="source-history-section" aria-labelledby="source-history-title">
        <div className="source-history-section-head">
          <h3 id="source-history-title">{t('history.title')}</h3>
        </div>

        <ol className="source-history-timeline">
          {timeline.map((entry, index) => {
            const unsafe = countUnsafeReadings(entry.readings)
            const isFocused = focusedEntry?.id === entry.id
            return (
              <li
                key={entry.id}
                className={`source-history-event${isFocused ? ' source-history-event--focused' : ''}${entry.isCurrent ? ' source-history-event--current' : ''}`}
              >
                <div className="source-history-event-marker" aria-hidden="true">
                  <span
                    className={`source-history-event-dot${
                      unsafe > 0 ? ' source-history-event-dot--unsafe' : ' source-history-event-dot--safe'
                    }`}
                  />
                  {index < timeline.length - 1 && <span className="source-history-event-line" />}
                </div>

                <button
                  type="button"
                  className="source-history-event-body"
                  onClick={() => setFocusedId(entry.id)}
                  aria-expanded={isFocused}
                >
                  <div className="source-history-event-head">
                    <span className="source-history-event-date">
                      <IconClock size={14} aria-hidden="true" />
                      {entry.dateLabel}
                    </span>
                    {entry.isCurrent && (
                      <span className="source-history-event-tag">{t('history.latest')}</span>
                    )}
                  </div>
                  <p className="source-history-event-session">
                    {entry.dateLabel}
                  </p>

                  {isFocused ? (
                    <>
                      <ReadingList
                        readings={entry.readings}
                        qualityMeasures={qualityMeasures}
                        compact
                        t={t}
                      />
                      {entry.rainfallMm72h != null && (
                        <p className="source-history-event-note">
                          {t('history.rainPrior', { mm: entry.rainfallMm72h })}
                        </p>
                      )}
                      {hazardSummary(entry.hazards, locale) && (
                        <p className="source-history-event-hazards">
                          {t('history.hazards', { list: hazardSummary(entry.hazards, locale) })}
                        </p>
                      )}
                    </>
                  ) : (
                    <p className="source-history-event-preview">
                      {formatReadingRows(entry.readings, qualityMeasures, t)
                        .map((r) => `${measureName(r.id, r.name, t)} ${r.value}`)
                        .join(' · ') || t('history.noReadings')}
                    </p>
                  )}
                </button>
              </li>
            )
          })}
        </ol>
      </section>
    </div>
  )
}
