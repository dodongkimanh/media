'use client'

import { useState } from 'react'
import { Topbar } from './Topbar'
import { Sidebar } from './Sidebar'
import { Toast } from '@/components/ui/Toast'
import { useToast } from '@/hooks/useToast'

interface DashboardLayoutProps {
  children: React.ReactNode
}

export function DashboardLayout({ children }: DashboardLayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const { toast, clear } = useToast()

  return (
    <div style={{ display: 'flex', height: '100vh', flexDirection: 'column', overflow: 'hidden' }}>
      <Topbar onMenuToggle={() => setSidebarOpen(v => !v)} />
      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
        <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />
        <main style={{ flex: 1, overflowY: 'auto', WebkitOverflowScrolling: 'touch' } as React.CSSProperties}>
          {children}
        </main>
      </div>
      {toast && <Toast message={toast.msg} type={toast.type} onClose={clear} />}
    </div>
  )
}
