import React, { useState, useMemo } from 'react';
import { StaffUser, Sale, StockAdjustment, AuditLog } from '../../types';
import { db } from '../../db/db';
import { useLiveQuery } from 'dexie-react-hooks';
import {
  Users,
  ShieldAlert,
  CheckCircle2,
  Banknote,
  Smartphone,
  CreditCard,
  TrendingUp,
  AlertTriangle,
  History,
  Lock,
  Plus,
  Key,
} from 'lucide-react';
import { formatCurrency, formatDateTime } from '../../lib/formatters';

interface StaffAccountabilityViewProps {
  currencySymbol: string;
  onOpenStaffManagement?: () => void;
}

export const StaffAccountabilityView: React.FC<StaffAccountabilityViewProps> = ({
  currencySymbol,
  onOpenStaffManagement,
}) => {
  const staffList = useLiveQuery(() => db.staff_users.toArray(), []) || [];
  const sales = useLiveQuery(() => db.sales.toArray(), []) || [];
  const stockAdjustments = useLiveQuery(() => db.stock_adjustments.toArray(), []) || [];
  const auditLogs = useLiveQuery(() => db.audit_logs.reverse().toArray(), []) || [];

  const [selectedStaffId, setSelectedStaffId] = useState<string>('all');

  // Compute accountability metrics per staff member
  const staffMetrics = useMemo(() => {
    return staffList.map((member) => {
      // Find sales belonging to this staff member (matched by attendantId or attendantName)
      const memberSales = sales.filter(
        (s) => (s.attendantId && s.attendantId === member.id) || s.attendantName === member.fullName
      );

      const totalRevenue = memberSales.reduce((acc, s) => acc + s.total, 0);
      const totalReceipts = memberSales.length;

      let cashTotal = 0;
      let momoTotal = 0;
      let cardTotal = 0;
      let creditTotal = 0;

      for (const s of memberSales) {
        if (s.paymentMethod === 'cash') cashTotal += s.total;
        else if (s.paymentMethod === 'mobile_money') momoTotal += s.total;
        else if (s.paymentMethod === 'card') cardTotal += s.total;
        else if (s.paymentMethod === 'credit') creditTotal += s.total;
      }

      // Stock adjustments logged by this staff member
      const memberAdjustments = stockAdjustments.filter(
        (a) => (a.attendantId && a.attendantId === member.id) || a.attendantName === member.fullName
      );

      const damageAdjustments = memberAdjustments.filter(
        (a) => a.adjustmentType === 'damage' || a.adjustmentType === 'theft_loss'
      );

      const totalDamagedQuantity = damageAdjustments.reduce(
        (acc, a) => acc + Math.abs(a.quantityChange),
        0
      );

      return {
        member,
        totalReceipts,
        totalRevenue,
        cashTotal,
        momoTotal,
        cardTotal,
        creditTotal,
        adjustmentsCount: memberAdjustments.length,
        damageIncidentsCount: damageAdjustments.length,
        totalDamagedQuantity,
      };
    });
  }, [staffList, sales, stockAdjustments]);

  // Filter audit logs for individual staff accountability inspection
  const filteredAudit = useMemo(() => {
    if (selectedStaffId === 'all') return auditLogs.slice(0, 50);
    const selected = staffList.find((s) => s.id === selectedStaffId);
    if (!selected) return [];
    return auditLogs
      .filter((l) => (l.attendantId && l.attendantId === selected.id) || l.attendantName === selected.fullName)
      .slice(0, 50);
  }, [auditLogs, selectedStaffId, staffList]);

  return (
    <div className="space-y-6">
      {/* Header with Title and Staff Management Trigger */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Users className="w-5 h-5 text-teal-600" />
            <span>Staff Accountability & Cash Drawer Matrix</span>
          </h2>
          <p className="text-xs text-slate-500">
            Audit individual attendant performance, drawer revenue reconciliation, and stock damage attribution.
          </p>
        </div>

        {onOpenStaffManagement && (
          <button
            onClick={onOpenStaffManagement}
            className="px-3.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-semibold shadow-xs flex items-center gap-1.5 transition"
          >
            <Key className="w-3.5 h-3.5" /> Manage Accounts & PINs
          </button>
        )}
      </div>

      {/* Staff Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {staffMetrics.map((sm) => {
          const isOwner = sm.member.role === 'owner';
          const isSelected = selectedStaffId === sm.member.id;

          return (
            <div
              key={sm.member.id}
              onClick={() => setSelectedStaffId(isSelected ? 'all' : sm.member.id)}
              className={`p-4 rounded-2xl border transition-all cursor-pointer relative ${
                isSelected
                  ? 'ring-2 ring-teal-500 shadow-md bg-white dark:bg-slate-800 border-teal-500'
                  : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-teal-300 shadow-xs'
              }`}
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-2.5">
                  <div
                    className={`w-10 h-10 rounded-xl text-white font-bold flex items-center justify-center text-sm shadow-xs ${
                      isOwner ? 'bg-amber-600' : sm.member.avatarColor || 'bg-teal-600'
                    }`}
                  >
                    {sm.member.fullName.charAt(0)}
                  </div>
                  <div>
                    <div className="font-bold text-xs text-slate-900 dark:text-white truncate max-w-[130px]">
                      {sm.member.fullName}
                    </div>
                    <span
                      className={`inline-block px-1.5 py-0.2 rounded text-[10px] font-semibold uppercase mt-0.5 ${
                        isOwner
                          ? 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300'
                          : 'bg-teal-100 text-teal-800 dark:bg-teal-950/60 dark:text-teal-300'
                      }`}
                    >
                      {sm.member.role}
                    </span>
                  </div>
                </div>

                <span className="text-[10px] text-slate-400 font-mono">
                  {sm.totalReceipts} tx
                </span>
              </div>

              {/* Total Revenue Box */}
              <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-700/60 mb-3">
                <span className="text-[10px] text-slate-400 block uppercase font-bold tracking-wider">
                  Attributed Revenue
                </span>
                <span className="text-base font-extrabold font-mono text-slate-900 dark:text-white block mt-0.5">
                  {formatCurrency(sm.totalRevenue, currencySymbol)}
                </span>
              </div>

              {/* Drawer & Tender Breakdown */}
              <div className="space-y-1.5 text-[11px] border-t border-slate-100 dark:border-slate-800 pt-2.5">
                <div className="flex justify-between items-center text-slate-600 dark:text-slate-300">
                  <span className="flex items-center gap-1">
                    <Banknote className="w-3 h-3 text-blue-500" /> Cash in Drawer:
                  </span>
                  <span className="font-mono font-semibold">
                    {formatCurrency(sm.cashTotal, currencySymbol)}
                  </span>
                </div>

                <div className="flex justify-between items-center text-slate-600 dark:text-slate-300">
                  <span className="flex items-center gap-1">
                    <Smartphone className="w-3 h-3 text-purple-500" /> M-Pesa / Tigo:
                  </span>
                  <span className="font-mono font-semibold">
                    {formatCurrency(sm.momoTotal, currencySymbol)}
                  </span>
                </div>

                <div className="flex justify-between items-center text-slate-600 dark:text-slate-300">
                  <span className="flex items-center gap-1">
                    <CreditCard className="w-3 h-3 text-emerald-500" /> Card / POS:
                  </span>
                  <span className="font-mono font-semibold">
                    {formatCurrency(sm.cardTotal, currencySymbol)}
                  </span>
                </div>

                {/* Stock damage incidents */}
                <div className="flex justify-between items-center pt-1 border-t border-dotted border-slate-200 dark:border-slate-700 text-slate-500">
                  <span className="flex items-center gap-1 text-rose-500 font-medium">
                    <AlertTriangle className="w-3 h-3" /> Damages / Loss:
                  </span>
                  <span className="font-mono font-bold text-rose-600 dark:text-rose-400">
                    {sm.damageIncidentsCount} ({sm.totalDamagedQuantity} pk)
                  </span>
                </div>
              </div>

              <div className="mt-3 text-center">
                <span className="text-[10px] text-teal-600 dark:text-teal-400 font-semibold hover:underline">
                  {isSelected ? 'Viewing Specific Audit Logs ↓' : 'Click to Audit Attendant'}
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Attendant Individual Audit Log */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 sm:p-5 shadow-xs">
        <div className="flex items-center justify-between mb-3 border-b border-slate-100 dark:border-slate-800 pb-3">
          <div className="flex items-center gap-2">
            <History className="w-4 h-4 text-teal-600" />
            <h3 className="font-bold text-xs sm:text-sm text-slate-900 dark:text-white">
              {selectedStaffId === 'all'
                ? 'All Attendants Operational Activity'
                : `Filtered Activity for: ${
                    staffList.find((s) => s.id === selectedStaffId)?.fullName
                  }`}
            </h3>
          </div>

          {selectedStaffId !== 'all' && (
            <button
              onClick={() => setSelectedStaffId('all')}
              className="text-xs text-teal-600 hover:underline font-semibold"
            >
              Reset to All Staff
            </button>
          )}
        </div>

        <div className="max-h-72 overflow-y-auto space-y-1.5 text-xs">
          {filteredAudit.length === 0 ? (
            <div className="text-center py-8 text-slate-400 text-xs">
              No audit logs recorded for this attendant.
            </div>
          ) : (
            filteredAudit.map((log) => (
              <div
                key={log.id}
                className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-700/60 flex items-start justify-between gap-3"
              >
                <div>
                  <div className="font-bold text-slate-800 dark:text-slate-200 flex items-center gap-2">
                    <span className="px-1.5 py-0.2 rounded text-[10px] bg-slate-200 dark:bg-slate-700 font-mono">
                      {log.action}
                    </span>
                    <span>{log.attendantName}</span>
                  </div>
                  <p className="text-slate-500 mt-0.5 text-[11px]">{log.details}</p>
                </div>
                <span className="text-[10px] text-slate-400 font-mono flex-shrink-0">
                  {formatDateTime(log.created_at)}
                </span>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};
