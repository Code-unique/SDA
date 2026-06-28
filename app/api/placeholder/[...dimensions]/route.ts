// app/api/placeholder/[...dimensions]/route.ts
import { NextRequest, NextResponse } from 'next/server';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ dimensions: string[] }> }
) {
  try {
    const { dimensions } = await params;
    const [widthStr, heightStr] = dimensions[0].split('x');
    const width = Math.max(1, Math.min(5000, parseInt(widthStr) || 300));
    const height = Math.max(1, Math.min(5000, parseInt(heightStr) || 200));
    
    const searchParams = new URL(request.url).searchParams;
    let text = searchParams.get('text') || 'Design';
    
    // Sanitize text to prevent XSS
    text = text.replace(/[<>]/g, '').substring(0, 50);
    
    // Return a simple SVG placeholder
    const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
  <rect width="100%" height="100%" fill="#f3f4f6"/>
  <text x="50%" y="50%" font-family="Arial, sans-serif" font-size="${Math.min(width, height) / 10}" fill="#9ca3af" text-anchor="middle" dominant-baseline="middle">${text}</text>
</svg>`;
    
    return new NextResponse(svg, {
      headers: {
        'Content-Type': 'image/svg+xml',
        'Cache-Control': 'public, max-age=31536000, immutable',
      },
    });
  } catch (error) {
    console.error('Error generating placeholder:', error);
    return new NextResponse(
      '<?xml version="1.0" encoding="UTF-8"?><svg width="300" height="200" xmlns="http://www.w3.org/2000/svg"><rect width="100%" height="100%" fill="#f3f4f6"/><text x="50%" y="50%" font-family="Arial" font-size="20" fill="#9ca3af" text-anchor="middle" dominant-baseline="middle">Error</text></svg>',
      {
        headers: {
          'Content-Type': 'image/svg+xml',
        },
      }
    );
  }
}