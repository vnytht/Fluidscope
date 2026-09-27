import { useState } from 'react'
import { HAZARD_TYPES, hazardsByActivity } from '../../../lib/hazards'
import { hazardName } from '../../../lib/i18n'
import { useLanguage } from '../../../context/LanguageContext'

export default function HazardStep({
  value,
  places,
  placingId,
  onChange,
  onPlace,
  onClearPlace,
}) {
  const { locale, t } = useLanguage()
  const selected = value ?? []
  const noneKnown = value !== null && selected.length === 0
  const [expandedGroup, setExpandedGroup] = useState(null)

  function toggleType(id) {
    const next = selected.includes(id) ? selected.filter((h) => h !== id) : [...selected, id]
    onChange(next)
    if (selected.includes(id)) onClearPlace?.(id)
  }

  function chooseNone() {
    onChange([])
    setExpandedGroup(null)
    selected.forEach((id) => onClearPlace?.(id))
  }

  function groupSummary(activity) {
    const picked = hazardsByActivity(activity).filter((item) => selected.includes(item.id))
    if (picked.length === 0) return t('quality.tapToAdd')
    if (picked.length === 1) return hazardName(picked[0].id, locale)
    return t('hazard.selectedCount', { count: picked.length })
  }

  function openGroup(activity) {
    if (value === null) onChange([])
    setExpandedGroup((current) => (current === activity ? null : activity))
  }

  return (
    <div className="flow-step">
      <h2>{t('hazard.title')}</h2>
      <p className="flow-hint">{t('hazard.hint')}</p>

      <button
        type="button"
        className={`hazard-none${noneKnown ? ' hazard-none--selected' : ''}`}
        onClick={chooseNone}
        aria-pressed={noneKnown}
      >
        {t('hazard.none')}
      </button>

      <div className="hazard-group-list">
        {(['active', 'passive']).map((activity) => {
          const types = hazardsByActivity(activity)
          const isExpanded = expandedGroup === activity
          const summary = groupSummary(activity)

          return (
            <div
              key={activity}
              className={`hazard-group hazard-group--${isExpanded ? 'expanded' : 'collapsed'}`}
            >
              <button
                type="button"
                className="hazard-group-toggle"
                onClick={() => openGroup(activity)}
                aria-expanded={isExpanded}
              >
                <span className="hazard-group-toggle-main">
                  <strong>{t(`hazard.${activity}`)}</strong>
                  {!isExpanded && <span className="hazard-group-summary">{summary}</span>}
                  {isExpanded && <span className="hazard-group-hint">{t(`hazard.${activity}Hint`)}</span>}
                </span>
                <span className="hazard-group-chevron" aria-hidden="true">
                  {isExpanded ? '▾' : '▸'}
                </span>
              </button>

              {isExpanded && (
                <div className="hazard-group-body">
                  <div className="chip-grid">
                    {types.map((type) => {
                      const isSelected = selected.includes(type.id)
                      return (
                        <button
                          key={type.id}
                          type="button"
                          className={`chip hazard-chip${isSelected ? ' chip--selected' : ''}`}
                          onClick={() => toggleType(type.id)}
                          aria-pressed={isSelected}
                        >
                          {hazardName(type.id, locale)}
                        </button>
                      )
                    })}
                  </div>
                </div>
              )}
            </div>
          )
        })}
      </div>

      {selected.length > 0 && (
        <div className="hazard-places">
          <p className="source-extras-kicker">{t('hazard.placeTitle')}</p>
          <p className="flow-hint">{t('hazard.placeHint')}</p>
          {selected.map((id) => {
            const placed = Boolean(places?.[id])
            const placing = placingId === id
            const meta = HAZARD_TYPES.find((item) => item.id === id)
            return (
              <div key={id} className={`hazard-place-row${placing ? ' hazard-place-row--placing' : ''}`}>
                <div className="hazard-place-copy">
                  <strong>{hazardName(id, locale)}</strong>
                  <span>
                    {placing
                      ? t('hazard.placing', { name: hazardName(id, locale) })
                      : placed
                        ? t('hazard.placed')
                        : t('hazard.notPlaced')}
                  </span>
                </div>
                <div className="hazard-place-actions">
                  <button type="button" className="btn-secondary" onClick={() => onPlace?.(id, meta?.activity)}>
                    {placed ? t('hazard.move') : t('hazard.place')}
                  </button>
                  {placed && (
                    <button type="button" className="btn-ghost" onClick={() => onClearPlace?.(id)}>
                      {t('hazard.clearPlace')}
                    </button>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
