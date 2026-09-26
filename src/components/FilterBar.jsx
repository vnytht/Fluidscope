import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { SOURCE_TYPES } from '../lib/mockData'
import { HAZARD_TYPES } from '../lib/hazards'
import {
  SEASONS,
  asFilterList,
  clearFilterField,
  countActiveFilters,
  emptyFilters,
  isDefaultFilters,
  toggleFilterValue,
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

function listSummary(list, emptyLabel, formatOne, t) {
  if (!list.length) return emptyLabel
  if (list.length === 1) return formatOne(list[0])
  return t('filter.nSelected', { count: list.length })
}

function activeChips(filters, { locale, dateLocale, t, qualityMeasures }) {
  const chips = []

  asFilterList(filters.sourceType).forEach((type) => {
    chips.push({
      key: `sourceType:${type}`,
      field: 'sourceType',
      value: type,
      label: sourceTypeName(type, locale),
    })
  })

  asFilterList(filters.contamination).forEach((item) => {
    const measure = qualityMeasures.find((entry) => entry.id === item)
    chips.push({
      key: `contamination:${item}`,
      field: 'contamination',
      value: item,
      label:
        item === 'unsafe'
          ? t('filter.contamination.unsafe')
          : measureName(item, measure?.name ?? item, t),
    })
  })

  asFilterList(filters.hazards).forEach((item) => {
    chips.push({
      key: `hazards:${item}`,
      field: 'hazards',
      value: item,
      label:
        item === 'any'
          ? t('filter.hazards.any')
          : item === 'none'
            ? t('filter.hazards.none')
            : hazardName(item, locale),
    })
  })

  asFilterList(filters.season).forEach((season) => {
    chips.push({
      key: `season:${season}`,
      field: 'season',
      value: season,
      label: t(`filter.season.${season}`),
    })
  })

  if (filters.dateFrom || filters.dateTo) {
    const from = formatChipDate(filters.dateFrom, dateLocale)
    const to = formatChipDate(filters.dateTo, dateLocale)
    chips.push({
      key: 'when',
      field: 'when',
      label: from && to ? `${from} – ${to}` : from || to,
    })
  } else if (filters.timeFrom || filters.timeTo) {
    chips.push({
      key: 'when',
      field: 'when',
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
  const sourceTypes = asFilterList(filters.sourceType)
  const contaminations = asFilterList(filters.contamination)
  const hazardFilters = asFilterList(filters.hazards)
  const seasons = asFilterList(filters.season)
  const hazardTypeIds = HAZARD_TYPES.map((hazard) => hazard.id)

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
    if (key === 'season' && asFilterList(value).length) {
      next.dateFrom = ''
      next.dateTo = ''
      next.timeFrom = ''
      next.timeTo = ''
    }
    if ((key === 'dateFrom' || key === 'dateTo' || key === 'timeFrom' || key === 'timeTo') && value) {
      next.season = []
    }
    onChange(next)
  }

  function pick(key, value, exclusive = []) {
    setField(key, toggleFilterValue(filters[key], value, exclusive))
  }

  function removeChip(chip) {
    if (chip.field && chip.value != null) {
      onChange({
        ...filters,
        [chip.field]: asFilterList(filters[chip.field]).filter((item) => item !== chip.value),
      })
      return
    }
    onChange(clearFilterField(filters, chip.field || chip.key))
  }

  function reopenForChip(chip) {
    const key = chip.field || chip.key
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
                      {listSummary(sourceTypes, t('filter.all'), (type) => sourceTypeName(type, locale), t)}
                    </span>
                  </button>
                  {openSection === 'source' && (
                    <div className="filter-chip-row">
                      <OptionChip
                        selected={sourceTypes.length === 0}
                        onClick={() => setField('sourceType', [])}
                      >
                        {t('filter.all')}
                      </OptionChip>
                      {SOURCE_TYPES.map((type) => (
                        <OptionChip
                          key={type}
                          selected={sourceTypes.includes(type)}
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
                      {listSummary(
                        contaminations,
                        t('filter.any'),
                        (item) =>
                          item === 'unsafe'
                            ? t('filter.contamination.unsafe')
                            : measureName(item, item, t),
                        t,
                      )}
                    </span>
                  </button>
                  {openSection === 'contamination' && (
                    <div className="filter-chip-row">
                      <OptionChip
                        selected={contaminations.length === 0}
                        onClick={() => setField('contamination', [])}
                      >
                        {t('filter.any')}
                      </OptionChip>
                      {qualityMeasures.map((measure) => (
                        <OptionChip
                          key={measure.id}
                          selected={contaminations.includes(measure.id)}
                          onClick={() => pick('contamination', measure.id)}
                        >
                          {measureName(measure.id, measure.name, t)}
                        </OptionChip>
                      ))}
                      <OptionChip
                        selected={contaminations.includes('unsafe')}
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
                      {listSummary(
                        hazardFilters,
                        t('filter.any'),
                        (item) =>
                          item === 'any'
                            ? t('filter.hazards.any')
                            : item === 'none'
                              ? t('filter.hazards.none')
                              : hazardName(item, locale),
                        t,
                      )}
                    </span>
                  </button>
                  {openSection === 'hazards' && (
                    <div className="filter-chip-row">
                      <OptionChip
                        selected={hazardFilters.length === 0}
                        onClick={() => setField('hazards', [])}
                      >
                        {t('filter.any')}
                      </OptionChip>
                      <OptionChip
                        selected={hazardFilters.includes('any')}
                        onClick={() => pick('hazards', 'any', [...hazardTypeIds, 'none'])}
                      >
                        {t('filter.hazards.any')}
                      </OptionChip>
                      <OptionChip
                        selected={hazardFilters.includes('none')}
                        onClick={() => pick('hazards', 'none', [...hazardTypeIds, 'any'])}
                      >
                        {t('filter.hazards.none')}
                      </OptionChip>
                      {HAZARD_TYPES.map((hazard) => (
                        <OptionChip
                          key={hazard.id}
                          selected={hazardFilters.includes(hazard.id)}
                          onClick={() => pick('hazards', hazard.id, ['any', 'none'])}
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
                      {listSummary(
                        seasons,
                        filters.dateFrom || filters.dateTo ? t('filter.dateTime') : t('filter.all'),
                        (season) => t(`filter.season.${season}`),
                        t,
                      )}
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
                      <p className="filter-season-hint">{t('filter.seasonHint')}</p>
                      <div className="filter-chip-row">
                        <OptionChip
                          selected={seasons.length === 0}
                          onClick={() => setField('season', [])}
                        >
                          {t('filter.all')}
                        </OptionChip>
                        {SEASONS.map((season) => (
                          <OptionChip
                            key={season}
                            selected={seasons.includes(season)}
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
            onClick={() => reopenForChip(chip)}
          >
            {chip.label}
            <span
              className="filter-chip-remove"
              role="button"
              tabIndex={0}
              aria-label={t('filter.remove', { label: chip.label })}
              onClick={(e) => {
                e.stopPropagation()
                removeChip(chip)
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault()
                  e.stopPropagation()
                  removeChip(chip)
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
