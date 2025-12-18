import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { connectToDatabase } from '@/lib/mongodb';
import Product from '@/lib/models/Product';

// GET all products (public)
export async function GET(request: NextRequest) {
  try {
    await connectToDatabase();
    
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '12');
    const skip = (page - 1) * limit;
    
    const category = searchParams.get('category');
    const designer = searchParams.get('designer');
    const search = searchParams.get('search');
    const minPrice = searchParams.get('minPrice');
    const maxPrice = searchParams.get('maxPrice');
    const sort = searchParams.get('sort') || '-createdAt';
    
    const query: any = { isActive: true };
    
    if (category) query.category = category;
    if (designer) query['designer.clerkId'] = designer;
    if (minPrice) query.price = { ...query.price, $gte: parseFloat(minPrice) };
    if (maxPrice) query.price = { ...query.price, $lte: parseFloat(maxPrice) };
    
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } },
        { tags: { $regex: search, $options: 'i' } },
        { 'designer.username': { $regex: search, $options: 'i' } },
      ];
    }
    
    const sortOptions: any = {};
    switch (sort) {
      case 'price_asc': sortOptions.price = 1; break;
      case 'price_desc': sortOptions.price = -1; break;
      case 'rating': sortOptions.rating = -1; break;
      case 'newest': sortOptions.createdAt = -1; break;
      case 'oldest': sortOptions.createdAt = 1; break;
      default: sortOptions.createdAt = -1;
    }
    
    const [products, total] = await Promise.all([
      Product.find(query)
        .sort(sortOptions)
        .skip(skip)
        .limit(limit)
        .lean(),
      Product.countDocuments(query),
    ]);
    
    return NextResponse.json({
      products,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error('GET products error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// POST create product (admin only)
export async function POST(request: NextRequest) {
  try {
    await connectToDatabase();
    
    const { userId } = await auth();
    
    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }
    
    const body = await request.json();
    
    const product = new Product({
      ...body,
      designer: {
        clerkId: userId,
        username: body.designer?.username || 'Admin',
        avatar: body.designer?.avatar || '/avatars/default.png',
      },
    });
    
    await product.save();
    
    return NextResponse.json(product, { status: 201 });
  } catch (error: any) {
    console.error('POST product error:', error);
    
    if (error.name === 'ValidationError') {
      return NextResponse.json(
        { error: 'Validation failed', details: error.errors },
        { status: 400 }
      );
    }
    
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}