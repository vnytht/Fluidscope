import { useEffect, useState } from 'react'
import { SOURCE_TYPE_LABELS } from '../../lib/sourceTypeLabels'
import { sampleHasHazard } from '../../lib/hazards'
import { hazardName, measureName, sourceTypeName } from '../../lib/i18n'
import { useLanguage } from '../../context/LanguageContext'
import { formatReadingDisplay } from '../../lib/readings'
import { getCatchment, shortCatchmentName } from '../../lib/catchments'
import { APA_BASIN_COLORS } from '../../lib/apaCatchments'
import ChatPanel from '../chat/ChatPanel'
import SourceHistoryPanel from './SourceHistoryPanel'
import {
  IconAlert,
  IconBeaker,
  IconChat,
  IconChevronRight,
  IconClose,
} from '../ui/Icons'
import './SourceDetailSheet.css'

export default function SourceDetailSheet({
  sample,
  relatedSamples,
  impactAnalysis,
  qualityMeasures,
  sessions,
  onClose,
  onEdit,
}) {
  const { locale, t } = useLanguage()
  const [chatOpen, setChatOpen] = useState(false)
  const [tab, setTab] = useState('details')
  const typeLabels = SOURCE_TYPE_LABELS[sample.sourceType]
  const catchment = getCatchment(sample.catchmentId)
  const apa = sample.apa ?? impactAnalysis?.apa?.assignment ?? null
  const communitySources = [sample, ...relatedSamples]
  const hazardsLine = sampleHasHazard(sample)
    ? sample.hazards.map((id) => hazardName(id, locale)).join(', ')
    : null

  const apaLooksCoded = Boolean(apa?.name && /^(CWB-|PT0)|-WB/i.test(apa.name))
  const apaTitle = apaLooksCoded && apa.subBasin ? apa.subBasin : apa?.name
  const communityLabel = apaTitle || apa?.name || shortCatchmentName(catchment.name)
  const communityColor = APA_BASIN_COLORS[apa?.basinName] ?? catchment.color
  const sourceCountLabel =
    communitySources.length === 1
      ? t('detail.linkedOne')
      : t('detail.linkedMany', { count: communitySources.length })
  const sameBasinCount = impactAnalysis?.sameBasinSamples.length ?? 0
  useEffect(() => {
    setTab('details')
    setChatOpen(false)
  }, [sample.id])

  if (chatOpen) {
    return (
      <div className="flow-sheet source-detail-sheet source-detail-sheet--chat">
        <ChatPanel
          variant="embedded"
          startBasinId={sample.basinChatId}
          startTownId={sample.townId}
          taggedPlace={{
            id: sample.id,
            label: sample.localName || sourceTypeName(sample.sourceType, locale),
          }}
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
          <h2>{sample.localName || sourceTypeName(sample.sourceType, locale)}</h2>
          {typeLabels && sample.localName && (
            <p className="source-detail-subtitle">{sourceTypeName(sample.sourceType, locale)}</p>
          )}
        </div>
        <button type="button" className="flow-close source-detail-close" onClick={onClose} aria-label={t('detail.close')}>
          <IconClose />
        </button>
      </div>

      <div className="source-detail-tabs" role="tablist" aria-label={t('detail.tabs')}>
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
          {t('detail.details')}
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
          {t('detail.history')}
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
              {sample.depthMeters != null && (
                <div className="source-detail-row">
                  <div className="source-detail-row-text">
                    <span className="source-detail-row-label">{t('detail.depth')}</span>
                    <span className="source-detail-row-value">{sample.depthMeters} m</span>
                  </div>
                </div>
              )}
              {sample.runsDry && (
                <div className="source-detail-row">
                  <div className="source-detail-row-text">
                    <span className="source-detail-row-label">{t('detail.runsDry')}</span>
                    <span className="source-detail-row-value">
                      {sample.runsDry === 'yes'
                        ? t('detail.yes')
                        : sample.runsDry === 'no'
                          ? t('detail.no')
                          : t('detail.notSure')}
                    </span>
                  </div>
                </div>
              )}
              {sample.sampledAt && (
                <div className="source-detail-row">
                  <div className="source-detail-row-text">
                    <span className="source-detail-row-label">{t('detail.sampleDate')}</span>
                    <span className="source-detail-row-value">{String(sample.sampledAt).slice(0, 10)}</span>
                  </div>
                </div>
              )}
              {sample.recentRain && (
                <div className="source-detail-row">
                  <div className="source-detail-row-text">
                    <span className="source-detail-row-label">{t('detail.recentRain')}</span>
                    <span className="source-detail-row-value">
                      {sample.recentRain === 'none'
                        ? t('detail.rainNone')
                        : sample.recentRain === 'light'
                          ? t('detail.rainLight')
                          : t('detail.rainHeavy')}
                    </span>
                  </div>
                </div>
              )}
              {sample.readings.map((reading) => {
                const { name, value, unit } = formatReadingDisplay(reading, qualityMeasures)
                return (
                  <div key={reading.measureId} className="source-detail-row">
                    <span className="source-detail-row-icon" aria-hidden="true">
                      <IconBeaker />
                    </span>
                    <div className="source-detail-row-text">
                      <span className="source-detail-row-label">{measureName(reading.measureId, name, t)}</span>
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
                    <span className="source-detail-row-label">{t('review.hazards')}</span>
                    <span className="source-detail-row-value">{hazardsLine}</span>
                  </div>
                </div>
              )}
            </div>

            {apa ? (
              <section className="impact-card" aria-label={t('detail.catchment')}>
                <div className="impact-card__head">
                  <div>
                    <p className="impact-card__eyebrow">{t('detail.apaBasin', { name: apa.basinName })}</p>
                    <h3>{apaTitle}</h3>
                    {apaLooksCoded && apa.subBasin && (
                      <p className="impact-card__code">{apa.name}</p>
                    )}
                  </div>
                  <p className="impact-card__neighbours">
                    {sameBasinCount === 1
                      ? t('detail.neighbourOne')
                      : t('detail.neighbours', { count: sameBasinCount })}
                  </p>
                </div>
                <p className="impact-card__note">{t('detail.catchmentNote')}</p>
              </section>
            ) : (
              <section className="impact-card impact-card--unmapped">
                {t('detail.unmapped')}
              </section>
            )}

            <button
              type="button"
              className="source-detail-community-row"
              style={{ '--community-color': communityColor }}
              onClick={() => setChatOpen(true)}
              aria-label={t('detail.openChat', { name: communityLabel })}
            >
              <span className="source-detail-community-icon" aria-hidden="true">
                <IconChat size={20} />
              </span>
              <span className="source-detail-community-copy">
                <span className="source-detail-community-kicker">{t('detail.chat')}</span>
                <span className="source-detail-community-name">{communityLabel}</span>
                <span className="source-detail-community-meta">{sourceCountLabel}</span>
              </span>
              <span className="source-detail-community-go">
                {t('detail.open')}
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
            {t('detail.edit')}
          </button>
        </div>
      )}
    </div>
  )
}
