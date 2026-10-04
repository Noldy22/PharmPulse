export type DosageForm = 
  | 'tablets'
  | 'capsules'
  | 'syrup'
  | 'suspension'
  | 'ampoules'
  | 'vials'
  | 'inhaler'
  | 'cream'
  | 'ointment'
  | 'drops'
  | 'suppository'
  | 'powder'
  | 'injection';

export type PaymentMethod = 'cash' | 'mobile_money' | 'card' | 'credit';

export type MobileMoneyProvider = 'mpesa' | 'tigopesa' | 'airtel' | 'mtn' | 'other';

export interface MobileMoneyDetails {
  provider: MobileMoneyProvider;
  phoneNumber?: string;
  transactionRef: string;
}

export interface CardPaymentDetails {
  cardType?: 'visa' | 'mastercard' | 'other';
  last4?: string;
  authCode?: string;
}

export interface CreditPaymentDetails {
  customerName: string;
  customerPhone?: string;
  dueDate?: string;
  notes?: string;
}

export interface PaymentDetails {
  cashReceived?: number;
  changeGiven?: number;
  mobileMoney?: MobileMoneyDetails;
  card?: CardPaymentDetails;
  credit?: CreditPaymentDetails;
}

export interface Product {
  id: string;
  tenantId: string;
  name: string; // Brand Name e.g. Augmentin 625mg
  genericName: string; // Generic Formulation e.g. Amoxicillin + Clavulanic Acid
  sku: string; // SKU / Internal code
  barcode?: string;
  category: string; // e.g. Antibiotics, Analgesic, Cardiovascular
  dosageForm: DosageForm;
  packSize: number; // e.g. 14 tablets per pack/box
  unitName: string; // e.g. 'Tablet', 'Capsule', 'Strip', 'Bottle'
  reorderThreshold: number; // Low stock threshold in packs
  buyingPrice: number; // Cost price per pack
  sellingPrice: number; // Selling price per pack
  unitSellingPrice: number; // Selling price per individual unit/tablet
  isPom: boolean; // Prescription Only Medicine
  requiresStorageWarning?: boolean; // Cold chain, etc.
  description?: string;
  synced: boolean;
  created_at: string;
  updated_at: string;
}

export interface Batch {
  id: string;
  tenantId: string;
  productId: string;
  batchNumber: string;
  expiryDate: string; // ISO date YYYY-MM-DD
  quantity: number; // Quantity in packs on hand (can be fractional if loose units sold)
  costPrice: number; // Unit buying price for this batch
  supplier?: string;
  manufacturingDate?: string;
  isQuarantined?: boolean;
  quarantineReason?: string;
  synced: boolean;
  created_at: string;
  updated_at: string;
}

export type UnitType = 'pack' | 'unit';

export interface CartItem {
  id: string; // unique item line id
  productId: string;
  product: Product;
  batchId: string;
  batch: Batch;
  unitType: UnitType; // 'pack' or 'unit'
  quantity: number;
  unitPrice: number;
  lineTotal: number;
  costPrice: number;
  discount: number; // percentage or fixed
}

export interface SaleItem {
  id: string;
  tenantId: string;
  saleId: string;
  productId: string;
  batchId: string;
  productName: string;
  genericName: string;
  dosageForm: DosageForm;
  batchNumber: string;
  expiryDate: string;
  unitType: UnitType;
  quantity: number;
  unitPrice: number;
  costPrice: number;
  discount: number;
  totalPrice: number;
  synced: boolean;
  created_at: string;
}

export interface Sale {
  id: string;
  tenantId: string;
  receiptNumber: string; // e.g. REC-20261004-001
  itemsCount: number;
  subtotal: number;
  discount: number;
  tax: number;
  total: number;
  costOfGoods: number;
  profit: number;
  paymentMethod: PaymentMethod;
  paymentDetails: PaymentDetails;
  amountPaid: number;
  changeGiven: number;
  attendantName: string;
  patientName?: string;
  patientPhone?: string;
  doctorName?: string;
  doctorRegNo?: string;
  hasPomItems: boolean;
  notes?: string;
  status: 'completed' | 'refunded' | 'voided';
  synced: boolean;
  created_at: string;
  updated_at: string;
}

export interface HeldSale {
  id: string;
  heldAt: string;
  customerRef?: string;
  items: CartItem[];
  patientName?: string;
  doctorName?: string;
  notes?: string;
}

export type StockAdjustmentType = 
  | 'damage'
  | 'theft_loss'
  | 'reconciliation'
  | 'supplier_return'
  | 'expiry_disposal'
  | 'restock';

export interface StockAdjustment {
  id: string;
  tenantId: string;
  productId: string;
  productName: string;
  batchId: string;
  batchNumber: string;
  adjustmentType: StockAdjustmentType;
  quantityChange: number; // positive or negative
  previousQuantity: number;
  newQuantity: number;
  reason: string;
  attendantName: string;
  synced: boolean;
  created_at: string;
}

export interface AuditLog {
  id: string;
  tenantId: string;
  action: string; // 'SALE_COMPLETED' | 'STOCK_ADJUSTED' | 'PRICE_UPDATED' | 'PRODUCT_CREATED' | 'BATCH_QUARANTINED' | 'SYNC_TRIGGERED'
  category: 'pos' | 'inventory' | 'license' | 'system' | 'supervision';
  details: string;
  entityId?: string;
  attendantName: string;
  metadata?: Record<string, unknown>;
  synced: boolean;
  created_at: string;
}

export interface StoreLicense {
  id: string;
  tenantId: string;
  storeName: string;
  ownerContact: string;
  licenseKey: string;
  plan: 'trial' | 'standard' | 'enterprise';
  hardwareFingerprint: string;
  activatedAt: string;
  validUntil: string;
  lastOnlinePing: string;
  offlineGraceDays: number; // Default: 7 days
  isValid: boolean;
}

export interface SyncOutboxItem {
  id: string;
  tenantId: string;
  table: string; // 'products' | 'batches' | 'sales' | 'sale_items' | 'stock_adjustments' | 'audit_logs'
  action: 'INSERT' | 'UPDATE' | 'DELETE';
  recordId: string;
  payload: Record<string, unknown>;
  retries: number;
  error?: string;
  created_at: string;
}

export interface StoreSettings {
  id: string;
  tenantId: string;
  storeName: string;
  tagline: string;
  address: string;
  phone: string;
  email?: string;
  tinNumber?: string; // Tax Identification Number
  currencySymbol: string;
  currencyCode: string;
  taxRate: number; // e.g. 0.18 for 18% VAT or 0 if tax-exempt
  taxInclusive: boolean;
  enableSoundBeeps: boolean;
  supabaseUrl?: string;
  supabaseAnonKey?: string;
  lastSyncTimestamp?: string;
  currentAttendant: string;
}

export type SyncState = 'synced' | 'pending' | 'offline' | 'error' | 'syncing';
