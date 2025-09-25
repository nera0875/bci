import { NextRequest, NextResponse } from 'next/server'
import { promises as fs } from 'fs'
import path from 'path'

export async function GET(request: NextRequest) {
  try {
    // Check environment variables status
    const status = {
      anthropic: !!process.env.ANTHROPIC_API_KEY,
      openai: !!process.env.OPENAI_API_KEY,
      supabase: !!(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY)
    }

    // Try to read current .env.local content
    let envContent = ''
    try {
      const envPath = path.join(process.cwd(), '.env.local')
      envContent = await fs.readFile(envPath, 'utf-8')
    } catch {
      // File doesn't exist, that's ok
      envContent = ''
    }

    return NextResponse.json({
      success: true,
      status,
      envContent,
      message: 'Environment variables checked'
    })
  } catch (error) {
    console.error('Env check error:', error)
    return NextResponse.json(
      { error: 'Failed to check environment variables' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const { envContent } = await request.json()
    
    if (typeof envContent !== 'string') {
      return NextResponse.json(
        { error: 'Invalid env content' },
        { status: 400 }
      )
    }

    // Write to .env.local
    const envPath = path.join(process.cwd(), '.env.local')
    await fs.writeFile(envPath, envContent, 'utf-8')

    return NextResponse.json({
      success: true,
      message: '.env.local updated successfully. Please restart the server for changes to take effect.'
    })
  } catch (error) {
    console.error('Env write error:', error)
    return NextResponse.json(
      { error: 'Failed to write .env.local file' },
      { status: 500 }
    )
  }
}
