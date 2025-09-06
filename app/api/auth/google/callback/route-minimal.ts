import { NextRequest, NextResponse } from 'next/server'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    console.log('Minimal callback test')
    
    const searchParams = request.nextUrl.searchParams
    const code = searchParams.get('code')
    const error = searchParams.get('error')
    
    console.log('Params:', { code: !!code, error })
    
    if (error) {
      return NextResponse.redirect('https://cmdv70i9g05dkmp0fdmyvsnl4-app.server.ideavo.ai/login?error=' + error)
    }
    
    if (!code) {
      return NextResponse.redirect('https://cmdv70i9g05dkmp0fdmyvsnl4-app.server.ideavo.ai/login?error=no_code')
    }
    
    // Just redirect to dashboard for now
    return NextResponse.redirect('https://cmdv70i9g05dkmp0fdmyvsnl4-app.server.ideavo.ai/dashboard?test=oauth_minimal')
    
  } catch (error) {
    console.error('Minimal callback error:', error)
    return NextResponse.redirect('https://cmdv70i9g05dkmp0fdmyvsnl4-app.server.ideavo.ai/login?error=callback_error')
  }
}