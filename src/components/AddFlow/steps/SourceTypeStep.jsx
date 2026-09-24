import { SOURCE_TYPES } from '../../../lib/mockData'
import { sourceTypeName } from '../../../lib/i18n'
import { useLanguage } from '../../../context/LanguageContext'

export default function SourceTypeStep({ sourceType, onChange, details, onDetailsChange }) {
  const { locale, t } = useLanguage()

  function patch(partial) {
    onDetailsChange({ ...details, ...partial })
  }

  return (
    <div className="flow-step">
      <h2>{t('source.title')}</h2>
      <div className="chip-grid">
        {SOURCE_TYPES.map((type) => (
          <button
            key={type}
            type="button"
            className={`chip${sourceType === type ? ' chip--selected' : ''}`}
            onClick={() => {
              onChange(type)
              if (type !== 'Dug well' && details.depthMeters) {
                patch({ depthMeters: '' })
              }
            }}
          >
            {sourceTypeName(type, locale)}
          </button>
        ))}
      </div>

      {sourceType === 'Dug well' && (
        <div className="source-extras">
          <label className="source-field">
            {t('source.depth')}
            <input
              type="number"
              min="0"
              step="0.5"
              inputMode="decimal"
              value={details.depthMeters}
              onChange={(e) => patch({ depthMeters: e.target.value })}
              placeholder={t('source.depthPlaceholder')}
            />
          </label>
        </div>
      )}
    </div>
  )
}
