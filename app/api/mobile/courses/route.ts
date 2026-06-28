// app/api/mobile/courses/route.ts
import { NextRequest } from 'next/server'
import { connectToDatabase } from '@/lib/mongodb'
import Course from '@/lib/models/Course'
import { mobileResponse, mobileError } from '@/lib/mobile-auth'
import "@/lib/loadmodels"

export async function GET(request: NextRequest) {
  try {
    await connectToDatabase()
    
    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '12')
    const search = searchParams.get('search') || ''
    const category = searchParams.get('category') || ''
    
    const query: any = { isPublished: true }
    
    if (search) {
      query.$or = [
        { title: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } },
        { category: { $regex: search, $options: 'i' } }
      ]
    }
    
    if (category) {
      query.category = category
    }
    
    const courses = await Course.find(query)
      .populate('instructor', 'username firstName lastName avatar')
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean()
    
    const total = await Course.countDocuments(query)
    
    return mobileResponse({
      courses: courses.map((c: any) => ({
        ...c,
        _id: c._id.toString(),
        instructor: c.instructor ? {
          ...c.instructor,
          _id: (c.instructor as any)._id.toString()
        } : null
      })),
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    })
  } catch (error: any) {
    console.error('Mobile courses error:', error)
    return mobileError('Failed to fetch courses: ' + error.message, 500)
  }
}