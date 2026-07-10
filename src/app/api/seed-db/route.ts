import { NextRequest, NextResponse } from 'next/server'
import fs from 'fs'
import path from 'path'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  // Try multiple paths where the seed DB might be
  const possiblePaths = [
    path.join(process.cwd(), 'public', 'hms-seed.db'),
    path.join(process.cwd(), '.next', 'static', 'hms-seed.db'),
    '/tmp/hms-seed.db',
  ]
  
  for (const dbPath of possiblePaths) {
    try {
      if (fs.existsSync(dbPath)) {
        const buffer = fs.readFileSync(dbPath)
        return new NextResponse(buffer, {
          headers: {
            'Content-Type': 'application/octet-stream',
            'Content-Disposition': 'attachment; filename="hms-seed.db"',
            'Content-Length': buffer.length.toString(),
            'Cache-Control': 'no-cache, no-store, must-revalidate',
          },
        })
      }
    } catch {}
  }
  
  return new NextResponse('Seed DB not found', { status: 404 })
}
