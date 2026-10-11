import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import dbConnect from '@/lib/db';
import { User } from '@/models/User';
import { Order, IOrder } from '@/models/Order';
import { ApiResponse } from '@/types';

/**
 * GET /api/orders/[id]
 * Get a single order by ID — only the owning user may access it
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: { id: string } }
): Promise<NextResponse<ApiResponse<any>>> {
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

    const order = await Order.findById(params.id).lean() as IOrder | null;
    if (!order) {
      return NextResponse.json(
        { success: false, message: 'Order not found' },
        { status: 404 }
      );
    }

    if (order.customerId.toString() !== user._id.toString()) {
      return NextResponse.json(
        { success: false, message: 'Forbidden' },
        { status: 403 }
      );
    }

    return NextResponse.json({ success: true, data: order });
  } catch (error) {
    console.error('Order fetch error:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to fetch order' },
      { status: 500 }
    );
  }
}
