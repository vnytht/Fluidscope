import { useMemo, useState } from 'react'
import { SEED_SAMPLES, SEED_SESSIONS, DEFAULT_QUALITY_MEASURES } from '../lib/mockData'
import { buildSourceTimeline, lastRecordingSummary } from '../lib/sourceHistory'
import { SOURCE_TYPE_LABELS } from '../lib/sourceTypeLabels'
import SourceHistoryPanel from '../components/source/SourceHistoryPanel'
import {
  IconBack,
  IconBeaker,
  IconChevronRight,
  IconClock,
  IconClose,
} from '../components/ui/Icons'
import './SourceHistoryUxOptions.css'

const SAMPLE = SEED_SAMPLES[0]

function DrawerShell({ label, badge, children }) {
  return (
    <div className="ux-phone">
      <div className="ux-phone-notch" aria-hidden="true" />
      <div className="ux-phone-screen">
        <p className="ux-phone-map-hint">Map behind drawer</p>
        <div className="ux-drawer">
          <div className="ux-drawer-handle" aria-hidden="true" />
          {badge && <span className="ux-option-badge">{badge}</span>}
          {children}
        </div>
      </div>
      <p className="ux-option-label">{label}</p>
    </div>
  )
}

function DrawerReadings({ sample }) {
  const typeLabels = SOURCE_TYPE_LABELS[sample.sourceType]
  return (
    <>
      <div className="ux-drawer-header">
        <div>
          <h3>{typeLabels?.en ?? sample.sourceType}</h3>
          {typeLabels?.pt && <p className="ux-drawer-sub">{typeLabels.pt}</p>}
        </div>
        <button type="button" className="ux-icon-btn" aria-label="Close">
          <IconClose />
        </button>
      </div>
      <div className="ux-drawer-body">
        {sample.readings.map((reading) => {
          const measure = DEFAULT_QUALITY_MEASURES.find((m) => m.id === reading.measureId)
          const unit = reading.measureId === 'nitrate' ? ' mg/L' : ''
          return (
            <div key={reading.measureId} className="ux-reading-row">
              <IconBeaker size={16} />
              <div>
                <span className="ux-reading-label">{measure?.name ?? reading.measureId}</span>
                <span className="ux-reading-value">
                  {reading.value}
                  {unit}
                </span>
              </div>
            </div>
          )
        })}
      </div>
    </>
  )
}

function HistoryView({ onBack, title = 'Test history' }) {
  return (
    <>
      <div className="ux-drawer-header ux-drawer-header--sub">
        <button type="button" className="ux-icon-btn" onClick={onBack} aria-label="Back">
          <IconBack />
        </button>
        <h3>{title}</h3>
        <button type="button" className="ux-icon-btn" aria-label="Close">
          <IconClose />
        </button>
      </div>
      <div className="ux-drawer-body ux-drawer-body--scroll">
        <SourceHistoryPanel
          sample={SAMPLE}
          sessions={SEED_SESSIONS}
          qualityMeasures={DEFAULT_QUALITY_MEASURES}
        />
      </div>
    </>
  )
}

function OptionA() {
  const [view, setView] = useState('main')
  const summary = useMemo(
    () => lastRecordingSummary(buildSourceTimeline(SAMPLE, SEED_SESSIONS)),
    [],
  )

  return (
    <DrawerShell label="Option A — Push sheet (like chat)" badge="Recommended">
      {view === 'main' ? (
        <>
          <DrawerReadings sample={SAMPLE} />
          <div className="ux-drawer-footer">
            <button type="button" className="ux-history-cta ux-history-cta--row" onClick={() => setView('history')}>
              <span className="ux-history-cta-icon">
                <IconClock size={18} />
              </span>
              <span className="ux-history-cta-copy">
                <span className="ux-history-cta-kicker">Test history</span>
                <span className="ux-history-cta-meta">
                  Last · {summary?.dateShort} · {summary?.count} recordings
                </span>
              </span>
              <IconChevronRight />
            </button>
          </div>
        </>
      ) : (
        <HistoryView onBack={() => setView('main')} />
      )}
    </DrawerShell>
  )
}

function OptionB() {
  const [view, setView] = useState('main')
  const summary = useMemo(
    () => lastRecordingSummary(buildSourceTimeline(SAMPLE, SEED_SESSIONS)),
    [],
  )

  return (
    <DrawerShell label="Option B — Full card CTA">
      {view === 'main' ? (
        <>
          <DrawerReadings sample={SAMPLE} />
          <div className="ux-drawer-body ux-drawer-body--tight">
            <button
              type="button"
              className="ux-history-card"
              onClick={() => setView('history')}
            >
              <span className="ux-history-card-icon">
                <IconClock size={20} />
              </span>
              <span className="ux-history-card-copy">
                <span className="ux-history-card-title">View test history</span>
                <span className="ux-history-card-meta">
                  {summary?.count} recordings · last {summary?.dateShort}
                </span>
                <span className="ux-history-card-preview">{summary?.preview}</span>
              </span>
              <span className="ux-history-card-go">
                Open
                <IconChevronRight />
              </span>
            </button>
          </div>
        </>
      ) : (
        <HistoryView onBack={() => setView('main')} />
      )}
    </DrawerShell>
  )
}

function OptionC() {
  const [view, setView] = useState('main')
  const summary = useMemo(
    () => lastRecordingSummary(buildSourceTimeline(SAMPLE, SEED_SESSIONS)),
    [],
  )

  return (
    <DrawerShell label="Option C — Compact peek row">
      {view === 'main' ? (
        <>
          <DrawerReadings sample={SAMPLE} />
          <button
            type="button"
            className="ux-history-peek"
            onClick={() => setView('history')}
          >
            <IconClock size={14} />
            <span>
              Last test {summary?.dateShort} — {summary?.preview}
            </span>
            <span className="ux-history-peek-action">History · {summary?.count}</span>
            <IconChevronRight size={14} />
          </button>
        </>
      ) : (
        <HistoryView onBack={() => setView('main')} title="Recordings" />
      )}
    </DrawerShell>
  )
}

function OptionD() {
  const [tab, setTab] = useState('details')

  return (
    <DrawerShell label="Option D — Header tabs">
      <div className="ux-drawer-header">
        <div>
          <h3>{SOURCE_TYPE_LABELS[SAMPLE.sourceType]?.en ?? SAMPLE.sourceType}</h3>
        </div>
        <button type="button" className="ux-icon-btn" aria-label="Close">
          <IconClose />
        </button>
      </div>
      <div className="ux-tab-bar" role="tablist">
        <button
          type="button"
          role="tab"
          aria-selected={tab === 'details'}
          className={`ux-tab${tab === 'details' ? ' ux-tab--active' : ''}`}
          onClick={() => setTab('details')}
        >
          Details
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={tab === 'history'}
          className={`ux-tab${tab === 'history' ? ' ux-tab--active' : ''}`}
          onClick={() => setTab('history')}
        >
          History
        </button>
      </div>
      {tab === 'details' ? (
        <div className="ux-drawer-body">
          {SAMPLE.readings.map((reading) => {
            const measure = DEFAULT_QUALITY_MEASURES.find((m) => m.id === reading.measureId)
            const unit = reading.measureId === 'nitrate' ? ' mg/L' : ''
            return (
              <div key={reading.measureId} className="ux-reading-row">
                <IconBeaker size={16} />
                <div>
                  <span className="ux-reading-label">{measure?.name ?? reading.measureId}</span>
                  <span className="ux-reading-value">
                    {reading.value}
                    {unit}
                  </span>
                </div>
              </div>
            )
          })}
          <p className="ux-tab-hint">Switch to History for past tests.</p>
        </div>
      ) : (
        <div className="ux-drawer-body ux-drawer-body--scroll">
          <SourceHistoryPanel
            sample={SAMPLE}
            sessions={SEED_SESSIONS}
            qualityMeasures={DEFAULT_QUALITY_MEASURES}
          />
        </div>
      )}
    </DrawerShell>
  )
}

export default function SourceHistoryUxOptions() {
  return (
    <div className="ux-options-page">
      <header className="ux-options-header">
        <div>
          <p className="ux-options-kicker">Prototype · pick one pattern</p>
          <h1>Source history — drawer entry options</h1>
          <p className="ux-options-lead">
            Main drawer stays clean (current readings only). Tap inside each mock to open
            history — last recording, previous dates, and full timeline with hypothetical data.
          </p>
        </div>
        <a className="ux-options-back" href="/">
          Back to map
        </a>
      </header>

      <div className="ux-options-grid">
        <OptionA />
        <OptionB />
        <OptionC />
        <OptionD />
      </div>

      <section className="ux-options-notes">
        <h2>What each history view includes</h2>
        <ul>
          <li>
            <strong>Last recording</strong> — most recent test, session, rainfall, readings with
            safe/unsafe dots
          </li>
          <li>
            <strong>Previous test dates</strong> — horizontal date pills to jump between tests
          </li>
          <li>
            <strong>History of this source</strong> — expandable timeline (4 mock entries for the
            dug well)
          </li>
        </ul>
        <p className="ux-options-pick">
          Reply with <strong>A</strong>, <strong>B</strong>, <strong>C</strong>, or{' '}
          <strong>D</strong> and we wire it into the real source drawer.
        </p>
      </section>
    </div>
  )
}
