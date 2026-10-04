import React from 'react';
import { CartItem, Product, Batch, StoreSettings } from '../../types';
import {
  Trash2,
  Plus,
  Minus,
  UserCheck,
  Stethoscope,
  ShieldAlert,
  ArrowRight,
  Clock,
  RotateCcw,
  Sparkles,
  ShoppingBag,
} from 'lucide-react';
import { formatCurrency, getExpiryStatus } from '../../lib/formatters';

interface ActiveCartProps {
  cartItems: CartItem[];
  patientName: string;
  doctorName: string;
  hasPomItems: boolean;
  settings: StoreSettings | null;
  discount: number;
  onUpdateQuantity: (itemId: string, newQty: number) => void;
  onUpdateUnitType: (itemId: string, unitType: 'pack' | 'unit') => void;
  onUpdateBatch: (itemId: string, newBatchId: string) => void;
  onRemoveItem: (itemId: string) => void;
  onClearCart: () => void;
  onOpenDispenseModal: () => void;
  onOpenHoldModal: () => void;
  onHoldCurrentSale: () => void;
  onOpenCheckout: () => void;
  onDiscountChange: (discount: number) => void;
  batchesMap: Map<string, Batch[]>;
}

export const ActiveCart: React.FC<ActiveCartProps> = ({
  cartItems,
  patientName,
  doctorName,
  hasPomItems,
  settings,
  discount,
  onUpdateQuantity,
  onUpdateUnitType,
  onUpdateBatch,
  onRemoveItem,
  onClearCart,
  onOpenDispenseModal,
  onOpenHoldModal,
  onHoldCurrentSale,
  onOpenCheckout,
  onDiscountChange,
  batchesMap,
}) => {
  const currency = settings?.currencySymbol || 'TSh';

  const subtotal = cartItems.reduce((acc, item) => acc + item.lineTotal, 0);
  const tax = settings?.taxRate ? Math.round(subtotal * settings.taxRate) : 0;
  const grandTotal = Math.max(0, subtotal - discount + tax);

  return (
    <div className="flex flex-col h-full bg-slate-50 dark:bg-slate-900/90 text-slate-800 dark:text-slate-100">
      {/* Top Header: Dispensing details banner */}
      <div className="p-3 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between gap-2">
        <button
          onClick={onOpenDispenseModal}
          className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium border transition ${
            patientName || doctorName
              ? 'bg-teal-50 dark:bg-teal-950/40 border-teal-300 dark:border-teal-800 text-teal-800 dark:text-teal-200'
              : hasPomItems
              ? 'bg-amber-50 dark:bg-amber-950/40 border-amber-300 dark:border-amber-800 text-amber-800 dark:text-amber-200 animate-pulse'
              : 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:border-teal-400'
          }`}
        >
          {hasPomItems ? (
            <ShieldAlert className="w-3.5 h-3.5 text-amber-600" />
          ) : (
            <Stethoscope className="w-3.5 h-3.5 text-teal-600" />
          )}
          <span className="truncate max-w-[160px]">
            {patientName ? `Pt: ${patientName}` : hasPomItems ? 'POM: Record Prescriber!' : '+ Add Patient / Rx'}
          </span>
        </button>

        <div className="flex items-center gap-1.5">
          <button
            onClick={onHoldCurrentSale}
            disabled={cartItems.length === 0}
            title="Park/Hold Current Sale (F8)"
            className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 disabled:opacity-40 text-slate-600 dark:text-slate-300 text-xs font-medium transition flex items-center gap-1"
          >
            <Clock className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Hold (F8)</span>
          </button>

          <button
            onClick={onOpenHoldModal}
            title="Recall Parked Sales (F9)"
            className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 text-xs font-medium transition"
          >
            Recall (F9)
          </button>

          <button
            onClick={onClearCart}
            disabled={cartItems.length === 0}
            title="Clear Current Sale (F2)"
            className="p-1.5 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/40 disabled:opacity-40 transition"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Cart Items List */}
      <div className="flex-1 overflow-y-auto p-3 space-y-2">
        {cartItems.length === 0 ? (
          <div className="text-center py-20 px-4 text-slate-400">
            <ShoppingBag className="w-12 h-12 mx-auto mb-3 opacity-40 text-teal-600" />
            <h4 className="text-sm font-semibold text-slate-600 dark:text-slate-300">Active Cart is Empty</h4>
            <p className="text-xs text-slate-400 mt-1 max-w-xs mx-auto">
              Scan barcode or select medicines from the catalog to dispense. Keyboard shortcut <kbd className="bg-slate-200 dark:bg-slate-800 px-1 py-0.5 rounded font-mono">F2</kbd> starts a fresh sale.
            </p>
          </div>
        ) : (
          cartItems.map((item) => {
            const availableBatches = batchesMap.get(item.productId) || [item.batch];
            const expiryStatus = getExpiryStatus(item.batch.expiryDate);

            return (
              <div
                key={item.id}
                className="p-3 rounded-xl bg-white dark:bg-slate-800 border border-slate-200/90 dark:border-slate-700/80 shadow-xs space-y-2 transition"
              >
                {/* Item header */}
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="font-bold text-xs text-slate-900 dark:text-white truncate flex items-center gap-1.5">
                      <span>{item.product.name}</span>
                      {item.product.isPom && (
                        <span className="text-[9px] font-bold px-1 rounded bg-rose-100 text-rose-800 dark:bg-rose-950/80 dark:text-rose-300">
                          POM
                        </span>
                      )}
                    </div>
                    <div className="text-[11px] text-slate-400 truncate italic">
                      {item.product.genericName}
                    </div>
                  </div>

                  <button
                    onClick={() => onRemoveItem(item.id)}
                    className="text-slate-400 hover:text-red-500 p-1 rounded-md transition"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>

                {/* Batch and Pack/Unit Toggle Controls */}
                <div className="grid grid-cols-2 gap-2 text-xs">
                  {/* Batch Selector with Expiry Info */}
                  <div>
                    <label className="block text-[10px] uppercase font-bold text-slate-400 mb-0.5">
                      Dispense Batch
                    </label>
                    <select
                      value={item.batchId}
                      onChange={(e) => onUpdateBatch(item.id, e.target.value)}
                      className="w-full py-1 px-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-[11px] font-mono outline-none"
                    >
                      {availableBatches.map((b) => (
                        <option key={b.id} value={b.id}>
                          {b.batchNumber} (Exp: {b.expiryDate} • {b.quantity} left)
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Unit vs Full Pack Selector */}
                  <div>
                    <label className="block text-[10px] uppercase font-bold text-slate-400 mb-0.5">
                      Unit Measure
                    </label>
                    <div className="flex items-center rounded-lg border border-slate-200 dark:border-slate-700 p-0.5 bg-slate-50 dark:bg-slate-900">
                      <button
                        type="button"
                        onClick={() => onUpdateUnitType(item.id, 'pack')}
                        className={`flex-1 py-0.5 text-center rounded text-[10px] font-bold transition ${
                          item.unitType === 'pack'
                            ? 'bg-teal-600 text-white shadow-xs'
                            : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                        }`}
                      >
                        Box / Pack
                      </button>
                      {item.product.packSize > 1 && (
                        <button
                          type="button"
                          onClick={() => onUpdateUnitType(item.id, 'unit')}
                          className={`flex-1 py-0.5 text-center rounded text-[10px] font-bold transition ${
                            item.unitType === 'unit'
                              ? 'bg-teal-600 text-white shadow-xs'
                              : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                          }`}
                        >
                          Loose ({item.product.unitName})
                        </button>
                      )}
                    </div>
                  </div>
                </div>

                {/* Stepper & Line Price */}
                <div className="flex items-center justify-between pt-1 border-t border-slate-100 dark:border-slate-700/60">
                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => onUpdateQuantity(item.id, item.quantity - 1)}
                      className="w-6 h-6 rounded bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-600 flex items-center justify-center text-slate-700 dark:text-slate-200 transition active:scale-95"
                    >
                      <Minus className="w-3 h-3" />
                    </button>
                    <input
                      type="number"
                      min="1"
                      value={item.quantity}
                      onChange={(e) => onUpdateQuantity(item.id, parseFloat(e.target.value) || 1)}
                      className="w-12 text-center py-0.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded text-xs font-bold font-mono outline-none"
                    />
                    <button
                      onClick={() => onUpdateQuantity(item.id, item.quantity + 1)}
                      className="w-6 h-6 rounded bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-600 flex items-center justify-center text-slate-700 dark:text-slate-200 transition active:scale-95"
                    >
                      <Plus className="w-3 h-3" />
                    </button>
                    <span className="text-[11px] text-slate-400 pl-1">
                      @ {formatCurrency(item.unitPrice, currency)}
                    </span>
                  </div>

                  <div className="text-right font-extrabold text-sm font-mono text-slate-900 dark:text-white">
                    {formatCurrency(item.lineTotal, currency)}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Financial Summary & Checkout Footer */}
      <div className="p-4 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 space-y-3">
        {/* Breakdown */}
        <div className="space-y-1.5 text-xs">
          <div className="flex justify-between text-slate-500">
            <span>Subtotal:</span>
            <span className="font-mono font-semibold">{formatCurrency(subtotal, currency)}</span>
          </div>

          <div className="flex justify-between items-center text-slate-500">
            <span>Discount ({currency}):</span>
            <input
              type="number"
              min="0"
              value={discount || ''}
              onChange={(e) => onDiscountChange(parseFloat(e.target.value) || 0)}
              placeholder="0"
              className="w-20 text-right py-0.5 px-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded text-xs font-mono outline-none"
            />
          </div>

          {tax > 0 && (
            <div className="flex justify-between text-slate-500">
              <span>VAT:</span>
              <span className="font-mono font-semibold">{formatCurrency(tax, currency)}</span>
            </div>
          )}

          <div className="flex justify-between items-baseline pt-2 border-t border-slate-100 dark:border-slate-800">
            <span className="text-sm font-extrabold text-slate-800 dark:text-slate-200">Total Due:</span>
            <span className="text-2xl font-black font-mono text-teal-600 dark:text-teal-400">
              {formatCurrency(grandTotal, currency)}
            </span>
          </div>
        </div>

        {/* Big Checkout Trigger Button */}
        <button
          disabled={cartItems.length === 0}
          onClick={onOpenCheckout}
          className="w-full py-3.5 px-4 bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-500 hover:to-emerald-500 disabled:opacity-40 text-white font-extrabold rounded-xl shadow-lg shadow-teal-600/20 transition-all active:scale-[0.99] text-sm flex items-center justify-center gap-2"
        >
          <span>Pay & Checkout (F4)</span>
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
