'use client'

import { useState, useCallback } from 'react'

export function useToast() {
  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null)

  const show = useCallback((msg: string, type: 'success' | 'error' = 'success') => {
    setToast({ msg, type })
  }, [])

  const clear = useCallback(() => setToast(null), [])

  return { toast, show, clear }
}
