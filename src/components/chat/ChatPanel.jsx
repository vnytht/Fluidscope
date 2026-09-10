import { useState } from 'react'
import { useAppState } from '../../context/AppStateContext'
import { getCatchment, shortCatchmentName } from '../../lib/catchments'
import { WATERSHED_GROUPS } from '../../lib/mockData'
import { IconBack, IconClose, IconSend } from '../ui/Icons'
import './ChatPanel.css'

function formatTime(iso) {
  const d = new Date(iso)
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
}

function formatDay(iso) {
  const d = new Date(iso)
  return d.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })
}

function ChatMessages({ messages, user, emptyLabel }) {
  let lastDay = null

  if (messages.length === 0) {
    return <p className="chat-empty">{emptyLabel}</p>
  }

  return messages.map((m) => {
    const day = formatDay(m.createdAt)
    const showDay = day !== lastDay
    lastDay = day
    const isOwn = m.author === (user?.email ?? 'You')

    return (
      <div key={m.id}>
        {showDay && <p className="chat-day">{day}</p>}
        <div className={`chat-message${isOwn ? ' chat-message--own' : ''}`}>
          {!isOwn && <strong className="chat-message-author">{m.author}</strong>}
          <div className="chat-message-bubble">
            <p>{m.text}</p>
          </div>
          <span className="chat-message-time">{formatTime(m.createdAt)}</span>
        </div>
      </div>
    )
  })
}

export default function ChatPanel({
  onClose,
  catchmentId = null,
  variant = 'fullscreen',
}) {
  const { user, chatMessages, sendMessage, activeWatershedId } = useAppState()
  const [tabId, setTabId] = useState(activeWatershedId)
  const [draft, setDraft] = useState('')

  const isEmbedded = variant === 'embedded'
  const isCommunity = Boolean(catchmentId)
  const catchment = catchmentId ? getCatchment(catchmentId) : null

  const messages = chatMessages
    .filter((m) => {
      if (isCommunity) return m.catchmentId === catchmentId
      return m.watershedId === tabId && !m.catchmentId
    })
    .sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt))

  function handleSend(e) {
    e.preventDefault()
    if (!draft.trim()) return
    if (isCommunity) {
      sendMessage(activeWatershedId, draft.trim(), { catchmentId })
    } else {
      sendMessage(tabId, draft.trim())
    }
    setDraft('')
  }

  const emptyLabel = isCommunity
    ? 'Start the conversation for this water community.'
    : 'No messages yet.'

  return (
    <div className={`chat-panel${isEmbedded ? ' chat-panel--embedded' : ''}`}>
      {!isEmbedded && (
        <div className="chat-header">
          <button type="button" className="chat-back" onClick={onClose} aria-label="Close chat">
            <IconBack />
          </button>
          <div className="chat-header-center">
            <h2>
              {isCommunity ? shortCatchmentName(catchment?.name ?? 'Community') : 'Watershed chat'}
            </h2>
            {isCommunity && <p className="chat-header-sub">Shared groundwater community</p>}
          </div>
          <button type="button" className="chat-close" onClick={onClose} aria-label="Close">
            <IconClose />
          </button>
        </div>
      )}

      {!isEmbedded && !isCommunity && (
        <div className="chat-tabs">
          {WATERSHED_GROUPS.map((g) => (
            <button
              key={g.id}
              type="button"
              className={`chat-tab${g.id === tabId ? ' chat-tab--active' : ''}${g.id === activeWatershedId ? ' chat-tab--mine' : ''}`}
              onClick={() => setTabId(g.id)}
            >
              {g.name}
            </button>
          ))}
        </div>
      )}

      {!isEmbedded && !isCommunity && tabId !== activeWatershedId && (
        <p className="chat-browsing-note">Browsing another watershed — posting as a visitor.</p>
      )}

      <div className="chat-messages">
        <ChatMessages messages={messages} user={user} emptyLabel={emptyLabel} />
      </div>

      <form className="chat-input-row" onSubmit={handleSend}>
        <div className="chat-input-wrap">
          <input
            type="text"
            placeholder={isCommunity ? 'Message this community…' : 'Send a message…'}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
          />
          <button type="submit" className="chat-send" disabled={!draft.trim()} aria-label="Send">
            <IconSend />
          </button>
        </div>
      </form>
    </div>
  )
}
