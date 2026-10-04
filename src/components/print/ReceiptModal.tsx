import React, { useState } from 'react';
import { Sale, SaleItem, StoreSettings } from '../../types';
import { ThermalReceipt } from './ThermalReceipt';
import { A4Invoice } from './A4Invoice';
import { Printer, X, FileText, Receipt, CheckCircle } from 'lucide-react';

interface ReceiptModalProps {
  sale: Sale;
  items: SaleItem[];
  settings?: StoreSettings | null;
  onClose: () => void;
  autoPrint?: boolean;
}

export const ReceiptModal: React.FC<ReceiptModalProps> = ({
  sale,
  items,
  settings,
  onClose,
  autoPrint = false,
}) => {
  const [printFormat, setPrintFormat] = useState<'thermal' | 'a4'>('thermal');

  React.useEffect(() => {
    if (autoPrint) {
      const timer = setTimeout(() => {
        window.print();
      }, 400);
      return () => clearTimeout(timer);
    }
  }, [autoPrint]);

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="relative bg-slate-900 border border-slate-700 rounded-xl shadow-2xl max-w-4xl w-full max-h-[90vh] flex flex-col no-print">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-900/90 rounded-t-xl">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
              <CheckCircle className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                Sale Completed
                <span className="text-xs font-mono font-normal text-slate-400 bg-slate-800 px-2 py-0.5 rounded">
                  {sale.receiptNumber}
                </span>
              </h2>
              <p className="text-xs text-slate-400">Preview receipt or invoice before printing</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Format Switcher */}
            <div className="flex items-center bg-slate-800 p-1 rounded-lg border border-slate-700">
              <button
                onClick={() => setPrintFormat('thermal')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-medium transition-colors ${
                  printFormat === 'thermal'
                    ? 'bg-teal-600 text-white shadow-sm'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <Receipt className="w-3.5 h-3.5" />
                80mm Thermal
              </button>
              <button
                onClick={() => setPrintFormat('a4')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-medium transition-colors ${
                  printFormat === 'a4'
                    ? 'bg-teal-600 text-white shadow-sm'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <FileText className="w-3.5 h-3.5" />
                A4 Medical
              </button>
            </div>

            <button
              onClick={handlePrint}
              className="flex items-center gap-2 bg-teal-600 hover:bg-teal-500 text-white px-4 py-2 rounded-lg text-xs font-semibold shadow transition-all active:scale-95"
            >
              <Printer className="w-4 h-4" />
              Print Now (Ctrl+P)
            </button>

            <button
              onClick={onClose}
              className="text-slate-400 hover:text-white p-2 rounded-lg hover:bg-slate-800 transition-colors ml-2"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Modal Body Preview Container */}
        <div className="flex-1 overflow-y-auto p-6 bg-slate-950/60 flex justify-center">
          <div className="bg-white shadow-xl rounded overflow-hidden">
            {printFormat === 'thermal' ? (
              <ThermalReceipt sale={sale} items={items} settings={settings} />
            ) : (
              <div className="transform scale-90 origin-top">
                <A4Invoice sale={sale} items={items} settings={settings} />
              </div>
            )}
          </div>
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-3 border-t border-slate-800 bg-slate-900 rounded-b-xl flex items-center justify-between text-xs text-slate-400">
          <div>
            Press <kbd className="bg-slate-800 px-1.5 py-0.5 rounded text-slate-300 font-mono">Esc</kbd> to close and begin new sale.
          </div>
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-slate-800 hover:bg-slate-700 text-white rounded text-xs font-medium transition-colors"
          >
            Done / Next Customer
          </button>
        </div>
      </div>

      {/* Hidden container dedicated to print DOM */}
      <div className="hidden print:block">
        {printFormat === 'thermal' ? (
          <ThermalReceipt sale={sale} items={items} settings={settings} />
        ) : (
          <A4Invoice sale={sale} items={items} settings={settings} />
        )}
      </div>
    </div>
  );
};
