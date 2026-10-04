import React, { useState, useEffect } from 'react';
import {
  Banknote,
  Smartphone,
  CreditCard,
  BookOpen,
  CheckCircle,
  X,
  Printer,
  FileText,
  Calculator,
  ArrowRight,
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { PaymentMethod, PaymentDetails, CartItem, StoreSettings } from '../../types';
import { formatCurrency } from '../../lib/formatters';

interface CheckoutModalProps {
  isOpen: boolean;
  total: number;
  items: CartItem[];
  settings: StoreSettings | null;
  onCompleteCheckout: (
    paymentMethod: PaymentMethod,
    paymentDetails: PaymentDetails,
    autoPrintThermal: boolean
  ) => Promise<void>;
  onClose: () => void;
}

export const CheckoutModal: React.FC<CheckoutModalProps> = ({
  isOpen,
  total,
  items,
  settings,
  onCompleteCheckout,
  onClose,
}) => {
  const currency = settings?.currencySymbol || 'TSh';
  const [method, setMethod] = useState<PaymentMethod>('cash');

  // Cash state
  const [cashReceived, setCashReceived] = useState<number>(total);
  const changeGiven = Math.max(0, cashReceived - total);

  // Mobile Money state
  const [momoProvider, setMomoProvider] = useState<'mpesa' | 'tigopesa' | 'airtel' | 'mtn' | 'other'>('mpesa');
  const [momoPhone, setMomoPhone] = useState('');
  const [momoRef, setMomoRef] = useState('');

  // Card state
  const [cardAuth, setCardAuth] = useState('');
  const [cardLast4, setCardLast4] = useState('');

  // Credit / Debt state
  const [debtorName, setDebtorName] = useState('');
  const [debtorPhone, setDebtorPhone] = useState('');
  const [debtDueDate, setDebtDueDate] = useState('');

  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Update default cash when total changes
  useEffect(() => {
    setCashReceived(total);
  }, [total]);

  // Generate suggested quick cash denominations based on total
  const getDenominations = () => {
    if (currency === '$' || currency === 'USD') {
      return [10, 20, 50, 100];
    }
    // TSh / East African Shillings
    const base = [1000, 2000, 5000, 10000, 20000, 50000];
    const roundedUp = Math.ceil(total / 5000) * 5000;
    const roundedUp10 = Math.ceil(total / 10000) * 10000;
    const set = new Set([total, roundedUp, roundedUp10, 10000, 20000, 50000]);
    return Array.from(set).filter((v) => v >= total).sort((a, b) => a - b).slice(0, 5);
  };

  if (!isOpen) return null;

  const handleFinish = async (autoPrint: boolean) => {
    setError(null);

    // Validation
    if (method === 'cash' && cashReceived < total) {
      setError(`Cash received (${formatCurrency(cashReceived, currency)}) is less than total payable (${formatCurrency(total, currency)}).`);
      return;
    }

    if (method === 'mobile_money' && !momoRef.trim()) {
      setError('Please enter the Mobile Money transaction reference / confirmation code.');
      return;
    }

    if (method === 'credit' && !debtorName.trim()) {
      setError('Please enter the customer / debtor name for store ledger.');
      return;
    }

    setProcessing(true);

    const paymentDetails: PaymentDetails = {
      cashReceived: method === 'cash' ? cashReceived : undefined,
      changeGiven: method === 'cash' ? changeGiven : undefined,
      mobileMoney:
        method === 'mobile_money'
          ? {
              provider: momoProvider,
              phoneNumber: momoPhone.trim() || undefined,
              transactionRef: momoRef.trim().toUpperCase(),
            }
          : undefined,
      card:
        method === 'card'
          ? {
              cardType: 'visa',
              last4: cardLast4.trim() || undefined,
              authCode: cardAuth.trim().toUpperCase() || 'APPROVED',
            }
          : undefined,
      credit:
        method === 'credit'
          ? {
              customerName: debtorName.trim(),
              customerPhone: debtorPhone.trim() || undefined,
              dueDate: debtDueDate || undefined,
            }
          : undefined,
    };

    try {
      await onCompleteCheckout(method, paymentDetails, autoPrint);
      // Confetti burst
      confetti({
        particleCount: 50,
        spread: 60,
        origin: { y: 0.8 },
      });
      onClose();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Checkout failed');
    } finally {
      setProcessing(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl max-w-xl w-full overflow-hidden text-slate-800 dark:text-slate-100 animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/60">
          <div className="flex items-center gap-2.5">
            <Calculator className="w-5 h-5 text-teal-600 dark:text-teal-400" />
            <div>
              <h3 className="font-bold text-base">Multi-Tender Checkout</h3>
              <p className="text-xs text-slate-500">{items.length} item line(s) in active cart</p>
            </div>
          </div>
          <div className="text-right">
            <span className="text-xs text-slate-400 block uppercase font-bold tracking-wider">Payable</span>
            <span className="text-xl font-extrabold text-teal-600 dark:text-teal-400 font-mono">
              {formatCurrency(total, currency)}
            </span>
          </div>
        </div>

        <div className="p-6 space-y-5">
          {/* Payment Method Switcher Tabs */}
          <div className="grid grid-cols-4 gap-2">
            <button
              type="button"
              onClick={() => setMethod('cash')}
              className={`p-3 rounded-xl border flex flex-col items-center justify-center gap-1.5 transition text-xs font-semibold ${
                method === 'cash'
                  ? 'border-teal-500 bg-teal-50 dark:bg-teal-950/40 text-teal-800 dark:text-teal-200 shadow-sm'
                  : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 text-slate-600 dark:text-slate-400'
              }`}
            >
              <Banknote className="w-5 h-5" />
              <span>Cash</span>
            </button>

            <button
              type="button"
              onClick={() => setMethod('mobile_money')}
              className={`p-3 rounded-xl border flex flex-col items-center justify-center gap-1.5 transition text-xs font-semibold ${
                method === 'mobile_money'
                  ? 'border-teal-500 bg-teal-50 dark:bg-teal-950/40 text-teal-800 dark:text-teal-200 shadow-sm'
                  : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 text-slate-600 dark:text-slate-400'
              }`}
            >
              <Smartphone className="w-5 h-5" />
              <span>M-Money</span>
            </button>

            <button
              type="button"
              onClick={() => setMethod('card')}
              className={`p-3 rounded-xl border flex flex-col items-center justify-center gap-1.5 transition text-xs font-semibold ${
                method === 'card'
                  ? 'border-teal-500 bg-teal-50 dark:bg-teal-950/40 text-teal-800 dark:text-teal-200 shadow-sm'
                  : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 text-slate-600 dark:text-slate-400'
              }`}
            >
              <CreditCard className="w-5 h-5" />
              <span>Card / POS</span>
            </button>

            <button
              type="button"
              onClick={() => setMethod('credit')}
              className={`p-3 rounded-xl border flex flex-col items-center justify-center gap-1.5 transition text-xs font-semibold ${
                method === 'credit'
                  ? 'border-teal-500 bg-teal-50 dark:bg-teal-950/40 text-teal-800 dark:text-teal-200 shadow-sm'
                  : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 text-slate-600 dark:text-slate-400'
              }`}
            >
              <BookOpen className="w-5 h-5" />
              <span>Store Credit</span>
            </button>
          </div>

          {/* Conditional Forms */}
          {/* 1. CASH */}
          {method === 'cash' && (
            <div className="space-y-4 bg-slate-50 dark:bg-slate-800/40 p-4 rounded-xl border border-slate-200 dark:border-slate-800">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">
                  Cash Received
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-2.5 font-mono font-bold text-slate-400 text-sm">
                    {currency}
                  </span>
                  <input
                    type="number"
                    autoFocus
                    value={cashReceived || ''}
                    onChange={(e) => setCashReceived(parseFloat(e.target.value) || 0)}
                    className="w-full pl-12 pr-4 py-2.5 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-lg font-bold font-mono outline-none focus:ring-2 focus:ring-teal-500"
                  />
                </div>
              </div>

              {/* Quick Preset Buttons */}
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="text-[11px] font-semibold text-slate-400 mr-1">Presets:</span>
                {getDenominations().map((denom) => (
                  <button
                    key={denom}
                    type="button"
                    onClick={() => setCashReceived(denom)}
                    className={`px-2.5 py-1 rounded-lg border text-xs font-mono font-medium transition ${
                      cashReceived === denom
                        ? 'bg-teal-600 text-white border-teal-600'
                        : 'bg-white dark:bg-slate-800 border-slate-300 dark:border-slate-700 hover:border-teal-400'
                    }`}
                  >
                    {formatCurrency(denom, currency)}
                  </button>
                ))}
              </div>

              {/* Change calculation */}
              <div className="flex items-center justify-between p-3 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700">
                <span className="text-xs font-semibold text-slate-500">Change Due:</span>
                <span
                  className={`text-lg font-extrabold font-mono ${
                    changeGiven >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-500'
                  }`}
                >
                  {formatCurrency(changeGiven, currency)}
                </span>
              </div>
            </div>
          )}

          {/* 2. MOBILE MONEY */}
          {method === 'mobile_money' && (
            <div className="space-y-3.5 bg-slate-50 dark:bg-slate-800/40 p-4 rounded-xl border border-slate-200 dark:border-slate-800 text-xs">
              <div>
                <label className="block font-bold uppercase tracking-wider text-slate-500 mb-1.5">
                  Mobile Network Provider
                </label>
                <div className="grid grid-cols-4 gap-2">
                  {(['mpesa', 'tigopesa', 'airtel', 'mtn'] as const).map((prov) => (
                    <button
                      key={prov}
                      type="button"
                      onClick={() => setMomoProvider(prov)}
                      className={`py-2 px-1 text-center rounded-lg border uppercase font-bold text-[11px] transition ${
                        momoProvider === prov
                          ? 'border-teal-500 bg-teal-100 dark:bg-teal-950/60 text-teal-800 dark:text-teal-200'
                          : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900'
                      }`}
                    >
                      {prov === 'mpesa' ? 'M-PESA' : prov === 'tigopesa' ? 'TIGO PESA' : prov.toUpperCase()}
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold uppercase tracking-wider text-slate-500 mb-1">
                    Customer Phone
                  </label>
                  <input
                    type="tel"
                    value={momoPhone}
                    onChange={(e) => setMomoPhone(e.target.value)}
                    placeholder="e.g. 0754 123 456"
                    className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-xs outline-none focus:ring-2 focus:ring-teal-500"
                  />
                </div>

                <div>
                  <label className="block font-bold uppercase tracking-wider text-slate-500 mb-1">
                    M-Pesa / Txn Ref <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={momoRef}
                    onChange={(e) => setMomoRef(e.target.value.toUpperCase())}
                    placeholder="e.g. QJ78KL9201"
                    className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-xs font-mono uppercase outline-none focus:ring-2 focus:ring-teal-500"
                  />
                </div>
              </div>
            </div>
          )}

          {/* 3. CARD */}
          {method === 'card' && (
            <div className="space-y-3.5 bg-slate-50 dark:bg-slate-800/40 p-4 rounded-xl border border-slate-200 dark:border-slate-800 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold uppercase tracking-wider text-slate-500 mb-1">
                    Card Last 4 Digits
                  </label>
                  <input
                    type="text"
                    maxLength={4}
                    value={cardLast4}
                    onChange={(e) => setCardLast4(e.target.value)}
                    placeholder="e.g. 4892"
                    className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-xs font-mono outline-none focus:ring-2 focus:ring-teal-500"
                  />
                </div>

                <div>
                  <label className="block font-bold uppercase tracking-wider text-slate-500 mb-1">
                    POS Terminal Auth Ref
                  </label>
                  <input
                    type="text"
                    value={cardAuth}
                    onChange={(e) => setCardAuth(e.target.value)}
                    placeholder="e.g. AUTH-99120"
                    className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-xs font-mono outline-none focus:ring-2 focus:ring-teal-500"
                  />
                </div>
              </div>
            </div>
          )}

          {/* 4. CREDIT */}
          {method === 'credit' && (
            <div className="space-y-3 bg-slate-50 dark:bg-slate-800/40 p-4 rounded-xl border border-slate-200 dark:border-slate-800 text-xs">
              <div>
                <label className="block font-bold uppercase tracking-wider text-slate-500 mb-1">
                  Debtor / Customer Full Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={debtorName}
                  onChange={(e) => setDebtorName(e.target.value)}
                  placeholder="e.g. Ally Said Mramba"
                  className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-xs outline-none focus:ring-2 focus:ring-teal-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold uppercase tracking-wider text-slate-500 mb-1">
                    Phone Number
                  </label>
                  <input
                    type="tel"
                    value={debtorPhone}
                    onChange={(e) => setDebtorPhone(e.target.value)}
                    placeholder="e.g. 0713 999 888"
                    className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-xs outline-none focus:ring-2 focus:ring-teal-500"
                  />
                </div>

                <div>
                  <label className="block font-bold uppercase tracking-wider text-slate-500 mb-1">
                    Promised Repayment Date
                  </label>
                  <input
                    type="date"
                    value={debtDueDate}
                    onChange={(e) => setDebtDueDate(e.target.value)}
                    className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-xs outline-none focus:ring-2 focus:ring-teal-500"
                  />
                </div>
              </div>
            </div>
          )}

          {error && (
            <div className="p-3 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 rounded-lg text-xs text-red-600 dark:text-red-300 font-medium">
              {error}
            </div>
          )}

          {/* Action Triggers */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
            <button
              type="button"
              disabled={processing}
              onClick={() => handleFinish(true)}
              className="py-3 px-4 bg-teal-600 hover:bg-teal-500 disabled:opacity-50 text-white font-bold rounded-xl shadow-md transition-all active:scale-[0.98] text-xs flex items-center justify-center gap-2"
            >
              <Printer className="w-4 h-4" />
              <span>Complete & Print 80mm</span>
            </button>

            <button
              type="button"
              disabled={processing}
              onClick={() => handleFinish(false)}
              className="py-3 px-4 bg-slate-800 hover:bg-slate-700 dark:bg-slate-700 dark:hover:bg-slate-600 disabled:opacity-50 text-white font-bold rounded-xl shadow-md transition-all active:scale-[0.98] text-xs flex items-center justify-center gap-2"
            >
              <CheckCircle className="w-4 h-4 text-emerald-400" />
              <span>Complete Sale Only (F4)</span>
            </button>
          </div>

          <div className="text-center pt-1">
            <button
              type="button"
              onClick={onClose}
              className="text-xs text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
            >
              Cancel & Return to Cart
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
