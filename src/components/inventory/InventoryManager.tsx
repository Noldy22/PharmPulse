import React, { useState, useMemo } from 'react';
import { Product, Batch, DosageForm, StoreSettings, StoreLicense } from '../../types';
import { db } from '../../db/db';
import { useLiveQuery } from 'dexie-react-hooks';
import {
  Boxes,
  Search,
  Plus,
  Sliders,
  Filter,
  Package,
  Layers,
  Edit2,
  AlertCircle,
  Download,
} from 'lucide-react';
import { formatCurrency, getDosageFormBadge } from '../../lib/formatters';
import { ProductModal } from './ProductModal';
import { StockAdjustmentModal } from './StockAdjustmentModal';
import { BatchListModal } from './BatchListModal';

interface InventoryManagerProps {
  settings: StoreSettings | null;
  license: StoreLicense | null;
}

export const InventoryManager: React.FC<InventoryManagerProps> = ({ settings, license }) => {
  const currency = settings?.currencySymbol || 'TSh';
  const tenantId = license?.tenantId || settings?.tenantId || 'demo-tenant-pharmpulse';
  const currentAttendant = settings?.currentAttendant || 'Pharmacist';

  // Live query for products and batches
  const products = useLiveQuery(() => db.products.toArray(), []) || [];
  const batches = useLiveQuery(() => db.batches.toArray(), []) || [];

  // Group batches by product
  const batchesByProduct = useMemo(() => {
    const map = new Map<string, Batch[]>();
    for (const b of batches) {
      if (!map.has(b.productId)) map.set(b.productId, []);
      map.get(b.productId)!.push(b);
    }
    return map;
  }, [batches]);

  // Filters state
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStockStatus, setFilterStockStatus] = useState<'all' | 'low' | 'out'>('all');
  const [filterDosage, setFilterDosage] = useState<string>('all');

  // Modals state
  const [isProductModalOpen, setIsProductModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [isAdjustmentModalOpen, setIsAdjustmentModalOpen] = useState(false);
  const [selectedProductForBatch, setSelectedProductForBatch] = useState<Product | null>(null);

  // Filtered products list
  const filteredProducts = useMemo(() => {
    const term = searchTerm.toLowerCase().trim();
    return products.filter((p) => {
      // Dosage form match
      if (filterDosage !== 'all' && p.dosageForm !== filterDosage) return false;

      // Stock status match
      const pBatches = batchesByProduct.get(p.id) || [];
      const totalStock = pBatches.reduce((acc, b) => acc + (b.isQuarantined ? 0 : b.quantity), 0);

      if (filterStockStatus === 'out' && totalStock > 0) return false;
      if (filterStockStatus === 'low' && (totalStock > p.reorderThreshold || totalStock <= 0)) return false;

      // Search match
      if (!term) return true;
      return (
        p.name.toLowerCase().includes(term) ||
        p.genericName.toLowerCase().includes(term) ||
        p.sku.toLowerCase().includes(term) ||
        (p.barcode && p.barcode.toLowerCase().includes(term))
      );
    });
  }, [products, batchesByProduct, searchTerm, filterStockStatus, filterDosage]);

  // CSV Export
  const handleExportCSV = () => {
    const headers = [
      'SKU',
      'Brand Name',
      'Generic Name',
      'Dosage Form',
      'Pack Size',
      'Loose Unit',
      'Stock (Packs)',
      'Reorder Threshold',
      'Cost Price',
      'Selling Price (Pack)',
      'Unit Price',
      'POM Status',
    ];

    const rows = products.map((p) => {
      const pBatches = batchesByProduct.get(p.id) || [];
      const stock = pBatches.reduce((acc, b) => acc + (b.isQuarantined ? 0 : b.quantity), 0);
      return [
        p.sku,
        `"${p.name.replace(/"/g, '""')}"`,
        `"${p.genericName.replace(/"/g, '""')}"`,
        p.dosageForm,
        p.packSize,
        p.unitName,
        stock,
        p.reorderThreshold,
        p.buyingPrice,
        p.sellingPrice,
        p.unitSellingPrice,
        p.isPom ? 'YES' : 'NO',
      ].join(',');
    });

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `pharmpulse_inventory_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="flex-1 flex flex-col h-[calc(100vh-4rem)] overflow-hidden bg-slate-50 dark:bg-slate-950">
      {/* Top Controls Bar */}
      <div className="p-4 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-teal-50 dark:bg-teal-950/40 text-teal-600 dark:text-teal-400 flex items-center justify-center font-bold">
            <Boxes className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-bold text-slate-900 dark:text-white">
              Pharmacy Inventory & Stock Controls
            </h2>
            <p className="text-xs text-slate-500">
              Formulary management, packaging unit conversion & multi-batch stock tracking
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2">
          <button
            onClick={handleExportCSV}
            className="flex items-center gap-1.5 px-3 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-lg text-xs font-semibold transition"
          >
            <Download className="w-3.5 h-3.5" /> Export CSV
          </button>

          <button
            onClick={() => setIsAdjustmentModalOpen(true)}
            className="flex items-center gap-1.5 px-3 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-lg text-xs font-semibold transition"
          >
            <Sliders className="w-3.5 h-3.5" /> Adjust Stock / Damage
          </button>

          <button
            onClick={() => {
              setEditingProduct(null);
              setIsProductModalOpen(true);
            }}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-teal-600 hover:bg-teal-500 text-white rounded-lg text-xs font-bold shadow transition active:scale-95"
          >
            <Plus className="w-4 h-4" /> Add Formulary Drug
          </button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="p-3 bg-slate-100/70 dark:bg-slate-900/60 border-b border-slate-200 dark:border-slate-800 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 text-xs">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search by Brand Name, Generic Formulation, SKU, Barcode..."
            className="w-full pl-9 pr-3 py-1.5 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-xs outline-none focus:ring-2 focus:ring-teal-500"
          />
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {/* Stock status filter buttons */}
          <div className="flex items-center rounded-lg border border-slate-200 dark:border-slate-700 p-0.5 bg-white dark:bg-slate-800">
            <button
              onClick={() => setFilterStockStatus('all')}
              className={`px-2.5 py-1 rounded text-xs font-medium transition ${
                filterStockStatus === 'all'
                  ? 'bg-teal-600 text-white'
                  : 'text-slate-600 dark:text-slate-300'
              }`}
            >
              All Items ({products.length})
            </button>
            <button
              onClick={() => setFilterStockStatus('low')}
              className={`px-2.5 py-1 rounded text-xs font-medium transition ${
                filterStockStatus === 'low'
                  ? 'bg-amber-600 text-white'
                  : 'text-slate-600 dark:text-slate-300'
              }`}
            >
              Low Stock
            </button>
            <button
              onClick={() => setFilterStockStatus('out')}
              className={`px-2.5 py-1 rounded text-xs font-medium transition ${
                filterStockStatus === 'out'
                  ? 'bg-red-600 text-white'
                  : 'text-slate-600 dark:text-slate-300'
              }`}
            >
              Out of Stock
            </button>
          </div>

          {/* Dosage Form Filter */}
          <select
            value={filterDosage}
            onChange={(e) => setFilterDosage(e.target.value)}
            className="px-2.5 py-1 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-xs outline-none"
          >
            <option value="all">All Dosage Forms</option>
            <option value="tablets">Tablets</option>
            <option value="capsules">Capsules</option>
            <option value="syrup">Syrups & Suspensions</option>
            <option value="ampoules">Injections / Ampoules</option>
            <option value="inhaler">Inhalers</option>
            <option value="cream">Topicals & Creams</option>
          </select>
        </div>
      </div>

      {/* Main Inventory Data Table */}
      <div className="flex-1 overflow-auto p-4">
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-xs overflow-hidden">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-50 dark:bg-slate-800/60 text-slate-500 uppercase text-[10px] font-bold border-b border-slate-200 dark:border-slate-800">
                <th className="py-3 px-3">Item / Generic Name</th>
                <th className="py-3 px-3">SKU / Code</th>
                <th className="py-3 px-3">Dosage & Pack</th>
                <th className="py-3 px-3 text-center">Stock on Hand</th>
                <th className="py-3 px-3 text-center">Threshold</th>
                <th className="py-3 px-3 text-right">Cost Price</th>
                <th className="py-3 px-3 text-right">Selling Price</th>
                <th className="py-3 px-3 text-right">Unit Price</th>
                <th className="py-3 px-3 text-center">Batches</th>
                <th className="py-3 px-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {filteredProducts.length === 0 ? (
                <tr>
                  <td colSpan={10} className="py-12 text-center text-slate-400">
                    No medications match current filters.
                  </td>
                </tr>
              ) : (
                filteredProducts.map((p) => {
                  const pBatches = batchesByProduct.get(p.id) || [];
                  const totalStock = pBatches.reduce(
                    (acc, b) => acc + (b.isQuarantined ? 0 : b.quantity),
                    0
                  );
                  const isLow = totalStock <= p.reorderThreshold && totalStock > 0;
                  const isOut = totalStock <= 0;
                  const dosageBadge = getDosageFormBadge(p.dosageForm);

                  return (
                    <tr
                      key={p.id}
                      className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition"
                    >
                      <td className="py-3 px-3">
                        <div className="font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                          <span>{p.name}</span>
                          {p.isPom && (
                            <span className="text-[9px] font-bold px-1 rounded bg-rose-100 text-rose-800 dark:bg-rose-950/80 dark:text-rose-300">
                              POM
                            </span>
                          )}
                        </div>
                        <div className="text-[11px] text-slate-400 italic">{p.genericName}</div>
                      </td>

                      <td className="py-3 px-3 font-mono text-[11px] text-slate-600 dark:text-slate-400">
                        {p.sku}
                      </td>

                      <td className="py-3 px-3">
                        <span className={`inline-block text-[10px] font-bold px-1.5 py-0.5 rounded ${dosageBadge.color}`}>
                          {dosageBadge.label}
                        </span>
                        <div className="text-[10px] text-slate-400 mt-0.5">
                          {p.packSize} {p.unitName}s/box
                        </div>
                      </td>

                      <td className="py-3 px-3 text-center font-mono font-bold">
                        <span
                          className={`inline-block px-2 py-0.5 rounded-full text-xs ${
                            isOut
                              ? 'bg-red-100 text-red-800 dark:bg-red-950/80 dark:text-red-300'
                              : isLow
                              ? 'bg-amber-100 text-amber-800 dark:bg-amber-950/80 dark:text-amber-300'
                              : 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/80 dark:text-emerald-300'
                          }`}
                        >
                          {totalStock} pk
                        </span>
                        {p.packSize > 1 && totalStock > 0 && (
                          <div className="text-[10px] text-slate-400 font-normal">
                            ({Math.round(totalStock * p.packSize)} {p.unitName}s)
                          </div>
                        )}
                      </td>

                      <td className="py-3 px-3 text-center font-mono text-slate-400">
                        {p.reorderThreshold}
                      </td>

                      <td className="py-3 px-3 text-right font-mono text-slate-500">
                        {formatCurrency(p.buyingPrice, currency)}
                      </td>

                      <td className="py-3 px-3 text-right font-mono font-bold text-slate-900 dark:text-white">
                        {formatCurrency(p.sellingPrice, currency)}
                      </td>

                      <td className="py-3 px-3 text-right font-mono text-slate-600 dark:text-slate-300">
                        {p.packSize > 1 ? formatCurrency(p.unitSellingPrice, currency) : '-'}
                      </td>

                      <td className="py-3 px-3 text-center">
                        <button
                          onClick={() => setSelectedProductForBatch(p)}
                          className="px-2 py-1 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded text-[11px] font-semibold transition"
                        >
                          {pBatches.length} batch(es)
                        </button>
                      </td>

                      <td className="py-3 px-3 text-right">
                        <button
                          onClick={() => {
                            setEditingProduct(p);
                            setIsProductModalOpen(true);
                          }}
                          className="p-1.5 text-slate-400 hover:text-teal-600 hover:bg-slate-100 dark:hover:bg-slate-800 rounded transition"
                          title="Edit product formulation"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
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

      {/* Product Formulary Add/Edit Modal */}
      {isProductModalOpen && (
        <ProductModal
          isOpen={isProductModalOpen}
          productToEdit={editingProduct}
          currencySymbol={currency}
          tenantId={tenantId}
          onSave={() => setIsProductModalOpen(false)}
          onClose={() => setIsProductModalOpen(false)}
        />
      )}

      {/* Stock Adjustment Modal */}
      {isAdjustmentModalOpen && (
        <StockAdjustmentModal
          isOpen={isAdjustmentModalOpen}
          tenantId={tenantId}
          attendantName={currentAttendant}
          onSaved={() => setIsAdjustmentModalOpen(false)}
          onClose={() => setIsAdjustmentModalOpen(false)}
        />
      )}

      {/* Batches Modal */}
      {selectedProductForBatch && (
        <BatchListModal
          product={selectedProductForBatch}
          currencySymbol={currency}
          tenantId={tenantId}
          onClose={() => setSelectedProductForBatch(null)}
        />
      )}
    </div>
  );
};
