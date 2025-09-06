import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { 
  generateOAuthState, 
  generateCodeVerifier, 
  generateCodeChallenge,
  buildGoogleAuthUrl,
  getBaseUrl
} from '@/lib/social-auth'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const revalidate = 0
export const fetchCache = 'force-no-store'

export async function GET(request: NextRequest) {
  try {
    // Check if Google OAuth is configured
    if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET) {
      return NextResponse.json(
        { error: 'Google OAuth not configured. Please set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET environment variables.' },
        { status: 500 }
      )
    }

    const searchParams = request.nextUrl.searchParams
    const isSignUp = searchParams.get('signup') === 'true'
    const isTrial = searchParams.get('trial') === 'true'
    const returnTo = searchParams.get('returnTo') || '/dashboard'

    // Generate OAuth security parameters
    const state = generateOAuthState()
    const codeVerifier = generateCodeVerifier()
    const codeChallenge = generateCodeChallenge(codeVerifier)

    // Build redirect URI
    const baseUrl = getBaseUrl()
    const redirectUri = `${baseUrl}/api/auth/google/callback`

    // Build authorization URL with state in URL (more reliable than cookies)
    const authUrl = buildGoogleAuthUrl(redirectUri, state, codeChallenge)
    
    // Create response with cookies
    const response = NextResponse.redirect(authUrl)
    
    // Set cookies with security flags
    const cookieOptions = {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax' as const,
      maxAge: 10 * 60, // 10 minutes
      path: '/',
    }

    response.cookies.set('google_oauth_state', state, cookieOptions)
    response.cookies.set('google_code_verifier', codeVerifier, cookieOptions)
    response.cookies.set('google_signup_context', JSON.stringify({
      isSignUp,
      isTrial,
      returnTo,
    }), cookieOptions)

    // Return the redirect response with cookies
    return response

  } catch (error) {
    console.error('Google OAuth initiation error:', error)
    return NextResponse.json(
      { error: 'Failed to initiate Google authentication' },
      { status: 500 }
    )
  }
}