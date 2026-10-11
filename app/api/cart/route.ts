import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import dbConnect from '@/lib/db';
import { CartService } from '@/lib/services/CartService';
import { ApiResponse } from '@/types';
import { generateSessionId } from '@/lib/utils/format';

export async function GET(request: NextRequest): Promise<NextResponse<ApiResponse<any>>> {
  try {
    await dbConnect();
    const session = await auth();
    const userId = session?.userId;
    const sessionId: string | null = request.cookies.get('sessionId')?.value || null;

    if (!userId && !sessionId) {
      // Return empty cart for guest without session
      return NextResponse.json({
        success: true,
        data: { items: [], subtotal: 0, total: 0 },
      });
    }

    const cart = userId
      ? await CartService.getCartByUserId(userId)
      : await CartService.getCartBySessionId(sessionId);

    return NextResponse.json({
      success: true,
      data: cart || { items: [], subtotal: 0, total: 0 },
    });
  } catch (error) {
    console.error('Cart fetch error:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to fetch cart' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest): Promise<NextResponse<ApiResponse<any>>> {
  try {
    await dbConnect();
    const session = await auth();
    const userId = session?.userId;
    const sessionIdValue = request.cookies.get('sessionId')?.value;
    let sessionId: string | undefined = sessionIdValue === null ? undefined : sessionIdValue;

    // Generate session ID for guests if not present
    if (!userId && !sessionId) {
      sessionId = generateSessionId();
    }

    const body = await request.json();
    const { productVariantId, quantity, price } = body;

    if (!productVariantId || !quantity || quantity < 1) {
      return NextResponse.json(
        { success: false, message: 'Invalid item data' },
        { status: 400 }
      );
    }

    const cart = await CartService.addToCart(userId, sessionId, {
      productVariantId,
      quantity,
      price,
    });

    const response = NextResponse.json({
      success: true,
      data: cart,
      message: 'Item added to cart',
    });

    // Set session cookie for guests
    if (sessionId && !userId) {
      response.cookies.set('sessionId', sessionId as string, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 30 * 24 * 60 * 60, // 30 days
      });
    }

    return response;
  } catch (error) {
    console.error('Cart add error:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to add item to cart' },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest): Promise<NextResponse<ApiResponse<any>>> {
  try {
    await dbConnect();
    const session = await auth();
    const userId = session?.userId;
    const sessionIdValue = request.cookies.get('sessionId')?.value;
    const sessionId: string | undefined = sessionIdValue === null ? undefined : sessionIdValue;

    const body = await request.json();
    const { productVariantId, quantity } = body;

    if (!productVariantId || quantity === undefined || quantity < 0) {
      return NextResponse.json(
        { success: false, message: 'Invalid update data' },
        { status: 400 }
      );
    }

    const cart = await CartService.updateItemQuantity(
      userId,
      sessionId as string | null | undefined,
      productVariantId,
      quantity
    );

    return NextResponse.json({
      success: true,
      data: cart,
      message: 'Cart updated',
    });
  } catch (error) {
    console.error('Cart update error:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to update cart' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest): Promise<NextResponse<ApiResponse<null>>> {
  try {
    await dbConnect();
    const session = await auth();
    const userId = session?.userId;
    const sessionIdValue = request.cookies.get('sessionId')?.value;
    const sessionId: string | undefined = sessionIdValue === null ? undefined : sessionIdValue;

    if (!userId && !sessionId) {
      return NextResponse.json(
        { success: false, message: 'No cart to clear' },
        { status: 400 }
      );
    }

    // Try to parse body — if it contains productVariantId, remove just that item
    let productVariantId: string | undefined;
    try {
      const body = await request.json();
      productVariantId = body?.productVariantId;
    } catch {
      // No body or non-JSON body — fall through to clear all
    }

    if (productVariantId) {
      await CartService.removeFromCart(userId, sessionId ?? null, productVariantId);
      return NextResponse.json({
        success: true,
        data: null,
        message: 'Item removed from cart',
      });
    }

    await CartService.clearCart(userId, sessionId as string | null | undefined);

    return NextResponse.json({
      success: true,
      data: null,
      message: 'Cart cleared',
    });
  } catch (error) {
    console.error('Cart clear error:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to clear cart' },
      { status: 500 }
    );
  }
}