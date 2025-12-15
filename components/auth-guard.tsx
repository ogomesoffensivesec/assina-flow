"use client"

import { useEffect, useState } from 'react'
import { useAuth, useUser } from '@clerk/nextjs'
import { useRouter, usePathname, useSearchParams } from 'next/navigation'

export function AuthGuard({ 
  children, 
  requireAuth = true 
}: { 
  children: React.ReactNode
  requireAuth?: boolean 
}) {
  const { isLoaded: authLoaded, isSignedIn } = useAuth()
  const { isLoaded: userLoaded } = useUser()
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const [isReady, setIsReady] = useState(false)

  useEffect(() => {
    if (!authLoaded || !userLoaded) return

    if (!requireAuth) {
      setIsReady(true)
      return
    }

    if (!isSignedIn) {
      const currentUrl = pathname + (searchParams.toString() ? '?' + searchParams.toString() : '')
      const loginUrl = `/auth/login?redirect=${encodeURIComponent(currentUrl)}`
      router.push(loginUrl)
      return
    }

    setIsReady(true)
  }, [authLoaded, userLoaded, isSignedIn, requireAuth, pathname, searchParams, router])

  if (!authLoaded || !userLoaded || !isReady) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="text-center">
          <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-current border-r-transparent align-[-0.125em] motion-reduce:animate-[spin_1.5s_linear_infinite]" />
          <p className="mt-4 text-sm text-muted-foreground">Carregando...</p>
        </div>
      </div>
    )
  }

  if (requireAuth && !isSignedIn) {
    return null
  }

  return <>{children}</>
}

