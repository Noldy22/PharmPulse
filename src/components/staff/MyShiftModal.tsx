import React, { useMemo } from 'react';
import { StaffUser, Sale } from '../../types';
import { db } from '../../db/db';
import { useLiveQuery } from 'dexie-react-hooks';
import {
  Banknote,
  Smartphone,
  CreditCard,
  ShoppingCart,
  Clock,
  X,
  CheckCircle,
  FileText,
  User,
} from 'lucide-react';
import { formatCurrency, formatDateTime } from '../../lib/formatters';

interface MyShiftModalProps {
  isOpen: boolean;
  currentUser: StaffUser;
  currencySymbol: string;
  onClose: () => void;
}

export const MyShiftModal: React.FC<MyShiftModalProps> = ({
  isOpen,
  currentUser,
  currencySymbol,
  onClose,
}) => {
  const sales = useLiveQuery(() => db.sales.toArray(), []) || [];

  // Filter sales completed by this user today
  const mySalesToday = useMemo(() => {
    const todayStr = new Date().toISOString().slice(0, 10);
    return sales.filter((s) => {
      const isToday = s.created_at.startsWith(todayStr);
      const isMe = (s.attendantId && s.attendantId === currentUser.id) || s.attendantName === currentUser.fullName;
      return isToday && isMe;
    });
  }, [sales, currentUser]);

  // Aggregate numbers
  const shiftTotals = useMemo(() => {
    let gross = 0;
    let cash = 0;
    let momo = 0;
    let card = 0;
    let credit = 0;

    for (const s of mySalesToday) {
      gross += s.total;
      if (s.paymentMethod === 'cash') cash += s.total;
      else if (s.paymentMethod === 'mobile_money') momo += s.total;
      else if (s.paymentMethod === 'card') card += s.total;
      else if (s.paymentMethod === 'credit') credit += s.total;
    }

    return { gross, cash, momo, card, credit, count: mySalesToday.length };
  }, [mySalesToday]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl max-w-xl w-full max-h-[90vh] flex flex-col my-auto text-slate-800 dark:text-slate-100 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/60 flex-shrink-0">
          <div className="flex items-center gap-2.5">
            <User className="w-5 h-5 text-teal-600 dark:text-teal-400" />
            <div>
              <h3 className="font-bold text-base">My Shift Register & Cash Drawer Reconciliation</h3>
              <p className="text-xs text-slate-500">
                Attendant: <span className="font-semibold text-slate-800 dark:text-slate-200">{currentUser.fullName}</span> ({currentUser.role.toUpperCase()})
              </p>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 p-1">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Shift Body */}
        <div className="p-6 space-y-4 overflow-y-auto flex-1 text-xs">
          <div className="p-3.5 rounded-2xl bg-teal-50 dark:bg-teal-950/40 border border-teal-200 dark:border-teal-800/80 flex items-center justify-between">
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-teal-700 dark:text-teal-300 block">
                Total Collections This Shift
              </span>
              <span className="text-2xl font-black font-mono text-teal-800 dark:text-teal-200">
                {formatCurrency(shiftTotals.gross, currencySymbol)}
              </span>
            </div>
            <div className="text-right">
              <span className="text-[10px] text-teal-600 dark:text-teal-400 font-semibold block">Transactions</span>
              <span className="text-xl font-black font-mono text-teal-700 dark:text-teal-300">
                {shiftTotals.count} receipts
              </span>
            </div>
          </div>

          {/* Drawer Reconciliation Breakdown */}
          <div className="grid grid-cols-3 gap-2.5">
            <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700">
              <div className="flex items-center gap-1.5 text-blue-600 font-bold mb-1">
                <Banknote className="w-4 h-4" /> Cash Handover
              </div>
              <div className="text-base font-extrabold font-mono text-slate-900 dark:text-white">
                {formatCurrency(shiftTotals.cash, currencySymbol)}
              </div>
              <span className="text-[10px] text-slate-400 block mt-0.5">Physical drawer count</span>
            </div>

            <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700">
              <div className="flex items-center gap-1.5 text-purple-600 font-bold mb-1">
                <Smartphone className="w-4 h-4" /> Mobile Money
              </div>
              <div className="text-base font-extrabold font-mono text-slate-900 dark:text-white">
                {formatCurrency(shiftTotals.momo, currencySymbol)}
              </div>
              <span className="text-[10px] text-slate-400 block mt-0.5">M-Pesa / Tigo receipts</span>
            </div>

            <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700">
              <div className="flex items-center gap-1.5 text-emerald-600 font-bold mb-1">
                <CreditCard className="w-4 h-4" /> Card POS
              </div>
              <div className="text-base font-extrabold font-mono text-slate-900 dark:text-white">
                {formatCurrency(shiftTotals.card, currencySymbol)}
              </div>
              <span className="text-[10px] text-slate-400 block mt-0.5">Merchant terminal slips</span>
            </div>
          </div>

          {/* Recent Sales by this attendant */}
          <div>
            <h4 className="font-bold uppercase tracking-wider text-slate-500 mb-2 text-[11px]">
              My Transactions Today ({mySalesToday.length})
            </h4>

            {mySalesToday.length === 0 ? (
              <div className="p-4 text-center border border-dashed border-slate-200 dark:border-slate-800 rounded-xl text-slate-400">
                You have not completed any sales during this shift yet.
              </div>
            ) : (
              <div className="max-h-48 overflow-y-auto space-y-1.5 border border-slate-200 dark:border-slate-800 rounded-xl p-2 font-mono text-[11px]">
                {mySalesToday.map((sale) => (
                  <div
                    key={sale.id}
                    className="flex items-center justify-between p-2 rounded-lg bg-slate-50 dark:bg-slate-800/60"
                  >
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-slate-800 dark:text-slate-200">{sale.receiptNumber}</span>
                      <span className="uppercase text-[10px] px-1 rounded bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300">
                        {sale.paymentMethod}
                      </span>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="font-bold text-teal-600 dark:text-teal-400">
                        {formatCurrency(sale.total, currencySymbol)}
                      </span>
                      <span className="text-slate-400 text-[10px]">
                        {new Date(sale.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800 text-[11px] text-slate-500 leading-relaxed">
            💡 <strong>Accountability Rule:</strong> At the close of your shift, hand over the exact cash figure ({formatCurrency(shiftTotals.cash, currencySymbol)}) along with mobile money confirmation slips to the Owner/Manager.
          </div>
        </div>
      </div>
    </div>
  );
};
