import React from 'react';
import { Keyboard, X } from 'lucide-react';

interface KeyboardShortcutsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const KeyboardShortcutsModal: React.FC<KeyboardShortcutsModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  const shortcuts = [
    { key: 'F2', action: 'New Sale / Clear Cart', desc: 'Resets the current transaction to start a fresh sale' },
    { key: 'F4', action: 'Complete Sale (Pay)', desc: 'Opens the Multi-Tender payment modal immediately' },
    { key: 'F8', action: 'Hold Current Sale', desc: 'Saves current cart to hold queue while serving next customer' },
    { key: 'F9', action: 'Recall Held Sales', desc: 'Opens the list of parked/held carts to restore' },
    { key: 'Enter', action: 'Add First Match to Cart', desc: 'When searching a drug, quickly adds the highlighted item' },
    { key: 'Esc', action: 'Close Modal / Cancel', desc: 'Dismisses open dialogs, checkout screen, or active popups' },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-2xl max-w-md w-full overflow-hidden text-slate-800 dark:text-slate-100">
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/60">
          <div className="flex items-center gap-2">
            <Keyboard className="w-5 h-5 text-teal-600 dark:text-teal-400" />
            <h3 className="font-bold text-sm">Keyboard Fast-Dispense Shortcuts</h3>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 p-1">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-5 space-y-3">
          <p className="text-xs text-slate-500 mb-2">
            Engineered for high-volume counter speed. Dispense drugs without touching the mouse:
          </p>
          <div className="space-y-2">
            {shortcuts.map((sc) => (
              <div
                key={sc.key}
                className="flex items-center justify-between p-2.5 rounded-lg bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/60"
              >
                <div>
                  <div className="text-xs font-bold text-slate-800 dark:text-slate-200">{sc.action}</div>
                  <div className="text-[11px] text-slate-500">{sc.desc}</div>
                </div>
                <kbd className="px-2.5 py-1 bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded font-mono text-xs font-bold shadow-sm text-teal-700 dark:text-teal-300">
                  {sc.key}
                </kbd>
              </div>
            ))}
          </div>

          <div className="pt-2 text-right">
            <button
              onClick={onClose}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-lg text-xs font-medium"
            >
              Got it
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
