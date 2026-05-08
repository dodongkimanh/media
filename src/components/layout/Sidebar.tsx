'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { Category } from '@/lib/types'
import { useAuth } from '@/hooks/useAuth'

interface SidebarProps {
  open: boolean
  onClose: () => void
}

const navItems = [
  {
    id: 'chat', label: 'Chat nội bộ', href: '/',
    icon: <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M1 3a1 1 0 0 1 1-1h12a1 1 0 0 1 1 1v7a1 1 0 0 1-1 1H9l-3 2v-2H2a1 1 0 0 1-1-1V3z"/></svg>
  },
  {
    id: 'knowledge', label: 'Kiến thức', href: '/knowledge',
    icon: <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5"><rect x="2" y="2" width="12" height="12" rx="1"/><path d="M5 6h6M5 9h4"/></svg>
  },
  {
    id: 'quiz', label: 'Bài kiểm tra', href: '/quiz',
    icon: <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5"><circle cx="8" cy="8" r="6"/><path d="M8 6v3M8 11v.5"/></svg>
  },
  {
    id: 'media', label: 'Ảnh Video Tư Liệu', href: '/media',
    icon: <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5"><rect x="1" y="3" width="14" height="10" rx="1.5"/><path d="M1 10l3.5-3.5 3 3 2-2 4 4"/><circle cx="11.5" cy="6.5" r="1.2" fill="currentColor" stroke="none"/></svg>
  },
]

export function Sidebar({ open, onClose }: SidebarProps) {
  const pathname = usePathname()
  const { isAdmin } = useAuth()
  const [categories, setCategories] = useState<Category[]>([])
  const [isMobile, setIsMobile] = useState(false)

  useEffect(() => {
    function check() { setIsMobile(window.innerWidth <= 680) }
    check()
    window.addEventListener('resize', check)
    return () => window.removeEventListener('resize', check)
  }, [])

  useEffect(() => {
    const supabase = createClient()
    supabase.from('categories').select('*, products(id)').order('sort_order').then(({ data }) => {
      setCategories(data ?? [])
    })
  }, [])

  return (
    <>
      {/* Overlay mobile */}
      {open && (
        <div
          className="sidebar-overlay open"
          style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,.35)', zIndex: 14 }}
          onClick={onClose}
        />
      )}

      <div style={{
        width: 253, background: 'var(--sf)', borderRight: '1px solid var(--bd)',
        display: 'flex', flexDirection: 'column', flexShrink: 0,
        transition: 'transform .25s', zIndex: 15,
        ...(isMobile
          ? { position: 'absolute', top: 0, bottom: 0, left: 0, transform: open ? 'translateX(0)' : 'translateX(-100%)' }
          : {})
      }} id="sidebar">

        {/* Fixed nav items */}
        <div style={{ padding: '.7rem .65rem .45rem', borderBottom: '1px solid var(--bd)', flexShrink: 0 }}>
          {navItems.map(item => {
            const active = item.href === '/' ? pathname === '/' : pathname.startsWith(item.href)
            return (
              <Link key={item.id} href={item.href} onClick={onClose}
                style={{
                  display: 'flex', alignItems: 'center', gap: '.5rem',
                  padding: '.52rem .65rem', borderRadius: 8, cursor: 'pointer',
                  color: active ? 'var(--gd)' : 'var(--mu)',
                  fontWeight: active ? 700 : 600, fontSize: 13,
                  background: active ? 'var(--gl)' : 'transparent',
                  textDecoration: 'none', transition: 'all .15s',
                  marginBottom: '.12rem', border: 'none'
                }}
              >
                <span style={{ width: 15, height: 15, flexShrink: 0 }}>{item.icon}</span>
                {item.label}
              </Link>
            )
          })}

          {isAdmin && (
            <Link href="/staff" onClick={onClose}
              style={{
                display: 'flex', alignItems: 'center', gap: '.5rem',
                padding: '.52rem .65rem', borderRadius: 8, cursor: 'pointer',
                color: pathname === '/staff' ? 'var(--gd)' : 'var(--mu)',
                fontWeight: pathname === '/staff' ? 700 : 600, fontSize: 13,
                background: pathname === '/staff' ? 'var(--gl)' : 'transparent',
                textDecoration: 'none', transition: 'all .15s', border: 'none'
              }}
            >
              <span style={{ width: 15, height: 15, flexShrink: 0 }}>
                <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <circle cx="6" cy="5" r="3"/><path d="M1 13c0-3 2-4 5-4s5 1 5 4"/>
                  <path d="M11 7c1.5 0 3 .5 3 3"/>
                </svg>
              </span>
              Nhân viên
            </Link>
          )}
        </div>

        {/* Scrollable: categories */}
        <div style={{ overflowY: 'auto', flex: 1, padding: '.45rem .55rem .75rem' }}>
          <div style={{ fontSize: 9.5, fontWeight: 700, color: 'var(--mu)', textTransform: 'uppercase', letterSpacing: '.8px', padding: '.55rem .6rem .2rem' }}>
            Danh mục sản phẩm
          </div>

          {categories.map(cat => {
            const active = pathname === `/products/${cat.id}`
            return (
              <Link key={cat.id} href={`/products/${cat.id}`} onClick={onClose}
                style={{
                  display: 'flex', alignItems: 'center', gap: '.5rem',
                  padding: '.52rem .65rem', borderRadius: 8, cursor: 'pointer',
                  color: active ? '#fff' : 'var(--tx)',
                  fontWeight: active ? 700 : 500, fontSize: 13,
                  background: active ? 'var(--green)' : 'transparent',
                  textDecoration: 'none', transition: 'all .15s',
                  marginBottom: '.12rem', border: 'none'
                }}
              >
                <svg style={{ width: 13, height: 13, flexShrink: 0 }} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <rect x="2" y="2" width="5" height="5" rx="1"/><rect x="9" y="2" width="5" height="5" rx="1"/>
                  <rect x="2" y="9" width="5" height="5" rx="1"/><rect x="9" y="9" width="5" height="5" rx="1"/>
                </svg>
                <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{cat.name}</span>
                {(() => { const count = (cat as any).products?.length ?? 0; return (
                  <span style={{ flexShrink: 0, minWidth: 20, height: 18, padding: '0 5px', borderRadius: 9, background: active ? 'rgba(255,255,255,.25)' : count > 0 ? 'var(--green)' : 'var(--bg)', color: active ? '#fff' : count > 0 ? '#fff' : 'var(--mu)', fontSize: 11, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    {count}
                  </span>
                )})()}
              </Link>
            )
          })}

          <div style={{ marginTop: '.5rem', display: 'flex', flexDirection: 'column', gap: '.4rem' }}>
            {isAdmin && (
              <Link href="/products/new" onClick={onClose}
                className="btn btn-primary btn-sm btn-full"
                style={{ justifyContent: 'center', textDecoration: 'none' }}
              >
                <svg width="12" height="12" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="2"><path d="M7 2v10M2 7h10"/></svg>
                Thêm sản phẩm
              </Link>
            )}
            {isAdmin && (
              <Link href="/categories" onClick={onClose}
                className="btn btn-secondary btn-sm btn-full"
                style={{ justifyContent: 'center', textDecoration: 'none' }}
              >
                <svg width="12" height="12" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="2"><path d="M7 2v10M2 7h10"/></svg>
                Quản lý danh mục
              </Link>
            )}
          </div>
        </div>
      </div>
    </>
  )
}
