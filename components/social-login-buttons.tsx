"use client"

import { useState } from 'react'
import { Button } from './ui/button'
import { Icons } from './ui/icons'
import { useToast } from '@/hooks/use-toast'

interface SocialLoginButtonsProps {
  isSignUp?: boolean
  isTrial?: boolean
  onSuccess?: () => void
  disabled?: boolean
}

export function SocialLoginButtons({ 
  isSignUp = false, 
  isTrial = false, 
  onSuccess, 
  disabled = false 
}: SocialLoginButtonsProps) {
  const [loadingProvider, setLoadingProvider] = useState<string | null>(null)
  const { toast } = useToast()

  const handleSocialLogin = async (provider: 'google' | 'microsoft' | 'apple') => {
    if (disabled) return
    
    setLoadingProvider(provider)
    
    try {
      // Get the appropriate base URL
      const baseUrl = window.location.origin
      
      // Add context parameters for different flows
      const params = new URLSearchParams({
        ...(isSignUp && { signup: 'true' }),
        ...(isTrial && { trial: 'true' }),
        returnTo: window.location.pathname,
      })
      
      // Redirect to the OAuth endpoint
      const authUrl = `${baseUrl}/api/auth/${provider}?${params.toString()}`
      window.location.href = authUrl
      
    } catch (error) {
      console.error(`${provider} authentication error:`, error)
      toast({
        title: "Authentication Error",
        description: `Failed to authenticate with ${provider}. Please try again.`,
        variant: "destructive",
      })
      setLoadingProvider(null)
    }
  }

  const getButtonText = (provider: string) => {
    if (isTrial) {
      return `Start Free Trial with ${provider}`
    }
    return isSignUp ? `Sign up with ${provider}` : `Sign in with ${provider}`
  }

  return (
    <div className="space-y-3">
      {/* Google Sign In */}
      <Button
        variant="outline"
        className="w-full h-11 text-sm font-medium"
        onClick={() => handleSocialLogin('google')}
        disabled={disabled || loadingProvider !== null}
      >
        {loadingProvider === 'google' ? (
          <Icons.spinner className="mr-2 h-4 w-4 animate-spin" />
        ) : (
          <Icons.google className="mr-2 h-4 w-4" />
        )}
        {getButtonText('Google')}
      </Button>

      {/* Microsoft/Outlook Sign In */}
      <Button
        variant="outline"
        className="w-full h-11 text-sm font-medium"
        onClick={() => handleSocialLogin('microsoft')}
        disabled={disabled || loadingProvider !== null}
      >
        {loadingProvider === 'microsoft' ? (
          <Icons.spinner className="mr-2 h-4 w-4 animate-spin" />
        ) : (
          <Icons.microsoft className="mr-2 h-4 w-4" />
        )}
        {getButtonText('Outlook')}
      </Button>

      {/* Apple Sign In */}
      <Button
        variant="outline"
        className="w-full h-11 text-sm font-medium bg-black text-white hover:bg-gray-800 border-black"
        onClick={() => handleSocialLogin('apple')}
        disabled={disabled || loadingProvider !== null}
      >
        {loadingProvider === 'apple' ? (
          <Icons.spinner className="mr-2 h-4 w-4 animate-spin" />
        ) : (
          <Icons.apple className="mr-2 h-4 w-4" />
        )}
        {getButtonText('Apple')}
      </Button>
    </div>
  )
}

// Compact version for inline usage
export function SocialLoginCompact({ 
  onSuccess, 
  disabled = false 
}: Pick<SocialLoginButtonsProps, 'onSuccess' | 'disabled'>) {
  const [loadingProvider, setLoadingProvider] = useState<string | null>(null)
  const { toast } = useToast()

  const handleSocialLogin = async (provider: 'google' | 'microsoft' | 'apple') => {
    if (disabled) return
    
    setLoadingProvider(provider)
    
    try {
      const baseUrl = window.location.origin
      const params = new URLSearchParams({
        returnTo: window.location.pathname,
      })
      
      const authUrl = `${baseUrl}/api/auth/${provider}?${params.toString()}`
      window.location.href = authUrl
      
    } catch (error) {
      console.error(`${provider} authentication error:`, error)
      toast({
        title: "Authentication Error",
        description: `Failed to authenticate with ${provider}. Please try again.`,
        variant: "destructive",
      })
      setLoadingProvider(null)
    }
  }

  return (
    <div className="flex space-x-3">
      <Button
        variant="outline"
        size="icon"
        className="h-10 w-10"
        onClick={() => handleSocialLogin('google')}
        disabled={disabled || loadingProvider !== null}
      >
        {loadingProvider === 'google' ? (
          <Icons.spinner className="h-4 w-4 animate-spin" />
        ) : (
          <Icons.google className="h-4 w-4" />
        )}
      </Button>

      <Button
        variant="outline"
        size="icon"
        className="h-10 w-10"
        onClick={() => handleSocialLogin('microsoft')}
        disabled={disabled || loadingProvider !== null}
      >
        {loadingProvider === 'microsoft' ? (
          <Icons.spinner className="h-4 w-4 animate-spin" />
        ) : (
          <Icons.microsoft className="h-4 w-4" />
        )}
      </Button>

      <Button
        variant="outline"
        size="icon"
        className="h-10 w-10 bg-black text-white hover:bg-gray-800 border-black"
        onClick={() => handleSocialLogin('apple')}
        disabled={disabled || loadingProvider !== null}
      >
        {loadingProvider === 'apple' ? (
          <Icons.spinner className="h-4 w-4 animate-spin" />
        ) : (
          <Icons.apple className="h-4 w-4" />
        )}
      </Button>
    </div>
  )
}