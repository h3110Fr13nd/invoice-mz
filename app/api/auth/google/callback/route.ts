import { NextRequest, NextResponse } from 'next/server'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const revalidate = 0
export const fetchCache = 'force-no-store'

function getBaseUrl(): string {
  return process.env.NEXTAUTH_URL || 'https://cmdv70i9g05dkmp0fdmyvsnl4-app.server.ideavo.ai'
}

export async function GET(request: NextRequest) {
  try {
    const version = `v2.0-${Date.now()}`
    console.log(`Google OAuth callback - safe version ${version}`)
    
    const searchParams = request.nextUrl.searchParams
    const code = searchParams.get('code')
    const state = searchParams.get('state')
    const error = searchParams.get('error')
    
    console.log('OAuth params:', { 
      hasCode: !!code, 
      hasState: !!state, 
      error: error,
      codeLength: code?.length,
      stateLength: state?.length
    })
    
    const baseUrl = getBaseUrl()
    
    // Handle OAuth errors from Google
    if (error) {
      console.error('Google OAuth error:', error)
      return NextResponse.redirect(`${baseUrl}/login?error=${encodeURIComponent(`Google OAuth error: ${error}`)}`)
    }
    
    // Check for required parameters
    if (!code) {
      console.error('No authorization code received')
      return NextResponse.redirect(`${baseUrl}/login?error=${encodeURIComponent('No authorization code received')}`)
    }
    
    if (!state) {
      console.error('No state parameter received')
      return NextResponse.redirect(`${baseUrl}/login?error=${encodeURIComponent('Invalid OAuth state')}`)
    }
    
    // Verify we have the required environment variables
    if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET) {
      console.error('Missing Google OAuth configuration')
      return NextResponse.redirect(`${baseUrl}/login?error=${encodeURIComponent('OAuth configuration error')}`)
    }
    
    // Get stored state from cookies (the simple way)
    const storedState = request.cookies.get('google_oauth_state')?.value
    const codeVerifier = request.cookies.get('google_code_verifier')?.value
    
    console.log('Cookie validation:', {
      hasStoredState: !!storedState,
      hasCodeVerifier: !!codeVerifier,
      stateMatches: storedState === state
    })
    
    if (!storedState || !codeVerifier) {
      console.error('Missing OAuth cookies')
      return NextResponse.redirect(`${baseUrl}/login?error=${encodeURIComponent('OAuth session expired')}`)
    }
    
    if (storedState !== state) {
      console.error('OAuth state mismatch')
      return NextResponse.redirect(`${baseUrl}/login?error=${encodeURIComponent('Invalid OAuth state')}`)
    }
    
    // If we get here, the OAuth flow is valid
    console.log('OAuth validation successful, proceeding with token exchange')
    
    try {
      // Now we need to exchange the code for tokens
      const tokenUrl = 'https://oauth2.googleapis.com/token'
      const redirectUri = `${baseUrl}/api/auth/google/callback`
      
      const tokenResponse = await fetch(tokenUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          client_id: process.env.GOOGLE_CLIENT_ID!,
          client_secret: process.env.GOOGLE_CLIENT_SECRET!,
          code,
          grant_type: 'authorization_code',
          redirect_uri: redirectUri,
          code_verifier: codeVerifier,
        }),
      })
      
      if (!tokenResponse.ok) {
        console.error('Token exchange failed:', tokenResponse.status, tokenResponse.statusText)
        const errorText = await tokenResponse.text()
        console.error('Token error response:', errorText)
        return NextResponse.redirect(`${baseUrl}/login?error=${encodeURIComponent('Failed to exchange authorization code')}`)
      }
      
      const tokenData = await tokenResponse.json()
      
      if (tokenData.error) {
        console.error('Google token error:', tokenData.error)
        return NextResponse.redirect(`${baseUrl}/login?error=${encodeURIComponent('Token exchange error: ' + tokenData.error)}`)
      }
      
      const { access_token } = tokenData
      
      if (!access_token) {
        console.error('No access token received')
        return NextResponse.redirect(`${baseUrl}/login?error=${encodeURIComponent('No access token received')}`)
      }
      
      // Get user info from Google
      const userInfoResponse = await fetch(`https://www.googleapis.com/oauth2/v2/userinfo?access_token=${access_token}`)
      
      if (!userInfoResponse.ok) {
        console.error('Failed to get user info:', userInfoResponse.status)
        return NextResponse.redirect(`${baseUrl}/login?error=${encodeURIComponent('Failed to get user information')}`)
      }
      
      const userInfo = await userInfoResponse.json()
      
      console.log('Google user info received:', { 
        email: userInfo.email, 
        name: userInfo.name,
        id: userInfo.id 
      })
      
      if (!userInfo.email) {
        console.error('No email in user info')
        return NextResponse.redirect(`${baseUrl}/login?error=${encodeURIComponent('Unable to retrieve email from Google')}`)
      }
      
      // For now, just redirect to dashboard with user info
      // TODO: Create/update user in database
      const response = NextResponse.redirect(`${baseUrl}/dashboard?oauth=success&email=${encodeURIComponent(userInfo.email)}&name=${encodeURIComponent(userInfo.name || '')}&version=${version}`)
      
      // Clear OAuth cookies
      response.cookies.delete('google_oauth_state')
      response.cookies.delete('google_code_verifier')
      response.cookies.delete('google_signup_context')
      
      // Add cache-busting headers
      response.headers.set('Cache-Control', 'no-cache, no-store, must-revalidate')
      response.headers.set('Pragma', 'no-cache')
      response.headers.set('Expires', '0')
      
      return response
      
    } catch (fetchError) {
      console.error('Token exchange network error:', fetchError)
      return NextResponse.redirect(`${baseUrl}/login?error=${encodeURIComponent('Network error during authentication')}`)
    }
    
  } catch (error) {
    console.error('OAuth callback error:', error)
    
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    console.error('Error details:', errorMessage)
    
    return NextResponse.redirect(`${getBaseUrl()}/login?error=${encodeURIComponent('Authentication failed: ' + errorMessage)}`)
  }
}