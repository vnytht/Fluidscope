import { SOURCE_TYPES } from '../../../lib/mockData'
import { SOURCE_TYPE_LABELS } from '../../../lib/sourceTypeLabels'

export default function SourceTypeStep({ sourceType, onChange }) {
  return (
    <div className="flow-step">
      <h2>What kind of source is it?</h2>
      <div className="chip-grid">
        {SOURCE_TYPES.map((type) => {
          const labels = SOURCE_TYPE_LABELS[type]
          return (
            <button
              key={type}
              type="button"
              className={`chip chip--bilingual${sourceType === type ? ' chip--selected' : ''}`}
              onClick={() => onChange(type)}
            >
              <span className="chip-label-pt">{labels.pt}</span>
              <span className="chip-label-en">{labels.en}</span>
            </button>
          )
        })}
      </div>
    </div>
  )
}
