import React, { useState, useMemo } from 'react';
import { Product, Batch, StockAdjustmentType } from '../../types';
import { db } from '../../db/db';
import { useLiveQuery } from 'dexie-react-hooks';
import { AlertCircle, Sliders, Check, X, ShieldAlert } from 'lucide-react';

interface StockAdjustmentModalProps {
  isOpen: boolean;
  preselectedProduct?: Product | null;
  tenantId: string;
  attendantName: string;
  onSaved: () => void;
  onClose: () => void;
}

export const StockAdjustmentModal: React.FC<StockAdjustmentModalProps> = ({
  isOpen,
  preselectedProduct,
  tenantId,
  attendantName,
  onSaved,
  onClose,
}) => {
  const products = useLiveQuery(() => db.products.toArray(), []) || [];
  const batches = useLiveQuery(() => db.batches.toArray(), []) || [];

  const [selectedProductId, setSelectedProductId] = useState<string>(
    preselectedProduct?.id || products[0]?.id || ''
  );
  const [selectedBatchId, setSelectedBatchId] = useState<string>('');
  const [adjustmentType, setAdjustmentType] = useState<StockAdjustmentType>('damage');
  const [quantityChange, setQuantityChange] = useState<number>(-1);
  const [reason, setReason] = useState<string>('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Available batches for selected product
  const productBatches = useMemo(() => {
    return batches.filter((b) => b.productId === selectedProductId);
  }, [batches, selectedProductId]);

  // Set default batch
  React.useEffect(() => {
    if (productBatches.length > 0 && !selectedBatchId) {
      setSelectedBatchId(productBatches[0].id);
    }
  }, [productBatches, selectedBatchId]);

  if (!isOpen) return null;

  const currentBatch = batches.find((b) => b.id === selectedBatchId);
  const currentProduct = products.find((p) => p.id === selectedProductId);

  const previousQty = currentBatch?.quantity || 0;
  const newQty = Math.max(0, previousQty + Number(quantityChange));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProductId || !selectedBatchId) {
      setError('Please select a product and batch to adjust.');
      return;
    }
    if (!reason.trim()) {
      setError('Please provide a reason or incident explanation for the audit log.');
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      await db.adjustStock({
        tenantId,
        productId: selectedProductId,
        batchId: selectedBatchId,
        adjustmentType,
        quantityChange: Number(quantityChange),
        reason: reason.trim(),
        attendantName,
      });

      onSaved();
      onClose();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Adjustment failed');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl max-w-lg w-full overflow-hidden text-slate-800 dark:text-slate-100">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/60">
          <div className="flex items-center gap-2">
            <Sliders className="w-5 h-5 text-teal-600 dark:text-teal-400" />
            <h3 className="font-bold text-base">Log Stock Adjustment / Damage</h3>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 p-1">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4 text-xs">
          {error && (
            <div className="p-3 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 rounded-lg text-red-600 dark:text-red-300 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Select Product */}
          <div>
            <label className="block font-bold uppercase tracking-wider text-slate-500 mb-1">
              Drug Formulary Item
            </label>
            <select
              value={selectedProductId}
              onChange={(e) => {
                setSelectedProductId(e.target.value);
                setSelectedBatchId('');
              }}
              className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg outline-none font-semibold"
            >
              {products.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} ({p.sku})
                </option>
              ))}
            </select>
          </div>

          {/* Select Batch */}
          <div>
            <label className="block font-bold uppercase tracking-wider text-slate-500 mb-1">
              Target Batch (FEFO Identifier)
            </label>
            <select
              value={selectedBatchId}
              onChange={(e) => setSelectedBatchId(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg font-mono outline-none"
            >
              {productBatches.map((b) => (
                <option key={b.id} value={b.id}>
                  Batch: {b.batchNumber} (Current Qty: {b.quantity} packs • Exp: {b.expiryDate})
                </option>
              ))}
            </select>
          </div>

          {/* Adjustment Reason Type */}
          <div>
            <label className="block font-bold uppercase tracking-wider text-slate-500 mb-1">
              Adjustment Incident Type
            </label>
            <select
              value={adjustmentType}
              onChange={(e) => {
                const t = e.target.value as StockAdjustmentType;
                setAdjustmentType(t);
                if (t === 'restock') {
                  if (quantityChange < 0) setQuantityChange(Math.abs(quantityChange));
                } else {
                  if (quantityChange > 0) setQuantityChange(-quantityChange);
                }
              }}
              className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg outline-none font-semibold"
            >
              <option value="damage">Damage / Broken Packaging (Deduct)</option>
              <option value="theft_loss">Theft / Unaccounted Shortage (Deduct)</option>
              <option value="expiry_disposal">Expired Drug Destruction / Quarantine (Deduct)</option>
              <option value="supplier_return">Return to Supplier / Recall (Deduct)</option>
              <option value="reconciliation">Audit Count Reconciliation (Direct Adjust)</option>
              <option value="restock">Direct Restock Inflow (Add)</option>
            </select>
          </div>

          {/* Quantity Change and Live Preview */}
          <div className="grid grid-cols-2 gap-3 p-3.5 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-slate-200 dark:border-slate-800">
            <div>
              <label className="block text-slate-500 mb-1">Quantity Change (Packs)</label>
              <input
                type="number"
                step="any"
                required
                value={quantityChange}
                onChange={(e) => setQuantityChange(parseFloat(e.target.value) || 0)}
                className="w-full px-3 py-1.5 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg font-mono font-bold text-sm outline-none"
              />
            </div>

            <div>
              <label className="block text-slate-500 mb-1">Resulting Batch Stock</label>
              <div className="py-1.5 px-3 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg font-mono text-sm font-extrabold text-teal-600 dark:text-teal-400">
                {previousQty} → {newQty} packs
              </div>
            </div>
          </div>

          {/* Reason text */}
          <div>
            <label className="block font-bold uppercase tracking-wider text-slate-500 mb-1">
              Detailed Reason / Attendant Notes <span className="text-red-500">*</span>
            </label>
            <textarea
              required
              rows={2}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="e.g. Broken ampoules during shelf restocking or periodic stock-take discrepancy..."
              className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg outline-none focus:ring-2 focus:ring-teal-500"
            />
          </div>

          <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-200 dark:border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-300 rounded-lg font-medium transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-5 py-2 bg-teal-600 hover:bg-teal-500 disabled:opacity-50 text-white rounded-lg font-bold shadow transition flex items-center gap-1.5"
            >
              <Check className="w-4 h-4" />
              {submitting ? 'Updating...' : 'Confirm Stock Adjustment'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
