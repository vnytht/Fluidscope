import { useState } from 'react'
import { geocodePlace, mockDeviceLocation } from '../../../lib/mapConfig'
import { useLanguage } from '../../../context/LanguageContext'

export default function LocationStep({ location, onPick, onPan }) {
  const { t } = useLanguage()
  const [locating, setLocating] = useState(false)
  const [searchOpen, setSearchOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [searching, setSearching] = useState(false)
  const [searchError, setSearchError] = useState(null)

  function useMyLocation() {
    setSearchOpen(false)
    if (!navigator.geolocation) {
      onPan(mockDeviceLocation())
      return
    }
    setLocating(true)
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        onPan([pos.coords.latitude, pos.coords.longitude])
        setLocating(false)
      },
      () => {
        onPan(mockDeviceLocation())
        setLocating(false)
      },
      { enableHighAccuracy: true, timeout: 10000 },
    )
  }

  async function handleSearchSubmit(e) {
    e.preventDefault()
    if (!query.trim()) return
    setSearching(true)
    setSearchError(null)
    try {
      const coords = await geocodePlace(query)
      onPan(coords)
      setSearchOpen(false)
    } catch (err) {
      setSearchError(err.message || t('location.searchFailed'))
    } finally {
      setSearching(false)
    }
  }

  return (
    <div className="flow-step">
      <h2>{t('location.title')}</h2>
      <p className="flow-hint">{t('location.hint')}</p>

      {locating && <p className="flow-hint">{t('location.finding')}</p>}

      {searchOpen ? (
        <form className="location-search" onSubmit={handleSearchSubmit}>
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t('location.searchPlaceholder')}
            autoFocus
            disabled={searching}
          />
          <button type="submit" className="btn-primary" disabled={searching || !query.trim()}>
            {searching ? '…' : t('location.go')}
          </button>
        </form>
      ) : null}
      {searchError && <p className="location-error">{searchError}</p>}

      <div className="location-choice">
        <button
          type="button"
          className="btn-outline"
          onClick={() => setSearchOpen((v) => !v)}
        >
          {t('location.search')}
        </button>
        <button type="button" className="btn-outline" onClick={useMyLocation}>
          {t('location.useMine')}
        </button>
      </div>

      {location && (
        <button type="button" className="btn-ghost location-retry" onClick={() => onPick(null)}>
          {t('location.reset')}
        </button>
      )}
    </div>
  )
}
