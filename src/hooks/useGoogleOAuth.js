import { useState, useCallback } from 'react'
import { useAuth } from '../context/AuthContext'

/**
 * Hook for connecting/disconnecting individual Google services via OAuth.
 * Uses google.accounts.oauth2.initTokenClient for dynamic per-scope OAuth.
 *
 * Usage:
 *   const { connect, disconnect, connecting } = useGoogleOAuth()
 *   connect('google-drive', 'https://www.googleapis.com/auth/drive')
 *   disconnect('google-drive')
 */
export function useGoogleOAuth() {
  const { token } = useAuth()
  const [connecting, setConnecting] = useState(null) // provider id being connected

  const connect = useCallback((provider, scope) => {
    return new Promise((resolve, reject) => {
      if (!window.google?.accounts?.oauth2) {
        reject(new Error('Google OAuth SDK not loaded'))
        return
      }

      setConnecting(provider)

      const client = window.google.accounts.oauth2.initTokenClient({
        client_id: import.meta.env.VITE_GOOGLE_CLIENT_ID || '',
        scope: scope,
        callback: async (tokenResponse) => {
          if (tokenResponse.error) {
            setConnecting(null)
            reject(new Error(tokenResponse.error))
            return
          }

          try {
            const res = await fetch('/api/integrations/google', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${token}`,
              },
              body: JSON.stringify({
                access_token: tokenResponse.access_token,
                provider,
                scope,
              }),
            })

            if (!res.ok) {
              throw new Error('Failed to save integration')
            }

            setConnecting(null)
            resolve(tokenResponse)
          } catch (err) {
            setConnecting(null)
            reject(err)
          }
        },
        error_callback: (err) => {
          setConnecting(null)
          reject(err)
        },
      })

      client.requestAccessToken()
    })
  }, [token])

  const disconnect = useCallback(async (provider) => {
    setConnecting(provider)
    try {
      await fetch('/api/integrations/disconnect', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ provider }),
      })
    } finally {
      setConnecting(null)
    }
  }, [token])

  return { connect, disconnect, connecting }
}
