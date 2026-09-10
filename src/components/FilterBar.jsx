import { useState } from 'react'
import { SOURCE_TYPES } from '../lib/mockData'
import { SOURCE_TYPE_LABELS } from '../lib/sourceTypeLabels'
import './FilterBar.css'

const DEFAULT_FILTERS = { sessionId: 'all', sourceType: 'all', measureId: 'all' }

function secondaryFilterCount(filters) {
  return [filters.sessionId, filters.measureId].filter((v) => v !== 'all').length
}

function FilterChip({ selected, onClick, children, className = '' }) {
  return (
    <button
      type="button"
      className={`filter-chip${selected ? ' filter-chip--selected' : ''}${className ? ` ${className}` : ''}`}
      onClick={onClick}
      aria-pressed={selected}
    >
      {children}
    </button>
  )
}

function ChipRow({ label, children }) {
  return (
    <div className="filter-group">
      <p className="filter-group-label">{label}</p>
      <div className="filter-chip-row">{children}</div>
    </div>
  )
}

export default function FilterBar({
  sessions,
  qualityMeasures,
  filters,
  onChange,
  resultCount,
  totalCount,
}) {
  const [menuOpen, setMenuOpen] = useState(false)
  const secondaryCount = secondaryFilterCount(filters)
  const sourceFiltered = filters.sourceType !== 'all'
  const anyFiltered =
    sourceFiltered || filters.sessionId !== 'all' || filters.measureId !== 'all'

  function setFilter(key, value) {
    onChange({ ...filters, [key]: value })
  }

  function clearSecondary() {
    onChange({ ...filters, sessionId: 'all', measureId: 'all' })
  }

  function clearAll() {
    onChange(DEFAULT_FILTERS)
    setMenuOpen(false)
  }

  return (
    <div className="filter-stack">
      <div className="filter-source-rail" role="toolbar" aria-label="Filter by source type">
        <FilterChip
          selected={filters.sourceType === 'all'}
          onClick={() => setFilter('sourceType', 'all')}
        >
          All · {totalCount ?? resultCount}
        </FilterChip>

        {SOURCE_TYPES.map((type) => (
          <FilterChip
            key={type}
            selected={filters.sourceType === type}
            onClick={() => setFilter('sourceType', type)}
          >
            {SOURCE_TYPE_LABELS[type]?.en ?? type}
          </FilterChip>
        ))}

        <div className="filter-menu-anchor">
          <FilterChip
            selected={menuOpen || secondaryCount > 0}
            className="filter-chip--menu"
            onClick={() => setMenuOpen((v) => !v)}
            aria-expanded={menuOpen}
          >
            Filters
            {secondaryCount > 0 && (
              <span className="filter-chip-badge">{secondaryCount}</span>
            )}
          </FilterChip>

          {menuOpen && (
            <>
              <button
                type="button"
                className="filter-menu-scrim"
                onClick={() => setMenuOpen(false)}
                aria-label="Close filters"
              />
              <div className="filter-menu-panel">
                <div className="filter-menu-head">
                  <h3>More filters</h3>
                  {secondaryCount > 0 && (
                    <button type="button" className="filter-menu-clear" onClick={clearSecondary}>
                      Clear
                    </button>
                  )}
                </div>

                <ChipRow label="Session">
                  <FilterChip
                    selected={filters.sessionId === 'all'}
                    onClick={() => setFilter('sessionId', 'all')}
                  >
                    All
                  </FilterChip>
                  {sessions.map((s) => (
                    <FilterChip
                      key={s.id}
                      selected={filters.sessionId === s.id}
                      onClick={() => setFilter('sessionId', s.id)}
                    >
                      {s.label}
                    </FilterChip>
                  ))}
                </ChipRow>

                <ChipRow label="Has reading for">
                  <FilterChip
                    selected={filters.measureId === 'all'}
                    onClick={() => setFilter('measureId', 'all')}
                  >
                    Any
                  </FilterChip>
                  {qualityMeasures.map((m) => (
                    <FilterChip
                      key={m.id}
                      selected={filters.measureId === m.id}
                      onClick={() => setFilter('measureId', m.id)}
                    >
                      {m.name}
                    </FilterChip>
                  ))}
                </ChipRow>

                {anyFiltered && (
                  <button type="button" className="filter-menu-reset" onClick={clearAll}>
                    Reset all filters
                  </button>
                )}
              </div>
            </>
          )}
        </div>
      </div>

      {anyFiltered && resultCount !== totalCount && (
        <p className="filter-status" aria-live="polite">
          Showing {resultCount} of {totalCount}
        </p>
      )}
    </div>
  )
}
