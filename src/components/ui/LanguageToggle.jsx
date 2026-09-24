import { useLanguage } from '../../context/LanguageContext'
import './LanguageToggle.css'

export default function LanguageToggle() {
  const { locale, setLocale, t } = useLanguage()

  return (
    <div className="lang-toggle" role="group" aria-label={t('lang.label')}>
      <button
        type="button"
        className={`lang-toggle-btn${locale === 'en' ? ' lang-toggle-btn--active' : ''}`}
        onClick={() => setLocale('en')}
        aria-pressed={locale === 'en'}
        title={t('lang.en')}
      >
        EN
      </button>
      <button
        type="button"
        className={`lang-toggle-btn${locale === 'pt' ? ' lang-toggle-btn--active' : ''}`}
        onClick={() => setLocale('pt')}
        aria-pressed={locale === 'pt'}
        title={t('lang.pt')}
      >
        PT
      </button>
    </div>
  )
}
