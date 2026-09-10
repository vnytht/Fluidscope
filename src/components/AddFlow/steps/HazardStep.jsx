import { useState } from 'react'
import { HAZARD_ACTIVITY, HAZARD_TYPES, hazardsByActivity } from '../../../lib/hazards'

export default function HazardStep({ value, onChange }) {
  const selected = value ?? []
  const noneKnown = value !== null && selected.length === 0
  const [expandedGroup, setExpandedGroup] = useState(null)

  function toggleType(id) {
    const next = selected.includes(id) ? selected.filter((h) => h !== id) : [...selected, id]
    onChange(next)
  }

  function chooseNone() {
    onChange([])
    setExpandedGroup(null)
  }

  function groupSummary(activity) {
    const picked = hazardsByActivity(activity).filter((t) => selected.includes(t.id))
    if (picked.length === 0) return 'Tap to add'
    if (picked.length === 1) return picked[0].en
    return `${picked.length} selected`
  }

  function openGroup(activity) {
    if (value === null) onChange([])
    setExpandedGroup((current) => (current === activity ? null : activity))
  }

  return (
    <div className="flow-step">
      <h2>Hazards near this source?</h2>
      <p className="flow-hint">
        Septic tanks aren&apos;t on any official map here — tap None, or expand a group to report.
      </p>

      <button
        type="button"
        className={`hazard-none${noneKnown ? ' hazard-none--selected' : ''}`}
        onClick={chooseNone}
        aria-pressed={noneKnown}
      >
        None that I know of
      </button>

      <div className="hazard-group-list">
        {(['active', 'passive']).map((activity) => {
          const group = HAZARD_ACTIVITY[activity]
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
                  <strong>{group.label}</strong>
                  {!isExpanded && <span className="hazard-group-summary">{summary}</span>}
                  {isExpanded && <span className="hazard-group-hint">{group.hint}</span>}
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
                          className={`chip chip--bilingual hazard-chip${isSelected ? ' chip--selected' : ''}`}
                          onClick={() => toggleType(type.id)}
                          aria-pressed={isSelected}
                        >
                          <span className="chip-label-pt">{type.pt}</span>
                          <span className="chip-label-en">{type.en}</span>
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
        <p className="hazard-summary">
          {selected.length} hazard{selected.length > 1 ? 's' : ''}:{' '}
          {selected
            .map((id) => HAZARD_TYPES.find((t) => t.id === id)?.en ?? id)
            .join(', ')}
        </p>
      )}
    </div>
  )
}
