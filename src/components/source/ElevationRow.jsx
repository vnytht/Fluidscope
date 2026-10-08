import { useElevation } from '../../hooks/useElevation'
import { useLanguage } from '../../context/LanguageContext'

export default function ElevationRow({ position, variant = 'detail' }) {
  const { t } = useLanguage()
  const { meters, status } = useElevation(position)

  if (status === 'idle') return null

  let value = t('detail.elevationLoading')
  if (status === 'ready') value = t('detail.elevationValue', { n: meters })
  if (status === 'error') value = t('detail.elevationUnknown')

  const review = variant === 'review'
  const labelClass = review ? 'review-row-label' : 'source-detail-row-label'
  const valueClass = review ? 'review-row-value' : 'source-detail-row-value'

  const inner = (
    <div className={review ? 'review-row-copy' : 'source-detail-row-text'}>
      <span className={labelClass}>{t('detail.elevation')}</span>
      <span className={valueClass}>{value}</span>
    </div>
  )

  if (review) {
    return <div className="review-row">{inner}</div>
  }
  return <div className="source-detail-row">{inner}</div>
}
