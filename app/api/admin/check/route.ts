import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/utils/role-check';

export async function GET(request: NextRequest) {
  try {
    // This will throw an error if user is not admin
    await requireAdmin();
    
    // If we get here, user is admin
    return NextResponse.json({ 
      isAdmin: true 
    }, { status: 200 });
    
  } catch (error: any) {
    return NextResponse.json(
      { error: 'Admin access required' }, 
      { status: 401 }
    );
  }
}