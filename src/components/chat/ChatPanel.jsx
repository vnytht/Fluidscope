import { useMemo, useState } from 'react'
import { useAppState } from '../../context/AppStateContext'
import { useLanguage } from '../../context/LanguageContext'
import { sourceTypeName } from '../../lib/i18n'
import {
  CHAT_BASINS,
  CHAT_TOWNS,
  THREAD_SUBJECTS,
  UNMAPPED_BASIN,
  WHOLE_BASIN_TOWN_ID,
  basinThreadCount,
  getChatBasin,
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

function threadTitle(thread, t) {
  return thread.title?.trim() || subjectLabel(thread.subject, t)
}

function ChatMessages({ messages, user, emptyLabel, dateLocale, youLabel }) {
  let lastDay = null

  if (messages.length === 0) {
    return <p className="chat-empty">{emptyLabel}</p>
  }

  return messages.map((m) => {
    const day = formatDay(m.createdAt, dateLocale)
    const showDay = day !== lastDay
    lastDay = day
    const isOwn = m.author === (user?.email ?? youLabel)

    return (
      <div key={m.id}>
        {showDay && <p className="chat-day">{day}</p>}
        <div className={`chat-message${isOwn ? ' chat-message--own' : ''}`}>
          {!isOwn && <strong className="chat-message-author">{m.author}</strong>}
          <div className="chat-message-bubble">
            <p>{m.text}</p>
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
  startBasinId = null,
  startTownId = null,
  taggedPlace = null,
}) {
  const { dateLocale, locale, t } = useLanguage()
  const { user, samples, chatThreads, chatMessages, createThread, replyToThread } = useAppState()
  const isEmbedded = variant === 'embedded'

  const [basinId, setBasinId] = useState(startBasinId)
  const [townId, setTownId] = useState(startTownId)
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

  const level = composing
    ? 'compose'
    : threadId
      ? 'thread'
      : townId
        ? 'threads'
        : basinId
          ? 'towns'
          : 'basins'

  const basin = basinId ? getChatBasin(basinId) : null
  const thread = chatThreads.find((item) => item.id === threadId) ?? null
  const scopedThreads = useMemo(
    () => (basinId && townId ? threadsInScope(chatThreads, basinId, townId) : []),
    [chatThreads, basinId, townId],
  )
  const placeOptions = useMemo(
    () => (basinId && townId ? samplesForChatPlace(samples, basinId, townId) : []),
    [samples, basinId, townId],
  )
  const threadMessages = useMemo(
    () =>
      chatMessages
        .filter((message) => message.threadId === threadId)
        .sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt)),
    [chatMessages, threadId],
  )

  const title =
    level === 'basins'
      ? t('chat.title')
      : level === 'towns'
        ? basin?.name
        : level === 'threads'
          ? townDisplayName(townId, t)
          : level === 'compose'
            ? t('chat.newThread')
            : thread
              ? threadTitle(thread, t)
              : t('chat.title')

  const subtitle =
    level === 'towns'
      ? t('chat.pickTown')
      : level === 'threads'
        ? basin?.name
        : level === 'thread' && thread
          ? [subjectLabel(thread.subject, t), thread.placeLabel, townDisplayName(thread.townId, t)]
              .filter(Boolean)
              .join(' · ')
          : level === 'compose'
            ? `${basin?.name} · ${townDisplayName(townId, t)}`
            : t('chat.titleSub')

  function handleBack() {
    if (composing) {
      setComposing(false)
      return
    }
    if (threadId) {
      setThreadId(null)
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
    if (basinId) {
      if (startBasinId && !startTownId) {
        onClose?.()
        return
      }
      setBasinId(null)
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
    setComposing(true)
  }

  function handleCreate(e) {
    e.preventDefault()
    if (!compose.text.trim()) return
    if (compose.subject === 'other' && !compose.title.trim()) return

    const selected = placeOptions.find((sample) => sample.id === compose.placeId)
    const placeLabel = selected
      ? placeLabelForOption(selected, locale)
      : compose.otherPlace.trim() || taggedPlace?.label || null

    const created = createThread({
      basinId,
      townId,
      subject: compose.subject,
      title: compose.title,
      placeId: selected?.id ?? taggedPlace?.id ?? null,
      placeLabel,
      text: compose.text,
    })
    setComposing(false)
    setThreadId(created.id)
  }

  function handleReply(e) {
    e.preventDefault()
    if (!draft.trim() || !threadId) return
    replyToThread(threadId, draft)
    setDraft('')
  }

  const basins = [...CHAT_BASINS, UNMAPPED_BASIN]

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

      {level === 'basins' && (
        <div className="chat-list">
          {basins.map((item) => {
            const count = basinThreadCount(chatThreads, item.id)
            return (
              <button key={item.id} type="button" className="chat-row" onClick={() => setBasinId(item.id)}>
                <span className="chat-row-copy">
                  <strong>{item.name}</strong>
                  <span>
                    {count === 1 ? t('chat.threadOne') : t('chat.threadMany', { count })}
                  </span>
                </span>
                <IconChevronRight />
              </button>
            )
          })}
        </div>
      )}

      {level === 'towns' && (
        <div className="chat-list">
          <button
            type="button"
            className="chat-row"
            onClick={() => setTownId(WHOLE_BASIN_TOWN_ID)}
          >
            <span className="chat-row-copy">
              <strong>{t('chat.wholeBasin')}</strong>
              <span>
                {t('chat.threadMany', { count: townThreadCount(chatThreads, basinId, WHOLE_BASIN_TOWN_ID) })}
              </span>
            </span>
            <IconChevronRight />
          </button>
          {CHAT_TOWNS.map((town) => {
            const count = townThreadCount(chatThreads, basinId, town.id)
            const sourceCount = samplesForChatPlace(samples, basinId, town.id).length
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
                      <strong>{threadTitle(item, t)}</strong>
                      <span>
                        {item.placeLabel ? `${item.placeLabel} · ` : ''}
                        {last ? last.text : t('chat.empty')}
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
