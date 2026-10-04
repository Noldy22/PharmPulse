import React, { useState, useEffect } from 'react';
import { StaffUser } from '../../types';
import { db } from '../../db/db';
import { useLiveQuery } from 'dexie-react-hooks';
import {
  ShieldCheck,
  Crown,
  UserCheck,
  Lock,
  Delete,
  CheckCircle2,
  AlertCircle,
  Pill,
  Sparkles,
} from 'lucide-react';

interface StaffAuthScreenProps {
  onAuthenticated: (user: StaffUser) => void;
  storeName?: string;
}

export const StaffAuthScreen: React.FC<StaffAuthScreenProps> = ({
  onAuthenticated,
  storeName = 'PharmPulse Healthcare',
}) => {
  const staffList = useLiveQuery(() => db.staff_users.where('isActive').equals(1).toArray(), []) || [];
  const [selectedUser, setSelectedUser] = useState<StaffUser | null>(null);
  const [pin, setPin] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Auto-select first user if none selected
  useEffect(() => {
    if (staffList.length > 0 && !selectedUser) {
      setSelectedUser(staffList[0]);
    }
  }, [staffList, selectedUser]);

  // Handle number pad button click
  const handleNumClick = (digit: string) => {
    if (pin.length < 6) {
      setPin((prev) => prev + digit);
      setError(null);
    }
  };

  const handleBackspace = () => {
    setPin((prev) => prev.slice(0, -1));
    setError(null);
  };

  const handleClear = () => {
    setPin('');
    setError(null);
  };

  const handleLogin = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!selectedUser) {
      setError('Please select your staff account first.');
      return;
    }
    if (!pin) {
      setError('Please enter your 4-digit security PIN.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const user = await db.authenticateStaff(selectedUser.id, pin);
      if (user) {
        onAuthenticated(user);
      } else {
        setError('Incorrect PIN. Please re-enter or ask Owner to reset.');
        setPin('');
      }
    } catch (err: unknown) {
      setError('Authentication error occurred.');
    } finally {
      setLoading(false);
    }
  };

  // Allow physical keyboard entry of digits and enter
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (/^[0-9]$/.test(e.key)) {
        if (pin.length < 6) setPin((prev) => prev + e.key);
      } else if (e.key === 'Backspace') {
        setPin((prev) => prev.slice(0, -1));
      } else if (e.key === 'Enter') {
        if (pin.length >= 4) {
          handleLogin();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [pin, selectedUser]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950 p-4 sm:p-6 overflow-y-auto">
      {/* Background ambient medical glows */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-teal-600/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-emerald-600/10 rounded-full blur-3xl pointer-events-none" />

      <div className="relative bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl max-w-4xl w-full max-h-[92vh] flex flex-col md:flex-row overflow-hidden my-auto animate-in fade-in zoom-in-95 duration-200">
        {/* Left Side: Staff Accounts Selector */}
        <div className="md:w-1/2 p-6 sm:p-8 bg-slate-50 dark:bg-slate-900/60 border-b md:border-b-0 md:border-r border-slate-200 dark:border-slate-800 flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2.5 mb-3">
              <div className="w-9 h-9 rounded-xl bg-teal-600 text-white flex items-center justify-center shadow-md font-bold">
                <Pill className="w-5 h-5 transform -rotate-45" />
              </div>
              <div>
                <h1 className="font-extrabold text-base tracking-tight text-slate-900 dark:text-white">
                  {storeName}
                </h1>
                <p className="text-[11px] text-teal-600 dark:text-teal-400 font-semibold uppercase tracking-wider">
                  Terminal Shift Sign-In Gate
                </p>
              </div>
            </div>

            <p className="text-xs text-slate-500 mb-5 leading-relaxed">
              Accountability Enforcement: Select your assigned staff profile. All dispensing records and drawer movements will be audited to you.
            </p>

            {/* Staff Accounts List */}
            <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
              {staffList.map((user) => {
                const isSelected = selectedUser?.id === user.id;
                const isOwner = user.role === 'owner';

                return (
                  <button
                    key={user.id}
                    type="button"
                    onClick={() => {
                      setSelectedUser(user);
                      setPin('');
                      setError(null);
                    }}
                    className={`w-full p-3.5 rounded-2xl border text-left transition-all flex items-center justify-between ${
                      isSelected
                        ? isOwner
                          ? 'border-amber-500 bg-amber-50/80 dark:bg-amber-950/40 shadow-sm ring-1 ring-amber-500'
                          : 'border-teal-500 bg-teal-50/80 dark:bg-teal-950/40 shadow-sm ring-1 ring-teal-500'
                        : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-800/80 hover:border-slate-300 dark:hover:border-slate-700'
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div
                        className={`w-10 h-10 rounded-xl text-white font-bold flex items-center justify-center text-sm shadow-sm flex-shrink-0 ${
                          isOwner ? 'bg-amber-600' : user.avatarColor || 'bg-teal-600'
                        }`}
                      >
                        {isOwner ? <Crown className="w-5 h-5" /> : user.fullName.charAt(0)}
                      </div>
                      <div className="truncate">
                        <div className="font-bold text-xs sm:text-sm text-slate-900 dark:text-white truncate">
                          {user.fullName}
                        </div>
                        <div className="text-[11px] text-slate-400 flex items-center gap-1.5 mt-0.5">
                          <span
                            className={`px-1.5 py-0.2 rounded font-semibold uppercase text-[10px] ${
                              isOwner
                                ? 'bg-amber-100 text-amber-800 dark:bg-amber-900/60 dark:text-amber-300'
                                : 'bg-slate-100 text-slate-700 dark:bg-slate-700 dark:text-slate-300'
                            }`}
                          >
                            {user.role}
                          </span>
                          <span>• @{user.username}</span>
                        </div>
                      </div>
                    </div>

                    {isSelected && (
                      <span className={`text-xs font-bold ${isOwner ? 'text-amber-600' : 'text-teal-600'}`}>
                        ✓ Selected
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Security policy footnote */}
          <div className="mt-4 pt-3 border-t border-slate-200 dark:border-slate-800 text-[11px] text-slate-400 flex items-center gap-1.5">
            <Lock className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
            <span>Do not share your authorization PIN with coworkers.</span>
          </div>
        </div>

        {/* Right Side: PIN Entry Keypad */}
        <div className="md:w-1/2 p-6 sm:p-8 flex flex-col justify-between bg-white dark:bg-slate-900">
          <div>
            <div className="text-center mb-6">
              <span className="text-xs uppercase font-bold tracking-wider text-slate-400 block mb-1">
                Authorization PIN Required
              </span>
              <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white">
                {selectedUser?.fullName || 'Select Staff Account'}
              </h2>
              <div className="text-xs text-slate-500 mt-0.5">
                Role: <span className="font-semibold uppercase">{selectedUser?.role || 'Staff'}</span>
              </div>
            </div>

            {/* PIN Display Dots */}
            <div className="flex items-center justify-center gap-3 mb-6">
              {[0, 1, 2, 3].map((idx) => (
                <div
                  key={idx}
                  className={`w-4 h-4 rounded-full transition-all duration-150 ${
                    pin.length > idx
                      ? 'bg-teal-600 dark:bg-teal-400 scale-125 shadow-md shadow-teal-500/30'
                      : 'border-2 border-slate-300 dark:border-slate-700 bg-transparent'
                  }`}
                />
              ))}
            </div>

            {error && (
              <div className="mb-4 p-2.5 rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 text-xs text-red-600 dark:text-red-300 flex items-center justify-center gap-1.5 text-center">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {/* PIN Pad 3x4 Grid */}
            <div className="grid grid-cols-3 gap-2.5 max-w-[260px] mx-auto">
              {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((digit) => (
                <button
                  key={digit}
                  type="button"
                  onClick={() => handleNumClick(digit)}
                  className="h-12 rounded-2xl bg-slate-50 hover:bg-slate-100 dark:bg-slate-800 dark:hover:bg-slate-700/80 text-slate-900 dark:text-white font-bold text-lg font-mono transition-all active:scale-95 shadow-xs flex items-center justify-center"
                >
                  {digit}
                </button>
              ))}
              <button
                type="button"
                onClick={handleClear}
                className="h-12 rounded-2xl bg-slate-50 hover:bg-slate-100 dark:bg-slate-800 dark:hover:bg-slate-700/80 text-slate-500 font-semibold text-xs transition-all active:scale-95 flex items-center justify-center"
              >
                Clear
              </button>
              <button
                type="button"
                onClick={() => handleNumClick('0')}
                className="h-12 rounded-2xl bg-slate-50 hover:bg-slate-100 dark:bg-slate-800 dark:hover:bg-slate-700/80 text-slate-900 dark:text-white font-bold text-lg font-mono transition-all active:scale-95 shadow-xs flex items-center justify-center"
              >
                0
              </button>
              <button
                type="button"
                onClick={handleBackspace}
                className="h-12 rounded-2xl bg-slate-50 hover:bg-slate-100 dark:bg-slate-800 dark:hover:bg-slate-700/80 text-slate-500 font-semibold text-sm transition-all active:scale-95 flex items-center justify-center"
              >
                <Delete className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Action Trigger Button */}
          <div className="mt-6">
            <button
              type="button"
              disabled={loading || pin.length < 4}
              onClick={() => handleLogin()}
              className="w-full py-3.5 px-4 bg-teal-600 hover:bg-teal-500 disabled:opacity-40 text-white font-bold rounded-2xl shadow-lg shadow-teal-600/20 transition-all active:scale-[0.98] text-sm flex items-center justify-center gap-2"
            >
              <UserCheck className="w-4 h-4" />
              <span>{loading ? 'Verifying PIN...' : 'Authorize Shift Access'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
