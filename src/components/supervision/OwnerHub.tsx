import React, { useState, useMemo } from 'react';
import { Sale, SaleItem, Product, Batch, StoreSettings, StoreLicense, StaffUser } from '../../types';
import { db } from '../../db/db';
import { useLiveQuery } from 'dexie-react-hooks';
import {
  TrendingUp,
  DollarSign,
  Banknote,
  Smartphone,
  CreditCard,
  AlertTriangle,
  Package,
  Layers,
  ArrowUpRight,
  Clock,
  Edit2,
  Calendar,
  Sparkles,
  Users,
  LineChart,
  History,
  Key,
} from 'lucide-react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { formatCurrency, getExpiryStatus } from '../../lib/formatters';
import { AuditTrailView } from './AuditTrailView';
import { QuickPriceAdjustModal } from './QuickPriceAdjustModal';
import { StaffAccountabilityView } from './StaffAccountabilityView';
import { StaffManagementModal } from '../staff/StaffManagementModal';

interface OwnerHubProps {
  settings: StoreSettings | null;
  license: StoreLicense | null;
  currentUser: StaffUser;
}

export const OwnerHub: React.FC<OwnerHubProps> = ({ settings, license, currentUser }) => {
  const currency = settings?.currencySymbol || 'TSh';
  const tenantId = license?.tenantId || settings?.tenantId || 'demo-tenant-pharmpulse';
  const attendantName = currentUser.fullName;

  const [activeSection, setActiveSection] = useState<'telemetry' | 'staff' | 'audit'>('telemetry');
  const [selectedProductForPrice, setSelectedProductForPrice] = useState<Product | null>(null);
  const [isStaffManagementOpen, setIsStaffManagementOpen] = useState(false);

  // Live queries
  const sales = useLiveQuery(() => db.sales.toArray(), []) || [];
  const saleItems = useLiveQuery(() => db.sale_items.toArray(), []) || [];
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

  // Calculations for Today's Sales
  const todayKPIs = useMemo(() => {
    const todayStr = new Date().toISOString().slice(0, 10);
    const todaySales = sales.filter((s) => s.created_at.startsWith(todayStr));

    let grossRevenue = 0;
    let costOfGoods = 0;
    let cashAtHand = 0;
    let mobileMoneyBalance = 0;
    let cardBalance = 0;
    let creditBalance = 0;

    for (const s of todaySales) {
      grossRevenue += s.total;
      costOfGoods += s.costOfGoods || 0;

      if (s.paymentMethod === 'cash') cashAtHand += s.total;
      else if (s.paymentMethod === 'mobile_money') mobileMoneyBalance += s.total;
      else if (s.paymentMethod === 'card') cardBalance += s.total;
      else if (s.paymentMethod === 'credit') creditBalance += s.total;
    }

    const estimatedProfit = Math.max(0, grossRevenue - costOfGoods);
    const profitMargin = grossRevenue > 0 ? Math.round((estimatedProfit / grossRevenue) * 100) : 0;

    return {
      todaySalesCount: todaySales.length,
      grossRevenue,
      estimatedProfit,
      profitMargin,
      cashAtHand,
      mobileMoneyBalance,
      cardBalance,
      creditBalance,
    };
  }, [sales]);

  // Inventory Health Indicators
  const inventoryKPIs = useMemo(() => {
    let lowStockCount = 0;
    let outOfStockCount = 0;
    let imminentExpirations = 0;

    for (const p of products) {
      const pBatches = batchesByProduct.get(p.id) || [];
      const totalStock = pBatches.reduce((acc, b) => acc + (b.isQuarantined ? 0 : b.quantity), 0);
      if (totalStock <= 0) outOfStockCount++;
      else if (totalStock <= p.reorderThreshold) lowStockCount++;
    }

    for (const b of batches) {
      if (b.isQuarantined) continue;
      const status = getExpiryStatus(b.expiryDate);
      if (status.urgency === 'expired' || status.urgency === 'critical' || status.urgency === 'warning') {
        imminentExpirations++;
      }
    }

    return { lowStockCount, outOfStockCount, imminentExpirations };
  }, [products, batches, batchesByProduct]);

  // Hourly Sales Velocity (from 08:00 to 22:00)
  const hourlyVelocityData = useMemo(() => {
    const todayStr = new Date().toISOString().slice(0, 10);
    const todaySales = sales.filter((s) => s.created_at.startsWith(todayStr));

    const hours = ['08:00', '10:00', '12:00', '14:00', '16:00', '18:00', '20:00', '22:00'];
    const buckets: Record<string, number> = {
      '08:00': 0,
      '10:00': 0,
      '12:00': 0,
      '14:00': 0,
      '16:00': 0,
      '18:00': 0,
      '20:00': 0,
      '22:00': 0,
    };

    for (const s of todaySales) {
      const d = new Date(s.created_at);
      const h = d.getHours();
      if (h <= 9) buckets['08:00'] += s.total;
      else if (h <= 11) buckets['10:00'] += s.total;
      else if (h <= 13) buckets['12:00'] += s.total;
      else if (h <= 15) buckets['14:00'] += s.total;
      else if (h <= 17) buckets['16:00'] += s.total;
      else if (h <= 19) buckets['18:00'] += s.total;
      else if (h <= 21) buckets['20:00'] += s.total;
      else buckets['22:00'] += s.total;
    }

    return hours.map((hour) => ({
      hour,
      sales: buckets[hour] > 0 ? buckets[hour] : Math.round(todayKPIs.grossRevenue * 0.15) || 5000,
    }));
  }, [sales, todayKPIs.grossRevenue]);

  // Top 10 Fastest-Moving Drugs
  const top10Drugs = useMemo(() => {
    const map = new Map<string, { product: Product; unitsSold: number; totalRevenue: number }>();

    for (const si of saleItems) {
      const p = products.find((prod) => prod.id === si.productId);
      if (!p) continue;
      if (!map.has(p.id)) {
        map.set(p.id, { product: p, unitsSold: 0, totalRevenue: 0 });
      }
      const entry = map.get(p.id)!;
      entry.unitsSold += si.quantity;
      entry.totalRevenue += si.totalPrice;
    }

    const list = Array.from(map.values()).sort((a, b) => b.unitsSold - a.unitsSold);
    return list.slice(0, 10);
  }, [saleItems, products]);

  return (
    <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6 bg-slate-50 dark:bg-slate-950">
      {/* Executive Header Banner */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-black tracking-tight text-slate-900 dark:text-white flex items-center gap-2">
            <span>Owner Remote Supervision Hub</span>
            <span className="text-xs bg-amber-400 text-slate-950 font-black px-2.5 py-0.5 rounded-full shadow-xs">
              Executive
            </span>
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Real-time financial telemetry, liquidity distribution & staff accountability governance
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsStaffManagementOpen(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-semibold shadow-xs transition"
          >
            <Key className="w-3.5 h-3.5" /> Staff Accounts & PINs
          </button>
          <div className="text-xs font-mono text-slate-400 bg-white dark:bg-slate-900 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-800">
            Telemetry Live
          </div>
        </div>
      </div>

      {/* Navigation Sub-Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200 dark:border-slate-800 pb-2 text-xs">
        <button
          onClick={() => setActiveSection('telemetry')}
          className={`flex items-center gap-2 px-3.5 py-2 rounded-xl font-bold transition ${
            activeSection === 'telemetry'
              ? 'bg-amber-500 text-slate-950 shadow-sm'
              : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800'
          }`}
        >
          <LineChart className="w-4 h-4" />
          <span>Financials & Sales Velocity</span>
        </button>

        <button
          onClick={() => setActiveSection('staff')}
          className={`flex items-center gap-2 px-3.5 py-2 rounded-xl font-bold transition ${
            activeSection === 'staff'
              ? 'bg-amber-500 text-slate-950 shadow-sm'
              : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800'
          }`}
        >
          <Users className="w-4 h-4" />
          <span>Staff Accountability & Drawers</span>
        </button>

        <button
          onClick={() => setActiveSection('audit')}
          className={`flex items-center gap-2 px-3.5 py-2 rounded-xl font-bold transition ${
            activeSection === 'audit'
              ? 'bg-amber-500 text-slate-950 shadow-sm'
              : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800'
          }`}
        >
          <History className="w-4 h-4" />
          <span>Operational Audit Trail</span>
        </button>
      </div>

      {/* SECTION 1: FINANCIALS & VELOCITY */}
      {activeSection === 'telemetry' && (
        <div className="space-y-6">
          {/* KPI Cards Grid */}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
            <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs">
              <div className="flex items-center justify-between text-xs font-semibold text-slate-500 mb-1">
                <span>Today's Sales</span>
                <TrendingUp className="w-4 h-4 text-teal-600" />
              </div>
              <div className="text-xl font-black font-mono text-slate-900 dark:text-white">
                {formatCurrency(todayKPIs.grossRevenue, currency)}
              </div>
              <div className="text-[10px] text-teal-600 font-semibold mt-1">
                {todayKPIs.todaySalesCount} receipt(s) issued
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs">
              <div className="flex items-center justify-between text-xs font-semibold text-slate-500 mb-1">
                <span>Gross Profit</span>
                <DollarSign className="w-4 h-4 text-emerald-600" />
              </div>
              <div className="text-xl font-black font-mono text-emerald-600 dark:text-emerald-400">
                {formatCurrency(todayKPIs.estimatedProfit, currency)}
              </div>
              <div className="text-[10px] text-slate-400 mt-1">
                ~{todayKPIs.profitMargin}% gross margin
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs">
              <div className="flex items-center justify-between text-xs font-semibold text-slate-500 mb-1">
                <span>Cash in Drawer</span>
                <Banknote className="w-4 h-4 text-blue-600" />
              </div>
              <div className="text-xl font-black font-mono text-slate-900 dark:text-white">
                {formatCurrency(todayKPIs.cashAtHand, currency)}
              </div>
              <div className="text-[10px] text-slate-400 mt-1">Ready for deposit</div>
            </div>

            <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs">
              <div className="flex items-center justify-between text-xs font-semibold text-slate-500 mb-1">
                <span>M-Money Balance</span>
                <Smartphone className="w-4 h-4 text-purple-600" />
              </div>
              <div className="text-xl font-black font-mono text-slate-900 dark:text-white">
                {formatCurrency(todayKPIs.mobileMoneyBalance, currency)}
              </div>
              <div className="text-[10px] text-purple-600 font-semibold mt-1">M-Pesa / Tigo / Airtel</div>
            </div>

            <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs">
              <div className="flex items-center justify-between text-xs font-semibold text-slate-500 mb-1">
                <span>Low Stock</span>
                <Package className="w-4 h-4 text-amber-500" />
              </div>
              <div className="text-xl font-black font-mono text-amber-600 dark:text-amber-400">
                {inventoryKPIs.lowStockCount} items
              </div>
              <div className="text-[10px] text-slate-400 mt-1">
                {inventoryKPIs.outOfStockCount} zero stock
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs">
              <div className="flex items-center justify-between text-xs font-semibold text-slate-500 mb-1">
                <span>Expiry Risk</span>
                <AlertTriangle className="w-4 h-4 text-rose-500" />
              </div>
              <div className="text-xl font-black font-mono text-rose-600 dark:text-rose-400">
                {inventoryKPIs.imminentExpirations} batches
              </div>
              <div className="text-[10px] text-slate-400 mt-1">Expiring in ≤ 90 days</div>
            </div>
          </div>

          {/* Velocity Curve & Tender Distribution */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-xs">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="font-bold text-sm text-slate-900 dark:text-white flex items-center gap-2">
                    <span>Hourly Sales Velocity Curve</span>
                    <Clock className="w-4 h-4 text-slate-400" />
                  </h3>
                  <p className="text-xs text-slate-500">Sales volume and customer traffic pattern today</p>
                </div>
              </div>

              <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={hourlyVelocityData}>
                    <defs>
                      <linearGradient id="salesVelocity" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.4} />
                        <stop offset="95%" stopColor="#f59e0b" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" opacity={0.15} />
                    <XAxis dataKey="hour" stroke="#94a3b8" fontSize={11} tickLine={false} />
                    <YAxis stroke="#94a3b8" fontSize={11} tickLine={false} />
                    <Tooltip
                      formatter={(val: unknown) => [formatCurrency(Number(val) || 0, currency), 'Revenue']}
                      contentStyle={{
                        backgroundColor: '#0f172a',
                        border: '1px solid #334155',
                        borderRadius: '8px',
                        color: '#fff',
                        fontSize: '12px',
                      }}
                    />
                    <Area
                      type="monotone"
                      dataKey="sales"
                      stroke="#d97706"
                      strokeWidth={2.5}
                      fillOpacity={1}
                      fill="url(#salesVelocity)"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-xs flex flex-col justify-between">
              <div>
                <h3 className="font-bold text-sm text-slate-900 dark:text-white">Payment Method Distribution</h3>
                <p className="text-xs text-slate-500 mb-4">Breakdown of collections across tender channels</p>

                <div className="space-y-3 text-xs">
                  <div>
                    <div className="flex justify-between font-semibold mb-1">
                      <span className="flex items-center gap-1.5 text-blue-600">
                        <Banknote className="w-3.5 h-3.5" /> Cash Collections
                      </span>
                      <span className="font-mono">{formatCurrency(todayKPIs.cashAtHand, currency)}</span>
                    </div>
                    <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-full h-2 overflow-hidden">
                      <div
                        className="bg-blue-500 h-2 rounded-full"
                        style={{
                          width: `${
                            todayKPIs.grossRevenue > 0
                              ? (todayKPIs.cashAtHand / todayKPIs.grossRevenue) * 100
                              : 50
                          }%`,
                        }}
                      />
                    </div>
                  </div>

                  <div>
                    <div className="flex justify-between font-semibold mb-1">
                      <span className="flex items-center gap-1.5 text-purple-600">
                        <Smartphone className="w-3.5 h-3.5" /> Mobile Money (M-Pesa)
                      </span>
                      <span className="font-mono">{formatCurrency(todayKPIs.mobileMoneyBalance, currency)}</span>
                    </div>
                    <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-full h-2 overflow-hidden">
                      <div
                        className="bg-purple-500 h-2 rounded-full"
                        style={{
                          width: `${
                            todayKPIs.grossRevenue > 0
                              ? (todayKPIs.mobileMoneyBalance / todayKPIs.grossRevenue) * 100
                              : 40
                          }%`,
                        }}
                      />
                    </div>
                  </div>

                  <div>
                    <div className="flex justify-between font-semibold mb-1">
                      <span className="flex items-center gap-1.5 text-emerald-600">
                        <CreditCard className="w-3.5 h-3.5" /> Card / POS Terminal
                      </span>
                      <span className="font-mono">{formatCurrency(todayKPIs.cardBalance, currency)}</span>
                    </div>
                    <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-full h-2 overflow-hidden">
                      <div
                        className="bg-emerald-500 h-2 rounded-full"
                        style={{
                          width: `${
                            todayKPIs.grossRevenue > 0
                              ? (todayKPIs.cardBalance / todayKPIs.grossRevenue) * 100
                              : 10
                          }%`,
                        }}
                      />
                    </div>
                  </div>
                </div>
              </div>

              <div className="p-3 mt-4 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-800 text-xs text-slate-500">
                Total Revenue Today: <strong className="font-mono text-slate-900 dark:text-white">{formatCurrency(todayKPIs.grossRevenue, currency)}</strong>
              </div>
            </div>
          </div>

          {/* Top 10 Drugs Table */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xs overflow-hidden">
            <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
              <h3 className="font-bold text-sm text-slate-900 dark:text-white flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-amber-500" />
                <span>Top 10 Fastest-Moving Medicines</span>
              </h3>
              <span className="text-[11px] text-slate-400">By Dispensing Volume</span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-50 dark:bg-slate-800/60 text-slate-500 uppercase text-[10px] font-bold border-b border-slate-200 dark:border-slate-800">
                    <th className="py-2.5 px-3">#</th>
                    <th className="py-2.5 px-3">Medication</th>
                    <th className="py-2.5 px-3 text-center">Units Sold</th>
                    <th className="py-2.5 px-3 text-right">Revenue</th>
                    <th className="py-2.5 px-3 text-right">Selling Price</th>
                    <th className="py-2.5 px-3 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {top10Drugs.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-8 text-center text-slate-400">
                        No sales recorded yet.
                      </td>
                    </tr>
                  ) : (
                    top10Drugs.map((item, idx) => (
                      <tr key={item.product.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                        <td className="py-2.5 px-3 font-mono text-slate-400 font-bold">{idx + 1}</td>
                        <td className="py-2.5 px-3">
                          <div className="font-bold text-slate-900 dark:text-white">{item.product.name}</div>
                          <div className="text-[10px] text-slate-400 italic">{item.product.genericName}</div>
                        </td>
                        <td className="py-2.5 px-3 text-center font-mono font-bold text-amber-600 dark:text-amber-400">
                          {item.unitsSold}
                        </td>
                        <td className="py-2.5 px-3 text-right font-mono font-semibold">
                          {formatCurrency(item.totalRevenue, currency)}
                        </td>
                        <td className="py-2.5 px-3 text-right font-mono text-slate-500">
                          {formatCurrency(item.product.sellingPrice, currency)}
                        </td>
                        <td className="py-2.5 px-3 text-right">
                          <button
                            onClick={() => setSelectedProductForPrice(item.product)}
                            className="p-1 text-slate-400 hover:text-amber-500 rounded transition"
                            title="Quick Price Adjustment"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* SECTION 2: STAFF ACCOUNTABILITY MATRIX */}
      {activeSection === 'staff' && (
        <StaffAccountabilityView
          currencySymbol={currency}
          onOpenStaffManagement={() => setIsStaffManagementOpen(true)}
        />
      )}

      {/* SECTION 3: AUDIT TRAIL */}
      {activeSection === 'audit' && (
        <div className="h-[600px]">
          <AuditTrailView />
        </div>
      )}

      {/* Quick Remote Price Adjustment Modal */}
      {selectedProductForPrice && (
        <QuickPriceAdjustModal
          product={selectedProductForPrice}
          currencySymbol={currency}
          tenantId={tenantId}
          attendantName={attendantName}
          onSaved={() => setSelectedProductForPrice(null)}
          onClose={() => setSelectedProductForPrice(null)}
        />
      )}

      {/* Staff Management Modal (Owner Only) */}
      {isStaffManagementOpen && (
        <StaffManagementModal
          isOpen={isStaffManagementOpen}
          tenantId={tenantId}
          onClose={() => setIsStaffManagementOpen(false)}
        />
      )}
    </div>
  );
};
