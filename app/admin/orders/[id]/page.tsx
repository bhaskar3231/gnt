import React from 'react';
import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { auth } from '@clerk/nextjs/server';
import mongoose from 'mongoose';
import { ArrowLeft } from 'lucide-react';
import dbConnect from '@/lib/db';
import { verifyAdminAccess } from '@/lib/admin-auth';
import { Order, User, ProductVariant, type IOrder } from '@/models';
import { OrderStatusBadge } from '../../_components/order-status-badge';
import { StatusUpdater } from '../../_components/status-updater';

function formatCurrency(value?: number): string {
  if (value === undefined || value === null) return '—';
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 2,
  }).format(value);
}

function formatDateTime(date?: Date | string): string {
  if (!date) return '—';
  return new Date(date).toLocaleString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

interface OrderDetailPageProps {
  params: Promise<{ id: string }>;
}

interface CustomerRef {
  firstName?: string;
  lastName?: string;
  email?: string;
  phone?: string;
}

interface VariantRef {
  sku?: string;
  name?: string;
}

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-lg border border-gray-200 bg-white shadow-sm">
      <div className="border-b border-gray-100 px-5 py-3">
        <h2 className="text-sm font-semibold text-gray-900">{title}</h2>
      </div>
      <div className="px-5 py-4 text-sm text-gray-700">{children}</div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex justify-between gap-4 py-1">
      <span className="text-gray-500">{label}</span>
      <span className="text-right text-gray-900">{value}</span>
    </div>
  );
}

export default async function OrderDetailPage({ params }: OrderDetailPageProps) {
  const { userId } = await auth();

  try {
    await verifyAdminAccess(userId);
  } catch {
    redirect('/');
  }

  const { id } = await params;
  if (!mongoose.isValidObjectId(id)) notFound();

  await dbConnect();
  void User;
  void ProductVariant;

  const order = await Order.findById(id)
    .populate('customerId', 'firstName lastName email phone')
    .populate('items.productVariantId', 'sku name')
    .lean<IOrder | null>();

  if (!order) notFound();

  const customer = order.customerId as unknown as CustomerRef | null;
  const customerName = customer
    ? [customer.firstName, customer.lastName].filter(Boolean).join(' ') || '—'
    : '—';
  const addr = order.shippingAddress;

  return (
    <div className="space-y-6 max-w-6xl">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center space-x-3">
          <Link
            href="/admin/orders"
            className="inline-flex items-center text-sm font-medium text-gray-500 hover:text-gray-900 transition-colors"
          >
            <ArrowLeft className="mr-1.5 h-4 w-4" />
            Back to Orders
          </Link>
          <span className="text-gray-300">/</span>
          <h1 className="text-xl font-semibold text-gray-900 font-mono">{order.orderNumber}</h1>
          <OrderStatusBadge status={order.status} />
        </div>
        <span className="text-xs text-gray-500">Placed {formatDateTime(order.createdAt)}</span>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Items + totals */}
        <div className="lg:col-span-2 space-y-6">
          <div className="rounded-lg border border-gray-200 bg-white shadow-sm overflow-hidden">
            <div className="border-b border-gray-100 px-5 py-3">
              <h2 className="text-sm font-semibold text-gray-900">Items</h2>
            </div>
            <table className="w-full text-left text-sm text-gray-600">
              <thead className="bg-gray-50 text-xs uppercase font-medium text-gray-500 border-b border-gray-200">
                <tr>
                  <th className="px-5 py-3">Product</th>
                  <th className="px-5 py-3">SKU</th>
                  <th className="px-5 py-3 text-right">Price</th>
                  <th className="px-5 py-3 text-right">Qty</th>
                  <th className="px-5 py-3 text-right">Subtotal</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {order.items.map((item, idx) => {
                  const variant = item.productVariantId as unknown as VariantRef | null;
                  return (
                    <tr key={idx}>
                      <td className="px-5 py-3">
                        <div className="font-medium text-gray-900">{item.productName}</div>
                        {item.giftWrapping && (
                          <div className="text-xs text-indigo-600">Gift wrapped</div>
                        )}
                        {item.giftMessage && (
                          <div className="text-xs text-gray-500 italic">
                            &ldquo;{item.giftMessage}&rdquo;
                          </div>
                        )}
                      </td>
                      <td className="px-5 py-3 font-mono text-xs">{variant?.sku || '—'}</td>
                      <td className="px-5 py-3 text-right">{formatCurrency(item.price)}</td>
                      <td className="px-5 py-3 text-right">{item.quantity}</td>
                      <td className="px-5 py-3 text-right font-medium text-gray-900">
                        {formatCurrency(item.price * item.quantity)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            <div className="border-t border-gray-100 px-5 py-4 text-sm space-y-1 ml-auto max-w-xs">
              <Row label="Subtotal" value={formatCurrency(order.subtotal)} />
              <Row
                label={`Discount${order.couponCode ? ` (${order.couponCode})` : ''}`}
                value={`− ${formatCurrency(order.discount)}`}
              />
              <Row label="Shipping" value={formatCurrency(order.shipping)} />
              <Row label="Tax" value={formatCurrency(order.tax)} />
              <div className="border-t border-gray-200 pt-2 mt-2">
                <Row
                  label="Total"
                  value={<span className="font-semibold">{formatCurrency(order.total)}</span>}
                />
              </div>
            </div>
          </div>

          {order.notes && (
            <Card title="Notes">
              <p className="whitespace-pre-wrap">{order.notes}</p>
            </Card>
          )}
        </div>

        {/* Sidebar info */}
        <div className="space-y-6">
          <Card title="Update Status">
            <StatusUpdater orderId={String(order._id)} currentStatus={order.status} />
          </Card>

          <Card title="Customer">
            <Row label="Name" value={customerName} />
            <Row label="Email" value={customer?.email || '—'} />
            <Row label="Phone" value={customer?.phone || '—'} />
          </Card>

          <Card title="Shipping Address">
            {addr ? (
              <address className="not-italic leading-relaxed">
                <div className="font-medium text-gray-900">{addr.name}</div>
                <div>{addr.address}</div>
                <div>
                  {[addr.city, addr.state, addr.postalCode].filter(Boolean).join(', ')}
                </div>
                <div>{addr.country}</div>
                {addr.phone && <div className="mt-1 text-gray-500">{addr.phone}</div>}
              </address>
            ) : (
              <p className="text-gray-400">No address</p>
            )}
          </Card>

          <Card title="Payment">
            <Row label="Method" value={order.payment?.method || '—'} />
            <Row label="Status" value={order.payment?.status || '—'} />
            <Row label="Razorpay Order" value={order.payment?.razorpayOrderId || '—'} />
            <Row label="Razorpay Payment" value={order.payment?.razorpayPaymentId || '—'} />
            <Row label="Paid At" value={formatDateTime(order.payment?.paidAt)} />
          </Card>

          <Card title="Timeline">
            <Row label="Created" value={formatDateTime(order.createdAt)} />
            <Row label="Paid" value={formatDateTime(order.payment?.paidAt)} />
            <Row label="Shipped" value={formatDateTime(order.shipment?.shippedAt)} />
            {order.shipment?.carrierName && (
              <Row label="Carrier" value={order.shipment.carrierName} />
            )}
            {order.shipment?.trackingNumber && (
              <Row label="Tracking #" value={order.shipment.trackingNumber} />
            )}
            <Row label="Last Updated" value={formatDateTime(order.updatedAt)} />
          </Card>
        </div>
      </div>
    </div>
  );
}
