import Dexie, { Table } from 'dexie';
import {
  Product,
  Batch,
  Sale,
  SaleItem,
  StockAdjustment,
  AuditLog,
  StoreLicense,
  StoreSettings,
  SyncOutboxItem,
  HeldSale,
  CartItem,
  PaymentMethod,
  PaymentDetails,
  StockAdjustmentType,
} from '../types';
import {
  INITIAL_PRODUCTS,
  INITIAL_BATCHES,
  INITIAL_SALES,
  INITIAL_AUDIT_LOGS,
  INITIAL_SETTINGS,
} from './seeder';

export class PharmPulseDB extends Dexie {
  products!: Table<Product, string>;
  batches!: Table<Batch, string>;
  sales!: Table<Sale, string>;
  sale_items!: Table<SaleItem, string>;
  stock_adjustments!: Table<StockAdjustment, string>;
  audit_logs!: Table<AuditLog, string>;
  license!: Table<StoreLicense, string>;
  settings!: Table<StoreSettings, string>;
  sync_outbox!: Table<SyncOutboxItem, string>;
  held_sales!: Table<HeldSale, string>;

  constructor() {
    super('PharmPulseDB');

    this.version(1).stores({
      products: 'id, tenantId, name, genericName, sku, barcode, category, dosageForm, isPom, synced, updated_at',
      batches: 'id, tenantId, productId, batchNumber, expiryDate, isQuarantined, synced, updated_at, [productId+expiryDate]',
      sales: 'id, tenantId, receiptNumber, status, paymentMethod, attendantName, created_at, synced, updated_at',
      sale_items: 'id, tenantId, saleId, productId, batchId, created_at, synced',
      stock_adjustments: 'id, tenantId, productId, batchId, adjustmentType, created_at, synced',
      audit_logs: 'id, tenantId, action, category, attendantName, created_at, synced',
      license: 'id, tenantId, licenseKey, isValid',
      settings: 'id, tenantId',
      sync_outbox: 'id, tenantId, table, action, created_at',
      held_sales: 'id, heldAt',
    });
  }

  // Seed default data if database is fresh
  async seedIfEmpty() {
    const productCount = await this.products.count();
    if (productCount === 0) {
      console.log('Seeding initial pharmacy database...');
      await this.transaction('rw', [
        this.products,
        this.batches,
        this.sales,
        this.sale_items,
        this.audit_logs,
        this.settings,
      ], async () => {
        await this.settings.put(INITIAL_SETTINGS);
        await this.products.bulkPut(INITIAL_PRODUCTS);
        await this.batches.bulkPut(INITIAL_BATCHES);

        for (const item of INITIAL_SALES) {
          await this.sales.put(item.sale);
          await this.sale_items.bulkPut(item.items);
        }

        await this.audit_logs.bulkPut(INITIAL_AUDIT_LOGS);
      });
      console.log('PharmPulse database seeded successfully.');
    }
  }

  // Queue mutation for remote sync
  async queueOutbox(
    tenantId: string,
    table: string,
    action: 'INSERT' | 'UPDATE' | 'DELETE',
    recordId: string,
    payload: Record<string, unknown>
  ) {
    const outboxItem: SyncOutboxItem = {
      id: `outbox-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      tenantId,
      table,
      action,
      recordId,
      payload,
      retries: 0,
      created_at: new Date().toISOString(),
    };
    await this.sync_outbox.put(outboxItem);
  }

  // Record an audit trail log
  async logAudit(
    tenantId: string,
    action: string,
    category: 'pos' | 'inventory' | 'license' | 'system' | 'supervision',
    details: string,
    attendantName: string,
    entityId?: string,
    metadata?: Record<string, unknown>
  ) {
    const log: AuditLog = {
      id: `audit-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      tenantId,
      action,
      category,
      details,
      entityId,
      attendantName,
      metadata,
      synced: false,
      created_at: new Date().toISOString(),
    };
    await this.audit_logs.put(log);
    await this.queueOutbox(tenantId, 'audit_logs', 'INSERT', log.id, log as unknown as Record<string, unknown>);
  }

  // FEFO (First Expiring First Out) batch selector
  async getFefoBatch(productId: string): Promise<Batch | undefined> {
    const batches = await this.batches
      .where('productId')
      .equals(productId)
      .toArray();

    // Filter available batches: not quarantined and quantity > 0
    const available = batches.filter(
      (b) => !b.isQuarantined && b.quantity > 0
    );

    if (available.length === 0) {
      // Fallback: return any non-quarantined batch even if qty 0 so POS can show stock
      const nonQuarantined = batches.filter((b) => !b.isQuarantined);
      if (nonQuarantined.length === 0) return batches[0];
      return nonQuarantined.sort((a, b) => a.expiryDate.localeCompare(b.expiryDate))[0];
    }

    // Sort by earliest expiration date first
    available.sort((a, b) => a.expiryDate.localeCompare(b.expiryDate));
    return available[0];
  }

  // Record a high-speed counter sale with atomic inventory depletion
  async checkoutSale({
    tenantId,
    attendantName,
    items,
    paymentMethod,
    paymentDetails,
    patientName,
    patientPhone,
    doctorName,
    doctorRegNo,
    notes,
    discount = 0,
    tax = 0,
  }: {
    tenantId: string;
    attendantName: string;
    items: CartItem[];
    paymentMethod: PaymentMethod;
    paymentDetails: PaymentDetails;
    patientName?: string;
    patientPhone?: string;
    doctorName?: string;
    doctorRegNo?: string;
    notes?: string;
    discount?: number;
    tax?: number;
  }): Promise<{ sale: Sale; items: SaleItem[] }> {
    const now = new Date().toISOString();
    const subtotal = items.reduce((sum, item) => sum + item.lineTotal, 0);
    const total = Math.max(0, subtotal - discount + tax);
    const costOfGoods = items.reduce((sum, item) => {
      // Calculate item cost
      const packCost = item.costPrice;
      const effectiveCost = item.unitType === 'pack' 
        ? packCost * item.quantity 
        : (packCost / (item.product.packSize || 1)) * item.quantity;
      return sum + effectiveCost;
    }, 0);
    const profit = Math.max(0, total - costOfGoods);

    const hasPomItems = items.some((item) => item.product.isPom);
    const saleId = `sale-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
    const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const randSeq = Math.floor(100 + Math.random() * 900);
    const receiptNumber = `REC-${dateStr}-${randSeq}`;

    let amountPaid = total;
    let changeGiven = 0;

    if (paymentMethod === 'cash') {
      amountPaid = paymentDetails.cashReceived || total;
      changeGiven = Math.max(0, amountPaid - total);
    }

    const sale: Sale = {
      id: saleId,
      tenantId,
      receiptNumber,
      itemsCount: items.length,
      subtotal,
      discount,
      tax,
      total,
      costOfGoods,
      profit,
      paymentMethod,
      paymentDetails,
      amountPaid,
      changeGiven,
      attendantName,
      patientName,
      patientPhone,
      doctorName,
      doctorRegNo,
      hasPomItems,
      notes,
      status: 'completed',
      synced: false,
      created_at: now,
      updated_at: now,
    };

    const saleItemsList: SaleItem[] = [];

    // Run transaction across tables for atomic consistency
    await this.transaction(
      'rw',
      [this.sales, this.sale_items, this.batches, this.products, this.audit_logs, this.sync_outbox],
      async () => {
        await this.sales.put(sale);
        await this.queueOutbox(tenantId, 'sales', 'INSERT', sale.id, sale as unknown as Record<string, unknown>);

        for (const item of items) {
          const saleItemId = `si-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
          const sItem: SaleItem = {
            id: saleItemId,
            tenantId,
            saleId,
            productId: item.productId,
            batchId: item.batchId,
            productName: item.product.name,
            genericName: item.product.genericName,
            dosageForm: item.product.dosageForm,
            batchNumber: item.batch.batchNumber,
            expiryDate: item.batch.expiryDate,
            unitType: item.unitType,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            costPrice: item.costPrice,
            discount: item.discount,
            totalPrice: item.lineTotal,
            synced: false,
            created_at: now,
          };
          saleItemsList.push(sItem);
          await this.sale_items.put(sItem);
          await this.queueOutbox(tenantId, 'sale_items', 'INSERT', sItem.id, sItem as unknown as Record<string, unknown>);

          // Deduct from batch quantity
          const batch = await this.batches.get(item.batchId);
          if (batch) {
            const deductionInPacks = item.unitType === 'pack' 
              ? item.quantity 
              : item.quantity / (item.product.packSize || 1);
            
            const updatedQty = Math.max(0, parseFloat((batch.quantity - deductionInPacks).toFixed(4)));
            await this.batches.update(batch.id, {
              quantity: updatedQty,
              synced: false,
              updated_at: now,
            });

            await this.queueOutbox(tenantId, 'batches', 'UPDATE', batch.id, {
              id: batch.id,
              quantity: updatedQty,
              updated_at: now,
            });
          }

          // Update product timestamp
          await this.products.update(item.productId, {
            updated_at: now,
          });
        }

        // Audit log
        const auditText = `Completed sale ${receiptNumber} (${paymentMethod.toUpperCase()}) for ${total.toLocaleString()} - ${items.length} items`;
        await this.logAudit(tenantId, 'SALE_COMPLETED', 'pos', auditText, attendantName, saleId, {
          receiptNumber,
          total,
          paymentMethod,
        });
      }
    );

    return { sale, items: saleItemsList };
  }

  // Adjust stock for loss, damage, count reconciliation, or restock
  async adjustStock({
    tenantId,
    productId,
    batchId,
    adjustmentType,
    quantityChange, // pack units change (can be positive or negative)
    reason,
    attendantName,
  }: {
    tenantId: string;
    productId: string;
    batchId: string;
    adjustmentType: StockAdjustmentType;
    quantityChange: number;
    reason: string;
    attendantName: string;
  }): Promise<StockAdjustment> {
    const now = new Date().toISOString();
    const product = await this.products.get(productId);
    const batch = await this.batches.get(batchId);

    if (!product || !batch) {
      throw new Error('Product or batch not found for stock adjustment');
    }

    const previousQuantity = batch.quantity;
    const newQuantity = Math.max(0, parseFloat((previousQuantity + quantityChange).toFixed(4)));

    const adjId = `adj-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
    const adjustment: StockAdjustment = {
      id: adjId,
      tenantId,
      productId,
      productName: product.name,
      batchId,
      batchNumber: batch.batchNumber,
      adjustmentType,
      quantityChange,
      previousQuantity,
      newQuantity,
      reason,
      attendantName,
      synced: false,
      created_at: now,
    };

    await this.transaction(
      'rw',
      [this.batches, this.stock_adjustments, this.audit_logs, this.sync_outbox],
      async () => {
        await this.batches.update(batchId, {
          quantity: newQuantity,
          synced: false,
          updated_at: now,
        });

        await this.stock_adjustments.put(adjustment);
        await this.queueOutbox(tenantId, 'stock_adjustments', 'INSERT', adjId, adjustment as unknown as Record<string, unknown>);
        await this.queueOutbox(tenantId, 'batches', 'UPDATE', batchId, {
          id: batchId,
          quantity: newQuantity,
          updated_at: now,
        });

        const sign = quantityChange >= 0 ? '+' : '';
        const auditText = `Stock adjusted for ${product.name} (Batch ${batch.batchNumber}): ${sign}${quantityChange} packs. Reason: ${reason} [${adjustmentType}]`;
        await this.logAudit(tenantId, 'STOCK_ADJUSTED', 'inventory', auditText, attendantName, adjId);
      }
    );

    return adjustment;
  }
}

export const db = new PharmPulseDB();
