import { useEffect, useMemo, useState } from 'react'
import { useAppState } from '../../context/AppStateContext'
import { useLanguage } from '../../context/LanguageContext'
import {
  localizedChatAuthor,
  localizedChatMessageText,
  localizedChatPlaceLabel,
  localizedChatThreadTitle,
  sourceTypeName,
} from '../../lib/i18n'
import {
  CHAT_TOWNS,
  THREAD_SUBJECTS,
  WHOLE_BASIN_TOWN_ID,
  communityThreadId,
  getChatTown,
  lastMessageForThread,
  messageCountForThread,
  samplesForChatPlace,
  threadsInScope,
  townThreadCount,
} from '../../lib/chatStructure'
import { IconBack, IconChevronRight, IconClose, IconPlus, IconSend } from '../ui/Icons'
import './ChatPanel.css'

function formatTime(iso, dateLocale) {
  return new Date(iso).toLocaleDateString(dateLocale, { month: 'short', day: 'numeric' })
}

function formatDay(iso, dateLocale) {
  return new Date(iso).toLocaleDateString(dateLocale, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  })
}

function subjectLabel(subject, t) {
  return t(`chat.subject.${subject}`)
}

function townDisplayName(townId, t) {
  if (townId === WHOLE_BASIN_TOWN_ID) return t('chat.wholeBasin')
  return getChatTown(townId)?.name ?? t('chat.unknownTown')
}

function threadTitle(thread, t, locale) {
  return localizedChatThreadTitle(thread, locale, t) || subjectLabel(thread.subject, t)
}

function ChatMessages({ messages, user, emptyLabel, dateLocale, youLabel, locale, t }) {
  let lastDay = null

  if (messages.length === 0) {
    return <p className="chat-empty">{emptyLabel}</p>
  }

  return messages.map((m) => {
    const day = formatDay(m.createdAt, dateLocale)
    const showDay = day !== lastDay
    lastDay = day
    const isOwn =
      m.author === user?.username || m.author === user?.email || m.author === youLabel

    return (
      <div key={m.id}>
        {showDay && <p className="chat-day">{day}</p>}
        <div className={`chat-message${isOwn ? ' chat-message--own' : ''}`}>
          {!isOwn && (
            <strong className="chat-message-author">{localizedChatAuthor(m.author, locale, t)}</strong>
          )}
          <div className="chat-message-bubble">
            <p>{localizedChatMessageText(m, locale, t)}</p>
          </div>
          <span className="chat-message-time">{formatTime(m.createdAt, dateLocale)}</span>
        </div>
      </div>
    )
  })
}

export default function ChatPanel({
  onClose,
  variant = 'fullscreen',
  startTownId = null,
  taggedPlace = null,
}) {
  const { dateLocale, locale, t } = useLanguage()
  const { user, samples, chatThreads, chatMessages, createThread, ensureCommunityThread, replyToThread } =
    useAppState()
  const isEmbedded = variant === 'embedded'

  const [townId, setTownId] = useState(startTownId)
  const [viewingThreads, setViewingThreads] = useState(false)
  const [threadId, setThreadId] = useState(null)
  const [composing, setComposing] = useState(false)
  const [draft, setDraft] = useState('')
  const [compose, setCompose] = useState({
    subject: 'hazard-discuss',
    title: '',
    placeId: taggedPlace?.id ?? '',
    otherPlace: '',
    text: '',
  })

  const communityId = townId ? communityThreadId(townId) : null

  useEffect(() => {
    if (townId) ensureCommunityThread(townId)
  }, [townId, ensureCommunityThread])

  const level = composing
    ? 'compose'
    : threadId
      ? 'thread'
      : viewingThreads && townId
        ? 'threads'
        : townId
          ? 'community'
          : 'towns'

  const thread = chatThreads.find((item) => item.id === threadId) ?? null
  const communityMessages = useMemo(
    () =>
      chatMessages
        .filter((message) => message.threadId === communityId)
        .sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt)),
    [chatMessages, communityId],
  )
  const scopedThreads = useMemo(
    () => (townId ? threadsInScope(chatThreads, townId) : []),
    [chatThreads, townId],
  )
  const placeOptions = useMemo(
    () => (townId ? samplesForChatPlace(samples, townId) : []),
    [samples, townId],
  )
  const threadMessages = useMemo(
    () =>
      chatMessages
        .filter((message) => message.threadId === threadId)
        .sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt)),
    [chatMessages, threadId],
  )

  const title =
    level === 'towns'
      ? t('chat.title')
      : level === 'community'
        ? townDisplayName(townId, t)
        : level === 'threads'
          ? townDisplayName(townId, t)
          : level === 'compose'
          ? t('chat.newThread')
          : thread
            ? threadTitle(thread, t, locale)
            : t('chat.title')

  const subtitle =
    level === 'towns'
      ? t('chat.pickTown')
      : level === 'community'
        ? t('chat.communitySub')
        : level === 'threads'
          ? t('chat.threadsForTown')
          : level === 'thread' && thread
          ? [subjectLabel(thread.subject, t), localizedChatPlaceLabel(thread.placeLabel, locale), townDisplayName(thread.townId, t)]
              .filter(Boolean)
              .join(' · ')
          : level === 'compose'
            ? townDisplayName(townId, t)
            : t('chat.titleSub')

  function handleBack() {
    if (composing) {
      setComposing(false)
      return
    }
    if (threadId) {
      setThreadId(null)
      setViewingThreads(true)
      return
    }
    if (viewingThreads) {
      setViewingThreads(false)
      return
    }
    if (townId) {
      if (startTownId) {
        onClose?.()
        return
      }
      setTownId(null)
      return
    }
    onClose?.()
  }

  function openCompose() {
    setCompose({
      subject: 'hazard-discuss',
      title: '',
      placeId: taggedPlace?.id ?? '',
      otherPlace: '',
      text: '',
    })
    setViewingThreads(true)
    setComposing(true)
  }

  async function handleCreate(e) {
    e.preventDefault()
    if (!compose.text.trim()) return
    if (compose.subject === 'other' && !compose.title.trim()) return

    const selected = placeOptions.find((sample) => sample.id === compose.placeId)
    const placeLabel = selected
      ? placeLabelForOption(selected, locale)
      : compose.otherPlace.trim() || taggedPlace?.label || null

    const created = await createThread({
      basinId: selected?.basinChatId ?? 'lima',
      townId,
      subject: compose.subject,
      title: compose.title,
      placeId: selected?.id ?? taggedPlace?.id ?? null,
      placeLabel,
      text: compose.text,
    })
    setComposing(false)
    setViewingThreads(true)
    setThreadId(created.id)
  }

  async function handleReply(e) {
    e.preventDefault()
    if (!draft.trim() || !threadId) return
    const text = draft
    setDraft('')
    await replyToThread(threadId, text)
  }

  async function handleCommunityReply(e) {
    e.preventDefault()
    if (!draft.trim() || !communityId) return
    const text = draft
    setDraft('')
    await ensureCommunityThread(townId)
    await replyToThread(communityId, text)
  }

  return (
    <div className={`chat-panel${isEmbedded ? ' chat-panel--embedded' : ''}`}>
      <div className="chat-header">
        <button type="button" className="chat-back" onClick={handleBack} aria-label={t('chat.closeShort')}>
          <IconBack />
        </button>
        <div className="chat-header-center">
          <h2>{title}</h2>
          {subtitle && <p className="chat-header-sub">{subtitle}</p>}
        </div>
        {!isEmbedded && (
          <button type="button" className="chat-close" onClick={onClose} aria-label={t('chat.closeShort')}>
            <IconClose />
          </button>
        )}
        {isEmbedded && <span className="chat-header-spacer" />}
      </div>

      {level === 'towns' && (
        <div className="chat-list">
          {CHAT_TOWNS.map((town) => {
            const count = townThreadCount(chatThreads, town.id)
            const sourceCount = samplesForChatPlace(samples, town.id).length
            return (
              <button key={town.id} type="button" className="chat-row" onClick={() => setTownId(town.id)}>
                <span className="chat-row-copy">
                  <strong>{town.name}</strong>
                  <span>
                    {count === 1 ? t('chat.threadOne') : t('chat.threadMany', { count })}
                    {sourceCount ? ` · ${t('chat.sources', { count: sourceCount })}` : ''}
                  </span>
                </span>
                <IconChevronRight />
              </button>
            )
          })}
        </div>
      )}

      {level === 'community' && (
        <>
          <div className="chat-messages">
            <ChatMessages
              messages={communityMessages}
              user={user}
              emptyLabel={t('chat.emptyCommunity')}
              dateLocale={dateLocale}
              youLabel={t('chat.you')}
              locale={locale}
              t={t}
            />
          </div>
          <div className="chat-list-footer chat-list-footer--community">
            <button
              type="button"
              className="chat-new-thread chat-new-thread--secondary"
              onClick={() => setViewingThreads(true)}
            >
              {t('chat.openThreads')}
              {scopedThreads.length
                ? ` · ${
                    scopedThreads.length === 1
                      ? t('chat.threadOne')
                      : t('chat.threadMany', { count: scopedThreads.length })
                  }`
                : ''}
            </button>
            <form className="chat-input-row chat-input-row--inline" onSubmit={handleCommunityReply}>
              <div className="chat-input-wrap">
                <input
                  type="text"
                  placeholder={t('chat.placeholderCommunity')}
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                />
                <button type="submit" className="chat-send" disabled={!draft.trim()} aria-label={t('chat.send')}>
                  <IconSend />
                </button>
              </div>
            </form>
            <p className="chat-moderated">{t('chat.moderated')}</p>
          </div>
        </>
      )}

      {level === 'threads' && (
        <>
          <div className="chat-list">
            {scopedThreads.length === 0 && (
              <p className="chat-empty chat-empty--list">{t('chat.emptyThreads')}</p>
            )}
            {scopedThreads
              .slice()
              .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
              .map((item) => {
                const last = lastMessageForThread(chatMessages, item.id)
                const count = messageCountForThread(chatMessages, item.id)
                return (
                  <button
                    key={item.id}
                    type="button"
                    className="chat-row chat-row--thread"
                    onClick={() => setThreadId(item.id)}
                  >
                    <span className="chat-row-copy">
                      <em className={`chat-subject chat-subject--${item.subject}`}>
                        {subjectLabel(item.subject, t)}
                      </em>
                      <strong>{threadTitle(item, t, locale)}</strong>
                      <span>
                        {item.placeLabel ? `${localizedChatPlaceLabel(item.placeLabel, locale)} · ` : ''}
                        {last ? localizedChatMessageText(last, locale, t) : t('chat.empty')}
                      </span>
                    </span>
                    <span className="chat-row-meta">
                      {count}
                      <IconChevronRight />
                    </span>
                  </button>
                )
              })}
          </div>
          <div className="chat-list-footer">
            <button type="button" className="chat-new-thread" onClick={openCompose}>
              <IconPlus size={18} />
              {t('chat.newThread')}
            </button>
            <p className="chat-moderated">{t('chat.moderated')}</p>
          </div>
        </>
      )}

      {level === 'compose' && (
        <form className="chat-compose" onSubmit={handleCreate}>
          <label className="chat-compose-label">
            {t('chat.tagPlace')}
            <select
              value={compose.placeId}
              onChange={(e) => setCompose((prev) => ({ ...prev, placeId: e.target.value }))}
            >
              <option value="">{t('chat.noPlace')}</option>
              {taggedPlace && !placeOptions.some((sample) => sample.id === taggedPlace.id) && (
                <option value={taggedPlace.id}>{taggedPlace.label}</option>
              )}
              {placeOptions.map((sample) => (
                <option key={sample.id} value={sample.id}>
                  {placeLabelForOption(sample, locale)}
                </option>
              ))}
            </select>
          </label>
          {!compose.placeId && (
            <label className="chat-compose-label">
              {t('chat.otherPlace')}
              <input
                type="text"
                value={compose.otherPlace}
                onChange={(e) => setCompose((prev) => ({ ...prev, otherPlace: e.target.value }))}
                placeholder={t('chat.otherPlaceHint')}
              />
            </label>
          )}

          <p className="chat-compose-label">{t('chat.subject')}</p>
          <div className="chat-subjects">
            {THREAD_SUBJECTS.map((subject) => (
              <button
                key={subject}
                type="button"
                className={`chat-subject-chip${compose.subject === subject ? ' is-on' : ''}`}
                onClick={() => setCompose((prev) => ({ ...prev, subject }))}
              >
                {subjectLabel(subject, t)}
              </button>
            ))}
          </div>

          <label className="chat-compose-label">
            {compose.subject === 'other' ? t('chat.topicRequired') : t('chat.topicOptional')}
            <input
              type="text"
              value={compose.title}
              onChange={(e) => setCompose((prev) => ({ ...prev, title: e.target.value }))}
              placeholder={t('chat.topicHint')}
              required={compose.subject === 'other'}
            />
          </label>

          <label className="chat-compose-label">
            {t('chat.firstMessage')}
            <textarea
              value={compose.text}
              onChange={(e) => setCompose((prev) => ({ ...prev, text: e.target.value }))}
              placeholder={t('chat.firstMessageHint')}
              rows={4}
              required
            />
          </label>

          <button
            type="submit"
            className="chat-new-thread"
            disabled={!compose.text.trim() || (compose.subject === 'other' && !compose.title.trim())}
          >
            {t('chat.startThread')}
          </button>
          <p className="chat-moderated">{t('chat.moderated')}</p>
        </form>
      )}

      {level === 'thread' && (
        <>
          <div className="chat-messages">
            <ChatMessages
              messages={threadMessages}
              user={user}
              emptyLabel={t('chat.empty')}
              dateLocale={dateLocale}
              youLabel={t('chat.you')}
              locale={locale}
              t={t}
            />
          </div>
          <form className="chat-input-row" onSubmit={handleReply}>
            <div className="chat-input-wrap">
              <input
                type="text"
                placeholder={t('chat.placeholderReply')}
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
              />
              <button type="submit" className="chat-send" disabled={!draft.trim()} aria-label={t('chat.send')}>
                <IconSend />
              </button>
            </div>
          </form>
        </>
      )}
    </div>
  )
}

function placeLabelForOption(sample, locale) {
  return sample.localName || sourceTypeName(sample.sourceType, locale) || sample.sourceType
}
