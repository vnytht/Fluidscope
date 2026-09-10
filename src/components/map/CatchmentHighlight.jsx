import { Polyline } from 'react-leaflet'
import { getCatchment } from '../../lib/catchments'

// Thin lines from the selected source to others in the same catchment — enough
// to read "connected" without a heavy zone overlay.
export default function CatchmentHighlight({ selectedSample, relatedSamples }) {
  if (!selectedSample || relatedSamples.length === 0) return null

  const catchment = getCatchment(selectedSample.catchmentId)

  return (
    <>
      {relatedSamples.map((s) => (
        <Polyline
          key={s.id}
          positions={[selectedSample.position, s.position]}
          pathOptions={{
            color: catchment.color,
            weight: 2,
            opacity: 0.55,
            lineCap: 'round',
          }}
          interactive={false}
        />
      ))}
    </>
  )
}
