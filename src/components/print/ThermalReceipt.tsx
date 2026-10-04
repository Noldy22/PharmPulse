import React from 'react';
import { Sale, SaleItem, StoreSettings } from '../../types';
import { formatCurrency, formatDateTime } from '../../lib/formatters';

interface ThermalReceiptProps {
  sale: Sale;
  items: SaleItem[];
  settings?: StoreSettings | null;
}

export const ThermalReceipt: React.FC<ThermalReceiptProps> = ({ sale, items, settings }) => {
  const storeName = settings?.storeName || 'AuraCare Pharmacy';
  const tagline = settings?.tagline || 'Community Dispensary & Healthcare';
  const address = settings?.address || 'Plot 44, Kenyatta Avenue, Central';
  const phone = settings?.phone || '+255 784 920 110';
  const tinNumber = settings?.tinNumber || 'TIN-114-889-402';
  const currency = settings?.currencySymbol || 'TSh';

  return (
    <div
      id="thermal-receipt-print"
      className="w-[80mm] mx-auto p-4 bg-white text-black font-mono text-[12px] leading-tight selection:bg-none"
    >
      {/* Header */}
      <div className="text-center pb-2 border-b border-dashed border-gray-400">
        <div className="font-extrabold text-base tracking-wider uppercase">{storeName}</div>
        <div className="text-[11px] text-gray-700">{tagline}</div>
        <div className="text-[10px] text-gray-600 mt-0.5">{address}</div>
        <div className="text-[10px] text-gray-600">TEL: {phone}</div>
        <div className="text-[10px] font-semibold text-gray-700">TIN: {tinNumber}</div>
      </div>

      {/* Sale Meta */}
      <div className="py-2 border-b border-dashed border-gray-400 text-[11px] space-y-0.5">
        <div className="flex justify-between font-bold">
          <span>RC: {sale.receiptNumber}</span>
          <span>{sale.paymentMethod.toUpperCase()}</span>
        </div>
        <div className="flex justify-between text-gray-600">
          <span>Date: {formatDateTime(sale.created_at)}</span>
        </div>
        <div className="flex justify-between text-gray-600">
          <span>Cashier: {sale.attendantName}</span>
        </div>
        {sale.patientName && (
          <div className="flex justify-between text-gray-700">
            <span>Patient: {sale.patientName}</span>
          </div>
        )}
        {sale.doctorName && (
          <div className="flex justify-between text-gray-700">
            <span>Prescriber: {sale.doctorName}</span>
          </div>
        )}
      </div>

      {/* Item Headers */}
      <div className="py-1 border-b border-dashed border-gray-400 text-[11px] font-bold flex justify-between">
        <span className="w-1/2">Item / Batch</span>
        <span className="w-1/4 text-center">Qty</span>
        <span className="w-1/4 text-right">Total</span>
      </div>

      {/* Items */}
      <div className="py-2 border-b border-dashed border-gray-400 space-y-1.5 text-[11px]">
        {items.map((item) => (
          <div key={item.id}>
            <div className="font-bold flex justify-between">
              <span className="truncate pr-1">{item.productName}</span>
              <span>{formatCurrency(item.totalPrice, currency)}</span>
            </div>
            <div className="text-[10px] text-gray-600 flex justify-between pl-1">
              <span>
                {item.quantity} {item.unitType === 'pack' ? 'pk' : 'unit'} @ {formatCurrency(item.unitPrice, currency)}
              </span>
              <span>B: {item.batchNumber}</span>
            </div>
          </div>
        ))}
      </div>

      {/* Totals */}
      <div className="py-2 border-b border-dashed border-gray-400 space-y-1 text-[11px]">
        <div className="flex justify-between">
          <span>Subtotal:</span>
          <span>{formatCurrency(sale.subtotal, currency)}</span>
        </div>
        {sale.discount > 0 && (
          <div className="flex justify-between text-red-600 font-semibold">
            <span>Discount:</span>
            <span>-{formatCurrency(sale.discount, currency)}</span>
          </div>
        )}
        {sale.tax > 0 && (
          <div className="flex justify-between">
            <span>VAT / Tax:</span>
            <span>{formatCurrency(sale.tax, currency)}</span>
          </div>
        )}
        <div className="flex justify-between font-extrabold text-sm pt-1 border-t border-dotted border-gray-400">
          <span>TOTAL:</span>
          <span>{formatCurrency(sale.total, currency)}</span>
        </div>
      </div>

      {/* Tender Details */}
      <div className="py-2 border-b border-dashed border-gray-400 text-[11px] space-y-0.5">
        {sale.paymentMethod === 'cash' && (
          <>
            <div className="flex justify-between">
              <span>Cash Tendered:</span>
              <span>{formatCurrency(sale.amountPaid, currency)}</span>
            </div>
            <div className="flex justify-between font-bold">
              <span>Change Returned:</span>
              <span>{formatCurrency(sale.changeGiven, currency)}</span>
            </div>
          </>
        )}
        {sale.paymentMethod === 'mobile_money' && sale.paymentDetails.mobileMoney && (
          <div className="space-y-0.5 text-gray-700">
            <div className="flex justify-between">
              <span>Provider:</span>
              <span className="font-bold uppercase">{sale.paymentDetails.mobileMoney.provider}</span>
            </div>
            <div className="flex justify-between">
              <span>Txn Ref:</span>
              <span className="font-mono font-bold">{sale.paymentDetails.mobileMoney.transactionRef}</span>
            </div>
            {sale.paymentDetails.mobileMoney.phoneNumber && (
              <div className="flex justify-between">
                <span>Phone:</span>
                <span>{sale.paymentDetails.mobileMoney.phoneNumber}</span>
              </div>
            )}
          </div>
        )}
        {sale.paymentMethod === 'card' && sale.paymentDetails.card && (
          <div className="flex justify-between text-gray-700">
            <span>Auth Ref:</span>
            <span className="font-mono">{sale.paymentDetails.card.authCode || 'APPROVED'}</span>
          </div>
        )}
        {sale.paymentMethod === 'credit' && sale.paymentDetails.credit && (
          <div className="text-gray-700">
            <div className="flex justify-between font-bold">
              <span>Debtor:</span>
              <span>{sale.paymentDetails.credit.customerName}</span>
            </div>
            {sale.paymentDetails.credit.dueDate && (
              <div className="flex justify-between text-[10px]">
                <span>Due Date:</span>
                <span>{sale.paymentDetails.credit.dueDate}</span>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Simulated Barcode */}
      <div className="py-3 text-center">
        <div className="font-mono tracking-[4px] text-[10px] text-gray-500 font-bold mb-1">
          |||||| | ||||| |||| | |||||| ||||
        </div>
        <div className="text-[9px] tracking-widest text-gray-500">{sale.receiptNumber}</div>
      </div>

      {/* Footer Notice */}
      <div className="text-center text-[10px] text-gray-600 space-y-0.5 pt-1">
        <div>Medicines once dispensed are non-returnable.</div>
        <div className="font-bold">Thank you for your visit!</div>
        <div className="text-[9px] text-gray-400 mt-1">PharmPulse Offline POS System</div>
      </div>
    </div>
  );
};
