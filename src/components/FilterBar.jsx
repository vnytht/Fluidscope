import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { SOURCE_TYPES } from '../lib/mockData'
import { HAZARD_TYPES } from '../lib/hazards'
import {
  SEASONS,
  clearFilterField,
  countActiveFilters,
  emptyFilters,
  isDefaultFilters,
} from '../lib/filters'
import { hazardName, measureName, sourceTypeName } from '../lib/i18n'
import { useLanguage } from '../context/LanguageContext'
import { IconClose, IconFilter } from './ui/Icons'
import './FilterBar.css'

function OptionChip({ selected, onClick, children }) {
  return (
    <button
      type="button"
      className={`filter-chip filter-option${selected ? ' filter-chip--selected' : ''}`}
      onClick={onClick}
      aria-pressed={selected}
    >
      {children}
    </button>
  )
}

function formatChipDate(value, dateLocale) {
  if (!value) return ''
  const date = new Date(`${value}T00:00:00`)
  if (Number.isNaN(date.getTime())) return value
  return date.toLocaleDateString(dateLocale, { day: 'numeric', month: 'short' })
}

function activeChips(filters, { locale, dateLocale, t, qualityMeasures }) {
  const chips = []

  if (filters.sourceType !== 'all') {
    chips.push({ key: 'sourceType', label: sourceTypeName(filters.sourceType, locale) })
  }

  if (filters.contamination === 'unsafe') {
    chips.push({ key: 'contamination', label: t('filter.contamination.unsafe') })
  } else if (filters.contamination !== 'all') {
    const measure = qualityMeasures.find((item) => item.id === filters.contamination)
    chips.push({
      key: 'contamination',
      label: measureName(filters.contamination, measure?.name ?? filters.contamination, t),
    })
  }

  if (filters.hazards === 'any') {
    chips.push({ key: 'hazards', label: t('filter.hazards.any') })
  } else if (filters.hazards === 'none') {
    chips.push({ key: 'hazards', label: t('filter.hazards.none') })
  } else if (filters.hazards !== 'all') {
    chips.push({ key: 'hazards', label: hazardName(filters.hazards, locale) })
  }

  if (filters.season !== 'all') {
    chips.push({ key: 'when', label: t(`filter.season.${filters.season}`) })
  } else if (filters.dateFrom || filters.dateTo) {
    const from = formatChipDate(filters.dateFrom, dateLocale)
    const to = formatChipDate(filters.dateTo, dateLocale)
    chips.push({
      key: 'when',
      label: from && to ? `${from} – ${to}` : from || to,
    })
  } else if (filters.timeFrom || filters.timeTo) {
    chips.push({
      key: 'when',
      label: [filters.timeFrom, filters.timeTo].filter(Boolean).join(' – '),
    })
  }

  return chips
}

export default function FilterBar({
  qualityMeasures,
  filters,
  onChange,
  resultCount,
  totalCount,
}) {
  const { locale, dateLocale, t } = useLanguage()
  const [menuOpen, setMenuOpen] = useState(false)
  const [openSection, setOpenSection] = useState('source')
  const [panelPos, setPanelPos] = useState({ top: 52, left: 100 })
  const buttonRef = useRef(null)
  const panelRef = useRef(null)
  const activeCount = countActiveFilters(filters)
  const anyFiltered = !isDefaultFilters(filters)
  const chips = activeChips(filters, { locale, dateLocale, t, qualityMeasures })

  function placePanel() {
    const rect = buttonRef.current?.getBoundingClientRect()
    if (!rect) return
    const width = Math.min(360, window.innerWidth - 24)
    const left = Math.min(rect.left, window.innerWidth - width - 12)
    setPanelPos({ top: rect.bottom + 8, left: Math.max(12, left) })
  }

  function openMenu() {
    placePanel()
    setOpenSection((current) => current || 'source')
    setMenuOpen(true)
  }

  function closeMenu() {
    setMenuOpen(false)
  }

  function toggleMenu(event) {
    event.stopPropagation()
    if (menuOpen) closeMenu()
    else openMenu()
  }

  useEffect(() => {
    if (!menuOpen) return
    placePanel()
    function onDoc(event) {
      if (buttonRef.current?.contains(event.target)) return
      if (panelRef.current?.contains(event.target)) return
      closeMenu()
    }
    function onKey(event) {
      if (event.key === 'Escape') closeMenu()
    }
    const timer = window.setTimeout(() => {
      document.addEventListener('pointerdown', onDoc)
    }, 0)
    window.addEventListener('resize', placePanel)
    window.addEventListener('keydown', onKey)
    return () => {
      window.clearTimeout(timer)
      document.removeEventListener('pointerdown', onDoc)
      window.removeEventListener('resize', placePanel)
      window.removeEventListener('keydown', onKey)
    }
  }, [menuOpen])

  function toggleSection(id) {
    setOpenSection((current) => (current === id ? null : id))
  }

  function setField(key, value) {
    const next = { ...filters, view: 'custom', [key]: value }
    if (key === 'season' && value !== 'all') {
      next.dateFrom = ''
      next.dateTo = ''
      next.timeFrom = ''
      next.timeTo = ''
    }
    if ((key === 'dateFrom' || key === 'dateTo' || key === 'timeFrom' || key === 'timeTo') && value) {
      next.season = 'all'
    }
    onChange(next)
  }

  function pick(key, value) {
    setField(key, filters[key] === value ? 'all' : value)
  }

  function removeChip(key) {
    onChange(clearFilterField(filters, key))
  }

  function reopenForChip(key) {
    const section =
      key === 'sourceType' ? 'source' : key === 'contamination' ? 'contamination' : key === 'hazards' ? 'hazards' : 'when'
    setOpenSection(section)
    setMenuOpen(true)
  }

  return (
    <div className="filter-stack">
      <div className="filter-source-rail" role="toolbar" aria-label={t('filter.views')}>
        <div className="filter-menu-anchor">
          <button
            ref={buttonRef}
            type="button"
            className={`filter-chip filter-chip--menu${menuOpen || activeCount > 0 ? ' filter-chip--selected' : ''}`}
            onClick={toggleMenu}
            aria-expanded={menuOpen}
            aria-haspopup="dialog"
          >
            <IconFilter />
            {t('filter.filters')}
            {activeCount > 0 && <span className="filter-chip-badge">{activeCount}</span>}
          </button>

          {menuOpen &&
            createPortal(
              <div
                ref={panelRef}
                className="filter-menu-panel"
                role="dialog"
                aria-label={t('filter.filters')}
                style={{ top: panelPos.top, left: panelPos.left }}
              >
                <div className="filter-menu-head">
                  <div>
                    <button
                      type="button"
                      className="filter-menu-back"
                      onClick={() => {
                        if (openSection) setOpenSection(null)
                        else closeMenu()
                      }}
                    >
                      ← {t('filter.back')}
                    </button>
                    <h3>{t('filter.more')}</h3>
                    <p className="filter-menu-sub">
                      {t('filter.showing', { count: resultCount, total: totalCount })}
                    </p>
                  </div>
                  {anyFiltered && (
                    <button
                      type="button"
                      className="filter-menu-clear"
                      onClick={() => onChange(emptyFilters())}
                    >
                      {t('filter.clear')}
                    </button>
                  )}
                </div>

                <section className={`filter-accordion${openSection === 'source' ? ' is-open' : ''}`}>
                  <button
                    type="button"
                    className="filter-accordion-toggle"
                    aria-expanded={openSection === 'source'}
                    onClick={() => toggleSection('source')}
                  >
                    <span>{t('filter.sourceType')}</span>
                    <span className="filter-accordion-value">
                      {filters.sourceType === 'all'
                        ? t('filter.all')
                        : sourceTypeName(filters.sourceType, locale)}
                    </span>
                  </button>
                  {openSection === 'source' && (
                    <div className="filter-chip-row">
                      <OptionChip
                        selected={filters.sourceType === 'all'}
                        onClick={() => setField('sourceType', 'all')}
                      >
                        {t('filter.all')}
                      </OptionChip>
                      {SOURCE_TYPES.map((type) => (
                        <OptionChip
                          key={type}
                          selected={filters.sourceType === type}
                          onClick={() => pick('sourceType', type)}
                        >
                          {sourceTypeName(type, locale)}
                        </OptionChip>
                      ))}
                    </div>
                  )}
                </section>

                <section className={`filter-accordion${openSection === 'contamination' ? ' is-open' : ''}`}>
                  <button
                    type="button"
                    className="filter-accordion-toggle"
                    aria-expanded={openSection === 'contamination'}
                    onClick={() => toggleSection('contamination')}
                  >
                    <span>{t('filter.contamination')}</span>
                    <span className="filter-accordion-value">
                      {filters.contamination === 'all'
                        ? t('filter.any')
                        : filters.contamination === 'unsafe'
                          ? t('filter.contamination.unsafe')
                          : measureName(filters.contamination, filters.contamination, t)}
                    </span>
                  </button>
                  {openSection === 'contamination' && (
                    <div className="filter-chip-row">
                      <OptionChip
                        selected={filters.contamination === 'all'}
                        onClick={() => setField('contamination', 'all')}
                      >
                        {t('filter.any')}
                      </OptionChip>
                      {qualityMeasures.map((measure) => (
                        <OptionChip
                          key={measure.id}
                          selected={filters.contamination === measure.id}
                          onClick={() => pick('contamination', measure.id)}
                        >
                          {measureName(measure.id, measure.name, t)}
                        </OptionChip>
                      ))}
                      <OptionChip
                        selected={filters.contamination === 'unsafe'}
                        onClick={() => pick('contamination', 'unsafe')}
                      >
                        {t('filter.contamination.unsafe')}
                      </OptionChip>
                    </div>
                  )}
                </section>

                <section className={`filter-accordion${openSection === 'hazards' ? ' is-open' : ''}`}>
                  <button
                    type="button"
                    className="filter-accordion-toggle"
                    aria-expanded={openSection === 'hazards'}
                    onClick={() => toggleSection('hazards')}
                  >
                    <span>{t('filter.hazards')}</span>
                    <span className="filter-accordion-value">
                      {filters.hazards === 'all'
                        ? t('filter.any')
                        : filters.hazards === 'any'
                          ? t('filter.hazards.any')
                          : filters.hazards === 'none'
                            ? t('filter.hazards.none')
                            : hazardName(filters.hazards, locale)}
                    </span>
                  </button>
                  {openSection === 'hazards' && (
                    <div className="filter-chip-row">
                      <OptionChip
                        selected={filters.hazards === 'all'}
                        onClick={() => setField('hazards', 'all')}
                      >
                        {t('filter.any')}
                      </OptionChip>
                      <OptionChip
                        selected={filters.hazards === 'any'}
                        onClick={() => pick('hazards', 'any')}
                      >
                        {t('filter.hazards.any')}
                      </OptionChip>
                      <OptionChip
                        selected={filters.hazards === 'none'}
                        onClick={() => pick('hazards', 'none')}
                      >
                        {t('filter.hazards.none')}
                      </OptionChip>
                      {HAZARD_TYPES.map((hazard) => (
                        <OptionChip
                          key={hazard.id}
                          selected={filters.hazards === hazard.id}
                          onClick={() => pick('hazards', hazard.id)}
                        >
                          {hazardName(hazard.id, locale)}
                        </OptionChip>
                      ))}
                    </div>
                  )}
                </section>

                <section className={`filter-accordion${openSection === 'when' ? ' is-open' : ''}`}>
                  <button
                    type="button"
                    className="filter-accordion-toggle"
                    aria-expanded={openSection === 'when'}
                    onClick={() => toggleSection('when')}
                  >
                    <span>{t('filter.when')}</span>
                    <span className="filter-accordion-value">
                      {filters.season !== 'all'
                        ? t(`filter.season.${filters.season}`)
                        : filters.dateFrom || filters.dateTo
                          ? t('filter.dateTime')
                          : t('filter.all')}
                    </span>
                  </button>
                  {openSection === 'when' && (
                    <div className="filter-when">
                      <div className="filter-datetime-grid">
                        <label className="filter-field">
                          {t('filter.from')}
                          <span className="filter-field-inputs">
                            <input
                              type="date"
                              value={filters.dateFrom}
                              onChange={(e) => setField('dateFrom', e.target.value)}
                            />
                            <input
                              type="time"
                              value={filters.timeFrom}
                              onChange={(e) => setField('timeFrom', e.target.value)}
                            />
                          </span>
                        </label>
                        <label className="filter-field">
                          {t('filter.to')}
                          <span className="filter-field-inputs">
                            <input
                              type="date"
                              value={filters.dateTo}
                              onChange={(e) => setField('dateTo', e.target.value)}
                            />
                            <input
                              type="time"
                              value={filters.timeTo}
                              onChange={(e) => setField('timeTo', e.target.value)}
                            />
                          </span>
                        </label>
                      </div>
                      <p className="filter-group-label">{t('filter.season')}</p>
                      <div className="filter-chip-row">
                        <OptionChip
                          selected={filters.season === 'all'}
                          onClick={() => setField('season', 'all')}
                        >
                          {t('filter.all')}
                        </OptionChip>
                        {SEASONS.map((season) => (
                          <OptionChip
                            key={season}
                            selected={filters.season === season}
                            onClick={() => pick('season', season)}
                          >
                            {t(`filter.season.${season}`)}
                          </OptionChip>
                        ))}
                      </div>
                    </div>
                  )}
                </section>

                <button type="button" className="filter-menu-done" onClick={closeMenu}>
                  {t('filter.done')}
                </button>
              </div>,
              document.body,
            )}
        </div>

        {chips.map((chip) => (
          <button
            key={chip.key}
            type="button"
            className="filter-chip filter-chip--token"
            onClick={() => reopenForChip(chip.key)}
          >
            {chip.label}
            <span
              className="filter-chip-remove"
              role="button"
              tabIndex={0}
              aria-label={t('filter.remove', { label: chip.label })}
              onClick={(e) => {
                e.stopPropagation()
                removeChip(chip.key)
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault()
                  e.stopPropagation()
                  removeChip(chip.key)
                }
              }}
            >
              <IconClose size={11} />
            </span>
          </button>
        ))}
      </div>
    </div>
  )
}
