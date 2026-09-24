import './FlowVizOptions.css'

function Pin() {
  return <span className="fv-pin" aria-hidden="true" />
}

function Buildings() {
  return (
    <div className="fv-buildings" aria-hidden="true">
      {Array.from({ length: 28 }, (_, i) => (
        <i key={i} className={`fv-bldg fv-bldg--${(i % 7) + 1}`} />
      ))}
    </div>
  )
}

function MockFrame({ children, caption }) {
  return (
    <figure className="fv-frame">
      <div className="fv-map">{children}</div>
      {caption ? <figcaption>{caption}</figcaption> : null}
    </figure>
  )
}

function Option({ id, title, verdict, honesty, data, children, recommended }) {
  return (
    <article className={`fv-card${recommended ? ' fv-card--recommended' : ''}`} id={`option-${id}`}>
      <header className="fv-card-head">
        <span className="fv-letter">{id}</span>
        <div>
          <h2>{title}</h2>
          <p className="fv-verdict">{verdict}</p>
        </div>
        {recommended ? <span className="fv-badge">Closest to the reference</span> : null}
      </header>
      {children}
      <dl className="fv-meta">
        <div>
          <dt>What the user should think</dt>
          <dd>{honesty}</dd>
        </div>
        <div>
          <dt>Data we would use</dt>
          <dd>{data}</dd>
        </div>
      </dl>
    </article>
  )
}

export default function FlowVizOptions() {
  return (
    <div className="fv-page">
      <header className="fv-hero">
        <p className="fv-kicker">Prototype · comparison page · map app unchanged</p>
        <h1>How should we show “water may flow this way”?</h1>
        <p className="fv-lead">
          Tapping a town well only paints <strong>one red catchment</strong> because that HydroBASINS
          unit drains to the sea and has no uphill/downhill neighbours in our file. That is honest
          basin data — and visually empty. This page compares other ways to imply direction from
          <strong> terrain / elevation</strong>, like the Living Infrastructure runoff layer.
        </p>
        <a className="fv-back" href="/">
          Back to map
        </a>
      </header>

      <section className="fv-why">
        <h2>Why you only see red today</h2>
        <ol>
          <li>We colour HydroBASINS polygons, not the hillside.</li>
          <li>Coastal Viana basins often have <code>NEXT_DOWN = 0</code> and no in-file upstream.</li>
          <li>So: one blob, neighbour pins, no teal, no amber, no arrows.</li>
        </ol>
        <p>
          The attached Field Kit layer is different: a <strong>runoff-volume metric</strong> (darker =
          more water could collect / be diverted). That needs a DEM flow-accumulation grid — we have
          Copernicus 30 m elevation locally (<code>GeoJSON/dem_viana.tif</code>), but it is not in the
          live map.
        </p>
      </section>

      <section className="fv-ref">
        <h2>Reference (not ours)</h2>
        <div className="fv-ref-grid">
          <figure>
            <img
              src={`${import.meta.env.BASE_URL}flow-viz/li-runoff-map.png`}
              alt="Living Infrastructure runoff contribution: darker channels where more water collects, building footprints, drain lines"
            />
            <figcaption>Runoff contribution — darker = higher potential runoff toward the site</figcaption>
          </figure>
          <figure>
            <img
              src={`${import.meta.env.BASE_URL}flow-viz/li-layer-pack.png`}
              alt="Water Supply layer pack: runoff contribution, groundwater basins, water flows"
            />
            <figcaption>Their pack also has groundwater basins + water-flow lines as separate layers</figcaption>
          </figure>
        </div>
      </section>

      <div className="fv-options">
        <Option
          id="A"
          title="Keep red basin only"
          verdict="Honest. Weak as a ‘flow’ story."
          honesty="This source sits in this catchment. We will not invent uphill/downhill."
          data="HydroBASINS L12 (already in the app)"
        >
          <MockFrame caption="Today: one catchment fill">
            <div className="fv-basemap" />
            <div className="fv-red-blob" />
            <Pin />
          </MockFrame>
        </Option>

        <Option
          id="B"
          title="Runoff wash from elevation (Field Kit look)"
          verdict="Best match to the screenshot."
          honesty="Land shape suggests where surface water would collect. Not proof it reaches this well."
          data="Copernicus DEM 30 m → flow accumulation raster, clipped to Viana, shown only after tap"
          recommended
        >
          <MockFrame caption="Darker channels = more upslope area draining through that cell">
            <div className="fv-wash" />
            <div className="fv-channels" />
            <Buildings />
            <Pin />
          </MockFrame>
        </Option>

        <Option
          id="C"
          title="Switch to terrain tiles, say nothing extra"
          verdict="Cheap. User infers downhill from hillshade."
          honesty="Look at the ridges. Water usually goes down. We are not tracing it."
          data="OpenTopoMap (already in mapConfig) or Mapbox terrain / hillshade tiles"
        >
          <MockFrame caption="OpenTopo-style: contours + hillshade, pin only">
            <div className="fv-topo" />
            <Pin />
          </MockFrame>
        </Option>

        <Option
          id="D"
          title="Terrain + soft downhill ticks"
          verdict="Implies direction without a river path."
          honesty="Ticks follow slope from the DEM. Diagram on the land, not a stream."
          data="Same DEM: aspect / D8 flow direction, sparse arrows, tap-only"
        >
          <MockFrame caption="Hillshade with faint ➜ following slope">
            <div className="fv-topo fv-topo--soft" />
            <div className="fv-ticks" />
            <Pin />
          </MockFrame>
        </Option>

        <Option
          id="E"
          title="Red basin + faint runoff wash inside it"
          verdict="Keeps catchment truth, adds land-flow hint where we have a polygon."
          honesty="Red = official catchment unit. Blue wash = terrain suggestion inside it."
          data="HydroBASINS clip × DEM accumulation (mask wash to selected polygon)"
        >
          <MockFrame caption="One catchment, gradient only inside the red outline">
            <div className="fv-basemap" />
            <div className="fv-masked-wash" />
            <Pin />
          </MockFrame>
        </Option>

        <Option
          id="F"
          title="Wash + official watercourses (their ‘Water Flows’)"
          verdict="Richest. Easy to overclaim."
          honesty="Blue lines are mapped channels. Wash is modelled runoff. Still not well-to-well."
          data="DEM accumulation + APA 1:25k (already clipped) as faint lines"
        >
          <MockFrame caption="Accumulation + drain/river lines like the reference">
            <div className="fv-wash" />
            <div className="fv-channels fv-channels--bold" />
            <Buildings />
            <Pin />
          </MockFrame>
        </Option>
      </div>

      <section className="fv-notes">
        <h2>What we should not pretend</h2>
        <ul>
          <li>A pretty gradient is still a <strong>model of the land surface</strong>, not groundwater in granite.</li>
          <li>Darker blue must be captioned as <strong>“potential surface runoff”</strong>, not “this contaminates that.”</li>
          <li>Do not animate water from pin to pin along the wash.</li>
        </ul>
        <p className="fv-pick">
          Reply with <strong>A–F</strong> to wire one into the real map later. Recommended if you want
          the attached look: <strong>B</strong>, or <strong>E</strong> if you want to keep the red
          catchment as the legal/honest outline.
        </p>
      </section>
    </div>
  )
}
