"use client";

export default function PrintButton() {
  return (
    <button
      onClick={() => window.print()}
      className="text-sm px-3 py-1.5 border border-gray-200 rounded-lg text-gray-600 hover:bg-gray-50 transition-colors"
      data-no-print
    >
      🖨 Print Invoice
    </button>
  );
}
