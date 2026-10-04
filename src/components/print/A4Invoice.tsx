import React from 'react';
import { Sale, SaleItem, StoreSettings } from '../../types';
import { formatCurrency, formatDateTime } from '../../lib/formatters';

interface A4InvoiceProps {
  sale: Sale;
  items: SaleItem[];
  settings?: StoreSettings | null;
}

export const A4Invoice: React.FC<A4InvoiceProps> = ({ sale, items, settings }) => {
  const storeName = settings?.storeName || 'AuraCare Pharmacy & Healthcare';
  const tagline = settings?.tagline || 'Community Dispensary & Prescription Center';
  const address = settings?.address || 'Plot 44, Kenyatta Avenue, Central District';
  const phone = settings?.phone || '+255 784 920 110';
  const email = settings?.email || 'dispensary@auracarepharm.com';
  const tinNumber = settings?.tinNumber || 'TIN-114-889-402';
  const currency = settings?.currencySymbol || 'TSh';

  return (
    <div
      id="a4-invoice-print"
      className="w-[210mm] min-h-[297mm] mx-auto p-12 bg-white text-slate-900 font-sans text-sm selection:bg-none"
    >
      {/* Header Banner */}
      <div className="flex justify-between items-start border-b-2 border-teal-700 pb-6 mb-8">
        <div>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded bg-teal-700 text-white font-bold flex items-center justify-center text-lg">
              +
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-teal-900">{storeName}</h1>
          </div>
          <p className="text-xs text-slate-500 mt-1">{tagline}</p>
          <div className="text-xs text-slate-600 mt-2 space-y-0.5">
            <p>{address}</p>
            <p>Tel: {phone} | Email: {email}</p>
            <p className="font-semibold text-slate-800">TIN / VAT Reg: {tinNumber}</p>
          </div>
        </div>

        <div className="text-right">
          <span className="inline-block bg-teal-50 text-teal-800 border border-teal-200 px-3 py-1 rounded text-xs font-bold uppercase tracking-wider mb-2">
            Official Tax Invoice
          </span>
          <div className="text-xl font-bold text-slate-800 font-mono">{sale.receiptNumber}</div>
          <p className="text-xs text-slate-500 mt-1">Date: {formatDateTime(sale.created_at)}</p>
          <p className="text-xs text-slate-500">Dispensing Pharmacist: {sale.attendantName}</p>
        </div>
      </div>

      {/* Patient & Prescriber Details Box */}
      <div className="grid grid-cols-2 gap-6 bg-slate-50 border border-slate-200 rounded-lg p-4 mb-8">
        <div>
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">
            Patient / Client Details
          </h3>
          <p className="font-bold text-slate-900">{sale.patientName || 'Walk-in Client (Over The Counter)'}</p>
          {sale.patientPhone && <p className="text-xs text-slate-600 mt-1">Contact: {sale.patientPhone}</p>}
        </div>

        <div>
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">
            Prescriber / Clinic Reference
          </h3>
          <p className="font-semibold text-slate-800">{sale.doctorName || 'Self / OTC Recommendation'}</p>
          {sale.doctorRegNo && <p className="text-xs text-slate-600 mt-1">Medical Reg No: {sale.doctorRegNo}</p>}
          {sale.hasPomItems && (
            <span className="inline-block mt-2 bg-amber-100 text-amber-800 text-[10px] font-bold px-2 py-0.5 rounded">
              POM Verification Attached
            </span>
          )}
        </div>
      </div>

      {/* Items Table */}
      <table className="w-full text-left border-collapse mb-8">
        <thead>
          <tr className="border-b-2 border-slate-300 bg-slate-100 text-xs font-bold text-slate-700 uppercase">
            <th className="py-2.5 px-3">#</th>
            <th className="py-2.5 px-3">Medication Description</th>
            <th className="py-2.5 px-3">Batch & Expiry</th>
            <th className="py-2.5 px-3 text-center">Qty / Unit</th>
            <th className="py-2.5 px-3 text-right">Unit Price</th>
            <th className="py-2.5 px-3 text-right">Total</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-200 text-xs">
          {items.map((item, idx) => (
            <tr key={item.id} className="hover:bg-slate-50">
              <td className="py-3 px-3 text-slate-400 font-mono">{idx + 1}</td>
              <td className="py-3 px-3">
                <div className="font-bold text-slate-900">{item.productName}</div>
                <div className="text-[11px] text-slate-500 italic">{item.genericName}</div>
              </td>
              <td className="py-3 px-3 font-mono text-[11px]">
                <div>{item.batchNumber}</div>
                <div className="text-slate-500">Exp: {item.expiryDate}</div>
              </td>
              <td className="py-3 px-3 text-center">
                <span className="font-semibold text-slate-800">{item.quantity}</span>{' '}
                <span className="text-slate-500 text-[11px]">{item.unitType === 'pack' ? 'Pack(s)' : 'Unit(s)'}</span>
              </td>
              <td className="py-3 px-3 text-right font-mono">{formatCurrency(item.unitPrice, currency)}</td>
              <td className="py-3 px-3 text-right font-bold font-mono text-slate-900">
                {formatCurrency(item.totalPrice, currency)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* Summary and Signatures */}
      <div className="flex justify-between items-start gap-8 border-t border-slate-200 pt-6">
        {/* Left Side: Regulatory Notice & Payment Status */}
        <div className="w-1/2 space-y-4">
          <div className="border border-slate-200 rounded p-3 text-xs bg-slate-50/50">
            <span className="font-bold text-slate-700 block mb-1">Payment Method:</span>
            <span className="uppercase font-semibold text-teal-800">{sale.paymentMethod}</span>
            {sale.paymentDetails.mobileMoney && (
              <span className="text-slate-600 block mt-0.5">
                Ref: {sale.paymentDetails.mobileMoney.transactionRef} ({sale.paymentDetails.mobileMoney.provider.toUpperCase()})
              </span>
            )}
            {sale.paymentDetails.cashReceived !== undefined && (
              <span className="text-slate-600 block mt-0.5">
                Cash Tendered: {formatCurrency(sale.paymentDetails.cashReceived, currency)} | Change: {formatCurrency(sale.changeGiven, currency)}
              </span>
            )}
          </div>

          <div className="text-[11px] text-slate-500 space-y-1">
            <p>• All drugs dispensed in accordance with Pharmacy and Poisons Board standards.</p>
            <p>• Opened or dispensed pharmaceuticals are non-returnable.</p>
            <p>• Keep medicines out of reach of children and direct sunlight.</p>
          </div>
        </div>

        {/* Right Side: Calculation Box */}
        <div className="w-5/12 bg-slate-50 rounded-lg p-4 border border-slate-200 space-y-2 text-xs">
          <div className="flex justify-between text-slate-600">
            <span>Subtotal:</span>
            <span className="font-mono">{formatCurrency(sale.subtotal, currency)}</span>
          </div>
          {sale.discount > 0 && (
            <div className="flex justify-between text-red-600 font-medium">
              <span>Discount Allowed:</span>
              <span className="font-mono">-{formatCurrency(sale.discount, currency)}</span>
            </div>
          )}
          {sale.tax > 0 && (
            <div className="flex justify-between text-slate-600">
              <span>VAT / Sales Tax:</span>
              <span className="font-mono">{formatCurrency(sale.tax, currency)}</span>
            </div>
          )}
          <div className="flex justify-between text-base font-bold text-teal-900 border-t border-slate-300 pt-2">
            <span>Amount Payable:</span>
            <span className="font-mono">{formatCurrency(sale.total, currency)}</span>
          </div>
        </div>
      </div>

      {/* Signature & Stamp Footer */}
      <div className="mt-16 pt-8 border-t border-slate-200 grid grid-cols-2 gap-12 text-center text-xs">
        <div>
          <div className="h-16 border-b border-dashed border-slate-400 mx-auto w-3/4"></div>
          <p className="mt-2 font-semibold text-slate-700">Official Dispensary Stamp</p>
        </div>
        <div>
          <div className="h-16 border-b border-dashed border-slate-400 mx-auto w-3/4"></div>
          <p className="mt-2 font-semibold text-slate-700">Authorized Pharmacist's Signature</p>
          <p className="text-[10px] text-slate-500">{sale.attendantName}</p>
        </div>
      </div>
    </div>
  );
};
