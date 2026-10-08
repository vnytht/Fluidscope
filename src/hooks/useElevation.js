import { useEffect, useState } from 'react'
import { elevationCacheKey, fetchElevationMeters } from '../lib/elevation'

export function useElevation(position) {
  const key = elevationCacheKey(position)
  const [meters, setMeters] = useState(null)
  const [status, setStatus] = useState(key ? 'loading' : 'idle')

  useEffect(() => {
    if (!key) {
      setMeters(null)
      setStatus('idle')
      return undefined
    }

    const [lat, lng] = key.split(',').map(Number)
    const controller = new AbortController()
    setStatus('loading')
    fetchElevationMeters([lat, lng], controller.signal)
      .then((value) => {
        setMeters(value)
        setStatus(value == null ? 'error' : 'ready')
      })
      .catch((err) => {
        if (err.name === 'AbortError') return
        setMeters(null)
        setStatus('error')
      })

    return () => controller.abort()
  }, [key])

  return { meters, status }
}
