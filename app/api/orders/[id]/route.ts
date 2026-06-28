// app/api/orders/[id]/route.ts - FIXED VERSION
import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { connectToDatabase } from '@/lib/mongodb';
import Order from '@/lib/models/Order';
import Product from '@/lib/models/Product';
import User from '@/lib/models/User';

// GET single order by ID
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await connectToDatabase();
    
    const { userId } = await auth();
    
    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { id } = await params;
    
    console.log('Fetching order:', { id, userId });
    
    // Find the order
    const order = await Order.findOne({
      _id: id,
      'user.clerkId': userId
    });

    if (!order) {
      console.log('Order not found for user:', { id, userId });
      return NextResponse.json(
        { error: 'Order not found' },
        { status: 404 }
      );
    }

    // Process items to include product details
    const populatedItems = await Promise.all(
      order.items.map(async (item: any) => {
        try {
          const product = await Product.findById(item.productId);
          
          if (!product) {
            console.log('Product not found:', item.productId);
            return {
              _id: item.productId?.toString() || 'unknown',
              name: item.name || 'Product not found',
              price: item.price || 0,
              quantity: item.quantity,
              image: item.image || '/api/placeholder/400/500',
              designer: item.designer || {
                username: 'Unknown',
                avatar: '/api/placeholder/100/100'
              }
            };
          }

          // Get designer info if available
          let designerInfo = item.designer;
          if (product.designer) {
            try {
              const designerUser = await User.findOne({ clerkId: product.designer.clerkId });
              if (designerUser) {
                designerInfo = {
                  username: designerUser.username || 'Unknown Designer',
                  avatar: designerUser.avatar || '/api/placeholder/100/100'
                };
              }
            } catch (designerError) {
              console.error('Error fetching designer:', designerError);
            }
          }

          // Use product.image (single image field) instead of product.images
          const imageUrl = product.image || item.image || '/api/placeholder/400/500';

          return {
            _id: product._id?.toString() || 'unknown',
            name: product.name || item.name || 'Unnamed Product',
            price: product.price || item.price || 0,
            quantity: item.quantity,
            image: imageUrl,
            designer: designerInfo || {
              username: 'Unknown Designer',
              avatar: '/api/placeholder/100/100'
            }
          };
        } catch (error) {
          console.error('Error processing item:', error);
          return {
            _id: item.productId?.toString() || 'unknown',
            name: item.name || 'Error loading product',
            price: item.price || 0,
            quantity: item.quantity,
            image: item.image || '/api/placeholder/400/500',
            designer: item.designer || {
              username: 'Unknown',
              avatar: '/api/placeholder/100/100'
            }
          };
        }
      })
    );

    // Transform the order to match your frontend interface
    const orderResponse = {
      _id: order._id?.toString() || '',
      orderNumber: order.orderNumber,
      items: populatedItems,
      shippingAddress: order.shippingAddress || {
        fullName: '',
        street: '',
        city: '',
        state: '',
        postalCode: '',
        country: '',
        phone: ''
      },
      subtotal: order.subtotal,
      shippingFee: order.shippingFee,
      tax: order.tax,
      total: order.total,
      status: order.status,
      paymentMethod: order.paymentMethod,
      paymentVerified: order.paymentVerified || false,
      paymentScreenshot: order.paymentScreenshot || null,
      trackingNumber: order.trackingNumber,
      createdAt: order.createdAt.toISOString(),
      updatedAt: order.updatedAt.toISOString()
    };

    console.log('Order response prepared:', { orderNumber: orderResponse.orderNumber });
    
    return NextResponse.json(orderResponse);
  } catch (error: any) {
    console.error('GET order error:', error);
    
    return NextResponse.json(
      { 
        error: 'Internal server error', 
        message: error.message,
        stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
      },
      { status: 500 }
    );
  }
}

// PUT update order status (admin or owner)
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await connectToDatabase();
    
    const { userId } = await auth();
    
    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { id } = await params;
    const body = await request.json();
    
    console.log('Updating order:', { id, userId, body });
    
    // Find the order
    const order = await Order.findOne({
      _id: id,
      'user.clerkId': userId
    });

    if (!order) {
      return NextResponse.json(
        { error: 'Order not found' },
        { status: 404 }
      );
    }

    // Check if user is trying to cancel the order
    if (body.action === 'cancel') {
      if (order.status === 'pending' || order.status === 'payment_verification') {
        order.status = 'cancelled';
        
        // Restore product stock
        await Promise.all(
          order.items.map(async (item: any) => {
            try {
              const product = await Product.findById(item.productId);
              if (product) {
                product.stock += item.quantity;
                await product.save();
                console.log(`Restored ${item.quantity} units to product ${product.name}`);
              }
            } catch (stockError) {
              console.error('Error restoring stock:', stockError);
            }
          })
        );
      } else {
        return NextResponse.json(
          { error: 'Cannot cancel order in current status' },
          { status: 400 }
        );
      }
    } else if (body.status) {
      // Regular status update (for admin mostly)
      // Check if user is admin
      const user = await User.findOne({ clerkId: userId });
      if (!user || user.role !== 'admin') {
        return NextResponse.json(
          { error: 'Only admins can update order status' },
          { status: 403 }
        );
      }
      
      const oldStatus = order.status;
      order.status = body.status;
      
      // Add admin note if status changed
      if (body.note) {
        const noteText = `[${new Date().toISOString()}] Status changed from ${oldStatus} to ${body.status}: ${body.note}`;
        order.adminNotes = order.adminNotes ? `${order.adminNotes}\n${noteText}` : noteText;
      }
    } else if (body.trackingNumber) {
      // Update tracking number (admin only)
      const user = await User.findOne({ clerkId: userId });
      if (!user || user.role !== 'admin') {
        return NextResponse.json(
          { error: 'Only admins can update tracking number' },
          { status: 403 }
        );
      }
      
      order.trackingNumber = body.trackingNumber;
    } else {
      // No valid update operation specified
      return NextResponse.json(
        { error: 'No valid update operation specified' },
        { status: 400 }
      );
    }

    await order.save();
    
    // Get populated items for response
    const populatedItems = await Promise.all(
      order.items.map(async (item: any) => {
        try {
          const product = await Product.findById(item.productId);
          
          if (!product) {
            return {
              _id: item.productId?.toString() || 'unknown',
              name: item.name || 'Product not found',
              price: item.price || 0,
              quantity: item.quantity,
              image: item.image || '/api/placeholder/400/500',
              designer: item.designer || {
                username: 'Unknown',
                avatar: '/api/placeholder/100/100'
              }
            };
          }

          let designerInfo = item.designer;
          if (product.designer) {
            try {
              const designerUser = await User.findOne({ clerkId: product.designer.clerkId });
              if (designerUser) {
                designerInfo = {
                  username: designerUser.username || 'Unknown Designer',
                  avatar: designerUser.avatar || '/api/placeholder/100/100'
                };
              }
            } catch (designerError) {
              console.error('Error fetching designer:', designerError);
            }
          }

          // Use product.image (single image field)
          const imageUrl = product.image || item.image || '/api/placeholder/400/500';

          return {
            _id: product._id?.toString() || 'unknown',
            name: product.name || item.name || 'Unnamed Product',
            price: product.price || item.price || 0,
            quantity: item.quantity,
            image: imageUrl,
            designer: designerInfo || {
              username: 'Unknown Designer',
              avatar: '/api/placeholder/100/100'
            }
          };
        } catch (error) {
          console.error('Error processing item:', error);
          return item;
        }
      })
    );

    const orderResponse = {
      _id: order._id?.toString() || '',
      orderNumber: order.orderNumber,
      items: populatedItems,
      shippingAddress: order.shippingAddress,
      subtotal: order.subtotal,
      shippingFee: order.shippingFee,
      tax: order.tax,
      total: order.total,
      status: order.status,
      paymentMethod: order.paymentMethod,
      paymentVerified: order.paymentVerified,
      paymentScreenshot: order.paymentScreenshot,
      trackingNumber: order.trackingNumber,
      adminNotes: order.adminNotes,
      createdAt: order.createdAt.toISOString(),
      updatedAt: order.updatedAt.toISOString()
    };

    return NextResponse.json(orderResponse);
  } catch (error: any) {
    console.error('PUT order error:', error);
    
    return NextResponse.json(
      { 
        error: 'Internal server error', 
        message: error.message,
        stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
      },
      { status: 500 }
    );
  }
}

// DELETE order (cancellation)
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await connectToDatabase();
    
    const { userId } = await auth();
    
    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { id } = await params;
    
    // Find and "soft delete" by marking as cancelled
    const order = await Order.findOne({
      _id: id,
      'user.clerkId': userId
    });

    if (!order) {
      return NextResponse.json(
        { error: 'Order not found' },
        { status: 404 }
      );
    }

    // Only allow cancellation of pending/payment_verification orders
    if (order.status === 'pending' || order.status === 'payment_verification') {
      order.status = 'cancelled';
      
      // Restore product stock
      await Promise.all(
        order.items.map(async (item: any) => {
          try {
            const product = await Product.findById(item.productId);
            if (product) {
              product.stock += item.quantity;
              await product.save();
            }
          } catch (stockError) {
            console.error('Error restoring stock:', stockError);
          }
        })
      );
      
      await order.save();
      
      return NextResponse.json({ 
        message: 'Order cancelled successfully',
        order 
      });
    } else {
      return NextResponse.json(
        { error: 'Cannot cancel order in current status' },
        { status: 400 }
      );
    }
  } catch (error: any) {
    console.error('DELETE order error:', error);
    
    return NextResponse.json(
      { 
        error: 'Internal server error', 
        message: error.message,
        stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
      },
      { status: 500 }
    );
  }
}