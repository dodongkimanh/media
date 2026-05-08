'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')
    const supabase = createClient()
    // Sign out any existing session to prevent session mixing between users
    await supabase.auth.signOut().catch(() => {})
    const { error: err } = await supabase.auth.signInWithPassword({ email, password })
    if (err) {
      setError('Email hoặc mật khẩu không đúng.')
      setLoading(false)
      return
    }
    router.push('/')
    router.refresh()
  }

  return (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      minHeight: '100vh', padding: '1rem',
      background: 'linear-gradient(135deg,#E1F5EE 0%,#F2F6F4 55%)'
    }}>
      <div style={{
        background: 'var(--sf)', border: '1px solid var(--bd)', borderRadius: 20,
        padding: '2.2rem 1.75rem', width: '100%', maxWidth: 390,
        boxShadow: '0 4px 28px rgba(29,158,117,.09)'
      }}>
        <div style={{ fontFamily: "'Playfair Display', serif", fontSize: 28, color: 'var(--gd)', marginBottom: '.2rem' }}>
          KIMANH
        </div>
        <div style={{ fontSize: 12.5, color: 'var(--mu)', marginBottom: '1.8rem' }}>
          Quản lý sản phẩm &amp; đào tạo nhân viên
        </div>

        {error && (
          <div style={{
            background: '#FEF0F0', color: 'var(--red)', borderRadius: 8,
            padding: '.55rem .85rem', fontSize: 12.5, marginBottom: '.9rem'
          }}>
            {error}
          </div>
        )}

        <form onSubmit={handleLogin}>
          <div className="fg">
            <label>Email</label>
            <input
              type="email" value={email} autoComplete="email"
              onChange={e => setEmail(e.target.value)} required
            />
          </div>
          <div className="fg">
            <label>Mật khẩu</label>
            <input
              type="password" value={password} autoComplete="current-password"
              onChange={e => setPassword(e.target.value)} required
              placeholder="••••••"
            />
          </div>
          <button
            type="submit"
            className="btn btn-primary btn-full"
            disabled={loading}
            style={{ marginTop: '.4rem' }}
          >
            {loading ? 'Đang đăng nhập...' : 'Đăng nhập'}
          </button>
        </form>

        <p style={{ fontSize: 11.5, color: 'var(--mu)', textAlign: 'center', marginTop: '.8rem' }}>
          Liên hệ admin để được cấp tài khoản
        </p>
      </div>
    </div>
  )
}
