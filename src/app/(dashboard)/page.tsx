'use client'

import { useState, useEffect, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from '@/hooks/useAuth'
import { Avatar } from '@/components/ui/Avatar'
import type { Message, Profile } from '@/lib/types'

function formatTime(d: string) {
  return new Date(d).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })
}
function formatDateSep(d: string) {
  const date = new Date(d)
  const today = new Date()
  if (date.toDateString() === today.toDateString()) return 'Hôm nay'
  return date.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

export default function ChatPage() {
  const { profile } = useAuth()
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [members, setMembers] = useState<Profile[]>([])
  const msgsRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    const supabase = createClient()

    async function loadMessages() {
      const { data } = await supabase
        .from('messages')
        .select('*, profiles(*)')
        .order('created_at', { ascending: true })
        .limit(200)
      setMessages(data ?? [])
      setTimeout(() => scrollToBottom(), 50)
    }

    async function loadMembers() {
      const { data } = await supabase.from('profiles').select('*').order('full_name')
      setMembers(data ?? [])
    }

    loadMessages()
    loadMembers()

    const channel = supabase
      .channel('messages-realtime')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages' }, async payload => {
        const { data } = await supabase
          .from('messages')
          .select('*, profiles(*)')
          .eq('id', payload.new.id)
          .single()
        if (data) {
          setMessages(prev => [...prev, data])
          setTimeout(() => scrollToBottom(), 50)
        }
      })
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [])

  function scrollToBottom() {
    msgsRef.current?.scrollTo({ top: msgsRef.current.scrollHeight, behavior: 'smooth' })
  }

  async function sendMsg() {
    if (!input.trim() || !profile) return
    const text = input.trim()
    setInput('')
    const supabase = createClient()
    await supabase.from('messages').insert({ user_id: profile.id, content: text })
  }

  function handleKey(e: React.KeyboardEvent) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMsg()
    }
  }

  let lastDate = ''

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* Header */}
      <div style={{
        padding: '.75rem 1.2rem', borderBottom: '1px solid var(--bd)', background: 'var(--sf)',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '.7rem', flexShrink: 0
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '.75rem' }}>
          <div style={{ display: 'flex', marginRight: '.25rem' }}>
            {members.slice(0, 4).map((m, i) => (
              <div key={m.id} style={{ marginLeft: i === 0 ? 0 : -8, border: '2px solid var(--sf)', borderRadius: '50%' }}>
                <Avatar name={m.full_name} color={m.avatar_color} size="sm" />
              </div>
            ))}
          </div>
          <div>
            <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--tx)' }}>Chat nội bộ KIMANH</div>
            <div style={{ fontSize: 11, color: 'var(--mu)' }}>{members.length} thành viên</div>
          </div>
        </div>
      </div>

      {/* Messages */}
      <div ref={msgsRef} style={{
        flex: 1, overflowY: 'auto', padding: '.9rem 1.2rem',
        display: 'flex', flexDirection: 'column', gap: '.7rem',
        background: 'var(--bg)', WebkitOverflowScrolling: 'touch'
      } as React.CSSProperties}>
        {messages.length === 0 && (
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: 'var(--mu)', gap: '.5rem', paddingTop: '3rem' }}>
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" style={{ opacity: .2 }}>
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
            </svg>
            <p style={{ fontSize: 13 }}>Chưa có tin nhắn. Hãy bắt đầu trò chuyện!</p>
          </div>
        )}

        {messages.map(msg => {
          const mine = msg.user_id === profile?.id
          const dateStr = formatDateSep(msg.created_at)
          const showSep = dateStr !== lastDate
          lastDate = dateStr

          return (
            <div key={msg.id}>
              {showSep && (
                <div style={{ textAlign: 'center', fontSize: 11, color: 'var(--mu)', margin: '.3rem 0', display: 'flex', alignItems: 'center', gap: '.5rem' }}>
                  <span style={{ flex: 1, height: 1, background: 'var(--bd)' }} />
                  {dateStr}
                  <span style={{ flex: 1, height: 1, background: 'var(--bd)' }} />
                </div>
              )}
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '.6rem', flexDirection: mine ? 'row-reverse' : 'row' }}>
                {!mine && (
                  <Avatar
                    name={msg.profiles?.full_name ?? '?'}
                    color={msg.profiles?.avatar_color}
                    size="sm"
                  />
                )}
                <div style={{ display: 'flex', flexDirection: 'column', maxWidth: '72%', alignItems: mine ? 'flex-end' : 'flex-start' }}>
                  {!mine && (
                    <div style={{ fontSize: 11, fontWeight: 700, marginBottom: '.2rem', color: 'var(--mu)' }}>
                      {msg.profiles?.full_name}
                    </div>
                  )}
                  <div className={`msg-bubble ${mine ? 'mine' : 'theirs'}`}>
                    {msg.content}
                  </div>
                  <div style={{ fontSize: 10, color: mine ? 'rgba(255,255,255,.65)' : 'var(--mu)', marginTop: '.25rem' }}>
                    {formatTime(msg.created_at)}
                  </div>
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {/* Input */}
      <div style={{
        padding: '.7rem 1.1rem', borderTop: '1px solid var(--bd)', background: 'var(--sf)',
        display: 'flex', gap: '.6rem', alignItems: 'flex-end', flexShrink: 0
      }}>
        <textarea
          ref={inputRef}
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={handleKey}
          placeholder="Nhắn tin cho cả nhóm..."
          rows={1}
          style={{
            flex: 1, border: '1px solid var(--bd)', borderRadius: 20,
            padding: '.55rem 1rem', fontFamily: 'inherit', fontSize: 13.5,
            color: 'var(--tx)', outline: 'none', resize: 'none', maxHeight: 100,
            lineHeight: 1.5, background: 'var(--bg)', transition: 'border .2s'
          }}
          onFocus={e => e.target.style.borderColor = 'var(--green)'}
          onBlur={e => e.target.style.borderColor = 'var(--bd)'}
        />
        <button
          onClick={sendMsg}
          style={{
            width: 38, height: 38, background: 'var(--green)', border: 'none',
            borderRadius: '50%', cursor: 'pointer', display: 'flex',
            alignItems: 'center', justifyContent: 'center', flexShrink: 0
          }}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2">
            <line x1="22" y1="2" x2="11" y2="13"/>
            <polygon points="22 2 15 22 11 13 2 9 22 2"/>
          </svg>
        </button>
      </div>
    </div>
  )
}
