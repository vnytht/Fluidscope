import { useMemo, useState } from 'react'
import { HAZARD_TYPES } from '../../lib/hazards'
import {
  buildSourceTimeline,
  countUnsafeReadings,
  formatReadingRows,
} from '../../lib/sourceHistory'
import { IconAlert, IconBeaker, IconClock } from '../ui/Icons'
import './SourceHistoryPanel.css'

function hazardSummary(hazardIds) {
  if (!hazardIds?.length) return null
  return hazardIds.map((id) => HAZARD_TYPES.find((h) => h.id === id)?.en ?? id).join(', ')
}

function ReadingList({ readings, qualityMeasures, compact = false }) {
  const rows = formatReadingRows(readings, qualityMeasures)
  if (rows.length === 0) {
    return <p className="source-history-empty">No readings logged.</p>
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
            <span className="source-reading-badge source-reading-badge--safe">Safe</span>
          )}
          {row.safe === false && (
            <span className="source-reading-badge source-reading-badge--unsafe">Outside limit</span>
          )}
        </li>
      ))}
    </ul>
  )
}

export default function SourceHistoryPanel({ sample, sessions, qualityMeasures }) {
  const timeline = useMemo(() => buildSourceTimeline(sample, sessions), [sample, sessions])
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
          <h3 id="source-last-recording">Last recording</h3>
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
              <span className="source-last-card-session">{lastRecording.sessionName}</span>
              {lastRecording.rainfallMm72h != null && (
                <span className="source-last-card-rain">
                  {lastRecording.rainfallMm72h} mm rain · 72 h
                </span>
              )}
            </div>
            <ReadingList readings={lastRecording.readings} qualityMeasures={qualityMeasures} />
            {hazardSummary(lastRecording.hazards) && (
              <p className="source-last-card-hazards">
                <IconAlert size={14} aria-hidden="true" />
                {hazardSummary(lastRecording.hazards)}
              </p>
            )}
          </div>
        ) : (
          <p className="source-history-empty">No recordings yet.</p>
        )}
      </section>

      {previousTests.length > 0 && (
        <section className="source-history-section" aria-labelledby="source-previous-dates">
          <div className="source-history-section-head">
            <h3 id="source-previous-dates">Previous test dates</h3>
            <span className="source-history-count">{previousTests.length} earlier</span>
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
          <h3 id="source-history-title">History of this source</h3>
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
                      <span className="source-history-event-tag">Latest</span>
                    )}
                  </div>
                  <p className="source-history-event-session">{entry.sessionName}</p>

                  {isFocused ? (
                    <>
                      <ReadingList
                        readings={entry.readings}
                        qualityMeasures={qualityMeasures}
                        compact
                      />
                      {entry.rainfallMm72h != null && (
                        <p className="source-history-event-note">
                          {entry.rainfallMm72h} mm rainfall in prior 72 hours
                        </p>
                      )}
                      {hazardSummary(entry.hazards) && (
                        <p className="source-history-event-hazards">
                          Hazards: {hazardSummary(entry.hazards)}
                        </p>
                      )}
                    </>
                  ) : (
                    <p className="source-history-event-preview">
                      {formatReadingRows(entry.readings, qualityMeasures)
                        .map((r) => `${r.name} ${r.value}`)
                        .join(' · ') || 'No readings'}
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
