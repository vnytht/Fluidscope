import { useRef } from 'react'
import { getSafeRangeStyle, isInSafeRange, positionToPercent } from '../../lib/qualityBands'
import { useLanguage } from '../../context/LanguageContext'

function nearestBandIndex(pct, bands, scale) {
  let best = 0
  let bestDist = Infinity
  bands.forEach((band, index) => {
    const bandPct = positionToPercent(band.position, scale)
    const dist = Math.abs(pct - bandPct)
    if (dist < bestDist) {
      bestDist = dist
      best = index
    }
  })
  return best
}

export default function SafetyScalePicker({ scale, value, onChange }) {
  const { t } = useLanguage()
  const trackRef = useRef(null)
  const { bands } = scale
  const safeRange = getSafeRangeStyle(scale)

  const selectedIndex = bands.findIndex((b) => b.value === value)
  const selected = selectedIndex >= 0 ? bands[selectedIndex] : null
  const thumbPct = selected ? positionToPercent(selected.position, scale) : 0
  const withinSafe = isInSafeRange(selected?.position, scale)

  function selectIndex(index) {
    onChange(bands[index].value)
  }

  function pickFromClientX(clientX) {
    const track = trackRef.current
    if (!track) return
    const rect = track.getBoundingClientRect()
    const pct = Math.min(100, Math.max(0, ((clientX - rect.left) / rect.width) * 100))
    selectIndex(nearestBandIndex(pct, bands, scale))
  }

  function onTrackPointerDown(e) {
    e.currentTarget.setPointerCapture(e.pointerId)
    pickFromClientX(e.clientX)
  }

  function onTrackPointerMove(e) {
    if (!e.currentTarget.hasPointerCapture(e.pointerId)) return
    pickFromClientX(e.clientX)
  }

  const ariaValueText = selected
    ? `${selected.value}${scale.unit ? ` ${scale.unit}` : ''}, ${
        withinSafe ? t('quality.withinLimit') : t('quality.outsideLimit')
      }`
    : t('quality.notSelected')

  return (
    <div className="safety-scale">
      <div className="scale-ruler-row">
        <div className="scale-ruler-track-wrap">
          {safeRange && (
            <div
              className="scale-ruler-safe-mark"
              style={{ left: `${safeRange.left}%`, width: `${safeRange.width}%` }}
              aria-hidden="true"
            >
              <span className="scale-ruler-safe-label">{t('quality.safeLimit')}</span>
            </div>
          )}

          <div
            ref={trackRef}
            className={`scale-ruler-track${selected ? '' : ' scale-ruler-track--unset'}`}
            onPointerDown={onTrackPointerDown}
            onPointerMove={onTrackPointerMove}
            role="slider"
            aria-label={t('quality.readingAria')}
            aria-valuemin={scale.min}
            aria-valuemax={scale.max}
            aria-valuenow={selected?.position ?? scale.min}
            aria-valuetext={ariaValueText}
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.key === 'ArrowRight' || e.key === 'ArrowUp') {
                e.preventDefault()
                selectIndex(Math.min(bands.length - 1, (selectedIndex >= 0 ? selectedIndex : 0) + 1))
              }
              if (e.key === 'ArrowLeft' || e.key === 'ArrowDown') {
                e.preventDefault()
                selectIndex(Math.max(0, (selectedIndex >= 0 ? selectedIndex : 0) - 1))
              }
            }}
          >
            <div className="scale-ruler-track-bg" />
            {bands.length > 8 &&
              bands.map((band) => (
                <span
                  key={`tick-${band.value}`}
                  className="scale-ruler-tick"
                  style={{ left: `${positionToPercent(band.position, scale)}%` }}
                  aria-hidden="true"
                />
              ))}
            {selected && (
              <div
                className={`scale-ruler-thumb${withinSafe ? ' scale-ruler-thumb--safe' : ' scale-ruler-thumb--unsafe'}`}
                style={{ left: `${thumbPct}%` }}
              />
            )}
          </div>
        </div>
      </div>

      <div className="scale-ruler-labels" role="group" aria-label={t('quality.valuesAria')}>
        {bands.map((band, index) => {
          const isSelected = selectedIndex === index
          const showLabel = band.showLabel !== false || isSelected
          if (!showLabel) return null
          const pct = positionToPercent(band.position, scale)
          const edge =
            index === 0 ? ' scale-ruler-label--start' : index === bands.length - 1 ? ' scale-ruler-label--end' : ''
          return (
            <button
              key={band.value}
              type="button"
              className={`scale-ruler-label${edge}${isSelected ? ' scale-ruler-label--selected' : ''}`}
              style={{ left: `${pct}%` }}
              onClick={() => selectIndex(index)}
              aria-pressed={isSelected}
            >
              {band.value}
            </button>
          )
        })}
      </div>

      {(scale.scaleText || scale.standardText) && (
        <p className="safety-scale-meta">
          {scale.scaleText ? <span>{t('quality.scale', { scale: scale.scaleText })}</span> : null}
          {scale.standardText ? <span>{t('quality.standard', { standard: scale.standardText })}</span> : null}
        </p>
      )}

      {!selected && <p className="safety-scale-prompt">{t('quality.slidePrompt')}</p>}
    </div>
  )
}
