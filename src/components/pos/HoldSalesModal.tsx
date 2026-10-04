import React from 'react';
import { HeldSale } from '../../types';
import { Clock, Play, Trash2, X, ShoppingBag } from 'lucide-react';
import { formatCurrency, formatDateTime } from '../../lib/formatters';

interface HoldSalesModalProps {
  isOpen: boolean;
  heldSales: HeldSale[];
  currencySymbol: string;
  onResume: (sale: HeldSale) => void;
  onDelete: (id: string) => void;
  onClose: () => void;
}

export const HoldSalesModal: React.FC<HoldSalesModalProps> = ({
  isOpen,
  heldSales,
  currencySymbol,
  onResume,
  onDelete,
  onClose,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-2xl max-w-lg w-full overflow-hidden text-slate-800 dark:text-slate-100">
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/60">
          <div className="flex items-center gap-2">
            <Clock className="w-5 h-5 text-teal-600 dark:text-teal-400" />
            <h3 className="font-bold text-sm">Parked / Held Sales (F9)</h3>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 p-1">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-5 space-y-3">
          {heldSales.length === 0 ? (
            <div className="text-center py-10 text-slate-400 text-xs">
              <ShoppingBag className="w-8 h-8 mx-auto mb-2 opacity-50" />
              No parked sales in queue. Press <kbd className="font-mono bg-slate-100 dark:bg-slate-800 px-1 rounded">F8</kbd> to park a cart.
            </div>
          ) : (
            <div className="space-y-2.5 max-h-96 overflow-y-auto">
              {heldSales.map((held) => {
                const total = held.items.reduce((sum, item) => sum + item.lineTotal, 0);
                return (
                  <div
                    key={held.id}
                    className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 flex items-center justify-between gap-3 text-xs"
                  >
                    <div>
                      <div className="font-bold text-slate-900 dark:text-white flex items-center gap-2">
                        <span>{held.customerRef || held.patientName || 'Anonymous Customer'}</span>
                        <span className="text-[10px] text-slate-400 font-mono">
                          {formatDateTime(held.heldAt)}
                        </span>
                      </div>
                      <div className="text-slate-500 mt-0.5">
                        {held.items.length} line item(s) •{' '}
                        <span className="font-bold font-mono text-teal-600 dark:text-teal-400">
                          {formatCurrency(total, currencySymbol)}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => onResume(held)}
                        className="px-3 py-1.5 bg-teal-600 hover:bg-teal-500 text-white rounded-lg font-semibold flex items-center gap-1 text-xs shadow-sm"
                      >
                        <Play className="w-3.5 h-3.5 fill-current" /> Resume
                      </button>
                      <button
                        onClick={() => onDelete(held.id)}
                        className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/40 rounded-lg transition"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
