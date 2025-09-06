import { NextResponse } from 'next/server'
import { getBaseUrl } from '@/lib/social-auth'
import { PrismaClient } from '@prisma/client'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET() {
  const results = {
    environment: process.env.NODE_ENV,
    baseUrl: getBaseUrl(),
    redirectUri: `${getBaseUrl()}/api/auth/google/callback`,
    googleClientId: process.env.GOOGLE_CLIENT_ID?.substring(0, 20) + '...' || 'missing',
    googleClientSecret: process.env.GOOGLE_CLIENT_SECRET ? 'configured' : 'missing',
    oauthEncryptionKey: process.env.OAUTH_ENCRYPTION_KEY ? 'configured' : 'missing',
    databaseTest: 'pending',
    supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL || 'missing',
    supabaseKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? 'configured' : 'missing',
  }

  // Test database connection
  try {
    const prisma = new PrismaClient()
    await prisma.$connect()
    results.databaseTest = 'connected'
    await prisma.$disconnect()
  } catch (error) {
    results.databaseTest = `error: ${error instanceof Error ? error.message : 'unknown'}`
  }

  return NextResponse.json(results, { 
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET',
    }
  })
}