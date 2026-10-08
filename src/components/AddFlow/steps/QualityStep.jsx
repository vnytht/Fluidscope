import { useState } from 'react'
import { DEFAULT_QUALITY_MEASURES } from '../../../lib/mockData'
import { getMeasureScale, normalizePresence, PUBLIC_INFO_LINKS } from '../../../lib/qualityBands'
import { measureName } from '../../../lib/i18n'
import { useLanguage } from '../../../context/LanguageContext'
import SafetyScalePicker from '../SafetyScalePicker'

const COMMON_MEASURE_IDS = new Set(DEFAULT_QUALITY_MEASURES.map((m) => m.id))

function readingSummary(measure, value, t) {
  if (!value) return t('quality.tapToAdd')
  const presence = normalizePresence(value)
  if (presence) return t(`quality.${presence}`)
  const scale = getMeasureScale(measure.id)
  const band = scale?.bands?.find((item) => item.value === value)
  const shown = band?.labelKey ? t(band.labelKey) : value
  const unit = scale?.unit ? ` ${scale.unit}` : measure.unit ? ` ${measure.unit}` : ''
  return `${shown}${unit}`
}

function MeasureInfoLink({ measureId, t }) {
  const link = PUBLIC_INFO_LINKS[measureId]
  if (!link) return null
  return (
    <a className="measure-info-link" href={link.url} target="_blank" rel="noopener noreferrer">
      {t('quality.furtherInfo')}
      <span aria-hidden="true"> ↗</span>
    </a>
  )
}

function CategoryPicker({ scale, value, onChange, t }) {
  return (
    <div className="category-picker" role="group" aria-label={t('quality.valuesAria')}>
      <p className="safety-scale-meta">
        {scale.scaleText ? <span>{t('quality.scale', { scale: scale.scaleText })}</span> : null}
        {scale.standardText ? <span>{t('quality.standard', { standard: scale.standardText })}</span> : null}
      </p>
      <div className="chip-grid">
        {scale.bands.map((band) => {
          const selected = value === band.value
          return (
            <button
              key={band.value}
              type="button"
              className={`chip category-chip category-chip--${band.safety}${selected ? ' chip--selected' : ''}`}
              aria-pressed={selected}
              onClick={() => onChange(band.value)}
            >
              {t(band.labelKey)}
            </button>
          )
        })}
      </div>
    </div>
  )
}

function NumericPicker({ value, onChange, t }) {
  return (
    <div className="measure-custom">
      <p className="measure-custom-scale">{t('quality.numericHint')}</p>
      <input
        type="number"
        inputMode="decimal"
        className="measure-custom-input"
        placeholder={t('quality.numericPlaceholder')}
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
    </div>
  )
}

function PresencePicker({ value, onChange, t }) {
  const current = normalizePresence(value)
  return (
    <div className="presence-picker" role="group" aria-label={t('quality.presenceAria')}>
      <p className="measure-custom-scale">{t('quality.presenceHint')}</p>
      <div className="chip-grid">
        <button
          type="button"
          className={`chip presence-chip presence-chip--absent${current === 'absent' ? ' chip--selected' : ''}`}
          aria-pressed={current === 'absent'}
          onClick={() => onChange('absent')}
        >
          {t('quality.absent')}
        </button>
        <button
          type="button"
          className={`chip presence-chip presence-chip--present${current === 'present' ? ' chip--selected' : ''}`}
          aria-pressed={current === 'present'}
          onClick={() => onChange('present')}
        >
          {t('quality.present')}
        </button>
      </div>
    </div>
  )
}

export default function QualityStep({ qualityMeasures, readings, onChange, onAddMeasure }) {
  const { t } = useLanguage()
  const [expandedId, setExpandedId] = useState(null)
  const [addingNew, setAddingNew] = useState(false)
  const [newName, setNewName] = useState('')
  const [entryKind, setEntryKind] = useState('presence')
  const [presentMeans, setPresentMeans] = useState('unsafe')

  const commonMeasures = qualityMeasures.filter((m) => COMMON_MEASURE_IDS.has(m.id))
  const extraMeasures = qualityMeasures.filter((m) => !COMMON_MEASURE_IDS.has(m.id))

  function valueFor(measureId) {
    return readings.find((r) => r.measureId === measureId)?.value ?? ''
  }

  function setValue(measureId, value) {
    const rest = readings.filter((r) => r.measureId !== measureId)
    onChange(value === '' ? rest : [...rest, { measureId, value }])
  }

  function handleAddMeasure(e) {
    e.preventDefault()
    if (!newName.trim()) return
    const base = newName.trim().toLowerCase().replace(/\s+/g, '-')
    const taken = new Set(qualityMeasures.map((m) => m.id))
    let id = base
    let n = 2
    while (taken.has(id) || COMMON_MEASURE_IDS.has(id)) {
      id = `${base}-${n}`
      n += 1
    }
    onAddMeasure({
      id,
      name: newName.trim(),
      scale: entryKind === 'numeric' ? '' : 'present / absent',
      kind: entryKind,
      presentMeans: entryKind === 'presence' ? presentMeans : undefined,
    })
    setNewName('')
    setEntryKind('presence')
    setPresentMeans('unsafe')
    setAddingNew(false)
    setExpandedId(id)
  }

  function renderMeasure(measure) {
    const scale = getMeasureScale(measure.id)
    const currentValue = valueFor(measure.id)
    const isExpanded = expandedId === measure.id
    const isNumeric = !scale && measure.kind === 'numeric'
    const isPresence = !scale && !isNumeric
    const summary = readingSummary(measure, currentValue, t)
    const displayName = measureName(measure.id, measure.name, t)
    const subline = isExpanded
      ? isNumeric
        ? t('quality.entryNumeric')
        : isPresence
        ? t('quality.presenceScale')
        : currentValue
          ? `${currentValue}${scale?.unit ? ` ${scale.unit}` : ''}`
          : scale?.unit ?? t('quality.slideReading')
      : summary

    return (
      <div
        key={measure.id}
        className={`measure-row measure-row--${isExpanded ? 'expanded' : 'collapsed'}`}
      >
        <button
          type="button"
          className="measure-row-toggle"
          onClick={() => setExpandedId(isExpanded ? null : measure.id)}
          aria-expanded={isExpanded}
        >
          <span className="measure-row-toggle-main">
            <strong>{displayName}</strong>
            <span className="measure-row-summary">{subline}</span>
          </span>
          <span className="measure-row-chevron" aria-hidden="true">
            {isExpanded ? '▾' : '▸'}
          </span>
        </button>

        {isExpanded && (
          <div className="measure-row-body">
            {scale?.kind === 'categories' ? (
              <CategoryPicker
                scale={scale}
                value={currentValue}
                onChange={(value) => setValue(measure.id, value)}
                t={t}
              />
            ) : scale ? (
              <SafetyScalePicker
                scale={scale}
                value={currentValue}
                onChange={(value) => setValue(measure.id, value)}
              />
            ) : isNumeric ? (
              <NumericPicker
                value={currentValue}
                onChange={(value) => setValue(measure.id, value)}
                t={t}
              />
            ) : (
              <PresencePicker
                value={currentValue}
                onChange={(value) => setValue(measure.id, value)}
                t={t}
              />
            )}
            <MeasureInfoLink measureId={measure.id} t={t} />
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="flow-step">
      <h2>{t('quality.title')}</h2>
      <p className="flow-hint">{t('quality.hint')}</p>
      <p className="flow-hint flow-hint--muted">{t('quality.limitsNote')}</p>

      <div className="measure-list">
        {commonMeasures.map(renderMeasure)}
        {extraMeasures.map(renderMeasure)}
      </div>

      {addingNew ? (
        <form className="new-measure-form" onSubmit={handleAddMeasure}>
          <input
            type="text"
            placeholder={t('quality.newName')}
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
          />
          <div className="chip-grid" role="group" aria-label={t('quality.entryTypeAria')}>
            <button
              type="button"
              className={`chip${entryKind === 'presence' ? ' chip--selected' : ''}`}
              aria-pressed={entryKind === 'presence'}
              onClick={() => setEntryKind('presence')}
            >
              {t('quality.entryPresence')}
            </button>
            <button
              type="button"
              className={`chip${entryKind === 'numeric' ? ' chip--selected' : ''}`}
              aria-pressed={entryKind === 'numeric'}
              onClick={() => setEntryKind('numeric')}
            >
              {t('quality.entryNumeric')}
            </button>
          </div>
          {entryKind === 'presence' ? (
            <>
              <p className="measure-custom-scale">{t('quality.newPresenceNote')}</p>
              <div className="chip-grid" role="group" aria-label={t('quality.presentMeansAria')}>
                <button
                  type="button"
                  className={`chip presence-chip presence-chip--present${presentMeans === 'unsafe' ? ' chip--selected' : ''}`}
                  aria-pressed={presentMeans === 'unsafe'}
                  onClick={() => setPresentMeans('unsafe')}
                >
                  {t('quality.presentMeansUnsafe')}
                </button>
                <button
                  type="button"
                  className={`chip presence-chip presence-chip--absent${presentMeans === 'safe' ? ' chip--selected' : ''}`}
                  aria-pressed={presentMeans === 'safe'}
                  onClick={() => setPresentMeans('safe')}
                >
                  {t('quality.presentMeansSafe')}
                </button>
              </div>
            </>
          ) : (
            <p className="measure-custom-scale">{t('quality.numericHint')}</p>
          )}
          <div className="new-measure-form-actions">
            <button type="button" className="btn-ghost" onClick={() => setAddingNew(false)}>
              {t('flow.cancel')}
            </button>
            <button type="submit" className="btn-secondary" disabled={!newName.trim()}>
              {t('quality.addMeasure')}
            </button>
          </div>
        </form>
      ) : (
        <button type="button" className="btn-ghost measure-add-btn" onClick={() => setAddingNew(true)}>
          {t('quality.addNew')}
        </button>
      )}
    </div>
  )
}
