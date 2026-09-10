import './MapReticle.css'

// A classic teardrop map pin, anchored by its point to the exact centre of
// the map (screen-centre, since the map fills the screen) — same pattern as
// a ride-share pickup picker. The user pans the map underneath it; while
// panning, the pin lifts off the map and its shadow shrinks, then it drops
// back down and the shadow settles when they stop, showing exactly where
// it will land.
export default function MapReticle({ lifted }) {
  return (
    <div className={`map-reticle-wrap${lifted ? ' map-reticle-wrap--lifted' : ''}`}>
      <div className="map-reticle-anchor">
        <span className="map-reticle-shadow" />
        <svg className="map-reticle-pin" viewBox="0 0 34 40" aria-hidden="true">
          <path
            d="M17 0C7.6 0 0 7.6 0 17c0 12 17 23 17 23s17-11 17-23C34 7.6 26.4 0 17 0z"
            fill="var(--ws-accent)"
          />
          <circle cx="17" cy="17" r="6.5" fill="white" />
        </svg>
      </div>
    </div>
  )
}
