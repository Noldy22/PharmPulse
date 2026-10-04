import React, { useState } from 'react';
import { Product } from '../../types';
import { db } from '../../db/db';
import { DollarSign, X, Check, AlertCircle } from 'lucide-react';
import { formatCurrency } from '../../lib/formatters';

interface QuickPriceAdjustModalProps {
  product: Product;
  currencySymbol: string;
  tenantId: string;
  attendantName: string;
  onSaved: () => void;
  onClose: () => void;
}

export const QuickPriceAdjustModal: React.FC<QuickPriceAdjustModalProps> = ({
  product,
  currencySymbol,
  tenantId,
  attendantName,
  onSaved,
  onClose,
}) => {
  const [sellingPrice, setSellingPrice] = useState<number>(product.sellingPrice);
  const [unitSellingPrice, setUnitSellingPrice] = useState<number>(product.unitSellingPrice);
  const [reason, setReason] = useState<string>('Owner price schedule update');
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    const now = new Date().toISOString();

    const oldPrice = product.sellingPrice;
    await db.products.update(product.id, {
      sellingPrice: Number(sellingPrice),
      unitSellingPrice: Number(unitSellingPrice),
      synced: false,
      updated_at: now,
    });

    await db.queueOutbox(tenantId, 'products', 'UPDATE', product.id, {
      id: product.id,
      sellingPrice: Number(sellingPrice),
      unitSellingPrice: Number(unitSellingPrice),
      updated_at: now,
    });

    await db.logAudit(
      tenantId,
      'PRICE_UPDATED',
      'supervision',
      `Supervisory price change for ${product.name}: ${formatCurrency(oldPrice, currencySymbol)} → ${formatCurrency(sellingPrice, currencySymbol)}. Reason: ${reason}`,
      attendantName,
      product.id
    );

    setSaving(false);
    onSaved();
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl max-w-md w-full overflow-hidden text-slate-800 dark:text-slate-100">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/60">
          <div className="flex items-center gap-2">
            <DollarSign className="w-5 h-5 text-teal-600 dark:text-teal-400" />
            <h3 className="font-bold text-sm">Remote Price Modification</h3>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 p-1">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4 text-xs">
          <div>
            <div className="font-bold text-sm text-slate-900 dark:text-white">{product.name}</div>
            <div className="text-slate-500 italic text-[11px]">{product.genericName} ({product.sku})</div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-slate-500 font-semibold mb-1">
                Selling Price / Pack ({currencySymbol})
              </label>
              <input
                type="number"
                min="0"
                required
                value={sellingPrice}
                onChange={(e) => setSellingPrice(parseFloat(e.target.value) || 0)}
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg font-mono font-bold text-sm outline-none focus:ring-2 focus:ring-teal-500"
              />
            </div>

            <div>
              <label className="block text-slate-500 font-semibold mb-1">
                Loose Unit Price ({currencySymbol})
              </label>
              <input
                type="number"
                min="0"
                value={unitSellingPrice}
                onChange={(e) => setUnitSellingPrice(parseFloat(e.target.value) || 0)}
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg font-mono font-bold text-sm outline-none focus:ring-2 focus:ring-teal-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-slate-500 font-semibold mb-1">Audit Trail Reason</label>
            <input
              type="text"
              required
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg outline-none focus:ring-2 focus:ring-teal-500 text-xs"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-slate-200 dark:border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 rounded-lg font-medium"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-5 py-2 bg-teal-600 hover:bg-teal-500 text-white rounded-lg font-bold shadow flex items-center gap-1.5"
            >
              <Check className="w-4 h-4" />
              {saving ? 'Updating...' : 'Save & Publish Price'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
