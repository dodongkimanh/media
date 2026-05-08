'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { Profile } from '@/lib/types'

export function useAuth() {
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const supabase = createClient()

    async function load() {
      const { data: { user }, error } = await supabase.auth.getUser()
      if (error || !user) {
        setProfile(null)
        setLoading(false)
        return
      }
      const { data } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single()
      setProfile(data)
      setLoading(false)
    }

    load()

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!session) { setProfile(null); setLoading(false); return }
      load()
    })
    return () => subscription.unsubscribe()
  }, [])

  const isAdmin = profile?.role === 'admin'
  const isLead = profile?.role === 'lead'
  // admin và lead đều có quyền quản lý
  const canManage = isAdmin || isLead

  return { profile, isAdmin, isLead, canManage, loading }
}
