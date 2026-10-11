import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import mongoose from 'mongoose';
import dbConnect from '@/lib/db';
import { User } from '@/models/User';
import { Order } from '@/models/Order';
import type { IStatusHistoryEntry } from '@/models/Order';
import type { ApiResponse } from '@/types';

const STATUS_LABELS: Record<string, string> = {
  PENDING_PAYMENT: 'Order placed',
  CONFIRMED: 'Order confirmed',
  PROCESSING: 'Processing',
  PACKED: 'Packed',
  SHIPPED: 'Shipped',
  OUT_FOR_DELIVERY: 'Out for delivery',
  DELIVERED: 'Delivered',
  CANCELLED: 'Cancelled',
  REFUND_PENDING: 'Refund pending',
  REFUNDED: 'Refunded',
  RETURN_REQUESTED: 'Return requested',
  RETURNED: 'Returned',
};

export interface TrackingResponse {
  orderId: string;
  orderNumber: string;
  status: string;
  trackingNumber: string | null;
  carrier: string | null;
  estimatedDelivery: string | null;
  shippedAt: string | null;
  trackingEvents: {
    timestamp: string;
    description: string;
    location: string | null;
  }[];
  shippingAddress: {
    name: string;
    phone: string;
    address: string;
    city: string;
    state: string;
    postalCode: string;
    country: string;
  };
  items: {
    productName: string;
    quantity: number;
    price: number;
    priceSnapshot: Record<string, unknown>;
  }[];
}

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse<ApiResponse<TrackingResponse>>> {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json(
        { success: false, message: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { id } = await params;
    if (!mongoose.isValidObjectId(id)) {
      return NextResponse.json(
        { success: false, message: 'Order not found' },
        { status: 404 }
      );
    }

    await dbConnect();

    const user = await User.findOne({ clerkId: userId });
    if (!user) {
      return NextResponse.json(
        { success: false, message: 'Order not found' },
        { status: 404 }
      );
    }

    const order = await Order.findById(id);
    if (!order) {
      return NextResponse.json(
        { success: false, message: 'Order not found' },
        { status: 404 }
      );
    }

    // Verify ownership — return 404 to avoid info leak
    if (order.customerId.toString() !== (user._id as mongoose.Types.ObjectId).toString()) {
      return NextResponse.json(
        { success: false, message: 'Order not found' },
        { status: 404 }
      );
    }

    // Build trackingEvents from statusHistory
    const historyEvents = (order.statusHistory ?? []).map((entry: IStatusHistoryEntry) => ({
      timestamp: entry.timestamp.toISOString(),
      description: STATUS_LABELS[entry.status] ?? entry.status,
      location: entry.note ?? null,
    }));

    // Always ensure at least one "Order placed" event exists
    const hasPlacedEvent = historyEvents.some(
      (e: { description: string }) => e.description === STATUS_LABELS['PENDING_PAYMENT']
    );
    if (!hasPlacedEvent) {
      historyEvents.push({
        timestamp: order.createdAt.toISOString(),
        description: STATUS_LABELS['PENDING_PAYMENT'],
        location: null,
      });
    }

    // Sort newest-first
    historyEvents.sort(
      (a: { timestamp: string }, b: { timestamp: string }) =>
        new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );

    const payload: TrackingResponse = {
      orderId: (order._id as mongoose.Types.ObjectId).toString(),
      orderNumber: order.orderNumber,
      status: order.status,
      trackingNumber: order.shipment?.trackingNumber ?? null,
      carrier: order.shipment?.carrierName ?? null,
      estimatedDelivery: null,
      shippedAt: order.shipment?.shippedAt?.toISOString() ?? null,
      trackingEvents: historyEvents,
      shippingAddress: {
        name: order.shippingAddress?.name ?? '',
        phone: order.shippingAddress?.phone ?? '',
        address: order.shippingAddress?.address ?? '',
        city: order.shippingAddress?.city ?? '',
        state: order.shippingAddress?.state ?? '',
        postalCode: order.shippingAddress?.postalCode ?? '',
        country: order.shippingAddress?.country ?? '',
      },
      items: order.items.map((item: { productName: string; quantity: number; price: number; priceSnapshot: Record<string, unknown> }) => ({
        productName: item.productName,
        quantity: item.quantity,
        price: item.price,
        priceSnapshot: item.priceSnapshot,
      })),
    };

    return NextResponse.json({ success: true, data: payload });
  } catch (error) {
    console.error('[GET /api/orders/[id]/tracking]', error);
    return NextResponse.json(
      { success: false, message: 'Failed to fetch tracking info' },
      { status: 500 }
    );
  }
}
