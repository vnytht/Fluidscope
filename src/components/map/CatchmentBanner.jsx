import { shortCatchmentName } from '../../lib/catchments'
import './CatchmentBanner.css'

export default function CatchmentBanner({ catchment, sourceCount }) {
  if (sourceCount < 2) return null

  return (
    <div className="catchment-banner" style={{ '--catchment-color': catchment.color }}>
      <span className="catchment-banner-dot" aria-hidden="true" />
      <span>
        {sourceCount} sources linked · {shortCatchmentName(catchment.name)}
      </span>
    </div>
  )
}
