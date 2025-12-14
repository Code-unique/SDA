import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import Course from '@/lib/models/Course';
import "@/lib/loadmodels";
export async function GET(request: NextRequest) {
  try {
    await connectToDatabase();

    // Get all unique categories from published courses
    const categories = await Course.aggregate([
      { $match: { isPublished: true } },
      { $group: { _id: '$category' } },
      { $sort: { _id: 1 } }
    ]);

    const categoryNames = categories.map(cat => cat._id).filter(Boolean);

    return NextResponse.json({
      success: true,
      data: categoryNames.length > 0 ? categoryNames : [
        'Fashion Design',
        'Pattern Making',
        'Sewing',
        'Textiles',
        'Fashion Business',
        'Sustainability',
        'Digital Fashion',
        '3D Design',
        'Fashion Marketing'
      ]
    });

  } catch (error: any) {
    console.error('Error fetching categories:', error);
    return NextResponse.json({
      success: false,
      data: [
        'Fashion Design',
        'Pattern Making',
        'Sewing',
        'Textiles',
        'Fashion Business',
        'Sustainability',
        'Digital Fashion',
        '3D Design',
        'Fashion Marketing'
      ],
      message: error.message
    });
  }
}