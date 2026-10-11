import { auth } from "@clerk/nextjs/server";
import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import mongoose from "mongoose";
import dbConnect from "@/lib/db";
import { User } from "@/models/User";
import { Order } from "@/models/Order";
import type { IStatusHistoryEntry, IOrderItem } from "@/models/Order";

interface PageProps {
  params: Promise<{ id: string }>;
}

const STATUS_SEQUENCE = [
  "CONFIRMED",
  "PROCESSING",
  "PACKED",
  "SHIPPED",
  "OUT_FOR_DELIVERY",
  "DELIVERED",
] as const;

const STATUS_LABELS: Record<string, string> = {
  CONFIRMED: "Confirmed",
  PROCESSING: "Processing",
  PACKED: "Packed",
  SHIPPED: "Shipped",
  OUT_FOR_DELIVERY: "Out for Delivery",
  DELIVERED: "Delivered",
};

const STATUS_BADGE: Record<string, string> = {
  CONFIRMED: "bg-green-100 text-green-800",
  PROCESSING: "bg-blue-100 text-blue-800",
  PACKED: "bg-yellow-100 text-yellow-800",
  SHIPPED: "bg-indigo-100 text-indigo-800",
  OUT_FOR_DELIVERY: "bg-orange-100 text-orange-800",
  DELIVERED: "bg-green-100 text-green-800",
  CANCELLED: "bg-red-100 text-red-800",
  PENDING_PAYMENT: "bg-gray-100 text-gray-800",
  REFUND_PENDING: "bg-yellow-100 text-yellow-800",
  REFUNDED: "bg-gray-100 text-gray-800",
  RETURN_REQUESTED: "bg-orange-100 text-orange-800",
  RETURNED: "bg-gray-100 text-gray-800",
};

const EVENT_LABELS: Record<string, string> = {
  PENDING_PAYMENT: "Order placed",
  CONFIRMED: "Order confirmed",
  PROCESSING: "Processing",
  PACKED: "Packed",
  SHIPPED: "Shipped",
  OUT_FOR_DELIVERY: "Out for delivery",
  DELIVERED: "Delivered",
  CANCELLED: "Cancelled",
  REFUND_PENDING: "Refund pending",
  REFUNDED: "Refunded",
  RETURN_REQUESTED: "Return requested",
  RETURNED: "Returned",
};

function formatDate(d: Date | string) {
  return new Date(d).toLocaleDateString("en-IN", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

function formatDateTime(d: Date | string) {
  return new Date(d).toLocaleString("en-IN", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default async function OrderTrackingPage({ params }: PageProps) {
  const { userId } = await auth();
  if (!userId) {
    redirect("/sign-in");
  }

  const { id } = await params;
  if (!mongoose.isValidObjectId(id)) {
    notFound();
  }

  await dbConnect();

  const user = await User.findOne({ clerkId: userId });
  if (!user) {
    redirect("/sign-in");
  }

  const order = await Order.findById(id);
  if (!order) {
    notFound();
  }

  if (order.customerId.toString() !== (user._id as mongoose.Types.ObjectId).toString()) {
    notFound();
  }

  const isCancelled = ["CANCELLED", "REFUNDED", "RETURNED", "REFUND_PENDING", "RETURN_REQUESTED"].includes(order.status);
  const currentStatusIndex = STATUS_SEQUENCE.indexOf(order.status as typeof STATUS_SEQUENCE[number]);

  // Build tracking events from statusHistory, newest-first
  const rawHistory = order.statusHistory ?? [];
  const trackingEvents = rawHistory
    .map((entry: IStatusHistoryEntry) => ({
      timestamp: entry.timestamp,
      description: EVENT_LABELS[entry.status] ?? entry.status.replace(/_/g, " "),
      note: entry.note ?? null,
    }))
    .sort(
      (a: { timestamp: Date }, b: { timestamp: Date }) =>
        b.timestamp.getTime() - a.timestamp.getTime()
    );

  // Always show at least "Order placed" as a fallback
  if (trackingEvents.length === 0) {
    trackingEvents.push({
      timestamp: order.createdAt,
      description: EVENT_LABELS["PENDING_PAYMENT"],
      note: null,
    });
  }

  return (
    <main className="max-w-4xl mx-auto px-4 py-10 space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <Link
            href={`/orders/${id}`}
            className="text-sm text-gray-500 hover:text-gray-700 flex items-center gap-1 mb-2"
          >
            ← Back to Order
          </Link>
          <p className="text-sm text-gray-500">Tracking</p>
          <h1 className="text-2xl font-bold text-gray-900">
            Order #{order.orderNumber}
          </h1>
          <p className="text-sm text-gray-500 mt-0.5">
            Placed on {formatDate(order.createdAt)}
          </p>
        </div>
        <span
          className={`self-start sm:self-center inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold ${
            STATUS_BADGE[order.status] ?? "bg-gray-100 text-gray-800"
          }`}
        >
          {order.status.replace(/_/g, " ")}
        </span>
      </div>

      {/* Cancelled / returned banner */}
      {isCancelled && (
        <div className="bg-red-50 border border-red-200 rounded-xl px-6 py-4">
          <p className="text-red-800 font-semibold">
            This order has been {order.status.toLowerCase().replace(/_/g, " ")}.
          </p>
          <p className="text-red-600 text-sm mt-1">
            If you have questions, please contact support.
          </p>
        </div>
      )}

      {/* Status Stepper */}
      {!isCancelled && (
        <section className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
          <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-6">
            Fulfillment Pipeline
          </h2>

          {/* Desktop horizontal stepper */}
          <div className="hidden sm:flex items-center">
            {STATUS_SEQUENCE.map((step, idx) => {
              const isCompleted = currentStatusIndex > idx;
              const isCurrent = currentStatusIndex === idx;

              return (
                <div key={step} className="flex items-center flex-1 last:flex-none">
                  <div className="flex flex-col items-center flex-shrink-0">
                    <div
                      className={`w-8 h-8 rounded-full flex items-center justify-center border-2 transition-colors ${
                        isCompleted
                          ? "bg-green-500 border-green-500 text-white"
                          : isCurrent
                          ? "bg-indigo-600 border-indigo-600 text-white ring-4 ring-indigo-100"
                          : "bg-white border-gray-300 text-gray-400"
                      }`}
                    >
                      {isCompleted ? (
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                        </svg>
                      ) : (
                        <span className="text-xs font-bold">{idx + 1}</span>
                      )}
                    </div>
                    <p
                      className={`text-xs mt-2 text-center w-16 leading-tight ${
                        isCompleted || isCurrent ? "text-gray-900 font-semibold" : "text-gray-400"
                      }`}
                    >
                      {STATUS_LABELS[step]}
                    </p>
                  </div>
                  {/* Connector line */}
                  {idx < STATUS_SEQUENCE.length - 1 && (
                    <div
                      className={`flex-1 h-0.5 mx-1 ${
                        currentStatusIndex > idx ? "bg-green-400" : "bg-gray-200"
                      }`}
                    />
                  )}
                </div>
              );
            })}
          </div>

          {/* Mobile vertical stepper */}
          <div className="sm:hidden space-y-0">
            {STATUS_SEQUENCE.map((step, idx) => {
              const isCompleted = currentStatusIndex > idx;
              const isCurrent = currentStatusIndex === idx;

              return (
                <div key={step} className="flex items-start gap-3">
                  <div className="flex flex-col items-center">
                    <div
                      className={`w-7 h-7 rounded-full flex items-center justify-center border-2 flex-shrink-0 ${
                        isCompleted
                          ? "bg-green-500 border-green-500 text-white"
                          : isCurrent
                          ? "bg-indigo-600 border-indigo-600 text-white ring-4 ring-indigo-100"
                          : "bg-white border-gray-300 text-gray-400"
                      }`}
                    >
                      {isCompleted ? (
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                        </svg>
                      ) : (
                        <span className="text-xs font-bold">{idx + 1}</span>
                      )}
                    </div>
                    {idx < STATUS_SEQUENCE.length - 1 && (
                      <div className={`w-0.5 h-6 ${currentStatusIndex > idx ? "bg-green-400" : "bg-gray-200"}`} />
                    )}
                  </div>
                  <p
                    className={`text-sm pt-1 pb-5 leading-tight ${
                      isCompleted || isCurrent ? "text-gray-900 font-semibold" : "text-gray-400"
                    }`}
                  >
                    {STATUS_LABELS[step]}
                  </p>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* Shipment Info */}
      <section className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
        <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-4">
          Shipment Details
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-sm">
          <div>
            <p className="text-gray-500 mb-0.5">Carrier</p>
            <p className="font-medium text-gray-900">
              {order.shipment?.carrierName ?? "Not yet assigned"}
            </p>
          </div>
          <div>
            <p className="text-gray-500 mb-0.5">Tracking Number</p>
            <p className="font-medium text-gray-900">
              {order.shipment?.trackingNumber ?? "Not yet available"}
            </p>
          </div>
          <div>
            <p className="text-gray-500 mb-0.5">Shipped On</p>
            <p className="font-medium text-gray-900">
              {order.shipment?.shippedAt
                ? formatDate(order.shipment.shippedAt)
                : "Not yet shipped"}
            </p>
          </div>
        </div>
      </section>

      {/* Tracking Events */}
      <section className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
        <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-4">
          Tracking Events
        </h2>
        {trackingEvents.length === 0 ? (
          <p className="text-sm text-gray-400">No tracking events yet.</p>
        ) : (
          <ol className="relative border-l border-gray-200 ml-2 space-y-6">
            {trackingEvents.map((event: { timestamp: Date; description: string; note: string | null }, idx: number) => (
              <li key={idx} className="ml-5">
                <span className="absolute -left-2.5 flex items-center justify-center w-5 h-5 rounded-full bg-indigo-100 ring-4 ring-white">
                  <span className="w-2 h-2 rounded-full bg-indigo-500" />
                </span>
                <p className="text-sm font-semibold text-gray-900">{event.description}</p>
                <p className="text-xs text-gray-500 mt-0.5">
                  {formatDateTime(event.timestamp)}
                </p>
                {event.note && (
                  <p className="text-xs text-gray-600 mt-1">{event.note}</p>
                )}
              </li>
            ))}
          </ol>
        )}
      </section>

      {/* Delivery Address */}
      <section className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
        <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-4">
          Delivery Address
        </h2>
        <address className="not-italic text-sm text-gray-700 leading-relaxed">
          <p className="font-semibold text-gray-900">{order.shippingAddress?.name}</p>
          <p>{order.shippingAddress?.address}</p>
          <p>
            {order.shippingAddress?.city}, {order.shippingAddress?.state}{" "}
            {order.shippingAddress?.postalCode}
          </p>
          <p>{order.shippingAddress?.country}</p>
          {order.shippingAddress?.phone && (
            <p className="mt-1 text-gray-500">📞 {order.shippingAddress.phone}</p>
          )}
        </address>
      </section>

      {/* Order Items */}
      <section className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
        <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-4">
          Order Items
        </h2>
        <ul className="divide-y divide-gray-100">
          {order.items.map((item: IOrderItem, idx: number) => {
            const snapshot = item.priceSnapshot as Record<string, unknown>;
            const variantName = typeof snapshot?.variantName === "string" ? snapshot.variantName : null;
            return (
              <li key={idx} className="py-3 flex justify-between items-center gap-4">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">{item.productName}</p>
                  {variantName && (
                    <p className="text-xs text-gray-500 mt-0.5">{variantName}</p>
                  )}
                  <p className="text-xs text-gray-500 mt-0.5">Qty: {item.quantity}</p>
                </div>
                <p className="text-sm font-semibold text-gray-900 flex-shrink-0">
                  ₹{(item.price * item.quantity).toLocaleString("en-IN")}
                </p>
              </li>
            );
          })}
        </ul>
        <div className="border-t border-gray-100 pt-3 mt-3 flex justify-between text-sm font-bold text-gray-900">
          <span>Total</span>
          <span>₹{order.total.toLocaleString("en-IN")}</span>
        </div>
      </section>
    </main>
  );
}
