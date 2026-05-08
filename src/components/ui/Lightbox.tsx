'use client'

import { useEffect, useState } from 'react'

interface LightboxMedia {
  url: string
  type?: 'image' | 'video'
}

interface LightboxProps {
  items: LightboxMedia[]
  initialIndex?: number
  onClose: () => void
}

type ShareStatus = 'idle' | 'loading' | 'done' | 'copied' | 'error'

export function Lightbox({ items, initialIndex = 0, onClose }: LightboxProps) {
  const [idx, setIdx] = useState(initialIndex)
  const [downloading, setDownloading] = useState(false)
  const [shareStatus, setShareStatus] = useState<ShareStatus>('idle')

  useEffect(() => { setIdx(initialIndex) }, [initialIndex])

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
      if (e.key === 'ArrowLeft') setIdx(i => (i - 1 + items.length) % items.length)
      if (e.key === 'ArrowRight') setIdx(i => (i + 1) % items.length)
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [items.length, onClose])

  // Reset share status khi chuyển ảnh
  useEffect(() => { setShareStatus('idle') }, [idx])

  const cur = items[idx]
  const isVideo = cur?.type === 'video' || /\.(mp4|mov|webm|avi)$/i.test(cur?.url ?? '')

  async function handleDownload() {
    if (!cur?.url) return
    setDownloading(true)
    try {
      const res = await fetch(cur.url)
      const blob = await res.blob()
      const objUrl = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = objUrl
      a.download = cur.url.split('/').pop()?.split('?')[0] ?? (isVideo ? 'video' : 'image')
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(objUrl)
    } catch {
      window.open(cur.url, '_blank')
    } finally {
      setDownloading(false)
    }
  }

  async function handleShare() {
    if (!cur?.url || shareStatus === 'loading') return
    setShareStatus('loading')

    try {
      // Fetch file về blob để share ảnh/video thực sự (Zalo, Messenger nhận được file)
      const res = await fetch(cur.url)
      const blob = await res.blob()
      const filename = cur.url.split('/').pop()?.split('?')[0] ?? (isVideo ? 'video.mp4' : 'image.jpg')
      const file = new File([blob], filename, { type: blob.type })

      // Web Share API Level 2: share file (Android/iOS native share sheet)
      if (navigator.share && navigator.canShare && navigator.canShare({ files: [file] })) {
        await navigator.share({ files: [file], title: filename })
        setShareStatus('done')
        setTimeout(() => setShareStatus('idle'), 2500)
        return
      }

      // Fallback: share URL (desktop Chrome / Firefox)
      if (navigator.share) {
        await navigator.share({ url: cur.url, title: filename })
        setShareStatus('done')
        setTimeout(() => setShareStatus('idle'), 2500)
        return
      }

      // Fallback cuối: copy link vào clipboard
      await navigator.clipboard.writeText(cur.url)
      setShareStatus('copied')
      setTimeout(() => setShareStatus('idle'), 2500)

    } catch (err: unknown) {
      // AbortError = người dùng hủy share sheet → không hiện lỗi
      if (err instanceof Error && err.name === 'AbortError') {
        setShareStatus('idle')
        return
      }
      // Lỗi thật: thử copy clipboard
      try {
        await navigator.clipboard.writeText(cur.url)
        setShareStatus('copied')
      } catch {
        setShareStatus('error')
      }
      setTimeout(() => setShareStatus('idle'), 2500)
    }
  }

  const iconBtn = (extra?: React.CSSProperties): React.CSSProperties => ({
    background: 'transparent', border: 'none', cursor: 'pointer',
    color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center',
    padding: '.35rem', borderRadius: 6, transition: 'background .15s',
    ...extra,
  })

  const shareLoading = shareStatus === 'loading'
  const shareDone    = shareStatus === 'done' || shareStatus === 'copied'

  // Label hiện bên cạnh nút share
  const shareLabel =
    shareStatus === 'loading' ? 'Đang tải...' :
    shareStatus === 'done'    ? 'Đã chia sẻ!' :
    shareStatus === 'copied'  ? 'Đã copy link!' :
    shareStatus === 'error'   ? 'Không thể share' : ''

  const shareLabelColor =
    shareStatus === 'error' ? '#f87171' : '#4ade80'

  return (
    <div id="lightbox" className="open">
      <div className="lb-top">
        <span style={{ color: 'rgba(255,255,255,.65)', fontSize: 13 }}>
          {idx + 1} / {items.length}
        </span>

        <div style={{ display: 'flex', alignItems: 'center', gap: '.15rem' }}>

          {/* Download */}
          <button
            onClick={handleDownload}
            disabled={downloading}
            style={iconBtn({ opacity: downloading ? .45 : 1 })}
            title="Tải xuống"
            onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,.15)')}
            onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
          >
            {downloading ? (
              <Spinner />
            ) : (
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6">
                <path d="M10 3v9M6.5 8.5L10 12l3.5-3.5" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M4 14.5h12" strokeLinecap="round"/>
              </svg>
            )}
          </button>

          {/* Share */}
          <button
            onClick={handleShare}
            disabled={shareLoading}
            style={iconBtn({ opacity: shareLoading ? .45 : 1 })}
            title="Chia sẻ (Zalo, Messenger...)"
            onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,.15)')}
            onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
          >
            {shareLoading ? <Spinner /> : shareDone ? (
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="#4ade80" strokeWidth="1.8">
                <path d="M4 10l5 5 7-8" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            ) : (
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6">
                <circle cx="15" cy="4" r="2.2"/>
                <circle cx="15" cy="16" r="2.2"/>
                <circle cx="5" cy="10" r="2.2"/>
                <path d="M7.1 8.9l5.8-3.3M7.1 11.1l5.8 3.3" strokeLinecap="round"/>
              </svg>
            )}
          </button>

          {/* Feedback label */}
          {shareLabel !== '' && (
            <span style={{ fontSize: 11.5, color: shareLabelColor, whiteSpace: 'nowrap', paddingRight: '.25rem' }}>
              {shareLabel}
            </span>
          )}

          {/* Close */}
          <button
            onClick={onClose}
            style={iconBtn({ marginLeft: '.3rem' })}
            title="Đóng (Esc)"
            onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,.15)')}
            onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
          >
            <svg width="22" height="22" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path d="M4 4l10 10M14 4L4 14"/>
            </svg>
          </button>
        </div>
      </div>

      <div className="lb-wrap">
        <button className="lb-nav" style={{ left: '.5rem' }} onClick={() => setIdx(i => (i - 1 + items.length) % items.length)}>
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2"><path d="M10 3L5 8l5 5"/></svg>
        </button>

        <div id="lb-main">
          {isVideo
            ? <video src={cur.url} className="lb-video" controls autoPlay />
            : <img src={cur.url} className="lb-img" alt="" />
          }
        </div>

        <button className="lb-nav" style={{ right: '.5rem' }} onClick={() => setIdx(i => (i + 1) % items.length)}>
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2"><path d="M6 3l5 5-5 5"/></svg>
        </button>
      </div>

      {items.length > 1 && (
        <div className="lb-strip">
          {items.map((it, i) => {
            const isV = it.type === 'video' || /\.(mp4|mov|webm|avi)$/i.test(it.url)
            return (
              <div key={i} className={`lb-th${i === idx ? ' active' : ''}`} onClick={() => setIdx(i)}>
                {isV
                  ? <video src={it.url} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  : <img src={it.url} style={{ width: '100%', height: '100%', objectFit: 'cover' }} alt="" />
                }
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

function Spinner() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="2"
      style={{ animation: 'spin .8s linear infinite' }}>
      <circle cx="9" cy="9" r="7" strokeOpacity=".25"/>
      <path d="M9 2a7 7 0 0 1 7 7" strokeLinecap="round"/>
      <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
    </svg>
  )
}
