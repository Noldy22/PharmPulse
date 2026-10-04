import React, { useState } from 'react';
import { Product, Batch, DosageForm } from '../../types';
import { db } from '../../db/db';
import { Package, X, Check, Plus, Calendar, AlertCircle } from 'lucide-react';

interface ProductModalProps {
  isOpen: boolean;
  productToEdit?: Product | null;
  currencySymbol: string;
  tenantId: string;
  onSave: () => void;
  onClose: () => void;
}

export const ProductModal: React.FC<ProductModalProps> = ({
  isOpen,
  productToEdit,
  currencySymbol,
  tenantId,
  onSave,
  onClose,
}) => {
  const [name, setName] = useState(productToEdit?.name || '');
  const [genericName, setGenericName] = useState(productToEdit?.genericName || '');
  const [sku, setSku] = useState(productToEdit?.sku || '');
  const [barcode, setBarcode] = useState(productToEdit?.barcode || '');
  const [category, setCategory] = useState(productToEdit?.category || 'Antibiotics');
  const [dosageForm, setDosageForm] = useState<DosageForm>(productToEdit?.dosageForm || 'tablets');
  const [packSize, setPackSize] = useState<number>(productToEdit?.packSize || 10);
  const [unitName, setUnitName] = useState(productToEdit?.unitName || 'Tablet');
  const [reorderThreshold, setReorderThreshold] = useState<number>(productToEdit?.reorderThreshold || 10);
  const [buyingPrice, setBuyingPrice] = useState<number>(productToEdit?.buyingPrice || 0);
  const [sellingPrice, setSellingPrice] = useState<number>(productToEdit?.sellingPrice || 0);
  const [unitSellingPrice, setUnitSellingPrice] = useState<number>(productToEdit?.unitSellingPrice || 0);
  const [isPom, setIsPom] = useState<boolean>(productToEdit?.isPom || false);
  const [description, setDescription] = useState(productToEdit?.description || '');

  // Initial Batch (if creating new product)
  const [batchNumber, setBatchNumber] = useState(`B-${new Date().getFullYear()}-${Math.floor(100 + Math.random() * 900)}`);
  const [expiryDate, setExpiryDate] = useState(() => {
    const d = new Date();
    d.setFullYear(d.getFullYear() + 2);
    return d.toISOString().split('T')[0];
  });
  const [initialQty, setInitialQty] = useState<number>(20);

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !genericName.trim() || !sku.trim()) {
      setError('Please provide Drug Name, Generic Formulation, and SKU.');
      return;
    }

    setSaving(true);
    setError(null);

    const now = new Date().toISOString();
    const prodId = productToEdit ? productToEdit.id : `prod-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;

    const productData: Product = {
      id: prodId,
      tenantId,
      name: name.trim(),
      genericName: genericName.trim(),
      sku: sku.trim().toUpperCase(),
      barcode: barcode.trim() || undefined,
      category: category.trim(),
      dosageForm,
      packSize: Number(packSize) || 1,
      unitName: unitName.trim() || 'Unit',
      reorderThreshold: Number(reorderThreshold) || 5,
      buyingPrice: Number(buyingPrice) || 0,
      sellingPrice: Number(sellingPrice) || 0,
      unitSellingPrice: Number(unitSellingPrice) || 0,
      isPom,
      description: description.trim() || undefined,
      synced: false,
      created_at: productToEdit ? productToEdit.created_at : now,
      updated_at: now,
    };

    try {
      if (productToEdit) {
        await db.products.put(productData);
        await db.queueOutbox(tenantId, 'products', 'UPDATE', prodId, productData as unknown as Record<string, unknown>);
        await db.logAudit(
          tenantId,
          'PRODUCT_UPDATED',
          'inventory',
          `Updated formulary item: ${productData.name} (${productData.sku})`,
          'Admin'
        );
      } else {
        await db.products.put(productData);
        await db.queueOutbox(tenantId, 'products', 'INSERT', prodId, productData as unknown as Record<string, unknown>);

        // Also create initial batch
        if (batchNumber.trim() && expiryDate && initialQty > 0) {
          const batchId = `batch-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
          const batchData: Batch = {
            id: batchId,
            tenantId,
            productId: prodId,
            batchNumber: batchNumber.trim().toUpperCase(),
            expiryDate,
            quantity: Number(initialQty),
            costPrice: Number(buyingPrice),
            synced: false,
            created_at: now,
            updated_at: now,
          };
          await db.batches.put(batchData);
          await db.queueOutbox(tenantId, 'batches', 'INSERT', batchId, batchData as unknown as Record<string, unknown>);
        }

        await db.logAudit(
          tenantId,
          'PRODUCT_CREATED',
          'inventory',
          `Created formulary drug: ${productData.name} (${productData.sku})`,
          'Admin'
        );
      }

      onSave();
      onClose();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to save product');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl max-w-2xl w-full overflow-hidden text-slate-800 dark:text-slate-100 my-8">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/60">
          <div className="flex items-center gap-2.5">
            <Package className="w-5 h-5 text-teal-600 dark:text-teal-400" />
            <h3 className="font-bold text-base">
              {productToEdit ? `Edit Drug Formulary: ${productToEdit.name}` : 'Register New Drug Formulary'}
            </h3>
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

          {/* Primary Identification */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block font-bold uppercase tracking-wider text-slate-500 mb-1">
                Brand / Commercial Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Augmentin 625mg"
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg outline-none focus:ring-2 focus:ring-teal-500 font-semibold"
              />
            </div>

            <div>
              <label className="block font-bold uppercase tracking-wider text-slate-500 mb-1">
                Generic Active Formulation <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                required
                value={genericName}
                onChange={(e) => setGenericName(e.target.value)}
                placeholder="e.g. Amoxicillin + Clavulanic Acid"
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg outline-none focus:ring-2 focus:ring-teal-500 italic"
              />
            </div>
          </div>

          {/* SKU, Barcode & Category */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block font-bold uppercase tracking-wider text-slate-500 mb-1">
                SKU / Item Code <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                required
                value={sku}
                onChange={(e) => setSku(e.target.value.toUpperCase())}
                placeholder="e.g. AUG-625"
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg font-mono outline-none focus:ring-2 focus:ring-teal-500"
              />
            </div>

            <div>
              <label className="block font-bold uppercase tracking-wider text-slate-500 mb-1">
                Barcode (EAN-13 / UPC)
              </label>
              <input
                type="text"
                value={barcode}
                onChange={(e) => setBarcode(e.target.value)}
                placeholder="Scan or enter code"
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg font-mono outline-none focus:ring-2 focus:ring-teal-500"
              />
            </div>

            <div>
              <label className="block font-bold uppercase tracking-wider text-slate-500 mb-1">
                Therapeutic Category
              </label>
              <input
                type="text"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                placeholder="e.g. Antibiotics"
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg outline-none focus:ring-2 focus:ring-teal-500"
              />
            </div>
          </div>

          {/* Dosage Form & Unit Conversion Breakdown */}
          <div className="p-3.5 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-slate-200 dark:border-slate-800 space-y-3">
            <span className="font-bold uppercase tracking-wider text-slate-500 block">
              Dosage Form & Packaging Packaging Unit Conversion
            </span>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-slate-500 mb-1">Dosage Form</label>
                <select
                  value={dosageForm}
                  onChange={(e) => setDosageForm(e.target.value as DosageForm)}
                  className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg outline-none"
                >
                  <option value="tablets">Tablets</option>
                  <option value="capsules">Capsules</option>
                  <option value="syrup">Syrup</option>
                  <option value="suspension">Suspension</option>
                  <option value="ampoules">Ampoules</option>
                  <option value="vials">Vials</option>
                  <option value="inhaler">Inhaler</option>
                  <option value="cream">Cream</option>
                  <option value="ointment">Ointment</option>
                  <option value="drops">Drops</option>
                  <option value="powder">Powder / Sachet</option>
                  <option value="injection">Injection</option>
                </select>
              </div>

              <div>
                <label className="block text-slate-500 mb-1">Pack Size (Units per Box)</label>
                <input
                  type="number"
                  min="1"
                  value={packSize}
                  onChange={(e) => setPackSize(parseInt(e.target.value) || 1)}
                  className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg outline-none"
                />
              </div>

              <div>
                <label className="block text-slate-500 mb-1">Loose Unit Name</label>
                <input
                  type="text"
                  value={unitName}
                  onChange={(e) => setUnitName(e.target.value)}
                  placeholder="e.g. Tablet, Strip, Sachet"
                  className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg outline-none"
                />
              </div>
            </div>

            <div className="flex items-center gap-2 pt-1">
              <input
                type="checkbox"
                id="isPomCheck"
                checked={isPom}
                onChange={(e) => setIsPom(e.target.checked)}
                className="w-4 h-4 text-teal-600 rounded border-slate-300 focus:ring-teal-500"
              />
              <label htmlFor="isPomCheck" className="text-slate-700 dark:text-slate-300 font-semibold cursor-pointer">
                Prescription Only Medicine (POM) — Requires Doctor & Patient details at counter
              </label>
            </div>
          </div>

          {/* Pricing & Reorder */}
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
            <div>
              <label className="block font-bold uppercase tracking-wider text-slate-500 mb-1">
                Cost Price / Pack
              </label>
              <input
                type="number"
                min="0"
                value={buyingPrice}
                onChange={(e) => setBuyingPrice(parseFloat(e.target.value) || 0)}
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg font-mono outline-none focus:ring-2 focus:ring-teal-500"
              />
            </div>

            <div>
              <label className="block font-bold uppercase tracking-wider text-slate-500 mb-1">
                Selling Price / Pack
              </label>
              <input
                type="number"
                min="0"
                value={sellingPrice}
                onChange={(e) => {
                  const sp = parseFloat(e.target.value) || 0;
                  setSellingPrice(sp);
                  if (packSize > 1) {
                    setUnitSellingPrice(Math.round((sp / packSize) * 1.15)); // auto-suggest loose price
                  }
                }}
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg font-mono outline-none focus:ring-2 focus:ring-teal-500"
              />
            </div>

            <div>
              <label className="block font-bold uppercase tracking-wider text-slate-500 mb-1">
                Loose Unit Price
              </label>
              <input
                type="number"
                min="0"
                value={unitSellingPrice}
                onChange={(e) => setUnitSellingPrice(parseFloat(e.target.value) || 0)}
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg font-mono outline-none focus:ring-2 focus:ring-teal-500"
              />
            </div>

            <div>
              <label className="block font-bold uppercase tracking-wider text-slate-500 mb-1">
                Low Stock Threshold
              </label>
              <input
                type="number"
                min="1"
                value={reorderThreshold}
                onChange={(e) => setReorderThreshold(parseInt(e.target.value) || 5)}
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg font-mono outline-none focus:ring-2 focus:ring-teal-500"
              />
            </div>
          </div>

          {/* Initial Batch Form (Only for new products) */}
          {!productToEdit && (
            <div className="p-3.5 bg-teal-50/50 dark:bg-teal-950/20 rounded-xl border border-teal-200 dark:border-teal-800/60 space-y-3">
              <span className="font-bold uppercase tracking-wider text-teal-800 dark:text-teal-300 block flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5" /> Initial Batch Details (FEFO Tracking)
              </span>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-slate-500 mb-1">Batch Number</label>
                  <input
                    type="text"
                    value={batchNumber}
                    onChange={(e) => setBatchNumber(e.target.value.toUpperCase())}
                    className="w-full px-3 py-1.5 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg font-mono outline-none"
                  />
                </div>

                <div>
                  <label className="block text-slate-500 mb-1">Expiry Date</label>
                  <input
                    type="date"
                    value={expiryDate}
                    onChange={(e) => setExpiryDate(e.target.value)}
                    className="w-full px-3 py-1.5 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg font-mono outline-none"
                  />
                </div>

                <div>
                  <label className="block text-slate-500 mb-1">Initial Stock (Packs)</label>
                  <input
                    type="number"
                    min="1"
                    value={initialQty}
                    onChange={(e) => setInitialQty(parseFloat(e.target.value) || 0)}
                    className="w-full px-3 py-1.5 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg font-mono outline-none"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Modal Action Buttons */}
          <div className="flex items-center justify-end gap-2.5 pt-4 border-t border-slate-200 dark:border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-300 rounded-lg font-medium transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-5 py-2 bg-teal-600 hover:bg-teal-500 disabled:opacity-50 text-white rounded-lg font-bold shadow transition flex items-center gap-1.5"
            >
              <Check className="w-4 h-4" />
              {saving ? 'Saving...' : productToEdit ? 'Update Drug' : 'Register Drug & Batch'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
