import { useLanguage } from '../../context/LanguageContext'
import { useAppState } from '../../context/AppStateContext'
import { formatLisbonDateTime } from '../../lib/lisbonTime'
import { IconClose } from '../ui/Icons'
import './ProfileSheet.css'

export default function ProfileSheet({ onClose }) {
  const { user, activity, logout } = useAppState()
  const { dateLocale, t } = useLanguage()
  const mine = activity.filter((entry) => !user?.id || entry.userId === user.id).slice(0, 24)

  function handleLogout() {
    logout()
    onClose()
  }

  return (
    <div className="profile-sheet" role="dialog" aria-labelledby="profile-title">
      <header className="profile-sheet-head">
        <div>
          <p className="profile-kicker">{t('profile.title')}</p>
          <h2 id="profile-title">{user?.username}</h2>
          <p className="profile-email">{user?.email}</p>
        </div>
        <button type="button" className="profile-close" onClick={onClose} aria-label={t('profile.close')}>
          <IconClose />
        </button>
      </header>

      <section className="profile-activity" aria-labelledby="profile-activity-title">
        <h3 id="profile-activity-title">{t('profile.activity')}</h3>
        <p className="profile-hint">{t('profile.activityHint')}</p>
        {mine.length === 0 ? (
          <p className="profile-empty">{t('profile.empty')}</p>
        ) : (
          <ul>
            {mine.map((entry) => (
              <li key={entry.id}>
                <span>{t(`activity.${entry.type}`)}</span>
                <time dateTime={entry.at}>{formatLisbonDateTime(entry.at, dateLocale)}</time>
              </li>
            ))}
          </ul>
        )}
      </section>

      <button type="button" className="profile-logout" onClick={handleLogout}>
        {t('profile.logout')}
      </button>
    </div>
  )
}
