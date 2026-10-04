import React from 'react';
import { ShoppingCart, Boxes, AlertTriangle, LineChart, Wallet, Settings } from 'lucide-react';
import { StaffUser } from '../../types';

interface MobileNavProps {
  currentTab: 'pos' | 'inventory' | 'expiry' | 'hub';
  onTabChange: (tab: 'pos' | 'inventory' | 'expiry' | 'hub') => void;
  currentUser: StaffUser;
  onOpenSettings: () => void;
  onOpenMyShift: () => void;
}

export const MobileNav: React.FC<MobileNavProps> = ({
  currentTab,
  onTabChange,
  currentUser,
  onOpenSettings,
  onOpenMyShift,
}) => {
  const isOwner = currentUser.role === 'owner';

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 px-2 py-1 shadow-lg no-print">
      <div className="flex items-center justify-around">
        <button
          onClick={() => onTabChange('pos')}
          className={`flex flex-col items-center justify-center py-1 px-3 rounded-lg text-[10px] font-semibold transition ${
            currentTab === 'pos'
              ? 'text-teal-600 dark:text-teal-400'
              : 'text-slate-500 hover:text-slate-800 dark:text-slate-400'
          }`}
        >
          <ShoppingCart className="w-5 h-5 mb-0.5" />
          <span>Counter POS</span>
        </button>

        <button
          onClick={() => onTabChange('inventory')}
          className={`flex flex-col items-center justify-center py-1 px-3 rounded-lg text-[10px] font-semibold transition ${
            currentTab === 'inventory'
              ? 'text-teal-600 dark:text-teal-400'
              : 'text-slate-500 hover:text-slate-800 dark:text-slate-400'
          }`}
        >
          <Boxes className="w-5 h-5 mb-0.5" />
          <span>Stock</span>
        </button>

        <button
          onClick={() => onTabChange('expiry')}
          className={`flex flex-col items-center justify-center py-1 px-3 rounded-lg text-[10px] font-semibold transition ${
            currentTab === 'expiry'
              ? 'text-teal-600 dark:text-teal-400'
              : 'text-slate-500 hover:text-slate-800 dark:text-slate-400'
          }`}
        >
          <AlertTriangle className="w-5 h-5 mb-0.5" />
          <span>Expiry</span>
        </button>

        {isOwner ? (
          <>
            <button
              onClick={() => onTabChange('hub')}
              className={`flex flex-col items-center justify-center py-1 px-3 rounded-lg text-[10px] font-bold transition ${
                currentTab === 'hub'
                  ? 'text-amber-500'
                  : 'text-slate-500 hover:text-slate-800 dark:text-slate-400'
              }`}
            >
              <LineChart className="w-5 h-5 mb-0.5" />
              <span>Owner Hub</span>
            </button>

            <button
              onClick={onOpenSettings}
              className="flex flex-col items-center justify-center py-1 px-3 rounded-lg text-[10px] font-semibold text-slate-500 hover:text-slate-800 dark:text-slate-400"
            >
              <Settings className="w-5 h-5 mb-0.5" />
              <span>Settings</span>
            </button>
          </>
        ) : (
          <button
            onClick={onOpenMyShift}
            className="flex flex-col items-center justify-center py-1 px-3 rounded-lg text-[10px] font-semibold text-teal-600 dark:text-teal-400"
          >
            <Wallet className="w-5 h-5 mb-0.5" />
            <span>My Shift</span>
          </button>
        )}
      </div>
    </nav>
  );
};
