import { NextRequest, NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'
import { createClient } from '@supabase/supabase-js'

const prisma = new PrismaClient()

export async function GET(request: NextRequest) {
  try {
    // Get user from Supabase auth
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )

    const authHeader = request.headers.get('authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const token = authHeader.split(' ')[1]
    const { data: { user }, error } = await supabase.auth.getUser(token)

    if (error || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const customers = await prisma.customer.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: 'desc' },
    })

    return NextResponse.json(customers)
  } catch (error) {
    console.error('Error fetching customers:', error)
    return NextResponse.json(
      { error: 'Failed to fetch customers' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    // Get user from Supabase auth
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )

    const authHeader = request.headers.get('authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      console.error('Missing or invalid authorization header')
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const token = authHeader.split(' ')[1]
    const { data: { user }, error } = await supabase.auth.getUser(token)

    if (error || !user) {
      console.error('Supabase auth error:', error)
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const data = await request.json()
    console.log('Customer creation data:', data)

    // Validate required fields
    console.log('Raw displayName value:', JSON.stringify(data.displayName))
    console.log('DisplayName type:', typeof data.displayName)
    console.log('DisplayName length:', data.displayName?.length)
    
    if (!data.displayName || data.displayName.trim() === '') {
      console.error('Missing required field: displayName')
      return NextResponse.json({ 
        error: 'Display name is required',
        debug: {
          received: data.displayName,
          type: typeof data.displayName,
          length: data.displayName?.length,
          trimmed: data.displayName?.trim()
        }
      }, { status: 400 })
    }
    
    // Ensure displayName is at least 1 character after trimming
    const trimmedDisplayName = data.displayName.trim()
    if (trimmedDisplayName.length === 0) {
      console.error('DisplayName is empty after trimming')
      return NextResponse.json({ error: 'Display name cannot be empty' }, { status: 400 })
    }

    const customerData = {
      userId: user.id,
      displayName: trimmedDisplayName, // Use the validated trimmed name
      firstName: data.firstName?.trim() || null,
      lastName: data.lastName?.trim() || null,
      businessName: data.businessName?.trim() || null,
      email: data.email?.trim() || null,
      phone: data.phone?.trim() || null,
      address: data.address?.trim() || null,
      city: data.city?.trim() || null,
      state: data.state?.trim() || null,
      zipCode: data.zipCode?.trim() || null,
      country: data.country?.trim() || null,
      businessRegNumber: data.businessRegNumber?.trim() || null,
    }
    
    console.log('Creating customer with data:', JSON.stringify(customerData, null, 2))
    
    const customer = await prisma.customer.create({
      data: customerData,
    })

    console.log('Customer created successfully:', customer.id)
    return NextResponse.json(customer)
  } catch (error) {
    console.error('Error creating customer - detailed:', error)
    
    // Check if it's a Prisma error
    if (error instanceof Error) {
      console.error('Error message:', error.message)
      console.error('Error stack:', error.stack)
    }
    
    return NextResponse.json(
      { error: 'Failed to create customer', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}