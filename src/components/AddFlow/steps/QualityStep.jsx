import { useState } from 'react'
import { DEFAULT_QUALITY_MEASURES } from '../../../lib/mockData'
import { getMeasureScale } from '../../../lib/qualityBands'
import SafetyScalePicker from '../SafetyScalePicker'

const COMMON_MEASURE_IDS = new Set(DEFAULT_QUALITY_MEASURES.map((m) => m.id))

function readingSummary(measure, value) {
  if (!value) return 'Tap to add'
  const scale = getMeasureScale(measure.id)
  const unit = scale?.unit ? ` ${scale.unit}` : ''
  return `${value}${unit}`
}

export default function QualityStep({ qualityMeasures, readings, onChange, onAddMeasure }) {
  const [expandedId, setExpandedId] = useState(null)
  const [addingNew, setAddingNew] = useState(false)
  const [newName, setNewName] = useState('')
  const [newScale, setNewScale] = useState('')

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
    if (!newName.trim() || !newScale.trim()) return
    const id = newName.trim().toLowerCase().replace(/\s+/g, '-')
    onAddMeasure({ id, name: newName.trim(), scale: newScale.trim() })
    setNewName('')
    setNewScale('')
    setAddingNew(false)
    setExpandedId(id)
  }

  function renderMeasure(measure) {
    const scale = getMeasureScale(measure.id)
    const currentValue = valueFor(measure.id)
    const isExpanded = expandedId === measure.id
    const isCustom = !scale
    const summary = readingSummary(measure, currentValue)
    const subline = isExpanded
      ? isCustom
        ? measure.scale || 'Enter your reading'
        : currentValue
          ? `${currentValue}${scale?.unit ? ` ${scale.unit}` : ''}`
          : scale?.unit ?? 'Slide to your reading'
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
            <strong>{measure.name}</strong>
            <span className="measure-row-summary">{subline}</span>
          </span>
          <span className="measure-row-chevron" aria-hidden="true">
            {isExpanded ? '▾' : '▸'}
          </span>
        </button>

        {isExpanded && (
          <div className="measure-row-body">
            {scale ? (
              <SafetyScalePicker
                scale={scale}
                value={currentValue}
                onChange={(value) => setValue(measure.id, value)}
              />
            ) : (
              <div className="measure-custom">
                {measure.scale ? (
                  <p className="measure-custom-scale">Scale: {measure.scale}</p>
                ) : null}
                <input
                  type="text"
                  className="measure-custom-input"
                  placeholder="Enter reading"
                  value={currentValue}
                  onChange={(e) => setValue(measure.id, e.target.value)}
                />
              </div>
            )}
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="flow-step">
      <h2>What do the test strips show?</h2>
      <p className="flow-hint">Expand a test to enter your reading — at least one required.</p>

      <div className="measure-list">
        {commonMeasures.map(renderMeasure)}
        {extraMeasures.map(renderMeasure)}
      </div>

      {addingNew ? (
        <form className="new-measure-form" onSubmit={handleAddMeasure}>
          <input
            type="text"
            placeholder="Measure name (e.g. E. coli)"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
          />
          <input
            type="text"
            placeholder="Scale (e.g. present / absent)"
            value={newScale}
            onChange={(e) => setNewScale(e.target.value)}
          />
          <div className="new-measure-form-actions">
            <button type="button" className="btn-ghost" onClick={() => setAddingNew(false)}>
              Cancel
            </button>
            <button type="submit" className="btn-secondary">
              Add measure
            </button>
          </div>
        </form>
      ) : (
        <button type="button" className="btn-ghost measure-add-btn" onClick={() => setAddingNew(true)}>
          + Add a new measure
        </button>
      )}
    </div>
  )
}
