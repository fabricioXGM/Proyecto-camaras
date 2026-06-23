import { useState, useCallback } from 'react'

export function useNotification() {
  const [notification, setNotification] = useState(null)

  const notify = useCallback((message, type = 'success') => {
    setNotification({ message, type })
    setTimeout(() => setNotification(null), 3000)
  }, [])

  return { notification, notify }
}
