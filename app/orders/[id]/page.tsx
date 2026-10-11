import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import dbConnect from "@/lib/db";
import { User, IUser } from "@/models/User";
import { Order, IOrder } from "@/models/Order";
import PrintButton from "./_print-button";

interface PageProps {
  params: { id: string };
  searchParams: { new?: string };
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

function formatDate(d: Date | string) {
  return new Date(d).toLocaleDateString("en-IN", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

export default async function OrderDetailPage({ params, searchParams }: PageProps) {
  const { userId } = await auth();
  if (!userId) {
    redirect("/sign-in");
  }

  await dbConnect();

  const user = await User.findOne({ clerkId: userId }).lean() as IUser | null;
  if (!user) {
    redirect("/sign-in");
  }

  const order = await Order.findById(params.id).lean() as IOrder | null;
  if (!order) {
    return (
      <main className="max-w-3xl mx-auto px-4 py-20 text-center">
        <h1 className="text-2xl font-bold text-gray-900 mb-4">Order not found</h1>
        <Link
          href="/account/orders"
          className="text-sm text-gray-500 hover:text-gray-700"
        >
          ← Back to My Orders
        </Link>
      </main>
    );
  }

  // Security: only owner may view
  if (order.customerId.toString() !== user._id.toString()) {
    redirect("/account/orders");
  }

  const isNew = searchParams.new === "true";
  const currentStatusIndex = STATUS_SEQUENCE.indexOf(order.status as any);
  const isCancelled = ["CANCELLED", "REFUNDED", "RETURNED"].includes(order.status);

  return (
    <>
      {/* Print styles */}
      <style>{`
        @media print {
          nav, [data-no-print] { display: none !important; }
          body { background: white; }
          main { max-width: 100% !important; padding: 0 !important; }
        }
      `}</style>

      <main className="max-w-4xl mx-auto px-4 py-10 space-y-8">
        {/* Success banner */}
        {isNew && (
          <div className="bg-green-50 border border-green-200 rounded-xl px-6 py-4">
            <p className="text-green-800 font-semibold">
              🎉 Order Placed Successfully! Your order will be delivered soon.
            </p>
          </div>
        )}

        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <p className="text-sm text-gray-500">Order</p>
            <h1 className="text-2xl font-bold text-gray-900">
              #{order.orderNumber}
            </h1>
            <p className="text-sm text-gray-500 mt-0.5">
              Placed on {formatDate(order.createdAt)}
            </p>
          </div>
          <div className="flex items-center gap-3" data-no-print>
            <span
              className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold ${
                STATUS_BADGE[order.status] ?? "bg-gray-100 text-gray-800"
              }`}
            >
              {order.status.replace(/_/g, " ")}
            </span>
            <PrintButton />
          </div>
        </div>

        {/* Status timeline */}
        {!isCancelled && (
          <section className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
            <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-6">
              Order Progress
            </h2>

            {/* Desktop horizontal */}
            <div className="hidden sm:flex items-center">
              {STATUS_SEQUENCE.map((step, idx) => {
                const isCompleted = currentStatusIndex > idx;
                const isCurrent = currentStatusIndex === idx;
                const isFuture = currentStatusIndex < idx;

                return (
                  <div key={step} className="flex items-center flex-1 last:flex-none">
                    {/* Circle */}
                    <div className="flex flex-col items-center flex-shrink-0">
                      <div
                        className={`w-8 h-8 rounded-full flex items-center justify-center border-2 ${
                          isCompleted
                            ? "bg-green-500 border-green-500 text-white"
                            : isCurrent
                            ? "bg-indigo-600 border-indigo-600 text-white animate-pulse"
                            : "bg-white border-gray-300 text-gray-400"
                        }`}
                      >
                        {isCompleted ? (
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                          </svg>
                        ) : (
                          <span className="w-2 h-2 rounded-full bg-current" />
                        )}
                      </div>
                      <span
                        className={`mt-2 text-xs text-center whitespace-nowrap ${
                          isCompleted || isCurrent
                            ? "text-gray-900 font-medium"
                            : isFuture
                            ? "text-gray-400"
                            : "text-gray-500"
                        }`}
                      >
                        {STATUS_LABELS[step]}
                      </span>
                    </div>

                    {/* Connector */}
                    {idx < STATUS_SEQUENCE.length - 1 && (
                      <div
                        className={`flex-1 h-0.5 mx-2 ${
                          isCompleted ? "bg-green-400" : "bg-gray-200"
                        }`}
                      />
                    )}
                  </div>
                );
              })}
            </div>

            {/* Mobile vertical */}
            <div className="sm:hidden space-y-4">
              {STATUS_SEQUENCE.map((step, idx) => {
                const isCompleted = currentStatusIndex > idx;
                const isCurrent = currentStatusIndex === idx;

                return (
                  <div key={step} className="flex items-start gap-3">
                    <div
                      className={`w-7 h-7 rounded-full flex items-center justify-center border-2 flex-shrink-0 mt-0.5 ${
                        isCompleted
                          ? "bg-green-500 border-green-500 text-white"
                          : isCurrent
                          ? "bg-indigo-600 border-indigo-600 text-white animate-pulse"
                          : "bg-white border-gray-300"
                      }`}
                    >
                      {isCompleted ? (
                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                        </svg>
                      ) : (
                        <span className="w-1.5 h-1.5 rounded-full bg-gray-300" />
                      )}
                    </div>
                    <span
                      className={`text-sm ${
                        isCompleted || isCurrent
                          ? "text-gray-900 font-medium"
                          : "text-gray-400"
                      }`}
                    >
                      {STATUS_LABELS[step]}
                    </span>
                  </div>
                );
              })}
            </div>
          </section>
        )}

        {/* Items table */}
        <section className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
          <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide px-6 pt-5 pb-4 border-b border-gray-100">
            Items Ordered
          </h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-gray-500 text-xs uppercase tracking-wide">
                <tr>
                  <th className="text-left px-6 py-3 font-medium">Product</th>
                  <th className="text-center px-4 py-3 font-medium">Qty</th>
                  <th className="text-right px-4 py-3 font-medium">Price</th>
                  <th className="text-right px-6 py-3 font-medium">Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {order.items.map((item, idx) => (
                  <tr key={idx} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4 font-medium text-gray-900">
                      {item.productName}
                    </td>
                    <td className="px-4 py-4 text-center text-gray-600">
                      {item.quantity}
                    </td>
                    <td className="px-4 py-4 text-right text-gray-600">
                      ₹{item.price.toLocaleString("en-IN")}
                    </td>
                    <td className="px-6 py-4 text-right font-semibold text-gray-900">
                      ₹{(item.price * item.quantity).toLocaleString("en-IN")}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="border-t border-gray-100 bg-gray-50 text-sm">
                <tr>
                  <td colSpan={3} className="px-6 py-3 text-right text-gray-600">
                    Subtotal
                  </td>
                  <td className="px-6 py-3 text-right font-medium text-gray-900">
                    ₹{(order.subtotal ?? 0).toLocaleString("en-IN")}
                  </td>
                </tr>
                <tr>
                  <td colSpan={3} className="px-6 py-2 text-right text-gray-600">
                    Shipping
                  </td>
                  <td className="px-6 py-2 text-right text-green-600 font-medium">
                    {order.shipping === 0 ? "FREE" : `₹${order.shipping.toLocaleString("en-IN")}`}
                  </td>
                </tr>
                {order.discount > 0 && (
                  <tr>
                    <td colSpan={3} className="px-6 py-2 text-right text-gray-600">
                      Discount
                    </td>
                    <td className="px-6 py-2 text-right text-red-600 font-medium">
                      −₹{order.discount.toLocaleString("en-IN")}
                    </td>
                  </tr>
                )}
                <tr className="font-bold text-gray-900">
                  <td colSpan={3} className="px-6 py-3 text-right">
                    Total
                  </td>
                  <td className="px-6 py-3 text-right text-base">
                    ₹{order.total.toLocaleString("en-IN")}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        </section>

        {/* Delivery address + Payment */}
        <div className="grid sm:grid-cols-2 gap-6">
          {/* Address */}
          <section className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
            <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-4">
              Delivery Address
            </h2>
            {order.shippingAddress ? (
              <address className="not-italic text-sm text-gray-700 space-y-1 leading-relaxed">
                <p className="font-semibold text-gray-900">
                  {order.shippingAddress.name}
                </p>
                {order.shippingAddress.phone && (
                  <p className="text-gray-500">{order.shippingAddress.phone}</p>
                )}
                <p>{order.shippingAddress.address}</p>
                <p>
                  {order.shippingAddress.city}
                  {order.shippingAddress.state
                    ? `, ${order.shippingAddress.state}`
                    : ""}
                </p>
                <p>
                  {order.shippingAddress.postalCode}
                  {order.shippingAddress.country
                    ? `, ${order.shippingAddress.country}`
                    : ""}
                </p>
              </address>
            ) : (
              <p className="text-sm text-gray-400">No address on record</p>
            )}
          </section>

          {/* Payment */}
          <section className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
            <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-4">
              Payment Info
            </h2>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-500">Method</span>
                <span className="font-medium text-gray-900">
                  {order.payment?.method === "COD"
                    ? "Cash on Delivery"
                    : order.payment?.method ?? "—"}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-500">Status</span>
                <span
                  className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                    order.payment?.status === "COMPLETED"
                      ? "bg-green-100 text-green-800"
                      : order.payment?.status === "FAILED"
                      ? "bg-red-100 text-red-800"
                      : "bg-gray-100 text-gray-700"
                  }`}
                >
                  {order.payment?.status ?? "PENDING"}
                </span>
              </div>
            </div>
          </section>
        </div>

        {/* Back link */}
        <div data-no-print>
          <Link
            href="/account/orders"
            className="text-sm text-gray-500 hover:text-gray-700 transition-colors"
          >
            ← Back to My Orders
          </Link>
        </div>
      </main>
    </>
  );
}
