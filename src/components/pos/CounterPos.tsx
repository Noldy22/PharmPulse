import React, { useState, useMemo, useCallback, useEffect } from 'react';
import { Product, Batch, CartItem, PaymentMethod, PaymentDetails, Sale, SaleItem, HeldSale, StoreSettings, StoreLicense, StaffUser } from '../../types';
import { db } from '../../db/db';
import { useLiveQuery } from 'dexie-react-hooks';
import { ProductCatalog } from './ProductCatalog';
import { ActiveCart } from './ActiveCart';
import { CheckoutModal } from './CheckoutModal';
import { HoldSalesModal } from './HoldSalesModal';
import { DispenseDetailsModal } from './DispenseDetailsModal';
import { ReceiptModal } from '../print/ReceiptModal';
import { syncEngine } from '../../lib/syncEngine';

interface CounterPosProps {
  settings: StoreSettings | null;
  license: StoreLicense | null;
  currentUser: StaffUser;
}

export const CounterPos: React.FC<CounterPosProps> = ({ settings, license, currentUser }) => {
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [discount, setDiscount] = useState<number>(0);
  const [patientName, setPatientName] = useState<string>('');
  const [patientPhone, setPatientPhone] = useState<string>('');
  const [doctorName, setDoctorName] = useState<string>('');
  const [doctorRegNo, setDoctorRegNo] = useState<string>('');
  const [dispenseNotes, setDispenseNotes] = useState<string>('');

  // Modals state
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
  const [isHoldModalOpen, setIsHoldModalOpen] = useState(false);
  const [isDispenseModalOpen, setIsDispenseModalOpen] = useState(false);

  // Completed sale receipt state
  const [completedSale, setCompletedSale] = useState<{
    sale: Sale;
    items: SaleItem[];
    autoPrint: boolean;
  } | null>(null);

  // Live queries
  const allBatches = useLiveQuery(() => db.batches.toArray(), []) || [];
  const heldSales = useLiveQuery(() => db.held_sales.toArray(), []) || [];

  // Group batches by product ID for quick access
  const batchesMap = useMemo(() => {
    const map = new Map<string, Batch[]>();
    for (const b of allBatches) {
      if (!map.has(b.productId)) map.set(b.productId, []);
      map.get(b.productId)!.push(b);
    }
    return map;
  }, [allBatches]);

  // Check if any cart item is POM
  const hasPomItems = useMemo(() => {
    return cartItems.some((item) => item.product.isPom);
  }, [cartItems]);

  // Add product to cart
  const handleAddToCart = (product: Product, batch: Batch, unitType: 'pack' | 'unit', qty: number = 1) => {
    const unitPrice = unitType === 'pack' ? product.sellingPrice : product.unitSellingPrice;
    const costPrice = unitType === 'pack' ? batch.costPrice : batch.costPrice / (product.packSize || 1);

    setCartItems((prev) => {
      // Check if same product, batch, and unitType is already in cart
      const existingIdx = prev.findIndex(
        (i) => i.productId === product.id && i.batchId === batch.id && i.unitType === unitType
      );

      if (existingIdx >= 0) {
        const updated = [...prev];
        const item = updated[existingIdx];
        const newQty = item.quantity + qty;
        updated[existingIdx] = {
          ...item,
          quantity: newQty,
          lineTotal: Math.round(newQty * item.unitPrice),
        };
        return updated;
      }

      const newItem: CartItem = {
        id: `cart-item-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        productId: product.id,
        product,
        batchId: batch.id,
        batch,
        unitType,
        quantity: qty,
        unitPrice,
        costPrice,
        discount: 0,
        lineTotal: Math.round(qty * unitPrice),
      };

      return [...prev, newItem];
    });
  };

  // Update quantity
  const handleUpdateQuantity = (itemId: string, newQty: number) => {
    if (newQty <= 0) {
      handleRemoveItem(itemId);
      return;
    }
    setCartItems((prev) =>
      prev.map((item) =>
        item.id === itemId
          ? {
              ...item,
              quantity: newQty,
              lineTotal: Math.round(newQty * item.unitPrice),
            }
          : item
      )
    );
  };

  // Switch between pack and loose unit
  const handleUpdateUnitType = (itemId: string, unitType: 'pack' | 'unit') => {
    setCartItems((prev) =>
      prev.map((item) => {
        if (item.id !== itemId) return item;
        const unitPrice = unitType === 'pack' ? item.product.sellingPrice : item.product.unitSellingPrice;
        const costPrice =
          unitType === 'pack' ? item.batch.costPrice : item.batch.costPrice / (item.product.packSize || 1);
        return {
          ...item,
          unitType,
          unitPrice,
          costPrice,
          lineTotal: Math.round(item.quantity * unitPrice),
        };
      })
    );
  };

  // Change batch for an item
  const handleUpdateBatch = (itemId: string, newBatchId: string) => {
    const batch = allBatches.find((b) => b.id === newBatchId);
    if (!batch) return;
    setCartItems((prev) =>
      prev.map((item) => {
        if (item.id !== itemId) return item;
        const costPrice =
          item.unitType === 'pack' ? batch.costPrice : batch.costPrice / (item.product.packSize || 1);
        return {
          ...item,
          batchId: newBatchId,
          batch,
          costPrice,
        };
      })
    );
  };

  // Remove single line item
  const handleRemoveItem = (itemId: string) => {
    setCartItems((prev) => prev.filter((i) => i.id !== itemId));
  };

  // Clear entire cart (F2)
  const handleClearCart = useCallback(() => {
    setCartItems([]);
    setDiscount(0);
    setPatientName('');
    setPatientPhone('');
    setDoctorName('');
    setDoctorRegNo('');
    setDispenseNotes('');
  }, []);

  // Hold current sale (F8)
  const handleHoldCurrentSale = useCallback(async () => {
    if (cartItems.length === 0) return;
    const held: HeldSale = {
      id: `held-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      heldAt: new Date().toISOString(),
      attendantId: currentUser.id,
      attendantName: currentUser.fullName,
      customerRef: patientName || `Customer (${cartItems.length} items)`,
      items: cartItems,
      patientName,
      doctorName,
      notes: dispenseNotes,
    };
    await db.held_sales.put(held);
    handleClearCart();
  }, [cartItems, patientName, doctorName, dispenseNotes, handleClearCart, currentUser]);

  // Resume a held sale
  const handleResumeHeldSale = async (held: HeldSale) => {
    setCartItems(held.items);
    if (held.patientName) setPatientName(held.patientName);
    if (held.doctorName) setDoctorName(held.doctorName);
    if (held.notes) setDispenseNotes(held.notes);
    await db.held_sales.delete(held.id);
    setIsHoldModalOpen(false);
  };

  // Delete held sale
  const handleDeleteHeldSale = async (id: string) => {
    await db.held_sales.delete(id);
  };

  // Total calculation
  const subtotal = cartItems.reduce((acc, item) => acc + item.lineTotal, 0);
  const tax = settings?.taxRate ? Math.round(subtotal * settings.taxRate) : 0;
  const grandTotal = Math.max(0, subtotal - discount + tax);

  // Complete checkout (F4)
  const handleCompleteCheckout = async (
    paymentMethod: PaymentMethod,
    paymentDetails: PaymentDetails,
    autoPrintThermal: boolean
  ) => {
    const tenantId = license?.tenantId || settings?.tenantId || 'demo-tenant-pharmpulse';
    const attendantId = currentUser.id;
    const attendantName = currentUser.fullName;

    const result = await db.checkoutSale({
      tenantId,
      attendantId,
      attendantName,
      items: cartItems,
      paymentMethod,
      paymentDetails,
      patientName: patientName || undefined,
      patientPhone: patientPhone || undefined,
      doctorName: doctorName || undefined,
      doctorRegNo: doctorRegNo || undefined,
      notes: dispenseNotes || undefined,
      discount,
      tax,
    });

    // Clear cart and show receipt preview
    handleClearCart();
    setCompletedSale({
      sale: result.sale,
      items: result.items,
      autoPrint: autoPrintThermal,
    });

    // Trigger background sync if online
    if (navigator.onLine) {
      syncEngine.triggerSync();
    }
  };

  // Global Keyboard Shortcuts (F2: New Sale, F4: Pay, F8: Hold, F9: Recall, Esc: Close modals)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'F2') {
        e.preventDefault();
        handleClearCart();
      } else if (e.key === 'F4') {
        e.preventDefault();
        if (cartItems.length > 0 && !isCheckoutOpen) {
          setIsCheckoutOpen(true);
        }
      } else if (e.key === 'F8') {
        e.preventDefault();
        handleHoldCurrentSale();
      } else if (e.key === 'F9') {
        e.preventDefault();
        setIsHoldModalOpen(true);
      } else if (e.key === 'Escape') {
        if (isCheckoutOpen) setIsCheckoutOpen(false);
        if (isHoldModalOpen) setIsHoldModalOpen(false);
        if (isDispenseModalOpen) setIsDispenseModalOpen(false);
        if (completedSale) setCompletedSale(null);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [
    cartItems.length,
    isCheckoutOpen,
    isHoldModalOpen,
    isDispenseModalOpen,
    completedSale,
    handleClearCart,
    handleHoldCurrentSale,
  ]);

  return (
    <div className="flex-1 flex flex-col lg:flex-row h-[calc(100vh-4rem)] overflow-hidden bg-slate-100 dark:bg-slate-950">
      {/* Left Panel: Fast Product Search & FEFO Catalog (Desktop 62%) */}
      <div className="w-full lg:w-[62%] h-1/2 lg:h-full flex flex-col overflow-hidden">
        <ProductCatalog
          onAddToCart={handleAddToCart}
          currencySymbol={settings?.currencySymbol || 'TSh'}
        />
      </div>

      {/* Right Panel: Active Cart, Patient/Doctor Dispense Record, Tender Keypad (Desktop 38%) */}
      <div className="w-full lg:w-[38%] h-1/2 lg:h-full flex flex-col border-t lg:border-t-0 lg:border-l border-slate-200 dark:border-slate-800 overflow-hidden shadow-lg">
        <ActiveCart
          cartItems={cartItems}
          patientName={patientName}
          doctorName={doctorName}
          hasPomItems={hasPomItems}
          settings={settings}
          discount={discount}
          onUpdateQuantity={handleUpdateQuantity}
          onUpdateUnitType={handleUpdateUnitType}
          onUpdateBatch={handleUpdateBatch}
          onRemoveItem={handleRemoveItem}
          onClearCart={handleClearCart}
          onOpenDispenseModal={() => setIsDispenseModalOpen(true)}
          onOpenHoldModal={() => setIsHoldModalOpen(true)}
          onHoldCurrentSale={handleHoldCurrentSale}
          onOpenCheckout={() => setIsCheckoutOpen(true)}
          onDiscountChange={setDiscount}
          batchesMap={batchesMap}
        />
      </div>

      {/* Checkout Modal */}
      {isCheckoutOpen && (
        <CheckoutModal
          isOpen={isCheckoutOpen}
          total={grandTotal}
          items={cartItems}
          settings={settings}
          onCompleteCheckout={handleCompleteCheckout}
          onClose={() => setIsCheckoutOpen(false)}
        />
      )}

      {/* Hold / Parked Sales Modal */}
      {isHoldModalOpen && (
        <HoldSalesModal
          isOpen={isHoldModalOpen}
          heldSales={heldSales}
          currencySymbol={settings?.currencySymbol || 'TSh'}
          onResume={handleResumeHeldSale}
          onDelete={handleDeleteHeldSale}
          onClose={() => setIsHoldModalOpen(false)}
        />
      )}

      {/* Dispense Details Modal (POM patient and doctor info) */}
      {isDispenseModalOpen && (
        <DispenseDetailsModal
          isOpen={isDispenseModalOpen}
          patientName={patientName}
          patientPhone={patientPhone}
          doctorName={doctorName}
          doctorRegNo={doctorRegNo}
          notes={dispenseNotes}
          hasPomItems={hasPomItems}
          onSave={(details) => {
            setPatientName(details.patientName);
            setPatientPhone(details.patientPhone);
            setDoctorName(details.doctorName);
            setDoctorRegNo(details.doctorRegNo);
            setDispenseNotes(details.notes);
          }}
          onClose={() => setIsDispenseModalOpen(false)}
        />
      )}

      {/* Completed Sale Receipt / Thermal Print Modal */}
      {completedSale && (
        <ReceiptModal
          sale={completedSale.sale}
          items={completedSale.items}
          settings={settings}
          autoPrint={completedSale.autoPrint}
          onClose={() => setCompletedSale(null)}
        />
      )}
    </div>
  );
};
