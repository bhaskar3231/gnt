import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import dbConnect from "@/lib/db";
import { User, IUser } from "@/models/User";
import { Order, IOrder } from "@/models/Order";

const STATUS_BADGE: Record<string, string> = {
  CONFIRMED: "bg-green-100 text-green-800",
  PROCESSING: "bg-blue-100 text-blue-800",
  PACKED: "bg-yellow-100 text-yellow-800",
  SHIPPED: "bg-indigo-100 text-indigo-800",
  OUT_FOR_DELIVERY: "bg-orange-100 text-orange-800",
  DELIVERED: "bg-green-100 text-green-800",
  CANCELLED: "bg-red-100 text-red-800",
  PENDING_PAYMENT: "bg-gray-100 text-gray-700",
  REFUND_PENDING: "bg-yellow-100 text-yellow-800",
  REFUNDED: "bg-gray-100 text-gray-700",
  RETURN_REQUESTED: "bg-orange-100 text-orange-800",
  RETURNED: "bg-gray-100 text-gray-700",
};

function formatDate(d: Date | string) {
  return new Date(d).toLocaleDateString("en-IN", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export default async function MyOrdersPage() {
  const { userId } = await auth();
  if (!userId) {
    redirect("/sign-in");
  }

  await dbConnect();

  const user = await User.findOne({ clerkId: userId }).lean() as IUser | null;
  if (!user) {
    redirect("/sign-in");
  }

  const orders = (await Order.find({ customerId: user._id })
    .sort({ createdAt: -1 })
    .lean()) as unknown as IOrder[];

  return (
    <main className="max-w-5xl mx-auto px-4 py-10">
      <h1 className="text-2xl font-bold text-gray-900 mb-8">My Orders</h1>

      {orders.length === 0 ? (
        <div className="flex flex-col items-center gap-6 py-20 text-center">
          <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center">
            <svg
              className="w-8 h-8 text-gray-400"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={1.5}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M20 7H4a2 2 0 00-2 2v10a2 2 0 002 2h16a2 2 0 002-2V9a2 2 0 00-2-2zM16 3H8l-2 4h12l-2-4z"
              />
            </svg>
          </div>
          <h2 className="text-xl font-semibold text-gray-900">No orders yet</h2>
          <p className="text-gray-500">
            When you place an order, it will appear here.
          </p>
          <Link
            href="/products"
            className="bg-gray-900 text-white px-6 py-3 rounded-xl text-sm font-semibold hover:bg-gray-700 transition-colors"
          >
            Start Shopping
          </Link>
        </div>
      ) : (
        <>
          {/* Desktop table */}
          <div className="hidden md:block bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-gray-500 text-xs uppercase tracking-wide">
                <tr>
                  <th className="text-left px-6 py-3 font-medium">Order #</th>
                  <th className="text-left px-4 py-3 font-medium">Date</th>
                  <th className="text-left px-4 py-3 font-medium">Items</th>
                  <th className="text-right px-4 py-3 font-medium">Total</th>
                  <th className="text-center px-4 py-3 font-medium">Status</th>
                  <th className="text-right px-6 py-3 font-medium"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {orders.map((order) => (
                  <tr
                    key={(order as any)._id.toString()}
                    className="hover:bg-gray-50 transition-colors"
                  >
                    <td className="px-6 py-4 font-semibold text-gray-900">
                      #{order.orderNumber}
                    </td>
                    <td className="px-4 py-4 text-gray-600">
                      {formatDate(order.createdAt)}
                    </td>
                    <td className="px-4 py-4 text-gray-600">
                      {order.items.length}{" "}
                      {order.items.length === 1 ? "item" : "items"}
                    </td>
                    <td className="px-4 py-4 text-right font-semibold text-gray-900">
                      ₹{order.total.toLocaleString("en-IN")}
                    </td>
                    <td className="px-4 py-4 text-center">
                      <span
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                          STATUS_BADGE[order.status] ?? "bg-gray-100 text-gray-700"
                        }`}
                      >
                        {order.status.replace(/_/g, " ")}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-4">
                        <Link
                          href={`/orders/${(order as any)._id}/tracking`}
                          className="text-gray-500 hover:text-gray-800 font-medium text-sm transition-colors"
                        >
                          Track
                        </Link>
                        <Link
                          href={`/orders/${(order as any)._id}`}
                          className="text-indigo-600 hover:text-indigo-800 font-medium text-sm transition-colors"
                        >
                          View Order →
                        </Link>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile cards */}
          <div className="md:hidden space-y-4">
            {orders.map((order) => (
              <div
                key={(order as any)._id.toString()}
                className="bg-white rounded-xl border border-gray-100 shadow-sm p-5"
              >
                <div className="flex justify-between items-start mb-3">
                  <div>
                    <p className="font-semibold text-gray-900">
                      #{order.orderNumber}
                    </p>
                    <p className="text-xs text-gray-500 mt-0.5">
                      {formatDate(order.createdAt)}
                    </p>
                  </div>
                  <span
                    className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                      STATUS_BADGE[order.status] ?? "bg-gray-100 text-gray-700"
                    }`}
                  >
                    {order.status.replace(/_/g, " ")}
                  </span>
                </div>
                <div className="flex justify-between items-center text-sm">
                  <span className="text-gray-600">
                    {order.items.length}{" "}
                    {order.items.length === 1 ? "item" : "items"} · ₹
                    {order.total.toLocaleString("en-IN")}
                  </span>
                  <div className="flex items-center gap-3">
                    <Link
                      href={`/orders/${(order as any)._id}/tracking`}
                      className="text-gray-500 hover:text-gray-800 font-medium transition-colors"
                    >
                      Track
                    </Link>
                    <Link
                      href={`/orders/${(order as any)._id}`}
                      className="text-indigo-600 hover:text-indigo-800 font-medium transition-colors"
                    >
                      View →
                    </Link>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </main>
  );
}
