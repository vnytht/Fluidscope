import { useMemo, useState } from 'react'
import { HAZARD_ACTIVITY } from '../../lib/hazards'
import { hazardName, sourceTypeName } from '../../lib/i18n'
import { formatLisbonDateTime } from '../../lib/lisbonTime'
import { useLanguage } from '../../context/LanguageContext'
import { IconClose } from '../ui/Icons'
import './SourceDetailSheet.css'
import './HazardDetailSheet.css'

function metersBetween(a, b) {
  if (!a || !b) return Infinity
  const toRad = (deg) => (deg * Math.PI) / 180
  const dLat = toRad(b[0] - a[0])
  const dLng = toRad(b[1] - a[1])
  const lat1 = toRad(a[0])
  const lat2 = toRad(b[0])
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2
  return 2 * 6371000 * Math.asin(Math.min(1, Math.sqrt(h)))
}

export default function HazardDetailSheet({ hazard, samples = [], canEdit = false, onClose, onDelete }) {
  const { locale, dateLocale, t } = useLanguage()
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const name = hazardName(hazard.typeId, locale)
  const activity = HAZARD_ACTIVITY[hazard.activity] ? t(`hazard.${hazard.activity}`) : hazard.activity
  const nearby = useMemo(
    () =>
      samples
        .map((sample) => ({
          sample,
          meters: metersBetween(hazard.position, sample.position),
        }))
        .filter((row) => row.meters <= 800)
        .sort((a, b) => a.meters - b.meters)
        .slice(0, 5),
    [samples, hazard.position],
  )

  const lat = hazard.position?.[0]
  const lng = hazard.position?.[1]
  const coords =
    Number.isFinite(lat) && Number.isFinite(lng)
      ? `${lat.toFixed(5)}, ${lng.toFixed(5)}`
      : null

  return (
    <div className="flow-sheet source-detail-sheet hazard-detail-sheet">
      <div className="source-detail-header">
        <div className="source-detail-title-wrap">
          <h2>{name}</h2>
          <p className="source-detail-subtitle">{t('hazard.detailKind')}</p>
        </div>
        <button
          type="button"
          className="flow-close source-detail-close"
          onClick={onClose}
          aria-label={t('detail.close')}
        >
          <IconClose />
        </button>
      </div>

      <div className="flow-sheet-body source-detail-body hazard-detail-body">
        <div className="source-detail-rows">
          {activity && (
            <div className="source-detail-row">
              <div className="source-detail-row-text">
                <span className="source-detail-row-label">{t('hazard.detailActivity')}</span>
                <span className="source-detail-row-value">{activity}</span>
              </div>
            </div>
          )}
          {hazard.createdAt && (
            <div className="source-detail-row">
              <div className="source-detail-row-text">
                <span className="source-detail-row-label">{t('hazard.detailLogged')}</span>
                <span className="source-detail-row-value">
                  {formatLisbonDateTime(hazard.createdAt, dateLocale)}
                </span>
              </div>
            </div>
          )}
          {coords && (
            <div className="source-detail-row">
              <div className="source-detail-row-text">
                <span className="source-detail-row-label">{t('hazard.detailCoords')}</span>
                <span className="source-detail-row-value">{coords}</span>
              </div>
            </div>
          )}
          <div className="source-detail-row">
            <div className="source-detail-row-text">
              <span className="source-detail-row-label">{t('hazard.detailNearby')}</span>
              <span className="source-detail-row-value">
                {nearby.length === 0
                  ? t('hazard.detailNearbyNone')
                  : nearby
                      .map((row) => {
                        const label =
                          row.sample.localName ||
                          sourceTypeName(row.sample.sourceType, locale)
                        return `${label} · ${Math.round(row.meters)} m`
                      })
                      .join(', ')}
              </span>
            </div>
          </div>
        </div>
        <p className="hazard-detail-note">{t('hazard.detailNote')}</p>
      </div>
      {canEdit && (
        <div className="flow-sheet-footer source-detail-footer">
          {!confirmDelete ? (
            <button
              type="button"
              className="btn-outline source-detail-delete"
              onClick={() => setConfirmDelete(true)}
            >
              {t('detail.delete')}
            </button>
          ) : (
            <>
              <p className="source-detail-delete-warn">{t('detail.deleteConfirm')}</p>
              <button
                type="button"
                className="btn-outline source-detail-delete"
                disabled={deleting}
                onClick={async () => {
                  setDeleting(true)
                  try {
                    await onDelete?.()
                  } finally {
                    setDeleting(false)
                  }
                }}
              >
                {deleting ? t('detail.deleting') : t('detail.deleteYes')}
              </button>
              <button
                type="button"
                className="btn-outline source-detail-edit"
                disabled={deleting}
                onClick={() => setConfirmDelete(false)}
              >
                {t('detail.deleteNo')}
              </button>
            </>
          )}
        </div>
      )}
    </div>
  )
}
