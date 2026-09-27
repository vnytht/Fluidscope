import { SOURCE_TYPES } from '../../../lib/mockData'
import { sourceTypeName, usageName } from '../../../lib/i18n'
import {
  SOURCE_USAGES,
  allUsagesSelected,
  asUsageList,
  toggleAllUsages,
  toggleUsage,
} from '../../../lib/sourceUsage'
import { useLanguage } from '../../../context/LanguageContext'

export default function SourceTypeStep({ sourceType, onChange, details, onDetailsChange }) {
  const { locale, t } = useLanguage()
  const usages = asUsageList(details.usages)
  const allOn = allUsagesSelected(usages)

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

      <div className="source-extras">
        <p className="source-extras-kicker">{t('source.usage')}</p>
        <p className="flow-hint">{t('source.usageHint')}</p>
        <div className="chip-grid">
          <button
            type="button"
            className={`chip${allOn ? ' chip--selected' : ''}`}
            onClick={() => patch({ usages: toggleAllUsages(usages) })}
          >
            {t('source.usage.selectAll')}
          </button>
          {SOURCE_USAGES.map((id) => (
            <button
              key={id}
              type="button"
              className={`chip${usages.includes(id) ? ' chip--selected' : ''}`}
              onClick={() => patch({ usages: toggleUsage(usages, id) })}
            >
              {usageName(id, t)}
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
