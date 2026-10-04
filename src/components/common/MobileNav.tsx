import React from 'react';
import { ShoppingCart, Boxes, AlertTriangle, LineChart, Settings } from 'lucide-react';

interface MobileNavProps {
  currentTab: 'pos' | 'inventory' | 'expiry' | 'hub';
  onTabChange: (tab: 'pos' | 'inventory' | 'expiry' | 'hub') => void;
  onOpenSettings: () => void;
}

export const MobileNav: React.FC<MobileNavProps> = ({
  currentTab,
  onTabChange,
  onOpenSettings,
}) => {
  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 px-2 py-1 shadow-lg no-print">
      <div className="flex items-center justify-around">
        <button
          onClick={() => onTabChange('pos')}
          className={`flex flex-col items-center justify-center py-1 px-3 rounded-lg text-[10px] font-semibold transition ${
            currentTab === 'pos'
              ? 'text-teal-600 dark:text-teal-400'
              : 'text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200'
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
              : 'text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200'
          }`}
        >
          <Boxes className="w-5 h-5 mb-0.5" />
          <span>Inventory</span>
        </button>

        <button
          onClick={() => onTabChange('expiry')}
          className={`flex flex-col items-center justify-center py-1 px-3 rounded-lg text-[10px] font-semibold transition ${
            currentTab === 'expiry'
              ? 'text-teal-600 dark:text-teal-400'
              : 'text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200'
          }`}
        >
          <AlertTriangle className="w-5 h-5 mb-0.5" />
          <span>Expiry Alerts</span>
        </button>

        <button
          onClick={() => onTabChange('hub')}
          className={`flex flex-col items-center justify-center py-1 px-3 rounded-lg text-[10px] font-semibold transition ${
            currentTab === 'hub'
              ? 'text-teal-600 dark:text-teal-400'
              : 'text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200'
          }`}
        >
          <LineChart className="w-5 h-5 mb-0.5" />
          <span>Overview Hub</span>
        </button>

        <button
          onClick={onOpenSettings}
          className="flex flex-col items-center justify-center py-1 px-3 rounded-lg text-[10px] font-semibold text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200"
        >
          <Settings className="w-5 h-5 mb-0.5" />
          <span>Settings</span>
        </button>
      </div>
    </nav>
  );
};
