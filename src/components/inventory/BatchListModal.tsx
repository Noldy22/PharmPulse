import React, { useState } from 'react';
import { Product, Batch } from '../../types';
import { db } from '../../db/db';
import { useLiveQuery } from 'dexie-react-hooks';
import { Calendar, X, AlertTriangle, ShieldCheck, ShieldAlert, Plus } from 'lucide-react';
import { formatCurrency, getExpiryStatus } from '../../lib/formatters';

interface BatchListModalProps {
  product: Product;
  currencySymbol: string;
  tenantId: string;
  onClose: () => void;
}

export const BatchListModal: React.FC<BatchListModalProps> = ({
  product,
  currencySymbol,
  tenantId,
  onClose,
}) => {
  const batches =
    useLiveQuery(
      () => db.batches.where('productId').equals(product.id).toArray(),
      [product.id]
    ) || [];

  const [showAddBatch, setShowAddBatch] = useState(false);
  const [newBatchNo, setNewBatchNo] = useState('');
  const [newExpiry, setNewExpiry] = useState('');
  const [newQty, setNewQty] = useState<number>(10);
  const [newCost, setNewCost] = useState<number>(product.buyingPrice);
  const [newSupplier, setNewSupplier] = useState('');

  const handleToggleQuarantine = async (batch: Batch) => {
    const updatedStatus = !batch.isQuarantined;
    const now = new Date().toISOString();
    await db.batches.update(batch.id, {
      isQuarantined: updatedStatus,
      quarantineReason: updatedStatus ? 'Manually quarantined by pharmacist' : undefined,
      synced: false,
      updated_at: now,
    });
    await db.queueOutbox(tenantId, 'batches', 'UPDATE', batch.id, {
      id: batch.id,
      isQuarantined: updatedStatus,
      updated_at: now,
    });
    await db.logAudit(
      tenantId,
      'BATCH_QUARANTINED',
      'inventory',
      `${updatedStatus ? 'Quarantined' : 'Released'} batch ${batch.batchNumber} for ${product.name}`,
      'Pharmacist'
    );
  };

  const handleAddNewBatch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newBatchNo.trim() || !newExpiry) return;
    const now = new Date().toISOString();
    const batchId = `batch-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
    const batchData: Batch = {
      id: batchId,
      tenantId,
      productId: product.id,
      batchNumber: newBatchNo.trim().toUpperCase(),
      expiryDate: newExpiry,
      quantity: Number(newQty),
      costPrice: Number(newCost),
      supplier: newSupplier.trim() || undefined,
      synced: false,
      created_at: now,
      updated_at: now,
    };
    await db.batches.put(batchData);
    await db.queueOutbox(tenantId, 'batches', 'INSERT', batchId, batchData as unknown as Record<string, unknown>);
    await db.logAudit(
      tenantId,
      'BATCH_ADDED',
      'inventory',
      `Added batch ${batchData.batchNumber} (${batchData.quantity} packs) for ${product.name}`,
      'Pharmacist'
    );
    setShowAddBatch(false);
    setNewBatchNo('');
    setNewExpiry('');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl max-w-2xl w-full overflow-hidden text-slate-800 dark:text-slate-100">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/60">
          <div>
            <h3 className="font-bold text-base flex items-center gap-2">
              <span>{product.name}</span>
              <span className="text-xs font-mono font-normal text-slate-400">({product.sku})</span>
            </h3>
            <p className="text-xs text-slate-500">Batches & Expiry Dates Management (FEFO Sequence)</p>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 p-1">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Active Batches ({batches.length})
            </span>
            <button
              onClick={() => setShowAddBatch(!showAddBatch)}
              className="text-xs font-bold text-teal-600 hover:text-teal-700 dark:text-teal-400 flex items-center gap-1"
            >
              <Plus className="w-3.5 h-3.5" />
              {showAddBatch ? 'Cancel New Batch' : '+ Add New Batch'}
            </button>
          </div>

          {showAddBatch && (
            <form
              onSubmit={handleAddNewBatch}
              className="p-4 rounded-xl bg-teal-50/50 dark:bg-teal-950/20 border border-teal-200 dark:border-teal-800 space-y-3 text-xs"
            >
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-slate-600 dark:text-slate-400 mb-1">Batch Number</label>
                  <input
                    type="text"
                    required
                    value={newBatchNo}
                    onChange={(e) => setNewBatchNo(e.target.value.toUpperCase())}
                    placeholder="e.g. B-2026-90"
                    className="w-full px-2.5 py-1.5 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg font-mono outline-none"
                  />
                </div>
                <div>
                  <label className="block text-slate-600 dark:text-slate-400 mb-1">Expiry Date</label>
                  <input
                    type="date"
                    required
                    value={newExpiry}
                    onChange={(e) => setNewExpiry(e.target.value)}
                    className="w-full px-2.5 py-1.5 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg font-mono outline-none"
                  />
                </div>
                <div>
                  <label className="block text-slate-600 dark:text-slate-400 mb-1">Stock (Packs)</label>
                  <input
                    type="number"
                    min="1"
                    required
                    value={newQty}
                    onChange={(e) => setNewQty(parseFloat(e.target.value) || 0)}
                    className="w-full px-2.5 py-1.5 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg font-mono outline-none"
                  />
                </div>
              </div>
              <div className="flex justify-end">
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-teal-600 hover:bg-teal-500 text-white rounded-lg font-bold shadow-xs text-xs"
                >
                  Save Batch
                </button>
              </div>
            </form>
          )}

          {/* Batches Table */}
          <div className="overflow-x-auto border border-slate-200 dark:border-slate-800 rounded-xl">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-800/60 text-slate-500 uppercase text-[10px] font-bold border-b border-slate-200 dark:border-slate-700">
                  <th className="py-2.5 px-3">Batch Number</th>
                  <th className="py-2.5 px-3">Expiry Date</th>
                  <th className="py-2.5 px-3">Stock (Packs)</th>
                  <th className="py-2.5 px-3">Status</th>
                  <th className="py-2.5 px-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-mono">
                {batches.map((batch) => {
                  const status = getExpiryStatus(batch.expiryDate);
                  return (
                    <tr
                      key={batch.id}
                      className={`hover:bg-slate-50 dark:hover:bg-slate-800/40 ${
                        batch.isQuarantined ? 'opacity-50 line-through bg-slate-50 dark:bg-slate-900/50' : ''
                      }`}
                    >
                      <td className="py-2.5 px-3 font-bold text-slate-900 dark:text-white">
                        {batch.batchNumber}
                      </td>
                      <td className="py-2.5 px-3">
                        <div>{batch.expiryDate}</div>
                        <span className={`inline-block text-[10px] px-1.5 py-0.2 rounded ${status.badgeClass}`}>
                          {status.label}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 font-semibold text-slate-800 dark:text-slate-200">
                        {batch.quantity}
                      </td>
                      <td className="py-2.5 px-3">
                        {batch.isQuarantined ? (
                          <span className="text-[10px] font-bold text-red-600 flex items-center gap-1">
                            <ShieldAlert className="w-3 h-3" /> Quarantined
                          </span>
                        ) : (
                          <span className="text-[10px] font-bold text-emerald-600 flex items-center gap-1">
                            <ShieldCheck className="w-3 h-3" /> Dispensing
                          </span>
                        )}
                      </td>
                      <td className="py-2.5 px-3 text-right">
                        <button
                          onClick={() => handleToggleQuarantine(batch)}
                          className={`text-[10px] font-semibold px-2 py-1 rounded transition ${
                            batch.isQuarantined
                              ? 'bg-emerald-100 text-emerald-800 hover:bg-emerald-200'
                              : 'bg-red-100 text-red-800 hover:bg-red-200'
                          }`}
                        >
                          {batch.isQuarantined ? 'Release' : 'Quarantine'}
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};
