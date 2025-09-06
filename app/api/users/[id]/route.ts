import { NextRequest, NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    
    const user = await prisma.user.findUnique({
      where: { id: id },
    })

    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      )
    }

    return NextResponse.json(user)
  } catch (error) {
    console.error('Error fetching user:', error)
    return NextResponse.json(
      { error: 'Failed to fetch user' },
      { status: 500 }
    )
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const data = await request.json()
    
    const user = await prisma.user.update({
      where: { id: id },
      data: {
        email: data.email,
        username: data.username,
        displayName: data.displayName,
        country: data.country,
        currency: data.currency,
        workType: data.workType,
        customWorkType: data.customWorkType,
        firstName: data.firstName,
        lastName: data.lastName,
        businessName: data.businessName,
        businessRegNumber: data.businessRegNumber,
        phone: data.phone,
        address: data.address,
        city: data.city,
        state: data.state,
        zipCode: data.zipCode,
        postalCode: data.postalCode,
        website: data.website,
        dateFormat: data.dateFormat,
        logoUrl: data.logoUrl,
      },
    })

    return NextResponse.json(user)
  } catch (error) {
    console.error('Error updating user:', error)
    return NextResponse.json(
      { error: 'Failed to update user' },
      { status: 500 }
    )
  }
}