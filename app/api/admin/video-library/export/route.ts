import { NextRequest, NextResponse } from 'next/server'
import { connectToDatabase } from '@/lib/mongodb'
import VideoLibrary from '@/lib/models/VideoLibrary'

export async function GET() {
  try {
    await connectToDatabase()

    const videos = await VideoLibrary.find({})
      .sort({ uploadDate: -1 })
      .limit(1000)
      .lean()

    // Convert to CSV
    const headers = ['Title', 'Description', 'URL', 'Size', 'Duration', 'Categories', 'Tags', 'Usage Count', 'Upload Date']
    
    const rows = videos.map(video => [
      `"${video.title.replace(/"/g, '""')}"`,
      `"${(video.description || '').replace(/"/g, '""')}"`,
      `"${video.video?.url || ''}"`,
      video.formattedSize || '0 B',
      video.formattedDuration || '0:00',
      `"${video.categories?.join(', ') || ''}"`,
      `"${video.tags?.join(', ') || ''}"`,
      video.usageCount || 0,
      new Date(video.uploadDate).toISOString(),
    ])

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.join(','))
    ].join('\n')

    const response = new NextResponse(csvContent)
    response.headers.set('Content-Type', 'text/csv')
    response.headers.set('Content-Disposition', `attachment; filename="video-library-${new Date().toISOString().split('T')[0]}.csv"`)
    
    return response
  } catch (error) {
    console.error('❌ Export error:', error)
    return NextResponse.json(
      { error: 'Failed to export videos' },
      { status: 500 }
    )
  }
}