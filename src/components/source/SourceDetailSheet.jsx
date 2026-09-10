import { useEffect, useState } from 'react'
import { SOURCE_TYPE_LABELS } from '../../lib/sourceTypeLabels'
import { HAZARD_TYPES, sampleHasHazard } from '../../lib/hazards'
import { formatReadingDisplay } from '../../lib/readings'
import { getCatchment, shortCatchmentName } from '../../lib/catchments'
import ChatPanel from '../chat/ChatPanel'
import SourceHistoryPanel from './SourceHistoryPanel'
import {
  IconAlert,
  IconBack,
  IconBeaker,
  IconChat,
  IconChevronRight,
  IconClose,
} from '../ui/Icons'
import './SourceDetailSheet.css'

export default function SourceDetailSheet({
  sample,
  relatedSamples,
  qualityMeasures,
  sessions,
  onClose,
  onEdit,
}) {
  const [chatOpen, setChatOpen] = useState(false)
  const [tab, setTab] = useState('details')
  const typeLabels = SOURCE_TYPE_LABELS[sample.sourceType]
  const catchment = getCatchment(sample.catchmentId)
  const communitySources = [sample, ...relatedSamples]
  const hazardsLine = sampleHasHazard(sample)
    ? sample.hazards.map((id) => HAZARD_TYPES.find((h) => h.id === id)?.en ?? id).join(', ')
    : null

  const communityLabel = shortCatchmentName(catchment.name)
  const sourceCountLabel = `${communitySources.length} linked source${communitySources.length > 1 ? 's' : ''}`

  useEffect(() => {
    setTab('details')
    setChatOpen(false)
  }, [sample.id])

  if (chatOpen) {
    return (
      <div className="flow-sheet source-detail-sheet source-detail-sheet--chat">
        <div className="source-detail-header source-detail-header--chat">
          <button
            type="button"
            className="flow-close source-detail-back"
            onClick={() => setChatOpen(false)}
            aria-label="Back to source"
          >
            <IconBack />
          </button>
          <div className="source-detail-title-wrap">
            <p className="source-detail-community-kicker">Community chat</p>
            <h2>{communityLabel}</h2>
          </div>
          <button type="button" className="flow-close source-detail-close" onClick={onClose} aria-label="Close">
            <IconClose />
          </button>
        </div>
        <ChatPanel
          variant="embedded"
          catchmentId={sample.catchmentId}
          onClose={() => setChatOpen(false)}
        />
      </div>
    )
  }

  return (
    <div
      className={`flow-sheet source-detail-sheet${tab === 'history' ? ' source-detail-sheet--history' : ''}`}
    >
      <div className="source-detail-header">
        <div className="source-detail-title-wrap">
          <h2>{typeLabels?.en ?? sample.sourceType}</h2>
          {typeLabels?.pt && <p className="source-detail-subtitle">{typeLabels.pt}</p>}
        </div>
        <button type="button" className="flow-close source-detail-close" onClick={onClose} aria-label="Close">
          <IconClose />
        </button>
      </div>

      <div className="source-detail-tabs" role="tablist" aria-label="Source sections">
        <span
          className="source-detail-tabs-slider"
          data-tab={tab}
          aria-hidden="true"
        />
        <button
          type="button"
          role="tab"
          id="source-tab-details"
          aria-selected={tab === 'details'}
          aria-controls="source-panel-details"
          className={`source-detail-tab${tab === 'details' ? ' source-detail-tab--active' : ''}`}
          onClick={() => setTab('details')}
        >
          Details
        </button>
        <button
          type="button"
          role="tab"
          id="source-tab-history"
          aria-selected={tab === 'history'}
          aria-controls="source-panel-history"
          className={`source-detail-tab${tab === 'history' ? ' source-detail-tab--active' : ''}`}
          onClick={() => setTab('history')}
        >
          History
        </button>
      </div>

      <div className="source-detail-panels">
        <div
          className="source-detail-panels-track"
          data-tab={tab}
          aria-live="polite"
        >
          <div
            id="source-panel-details"
            role="tabpanel"
            aria-labelledby="source-tab-details"
            tabIndex={tab === 'details' ? 0 : -1}
            className="flow-sheet-body source-detail-body source-detail-panel"
          >
            <div className="source-detail-rows">
              {sample.readings.map((reading) => {
                const { name, value, unit } = formatReadingDisplay(reading, qualityMeasures)
                return (
                  <div key={reading.measureId} className="source-detail-row">
                    <span className="source-detail-row-icon" aria-hidden="true">
                      <IconBeaker />
                    </span>
                    <div className="source-detail-row-text">
                      <span className="source-detail-row-label">{name}</span>
                      <span className="source-detail-row-value">
                        {value}
                        {unit ? ` ${unit}` : ''}
                      </span>
                    </div>
                  </div>
                )
              })}

              {hazardsLine && (
                <div className="source-detail-row source-detail-row--hazard">
                  <span className="source-detail-row-icon" aria-hidden="true">
                    <IconAlert />
                  </span>
                  <div className="source-detail-row-text">
                    <span className="source-detail-row-label">Hazards nearby</span>
                    <span className="source-detail-row-value">{hazardsLine}</span>
                  </div>
                </div>
              )}
            </div>

            <button
              type="button"
              className="source-detail-community-row"
              style={{ '--community-color': catchment.color }}
              onClick={() => setChatOpen(true)}
              aria-label={`Open community chat for ${communityLabel}`}
            >
              <span className="source-detail-community-icon" aria-hidden="true">
                <IconChat size={20} />
              </span>
              <span className="source-detail-community-copy">
                <span className="source-detail-community-kicker">Community chat</span>
                <span className="source-detail-community-name">{communityLabel}</span>
                <span className="source-detail-community-meta">{sourceCountLabel}</span>
              </span>
              <span className="source-detail-community-go">
                Open
                <IconChevronRight />
              </span>
            </button>
          </div>

          <div
            id="source-panel-history"
            role="tabpanel"
            aria-labelledby="source-tab-history"
            tabIndex={tab === 'history' ? 0 : -1}
            className="flow-sheet-body source-detail-body source-detail-panel source-detail-panel--history"
          >
            <SourceHistoryPanel
              sample={sample}
              sessions={sessions}
              qualityMeasures={qualityMeasures}
            />
          </div>
        </div>
      </div>

      {tab === 'details' && (
        <div className="flow-sheet-footer source-detail-footer">
          <button type="button" className="btn-outline source-detail-edit" onClick={onEdit}>
            Edit source
          </button>
        </div>
      )}
    </div>
  )
}
