import React, { useState, useMemo } from 'react';
import { AuditLog } from '../../types';
import { db } from '../../db/db';
import { useLiveQuery } from 'dexie-react-hooks';
import { History, Search, Filter, User, Clock, Shield, ShoppingCart, Boxes } from 'lucide-react';
import { formatDateTime } from '../../lib/formatters';

export const AuditTrailView: React.FC = () => {
  const auditLogs = useLiveQuery(() => db.audit_logs.reverse().toArray(), []) || [];
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  const filteredLogs = useMemo(() => {
    const term = searchTerm.toLowerCase().trim();
    return auditLogs.filter((log) => {
      if (selectedCategory !== 'all' && log.category !== selectedCategory) return false;
      if (!term) return true;
      return (
        log.details.toLowerCase().includes(term) ||
        log.attendantName.toLowerCase().includes(term) ||
        log.action.toLowerCase().includes(term)
      );
    });
  }, [auditLogs, searchTerm, selectedCategory]);

  const getCategoryBadge = (category: AuditLog['category']) => {
    switch (category) {
      case 'pos':
        return {
          icon: ShoppingCart,
          class: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300',
        };
      case 'inventory':
        return {
          icon: Boxes,
          class: 'bg-blue-100 text-blue-800 dark:bg-blue-950/60 dark:text-blue-300',
        };
      case 'license':
        return {
          icon: Shield,
          class: 'bg-purple-100 text-purple-800 dark:bg-purple-950/60 dark:text-purple-300',
        };
      default:
        return {
          icon: History,
          class: 'bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-300',
        };
    }
  };

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xs overflow-hidden flex flex-col h-full">
      <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between gap-3 bg-slate-50/50 dark:bg-slate-900/50">
        <div className="flex items-center gap-2">
          <History className="w-5 h-5 text-teal-600 dark:text-teal-400" />
          <h3 className="font-bold text-sm text-slate-900 dark:text-white">
            Dispensing & Operational Audit Trail
          </h3>
        </div>

        <div className="flex items-center gap-2">
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="px-2 py-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs outline-none"
          >
            <option value="all">All Activities</option>
            <option value="pos">Sales & POS</option>
            <option value="inventory">Stock Changes</option>
            <option value="supervision">Price Updates</option>
            <option value="license">System & License</option>
          </select>
        </div>
      </div>

      <div className="p-3 border-b border-slate-100 dark:border-slate-800">
        <div className="relative">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search attendant, receipt number, medication..."
            className="w-full pl-8 pr-3 py-1 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs outline-none focus:ring-2 focus:ring-teal-500"
          />
        </div>
      </div>

      {/* Log list */}
      <div className="flex-1 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800/80 p-2 space-y-1">
        {filteredLogs.length === 0 ? (
          <div className="text-center py-12 text-slate-400 text-xs">
            No audit records found matching query.
          </div>
        ) : (
          filteredLogs.map((log) => {
            const badge = getCategoryBadge(log.category);
            const Icon = badge.icon;
            return (
              <div
                key={log.id}
                className="p-3 rounded-xl hover:bg-slate-50/80 dark:hover:bg-slate-800/50 transition text-xs flex items-start gap-3"
              >
                <div className={`p-2 rounded-lg flex-shrink-0 ${badge.class}`}>
                  <Icon className="w-4 h-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-bold text-slate-900 dark:text-white truncate">
                      {log.action.replace(/_/g, ' ')}
                    </span>
                    <span className="text-[10px] text-slate-400 font-mono flex items-center gap-1 flex-shrink-0">
                      <Clock className="w-3 h-3" />
                      {formatDateTime(log.created_at)}
                    </span>
                  </div>
                  <p className="text-slate-600 dark:text-slate-300 mt-0.5 leading-relaxed">
                    {log.details}
                  </p>
                  <div className="flex items-center gap-1.5 mt-1 text-[11px] text-slate-400">
                    <User className="w-3 h-3 text-teal-600" />
                    <span>{log.attendantName}</span>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
