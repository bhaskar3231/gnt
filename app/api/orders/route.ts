import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import dbConnect from '@/lib/db';
import { OrderService } from '@/lib/services/OrderService';
import { CartService } from '@/lib/services/CartService';
import { ValidationService } from '@/lib/services/ValidationService';
import { User } from '@/models/User';
import { Order } from '@/models/Order';
import { ProductVariant } from '@/models/ProductVariant';
import { Product } from '@/models/Product';
import { ApiResponse } from '@/types';

/**
 * GET /api/orders
 * Get all orders for the authenticated user
 */
export async function GET(_request: NextRequest): Promise<NextResponse<ApiResponse<any>>> {
  try {
    await dbConnect();

    const session = await auth();
    const userId = session?.userId;

    if (!userId) {
      return NextResponse.json(
        { success: false, message: 'Unauthorized' },
        { status: 401 }
      );
    }

    const user = await User.findOne({ clerkId: userId });
    if (!user) {
      return NextResponse.json(
        { success: false, message: 'User not found' },
        { status: 404 }
      );
    }

    const orders = await Order.find({ customerId: user._id })
      .sort({ createdAt: -1 })
      .lean();

    return NextResponse.json({ success: true, data: orders });
  } catch (error) {
    console.error('Orders fetch error:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to fetch orders' },
      { status: 500 }
    );
  }
}

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

    // Get or auto-create user record (Clerk sign-in doesn't create a MongoDB user)
    let user = await User.findOne({ clerkId: userId });
    if (!user) {
      // Pull basic info from the request body if provided, else use defaults
      user = await User.create({
        clerkId: userId,
        email: body.userEmail ?? `${userId}@unknown.clerk`,
        firstName: body.firstName ?? '',
        lastName: body.lastName ?? '',
        role: 'CUSTOMER',
      });
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

    // Enrich order items with productName + priceSnapshot (required by Order schema)
    // Cart items only store productVariantId/quantity/price — look up variant & product here
    const enrichedItems = await Promise.all(
      items.map(async (item: { productVariantId: string; quantity: number; price: number }) => {
        const variant = await ProductVariant.findById(item.productVariantId);
        let productName = 'Product';
        if (variant) {
          const product = await Product.findById(variant.productId);
          if (product) productName = product.name;
        }
        return {
          productVariantId: item.productVariantId,
          quantity: item.quantity,
          price: item.price,
          productName,
          priceSnapshot: {
            variantName: variant?.name ?? '',
            sku: variant?.sku ?? '',
            price: item.price,
            compareAtPrice: variant?.compareAtPrice ?? null,
          },
        };
      })
    );

    const resolvedPaymentMethod = paymentMethod || 'COD';

    // Create order — pass MongoDB _id (not Clerk userId) as customerId
    const order = await OrderService.createOrder({
      customerId: user._id.toString(),
      items: enrichedItems,
      shippingAddress,
      billingAddress: billingAddress || shippingAddress,
      couponCode,
      paymentMethod: resolvedPaymentMethod,
      subtotal: subtotal || 0,
      total: total || 0,
      discount: discount || 0,
      shipping: shipping || 0,
      tax: tax || 0,
    });

    // For COD orders, immediately confirm the order and record both history entries
    if (resolvedPaymentMethod === 'COD') {
      const now = new Date();
      await order.updateOne({
        status: 'CONFIRMED',
        'payment.status': 'PENDING',
        $push: {
          statusHistory: {
            $each: [
              { status: 'PENDING_PAYMENT', timestamp: order.createdAt ?? now },
              { status: 'CONFIRMED', timestamp: now },
            ],
          },
        },
      });
    }

    // Reserve inventory for this order
    await OrderService.reserveInventory(order._id);

    // Clear user's cart
    await CartService.clearCart(userId, null);

    return NextResponse.json({
      success: true,
      data: order,
      message: 'Order created successfully',
    });
  } catch (error) {
    console.error('Order creation error:', error);
    const isDev = process.env.NODE_ENV !== 'production';
    return NextResponse.json(
      {
        success: false,
        message: isDev && error instanceof Error ? error.message : 'Failed to create order',
      },
      { status: 500 }
    );
  }
}