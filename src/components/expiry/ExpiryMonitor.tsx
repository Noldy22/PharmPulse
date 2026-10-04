import React, { useState, useMemo } from 'react';
import { Product, Batch, StoreSettings, StoreLicense } from '../../types';
import { db } from '../../db/db';
import { useLiveQuery } from 'dexie-react-hooks';
import {
  AlertTriangle,
  AlertCircle,
  Calendar,
  ShieldAlert,
  ShieldCheck,
  Search,
  Filter,
  Trash2,
  CheckCircle2,
  ArrowUpDown,
} from 'lucide-react';
import { formatCurrency, getExpiryStatus, ExpiryUrgency } from '../../lib/formatters';

interface ExpiryMonitorProps {
  settings: StoreSettings | null;
  license: StoreLicense | null;
}

export const ExpiryMonitor: React.FC<ExpiryMonitorProps> = ({ settings, license }) => {
  const currency = settings?.currencySymbol || 'TSh';
  const tenantId = license?.tenantId || settings?.tenantId || 'demo-tenant-pharmpulse';

  const batches = useLiveQuery(() => db.batches.toArray(), []) || [];
  const products = useLiveQuery(() => db.products.toArray(), []) || [];

  const [filterUrgency, setFilterUrgency] = useState<ExpiryUrgency | 'all'>('all');
  const [searchTerm, setSearchTerm] = useState('');

  // Map products by ID
  const productsMap = useMemo(() => {
    const map = new Map<string, Product>();
    for (const p of products) {
      map.set(p.id, p);
    }
    return map;
  }, [products]);

  // Enriched batches with product metadata and expiry stats
  const enrichedBatches = useMemo(() => {
    return batches.map((b) => {
      const product = productsMap.get(b.productId);
      const status = getExpiryStatus(b.expiryDate);
      return {
        ...b,
        product,
        productName: product?.name || 'Unknown Medicine',
        genericName: product?.genericName || '',
        category: product?.category || '',
        status,
      };
    });
  }, [batches, productsMap]);

  // Counts by urgency
  const counts = useMemo(() => {
    let expired = 0;
    let critical = 0;
    let warning = 0;
    let safe = 0;

    for (const eb of enrichedBatches) {
      if (eb.isQuarantined) continue;
      if (eb.status.urgency === 'expired') expired++;
      else if (eb.status.urgency === 'critical') critical++;
      else if (eb.status.urgency === 'warning') warning++;
      else safe++;
    }

    return { expired, critical, warning, safe, total: enrichedBatches.length };
  }, [enrichedBatches]);

  // Filtered and sorted by FEFO (earliest expiry first)
  const filteredBatches = useMemo(() => {
    const term = searchTerm.toLowerCase().trim();
    return enrichedBatches
      .filter((b) => {
        if (filterUrgency !== 'all' && b.status.urgency !== filterUrgency) return false;
        if (!term) return true;
        return (
          b.productName.toLowerCase().includes(term) ||
          b.genericName.toLowerCase().includes(term) ||
          b.batchNumber.toLowerCase().includes(term)
        );
      })
      .sort((a, b) => a.expiryDate.localeCompare(b.expiryDate));
  }, [enrichedBatches, filterUrgency, searchTerm]);

  // Quarantine batch action
  const handleToggleQuarantine = async (batchId: string, currentQuarantined?: boolean) => {
    const nextStatus = !currentQuarantined;
    const now = new Date().toISOString();
    await db.batches.update(batchId, {
      isQuarantined: nextStatus,
      quarantineReason: nextStatus ? 'Quarantined due to expiration / safety alert' : undefined,
      synced: false,
      updated_at: now,
    });
    await db.queueOutbox(tenantId, 'batches', 'UPDATE', batchId, {
      id: batchId,
      isQuarantined: nextStatus,
      updated_at: now,
    });
    await db.logAudit(
      tenantId,
      'BATCH_QUARANTINED',
      'inventory',
      `${nextStatus ? 'Quarantined' : 'Restored'} batch ${batchId}`,
      'Pharmacist'
    );
  };

  return (
    <div className="flex-1 flex flex-col h-[calc(100vh-4rem)] overflow-hidden bg-slate-50 dark:bg-slate-950">
      {/* Header */}
      <div className="p-4 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 flex items-center justify-center font-bold">
            <AlertTriangle className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-bold text-slate-900 dark:text-white">
              Expiry & FEFO Control Monitor
            </h2>
            <p className="text-xs text-slate-500">
              First-Expiring, First-Out lifecycle governance, early risk warnings & batch quarantine
            </p>
          </div>
        </div>
      </div>

      {/* KPI Cards for Expiry Buckets */}
      <div className="p-4 grid grid-cols-2 sm:grid-cols-4 gap-3 bg-slate-100/60 dark:bg-slate-900/40 border-b border-slate-200 dark:border-slate-800">
        <button
          onClick={() => setFilterUrgency(filterUrgency === 'expired' ? 'all' : 'expired')}
          className={`p-3 rounded-xl border text-left transition-all ${
            filterUrgency === 'expired'
              ? 'ring-2 ring-red-500 shadow-md bg-red-50 dark:bg-red-950/40 border-red-300 dark:border-red-800'
              : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 hover:border-red-300'
          }`}
        >
          <div className="flex items-center justify-between text-xs font-bold text-red-600 dark:text-red-400">
            <span>Expired (Past Date)</span>
            <AlertCircle className="w-4 h-4" />
          </div>
          <div className="text-2xl font-black font-mono text-red-600 dark:text-red-400 mt-1">
            {counts.expired}
          </div>
          <div className="text-[10px] text-slate-400 mt-0.5">Immediate Quarantine Req.</div>
        </button>

        <button
          onClick={() => setFilterUrgency(filterUrgency === 'critical' ? 'all' : 'critical')}
          className={`p-3 rounded-xl border text-left transition-all ${
            filterUrgency === 'critical'
              ? 'ring-2 ring-orange-500 shadow-md bg-orange-50 dark:bg-orange-950/40 border-orange-300 dark:border-orange-800'
              : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 hover:border-orange-300'
          }`}
        >
          <div className="flex items-center justify-between text-xs font-bold text-orange-600 dark:text-orange-400">
            <span>Critical (≤ 30 Days)</span>
            <AlertTriangle className="w-4 h-4" />
          </div>
          <div className="text-2xl font-black font-mono text-orange-600 dark:text-orange-400 mt-1">
            {counts.critical}
          </div>
          <div className="text-[10px] text-slate-400 mt-0.5">FEFO Fast-Track Dispense</div>
        </button>

        <button
          onClick={() => setFilterUrgency(filterUrgency === 'warning' ? 'all' : 'warning')}
          className={`p-3 rounded-xl border text-left transition-all ${
            filterUrgency === 'warning'
              ? 'ring-2 ring-amber-500 shadow-md bg-amber-50 dark:bg-amber-950/40 border-amber-300 dark:border-amber-800'
              : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 hover:border-amber-300'
          }`}
        >
          <div className="flex items-center justify-between text-xs font-bold text-amber-600 dark:text-amber-400">
            <span>Warning (≤ 90 Days)</span>
            <Calendar className="w-4 h-4" />
          </div>
          <div className="text-2xl font-black font-mono text-amber-600 dark:text-amber-400 mt-1">
            {counts.warning}
          </div>
          <div className="text-[10px] text-slate-400 mt-0.5">Prioritize Counter Sales</div>
        </button>

        <button
          onClick={() => setFilterUrgency(filterUrgency === 'safe' ? 'all' : 'safe')}
          className={`p-3 rounded-xl border text-left transition-all ${
            filterUrgency === 'safe'
              ? 'ring-2 ring-emerald-500 shadow-md bg-emerald-50 dark:bg-emerald-950/40 border-emerald-300 dark:border-emerald-800'
              : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 hover:border-emerald-300'
          }`}
        >
          <div className="flex items-center justify-between text-xs font-bold text-emerald-600 dark:text-emerald-400">
            <span>Safe Shelf Life (&gt; 90d)</span>
            <CheckCircle2 className="w-4 h-4" />
          </div>
          <div className="text-2xl font-black font-mono text-emerald-600 dark:text-emerald-400 mt-1">
            {counts.safe}
          </div>
          <div className="text-[10px] text-slate-400 mt-0.5">Optimal Shelf Stability</div>
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className="p-3 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between gap-3 text-xs">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search by Medicine Name, Formulation, Batch ID..."
            className="w-full pl-9 pr-3 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-xs outline-none focus:ring-2 focus:ring-teal-500"
          />
        </div>

        <div className="text-xs text-slate-500">
          Showing <span className="font-bold text-slate-800 dark:text-slate-200">{filteredBatches.length}</span>{' '}
          monitored batch(es)
        </div>
      </div>

      {/* Batches Table */}
      <div className="flex-1 overflow-auto p-4">
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-xs overflow-hidden">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-50 dark:bg-slate-800/60 text-slate-500 uppercase text-[10px] font-bold border-b border-slate-200 dark:border-slate-800">
                <th className="py-3 px-3">Medicine Description</th>
                <th className="py-3 px-3">Batch Number</th>
                <th className="py-3 px-3">Expiration Date</th>
                <th className="py-3 px-3">Urgency Warning</th>
                <th className="py-3 px-3 text-center">Stock On Hand</th>
                <th className="py-3 px-3 text-right">Batch Value</th>
                <th className="py-3 px-3 text-center">Status</th>
                <th className="py-3 px-3 text-right">Quarantine Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {filteredBatches.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-400">
                    No batches match the selected criteria.
                  </td>
                </tr>
              ) : (
                filteredBatches.map((b) => {
                  const batchTotalValue = (b.quantity || 0) * (b.product?.sellingPrice || 0);

                  return (
                    <tr
                      key={b.id}
                      className={`hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition ${
                        b.isQuarantined ? 'opacity-60 bg-slate-50 dark:bg-slate-900/60' : ''
                      }`}
                    >
                      <td className="py-3 px-3">
                        <div className="font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                          <span>{b.productName}</span>
                          {b.product?.isPom && (
                            <span className="text-[9px] font-bold px-1 rounded bg-rose-100 text-rose-800 dark:bg-rose-950/80 dark:text-rose-300">
                              POM
                            </span>
                          )}
                        </div>
                        <div className="text-[11px] text-slate-400 italic">{b.genericName}</div>
                      </td>

                      <td className="py-3 px-3 font-mono font-bold text-slate-700 dark:text-slate-300">
                        {b.batchNumber}
                      </td>

                      <td className="py-3 px-3 font-mono">
                        <div>{b.expiryDate}</div>
                      </td>

                      <td className="py-3 px-3">
                        <span
                          className={`inline-block px-2.5 py-0.5 rounded-full text-[11px] border ${b.status.badgeClass} ${b.status.borderClass}`}
                        >
                          {b.status.label}
                        </span>
                      </td>

                      <td className="py-3 px-3 text-center font-mono font-bold text-slate-800 dark:text-slate-200">
                        {b.quantity} packs
                      </td>

                      <td className="py-3 px-3 text-right font-mono text-slate-600 dark:text-slate-400">
                        {formatCurrency(batchTotalValue, currency)}
                      </td>

                      <td className="py-3 px-3 text-center">
                        {b.isQuarantined ? (
                          <span className="inline-flex items-center gap-1 text-[10px] font-bold text-red-600 bg-red-50 dark:bg-red-950/50 px-2 py-0.5 rounded-full border border-red-200 dark:border-red-800">
                            <ShieldAlert className="w-3 h-3" /> Quarantined
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-600 bg-emerald-50 dark:bg-emerald-950/50 px-2 py-0.5 rounded-full border border-emerald-200 dark:border-emerald-800">
                            <ShieldCheck className="w-3 h-3" /> Dispensing
                          </span>
                        )}
                      </td>

                      <td className="py-3 px-3 text-right">
                        <button
                          onClick={() => handleToggleQuarantine(b.id, b.isQuarantined)}
                          className={`px-2.5 py-1 rounded text-xs font-semibold transition active:scale-95 ${
                            b.isQuarantined
                              ? 'bg-emerald-600 hover:bg-emerald-500 text-white'
                              : 'bg-red-100 hover:bg-red-200 dark:bg-red-950/60 dark:hover:bg-red-900 text-red-700 dark:text-red-300'
                          }`}
                        >
                          {b.isQuarantined ? 'Release Batch' : 'Quarantine Batch'}
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
