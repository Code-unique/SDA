// app/api/orders/route.ts - ADD PRODUCT VALIDATION FIX
import { NextRequest, NextResponse } from 'next/server';
import { auth, currentUser } from '@clerk/nextjs/server';
import { connectToDatabase } from '@/lib/mongodb';
import Order from '@/lib/models/Order';
import Product from '@/lib/models/Product';
import User from '@/lib/models/User';

// Generate unique order number
function generateOrderNumber() {
  const date = new Date();
  const year = date.getFullYear().toString().slice(-2);
  const month = (date.getMonth() + 1).toString().padStart(2, '0');
  const day = date.getDate().toString().padStart(2, '0');
  const random = Math.random().toString(36).substr(2, 6).toUpperCase();
  return `ORD${year}${month}${day}${random}`;
}

// Helper function to validate product data
function validateProductData(product: any) {
  // Ensure required fields exist with fallbacks
  return {
    _id: product._id || product.productId,
    name: product.name || 'Unnamed Product',
    description: product.description || 'No description available',
    price: product.price || 0,
    originalPrice: product.originalPrice,
    images: Array.isArray(product.images) && product.images.length > 0 
      ? product.images 
      : ['/api/placeholder/400/500'],
    designer: product.designer || {
      clerkId: 'admin_user', // Fallback clerkId
      username: 'Admin',
      avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Admin'
    },
    category: product.category || 'uncategorized',
    rating: product.rating || 0,
    reviews: product.reviews || 0,
    stock: product.stock || 0,
  };
}

// POST create order - FIXED WITH PRODUCT VALIDATION
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
    
    // Get user info from database
    let userEmail = '';
    let userName = '';
    let userPhone = '';
    
    // Fetch user from your database
    const dbUser = await User.findOne({ clerkId: userId });
    
    if (dbUser) {
      // Use database user info
      userEmail = dbUser.email;
      userName = dbUser.firstName && dbUser.lastName 
        ? `${dbUser.firstName} ${dbUser.lastName}`.trim()
        : dbUser.username;
      userPhone = dbUser.phone || '';
    } else {
      // Fallback to Clerk info if user not in database
      const clerkUser = await currentUser();
      
      if (clerkUser) {
        const clerkEmail = clerkUser.emailAddresses[0]?.emailAddress;
        const clerkFirstName = clerkUser.firstName;
        const clerkLastName = clerkUser.lastName;
        
        if (clerkEmail) userEmail = clerkEmail;
        if (clerkFirstName || clerkLastName) {
          userName = `${clerkFirstName || ''} ${clerkLastName || ''}`.trim();
        }
      }
      
      // Log warning if user not found in database
      console.warn(`User ${userId} not found in database. Using Clerk data.`);
    }
    
    // Validate we have required user data
    if (!userEmail) {
      return NextResponse.json(
        { error: 'User email not found. Please complete your profile.' },
        { status: 400 }
      );
    }
    
    if (!userName) {
      userName = 'Customer'; // Fallback
    }
    
    const body = await request.json();
    
    console.log('Order request from user:', { userId, userEmail, userName });
    
    // Validate required fields
    if (!body.shippingAddress || !body.paymentMethod) {
      return NextResponse.json(
        { error: 'Missing required fields: shippingAddress and paymentMethod are required' },
        { status: 400 }
      );
    }

    // Validate items
    if (!body.items || !Array.isArray(body.items) || body.items.length === 0) {
      return NextResponse.json(
        { error: 'No items in order' },
        { status: 400 }
      );
    }

    // Process items to get product details
    const items = [];
    let subtotal = 0;

    for (const item of body.items) {
      const product = await Product.findById(item.productId);
      
      if (!product) {
        return NextResponse.json(
          { error: `Product ${item.productId} not found` },
          { status: 400 }
        );
      }
      
      if (product.stock < item.quantity) {
        return NextResponse.json(
          { error: `Insufficient stock for ${product.name}. Available: ${product.stock}` },
          { status: 400 }
        );
      }
      
      const itemTotal = product.price * item.quantity;
      subtotal += itemTotal;
      
      // Validate and clean product data
      const validatedProduct = validateProductData({
        _id: product._id,
        name: product.name,
        description: product.description,
        price: product.price,
        originalPrice: product.originalPrice,
        images: product.images,
        designer: product.designer,
        category: product.category,
        rating: product.rating,
        reviews: product.reviews,
        stock: product.stock,
      });
      
      items.push({
        productId: validatedProduct._id,
        name: validatedProduct.name,
        price: validatedProduct.price,
        quantity: item.quantity,
        image: validatedProduct.images[0],
        designer: validatedProduct.designer,
      });

      // Update product stock
      product.stock -= item.quantity;
      try {
        await product.save();
      } catch (stockError) {
        console.error('Error updating product stock:', stockError);
        // Continue anyway - don't fail the order over stock update
      }
    }

    // Calculate totals
    const shippingFee = body.shippingFee || 0;
    const tax = body.tax || 0;
    const total = subtotal + shippingFee + tax;

    // Generate order number
    const orderNumber = generateOrderNumber();
    
    // Determine initial status
    let initialStatus: 'pending' | 'processing' = 'processing';
    let paymentVerified = true;
    
    if (body.paymentMethod === 'bank_transfer') {
      initialStatus = 'pending'; // Needs payment verification
      paymentVerified = false;
    } else if (body.paymentMethod === 'cash_on_delivery') {
      initialStatus = 'pending'; // Will be processed after confirmation
      paymentVerified = false;
    }
    
    // Create order with proper user details
    const order = new Order({
      orderNumber,
      user: {
        clerkId: userId,
        email: userEmail,
        name: userName,
        phone: userPhone || body.shippingAddress.phone,
      },
      items,
      shippingAddress: body.shippingAddress,
      subtotal,
      shippingFee,
      tax,
      total,
      paymentMethod: body.paymentMethod,
      status: initialStatus,
      paymentVerified,
    });

    await order.save();

    console.log('Order created successfully:', {
      orderNumber: order.orderNumber,
      user: order.user,
      total: order.total,
      itemsCount: order.items.length
    });

    return NextResponse.json(order, { status: 201 });
  } catch (error: any) {
    console.error('POST order error:', error);
    
    if (error.name === 'ValidationError') {
      console.error('Validation errors:', error.errors);
      const validationErrors = Object.values(error.errors).map((err: any) => ({
        field: err.path,
        message: err.message
      }));
      
      return NextResponse.json(
        { 
          error: 'Validation failed', 
          details: validationErrors 
        },
        { status: 400 }
      );
    }
    
    if (error.code === 11000) {
      return NextResponse.json(
        { error: 'Duplicate order number, please try again' },
        { status: 400 }
      );
    }
    
    return NextResponse.json(
      { error: 'Internal server error', message: error.message },
      { status: 500 }
    );
  }
}