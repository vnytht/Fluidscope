import { useState } from 'react'
import { geocodePlace, mockDeviceLocation } from '../../../lib/mapConfig'

export default function LocationStep({ location, onPick, onPan }) {
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
      setSearchError(err.message || 'Search failed.')
    } finally {
      setSearching(false)
    }
  }

  return (
    <div className="flow-step">
      <h2>Place the source on the map</h2>
      <p className="flow-hint">
        Drag the pin to place it, or tap the map. Pan with an empty spot on the map.
      </p>

      {locating && <p className="flow-hint">Finding your location…</p>}

      {searchOpen ? (
        <form className="location-search" onSubmit={handleSearchSubmit}>
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search a place or address"
            autoFocus
            disabled={searching}
          />
          <button type="submit" className="btn-primary" disabled={searching || !query.trim()}>
            {searching ? '…' : 'Go'}
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
          Search
        </button>
        <button type="button" className="btn-outline" onClick={useMyLocation}>
          Use my location
        </button>
      </div>

      {location && (
        <button type="button" className="btn-ghost location-retry" onClick={() => onPick(null)}>
          Reset pin
        </button>
      )}
    </div>
  )
}
