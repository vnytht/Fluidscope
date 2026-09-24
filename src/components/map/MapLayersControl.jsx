import { useEffect, useRef, useState } from 'react'
import { MAP_LAYER_KEYS } from '../../lib/mapLayers'
import { useLanguage } from '../../context/LanguageContext'
import { IconLayers } from '../ui/Icons'
import './MapLayersControl.css'

export default function MapLayersControl({ layers, onChange }) {
  const { t } = useLanguage()
  const [open, setOpen] = useState(false)
  const rootRef = useRef(null)
  const activeCount = MAP_LAYER_KEYS.filter((key) => layers[key]).length

  useEffect(() => {
    if (!open) return undefined
    function onDoc(event) {
      if (rootRef.current?.contains(event.target)) return
      setOpen(false)
    }
    function onKey(event) {
      if (event.key === 'Escape') setOpen(false)
    }
    const timer = window.setTimeout(() => document.addEventListener('pointerdown', onDoc), 0)
    window.addEventListener('keydown', onKey)
    return () => {
      window.clearTimeout(timer)
      document.removeEventListener('pointerdown', onDoc)
      window.removeEventListener('keydown', onKey)
    }
  }, [open])

  function toggle(key) {
    onChange({ ...layers, [key]: !layers[key] })
  }

  return (
    <div className="map-layers" ref={rootRef}>
      <button
        type="button"
        className={`map-layers-btn${open || activeCount > 0 ? ' is-active' : ''}`}
        aria-expanded={open}
        aria-haspopup="dialog"
        aria-label={t('layers.open')}
        onClick={() => setOpen((value) => !value)}
      >
        <IconLayers />
        {activeCount > 0 && <span className="map-layers-badge">{activeCount}</span>}
      </button>

      {open && (
        <div className="map-layers-panel" role="dialog" aria-label={t('layers.title')}>
          <p className="map-layers-title">{t('layers.title')}</p>
          <ul className="map-layers-list">
            {MAP_LAYER_KEYS.map((key) => (
              <li key={key}>
                <label className="map-layers-item">
                  <input
                    type="checkbox"
                    checked={Boolean(layers[key])}
                    onChange={() => toggle(key)}
                  />
                  <span>{t(`layers.${key}`)}</span>
                </label>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}
