import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import dbConnect from '@/lib/db';
import { OrderService } from '@/lib/services/OrderService';
import { CartService } from '@/lib/services/CartService';
import { ValidationService } from '@/lib/services/ValidationService';
import { User } from '@/models/User';
import { ApiResponse } from '@/types';

/**
 * POST /api/orders
 * Create a new order from cart
 */
export async function POST(request: NextRequest): Promise<NextResponse<ApiResponse<any>>> {
  try {
    await dbConnect();

    const session = await auth();
    const userId = session?.userId;

    if (!userId) {
      return NextResponse.json(
        {
          success: false,
          message: 'Unauthorized. Please sign in to place an order.',
        },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { items, shippingAddress, billingAddress, couponCode, paymentMethod, subtotal, total, discount, shipping, tax } = body;

    // Validate order data
    try {
      ValidationService.validateOrder({
        customerId: userId,
        items,
        shippingAddress,
        subtotal: subtotal || 0,
        total: total || 0,
        paymentMethod: paymentMethod || 'RAZORPAY',
      });
    } catch (error) {
      return NextResponse.json(
        {
          success: false,
          message: 'Invalid order data',
        },
        { status: 400 }
      );
    }

    // Get user
    const user = await User.findOne({ clerkId: userId });
    if (!user) {
      return NextResponse.json(
        {
          success: false,
          message: 'User not found',
        },
        { status: 404 }
      );
    }

    // Validate cart inventory
    const userCart = await CartService.getCartByUserId(userId);
    if (!userCart || !await CartService.validateCartInventory(userCart)) {
      return NextResponse.json(
        {
          success: false,
          message: 'Some items are out of stock',
        },
        { status: 400 }
      );
    }

    // Create order
    const order = await OrderService.createOrder({
      customerId: userId,
      items,
      shippingAddress,
      billingAddress: billingAddress || shippingAddress,
      couponCode,
      paymentMethod: paymentMethod || 'RAZORPAY',
      subtotal: subtotal || 0,
      total: total || 0,
      discount: discount || 0,
      shipping: shipping || 0,
      tax: tax || 0,
    });

    // Reserve inventory for this order
    await OrderService.reserveInventory(order._id);

    // Clear user's cart
    await CartService.clearCart(userId, undefined);

    return NextResponse.json({
      success: true,
      data: order,
      message: 'Order created successfully',
    });
  } catch (error) {
    console.error('Order creation error:', error);
    return NextResponse.json(
      {
        success: false,
        message: 'Failed to create order',
      },
      { status: 500 }
    );
  }
}