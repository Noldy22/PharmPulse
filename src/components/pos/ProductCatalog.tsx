import React, { useState, useMemo, useEffect, useRef } from 'react';
import { Product, Batch, DosageForm } from '../../types';
import { db } from '../../db/db';
import { useLiveQuery } from 'dexie-react-hooks';
import { Search, Plus, AlertCircle, ShieldAlert, Package, Check, Sparkles, Filter } from 'lucide-react';
import { formatCurrency, getExpiryStatus, getDosageFormBadge } from '../../lib/formatters';

interface ProductCatalogProps {
  onAddToCart: (product: Product, batch: Batch, unitType: 'pack' | 'unit', quantity?: number) => void;
  currencySymbol?: string;
}

export const ProductCatalog: React.FC<ProductCatalogProps> = ({ onAddToCart, currencySymbol = 'TSh' }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Live queries for reactive data
  const products = useLiveQuery(() => db.products.toArray(), []) || [];
  const batches = useLiveQuery(() => db.batches.toArray(), []) || [];

  // Group batches by product id
  const batchesByProduct = useMemo(() => {
    const map = new Map<string, Batch[]>();
    for (const b of batches) {
      if (!map.has(b.productId)) map.set(b.productId, []);
      map.get(b.productId)!.push(b);
    }
    return map;
  }, [batches]);

  // Extract distinct categories
  const categories = useMemo(() => {
    const set = new Set<string>();
    products.forEach((p) => {
      if (p.category) set.add(p.category);
    });
    return ['ALL', ...Array.from(set)];
  }, [products]);

  // Filtered products
  const filteredProducts = useMemo(() => {
    const term = searchTerm.toLowerCase().trim();
    return products.filter((p) => {
      const matchesCategory = selectedCategory === 'ALL' || p.category === selectedCategory;
      if (!matchesCategory) return false;

      if (!term) return true;
      return (
        p.name.toLowerCase().includes(term) ||
        p.genericName.toLowerCase().includes(term) ||
        p.sku.toLowerCase().includes(term) ||
        (p.barcode && p.barcode.toLowerCase().includes(term))
      );
    });
  }, [products, searchTerm, selectedCategory]);

  // Fast Barcode Auto-Add or Enter keypress
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && filteredProducts.length > 0) {
      const topMatch = filteredProducts[0];
      const pBatches = batchesByProduct.get(topMatch.id) || [];
      const fefoBatch = getFefoBatchFromList(pBatches);
      if (fefoBatch) {
        onAddToCart(topMatch, fefoBatch, 'pack', 1);
        setSearchTerm('');
      }
    }
  };

  // Helper to pick FEFO batch
  const getFefoBatchFromList = (pBatches: Batch[]): Batch | undefined => {
    const available = pBatches.filter((b) => !b.isQuarantined && b.quantity > 0);
    if (available.length > 0) {
      return [...available].sort((a, b) => a.expiryDate.localeCompare(b.expiryDate))[0];
    }
    return pBatches[0];
  };

  // Focus search box on Mount or when requested
  useEffect(() => {
    searchInputRef.current?.focus();
  }, []);

  return (
    <div className="flex flex-col h-full bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800">
      {/* Search Bar & Fast Filters */}
      <div className="p-3.5 border-b border-slate-200 dark:border-slate-800 space-y-2.5 bg-slate-50/50 dark:bg-slate-900/50">
        <div className="relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
          <input
            ref={searchInputRef}
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Search Brand Name, Generic Formulation, Barcode (Enter to Add)..."
            className="w-full pl-9 pr-20 py-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-sm focus:ring-2 focus:ring-teal-500 focus:border-transparent outline-none transition placeholder:text-slate-400"
          />
          {searchTerm && (
            <button
              onClick={() => setSearchTerm('')}
              className="absolute right-2.5 top-2 text-xs text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 px-1.5 py-0.5 rounded"
            >
              Clear
            </button>
          )}
        </div>

        {/* Category Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none text-xs">
          <Filter className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-2.5 py-1 rounded-full whitespace-nowrap text-[11px] font-semibold transition ${
                selectedCategory === cat
                  ? 'bg-teal-700 text-white shadow-sm'
                  : 'bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Catalog List */}
      <div className="flex-1 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800/80 p-2 space-y-1.5">
        {filteredProducts.length === 0 ? (
          <div className="text-center py-16 px-4">
            <Package className="w-10 h-10 text-slate-300 dark:text-slate-600 mx-auto mb-2" />
            <h4 className="text-sm font-semibold text-slate-700 dark:text-slate-300">No matching medicines found</h4>
            <p className="text-xs text-slate-400 mt-1 max-w-xs mx-auto">
              Try searching with generic active ingredient (e.g. Paracetamol, Amoxicillin) or scan a barcode.
            </p>
          </div>
        ) : (
          filteredProducts.map((product) => {
            const pBatches = batchesByProduct.get(product.id) || [];
            const fefoBatch = getFefoBatchFromList(pBatches);
            const totalStockPacks = pBatches.reduce((acc, b) => acc + (b.isQuarantined ? 0 : b.quantity), 0);
            const isLowStock = totalStockPacks <= product.reorderThreshold;
            const isOutOfStock = totalStockPacks <= 0;
            const dosage = getDosageFormBadge(product.dosageForm);
            const expiryStatus = fefoBatch ? getExpiryStatus(fefoBatch.expiryDate) : null;

            return (
              <div
                key={product.id}
                className={`p-3 rounded-xl border transition-all hover:shadow-sm ${
                  isOutOfStock
                    ? 'bg-slate-50/70 dark:bg-slate-900/40 border-slate-200 dark:border-slate-800 opacity-60'
                    : 'bg-white dark:bg-slate-800/60 border-slate-200/80 dark:border-slate-700/60 hover:border-teal-400'
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-bold text-sm text-slate-900 dark:text-white truncate">
                        {product.name}
                      </span>
                      <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${dosage.color}`}>
                        {dosage.label}
                      </span>
                      {product.isPom && (
                        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-rose-100 text-rose-800 dark:bg-rose-950/80 dark:text-rose-300 flex items-center gap-0.5">
                          <ShieldAlert className="w-3 h-3" /> POM (Rx)
                        </span>
                      )}
                    </div>

                    <div className="text-xs text-slate-500 dark:text-slate-400 truncate mt-0.5 italic">
                      {product.genericName}
                    </div>

                    {/* Stock and FEFO batch indicator */}
                    <div className="flex items-center gap-3 mt-2 text-xs flex-wrap">
                      <span
                        className={`font-semibold ${
                          isOutOfStock
                            ? 'text-red-500'
                            : isLowStock
                            ? 'text-amber-500'
                            : 'text-emerald-600 dark:text-emerald-400'
                        }`}
                      >
                        Stock: {totalStockPacks} pack{totalStockPacks === 1 ? '' : 's'}
                        {product.packSize > 1 && ` (${Math.round(totalStockPacks * product.packSize)} ${product.unitName}s)`}
                      </span>

                      {fefoBatch && expiryStatus && (
                        <span
                          className={`text-[10px] px-2 py-0.5 rounded-full border ${expiryStatus.badgeClass} ${expiryStatus.borderClass}`}
                          title={`Auto-suggested FEFO Batch: ${fefoBatch.batchNumber} (Exp: ${fefoBatch.expiryDate})`}
                        >
                          FEFO: {fefoBatch.batchNumber} • {expiryStatus.label}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Pricing and Quick Add Buttons */}
                  <div className="text-right flex flex-col items-end gap-1.5 flex-shrink-0">
                    <div className="text-xs">
                      <div className="font-extrabold text-sm text-slate-900 dark:text-white font-mono">
                        {formatCurrency(product.sellingPrice, currencySymbol)}
                        <span className="text-[10px] font-normal text-slate-400"> /pack</span>
                      </div>
                      {product.unitSellingPrice > 0 && product.packSize > 1 && (
                        <div className="text-[11px] text-slate-500 font-mono">
                          {formatCurrency(product.unitSellingPrice, currencySymbol)} / {product.unitName}
                        </div>
                      )}
                    </div>

                    {/* Dispense Action Buttons */}
                    <div className="flex items-center gap-1.5 mt-1">
                      {product.packSize > 1 && (
                        <button
                          disabled={isOutOfStock || !fefoBatch}
                          onClick={() => fefoBatch && onAddToCart(product, fefoBatch, 'unit', 1)}
                          className="px-2 py-1 bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-600 disabled:opacity-40 text-slate-700 dark:text-slate-200 rounded text-[11px] font-medium transition active:scale-95"
                          title={`Sell 1 loose ${product.unitName}`}
                        >
                          +1 {product.unitName}
                        </button>
                      )}

                      <button
                        disabled={isOutOfStock || !fefoBatch}
                        onClick={() => fefoBatch && onAddToCart(product, fefoBatch, 'pack', 1)}
                        className="px-2.5 py-1 bg-teal-600 hover:bg-teal-500 disabled:opacity-40 text-white rounded text-xs font-semibold shadow-sm transition active:scale-95 flex items-center gap-1"
                        title="Add 1 full pack to cart"
                      >
                        <Plus className="w-3.5 h-3.5" /> Pack
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
