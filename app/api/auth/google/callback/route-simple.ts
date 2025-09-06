import { NextRequest, NextResponse } from 'next/server'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    console.log('Google OAuth callback - simple test')
    
    const searchParams = request.nextUrl.searchParams
    const code = searchParams.get('code')
    const error = searchParams.get('error')
    
    // If there's an OAuth error from Google
    if (error) {
      console.error('Google OAuth error:', error)
      return NextResponse.redirect(`${getBaseUrl()}/login?error=${encodeURIComponent(`Google OAuth error: ${error}`)}`)
    }
    
    // If no code, something went wrong
    if (!code) {
      console.error('No authorization code received')
      return NextResponse.redirect(`${getBaseUrl()}/login?error=No authorization code received`)
    }
    
    // For now, just redirect to dashboard to test basic flow
    console.log('OAuth callback successful, redirecting to dashboard')
    return NextResponse.redirect(`${getBaseUrl()}/dashboard?oauth=test`)
    
  } catch (error) {
    console.error('Callback error:', error)
    return NextResponse.redirect(`${getBaseUrl()}/login?error=Callback failed`)
  }
}

function getBaseUrl(): string {
  return process.env.NEXTAUTH_URL || 'https://cmdv70i9g05dkmp0fdmyvsnl4-app.server.ideavo.ai'
}