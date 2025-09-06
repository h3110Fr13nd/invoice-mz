import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { PrismaClient } from '@prisma/client'
import { supabase } from '@/lib/supabase'
import { 
  exchangeGoogleCode,
  getGoogleUserInfo,
  encryptToken,
  getBaseUrl
} from '@/lib/social-auth'
import { createSimpleOAuthToken } from '@/lib/oauth-session-simple'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const prisma = new PrismaClient()

export async function GET(request: NextRequest) {
  console.log('Google OAuth callback initiated')
  
  try {
    const searchParams = request.nextUrl.searchParams
    const code = searchParams.get('code')
    const state = searchParams.get('state')
    const error = searchParams.get('error')
    
    console.log('OAuth callback params:', { 
      hasCode: !!code, 
      hasState: !!state, 
      error: error 
    })

    // Handle OAuth errors
    if (error) {
      const errorMap: Record<string, string> = {
        'access_denied': 'You denied access to your Google account',
        'invalid_request': 'Invalid OAuth request',
        'unauthorized_client': 'Unauthorized OAuth client',
        'unsupported_response_type': 'Unsupported OAuth response type',
        'invalid_scope': 'Invalid OAuth scope requested',
        'server_error': 'Google OAuth server error',
        'temporarily_unavailable': 'Google OAuth temporarily unavailable'
      }
      
      const errorMessage = errorMap[error] || 'Google authentication failed'
      return NextResponse.redirect(`${getBaseUrl()}/login?error=${encodeURIComponent(errorMessage)}`)
    }

    if (!code || !state) {
      return NextResponse.redirect(`${getBaseUrl()}/login?error=Missing authorization code`)
    }

    // Retrieve and validate stored OAuth state from request cookies
    const storedState = request.cookies.get('google_oauth_state')?.value
    const codeVerifier = request.cookies.get('google_code_verifier')?.value
    const contextCookie = request.cookies.get('google_signup_context')?.value

    if (!storedState || !codeVerifier || storedState !== state) {
      return NextResponse.redirect(`${getBaseUrl()}/login?error=Invalid OAuth state`)
    }

    // Parse signup context
    let context = { isSignUp: false, isTrial: false, returnTo: '/dashboard' }
    try {
      if (contextCookie) {
        context = JSON.parse(contextCookie)
      }
    } catch (e) {
      console.warn('Failed to parse signup context:', e)
    }

    // Exchange authorization code for tokens
    const baseUrl = getBaseUrl()
    const redirectUri = `${baseUrl}/api/auth/google/callback`
    
    const tokenResponse = await exchangeGoogleCode(code, redirectUri, codeVerifier)
    
    if (tokenResponse.error) {
      console.error('Google token exchange error:', tokenResponse.error)
      return NextResponse.redirect(`${getBaseUrl()}/login?error=Failed to exchange authorization code`)
    }

    const { access_token, refresh_token, expires_in } = tokenResponse

    // Get user info from Google
    const userInfo = await getGoogleUserInfo(access_token)
    
    console.log('Retrieved Google user info:', { 
      email: userInfo.email, 
      name: userInfo.name, 
      id: userInfo.id 
    })
    
    if (!userInfo.email) {
      return NextResponse.redirect(`${getBaseUrl()}/login?error=Unable to retrieve email from Google`)
    }

    // Calculate token expiry
    const tokenExpiry = new Date(Date.now() + (expires_in * 1000))

    try {
      console.log('Checking if user exists for email:', userInfo.email)
      
      // Check if user already exists
      const existingUser = await prisma.user.findUnique({
        where: { email: userInfo.email },
        include: { socialAccounts: true }
      })
      
      console.log('User lookup result:', existingUser ? 'found' : 'not found')

      if (existingUser) {
        // Check if Google account is already linked
        const existingGoogleAccount = existingUser.socialAccounts.find(
          account => account.provider === 'GOOGLE'
        )

        if (existingGoogleAccount) {
          // Update existing Google account tokens
          await prisma.socialAccount.update({
            where: { id: existingGoogleAccount.id },
            data: {
              accessToken: encryptToken(access_token),
              refreshToken: refresh_token ? encryptToken(refresh_token) : null,
              tokenExpiry,
              name: userInfo.name,
              avatar: userInfo.picture,
            }
          })
        } else {
          // Link new Google account to existing user
          await prisma.socialAccount.create({
            data: {
              userId: existingUser.id,
              provider: 'GOOGLE',
              providerId: userInfo.id,
              email: userInfo.email,
              name: userInfo.name,
              avatar: userInfo.picture,
              accessToken: encryptToken(access_token),
              refreshToken: refresh_token ? encryptToken(refresh_token) : null,
              tokenExpiry,
            }
          })
        }

        // Create OAuth session for existing user
        const sessionToken = createSimpleOAuthToken(existingUser.id, existingUser.email, 'google')
        
        const response = NextResponse.redirect(`${getBaseUrl()}/dashboard?oauth=success&linked=google`)
        
        // Set session cookie
        response.cookies.set('oauth_session', sessionToken, {
          httpOnly: true,
          secure: process.env.NODE_ENV === 'production',
          sameSite: 'lax',
          maxAge: 24 * 60 * 60, // 24 hours
          path: '/',
        })
        
        // Clear OAuth cookies
        response.cookies.delete('google_oauth_state')
        response.cookies.delete('google_code_verifier') 
        response.cookies.delete('google_signup_context')
        
        return response
      }

      // Create new user account
      if (context.isSignUp || context.isTrial) {
        // Generate username from email
        const username = userInfo.email.split('@')[0].replace(/[^a-zA-Z0-9]/g, '') + 
                        Math.random().toString(36).substring(2, 6)

        // Create Supabase user
        const { data: authData, error: authError } = await supabase.auth.admin.createUser({
          email: userInfo.email,
          email_confirm: true,
          user_metadata: {
            name: userInfo.name,
            avatar_url: userInfo.picture,
          }
        })

        if (authError || !authData.user) {
          console.error('Supabase user creation error:', authError)
          return NextResponse.redirect(`${getBaseUrl()}/login?error=Failed to create user account`)
        }

        // Create user profile
        const newUser = await prisma.user.create({
          data: {
            id: authData.user.id,
            email: userInfo.email,
            username,
            country: 'US', // Default, can be updated later
            currency: 'USD', // Default, can be updated later
            displayName: userInfo.name,
            socialAccounts: {
              create: {
                provider: 'GOOGLE',
                providerId: userInfo.id,
                email: userInfo.email,
                name: userInfo.name,
                avatar: userInfo.picture,
                accessToken: encryptToken(access_token),
                refreshToken: refresh_token ? encryptToken(refresh_token) : null,
                tokenExpiry,
              }
            }
          }
        })

        // Send welcome email if configured
        try {
          await fetch(`${baseUrl}/api/email/confirmation`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              email: userInfo.email,
              displayName: userInfo.name || username,
              appName: 'Invoice Easy',
            }),
          })
        } catch (emailError) {
          console.warn('Failed to send welcome email:', emailError)
        }

        // Create OAuth session for new user
        const sessionToken = createSimpleOAuthToken(newUser.id, newUser.email, 'google')
        
        // Redirect to onboarding for new user
        const response = NextResponse.redirect(`${getBaseUrl()}/dashboard?welcome=true&oauth=success&provider=google`)
        
        // Set session cookie
        response.cookies.set('oauth_session', sessionToken, {
          httpOnly: true,
          secure: process.env.NODE_ENV === 'production',
          sameSite: 'lax',
          maxAge: 24 * 60 * 60, // 24 hours
          path: '/',
        })
        
        // Clear OAuth cookies
        response.cookies.delete('google_oauth_state')
        response.cookies.delete('google_code_verifier')
        response.cookies.delete('google_signup_context')
        
        return response
      }

      // User doesn't exist and not signing up
      return NextResponse.redirect(`${getBaseUrl()}/signup?prefill=${encodeURIComponent(userInfo.email)}&provider=google`)

    } catch (dbError) {
      console.error('Database error during Google OAuth:', dbError)
      return NextResponse.redirect(`${getBaseUrl()}/login?error=Database error occurred`)
    } finally {
      // Clean up OAuth cookies in the response
      // We'll handle this in the response instead of async cookies
    }

  } catch (error) {
    console.error('Google OAuth callback error:', error)
    
    // Log detailed error information for debugging
    if (error instanceof Error) {
      console.error('Error message:', error.message)
      console.error('Error stack:', error.stack)
    }
    
    return NextResponse.redirect(`${getBaseUrl()}/login?error=${encodeURIComponent('Authentication failed: ' + (error instanceof Error ? error.message : 'Unknown error'))}`)
  } finally {
    await prisma.$disconnect()
  }
}