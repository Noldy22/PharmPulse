import { DosageForm } from '../types';

export function formatCurrency(amount: number, symbol: string = 'TSh'): string {
  if (isNaN(amount) || amount === null || amount === undefined) return `${symbol} 0`;
  const formatted = Math.round(amount).toLocaleString('en-US');
  return `${symbol} ${formatted}`;
}

export function formatDate(dateStr: string): string {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

export function formatDateTime(dateStr: string): string {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export type ExpiryUrgency = 'expired' | 'critical' | 'warning' | 'safe';

export interface ExpiryStatus {
  urgency: ExpiryUrgency;
  daysRemaining: number;
  label: string;
  badgeClass: string;
  borderClass: string;
  bgLightClass: string;
}

export function getExpiryStatus(expiryDateStr: string): ExpiryStatus {
  if (!expiryDateStr) {
    return {
      urgency: 'safe',
      daysRemaining: 999,
      label: 'Safe',
      badgeClass: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300',
      borderClass: 'border-emerald-300 dark:border-emerald-800',
      bgLightClass: 'bg-emerald-50/50 dark:bg-emerald-950/20',
    };
  }

  const now = new Date();
  now.setHours(0, 0, 0, 0);
  const exp = new Date(expiryDateStr);
  exp.setHours(0, 0, 0, 0);

  const diffMs = exp.getTime() - now.getTime();
  const daysRemaining = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

  if (daysRemaining < 0) {
    return {
      urgency: 'expired',
      daysRemaining,
      label: `Expired (${Math.abs(daysRemaining)}d ago)`,
      badgeClass: 'bg-red-100 text-red-800 dark:bg-red-950/80 dark:text-red-300 font-semibold',
      borderClass: 'border-red-400 dark:border-red-800',
      bgLightClass: 'bg-red-50/60 dark:bg-red-950/30',
    };
  }

  if (daysRemaining <= 30) {
    return {
      urgency: 'critical',
      daysRemaining,
      label: `Expiring in ${daysRemaining}d`,
      badgeClass: 'bg-orange-100 text-orange-800 dark:bg-orange-950/80 dark:text-orange-300 font-semibold',
      borderClass: 'border-orange-400 dark:border-orange-800',
      bgLightClass: 'bg-orange-50/60 dark:bg-orange-950/30',
    };
  }

  if (daysRemaining <= 90) {
    return {
      urgency: 'warning',
      daysRemaining,
      label: `Expiring in ${daysRemaining}d`,
      badgeClass: 'bg-amber-100 text-amber-800 dark:bg-amber-950/80 dark:text-amber-300',
      borderClass: 'border-amber-300 dark:border-amber-800',
      bgLightClass: 'bg-amber-50/50 dark:bg-amber-950/20',
    };
  }

  return {
    urgency: 'safe',
    daysRemaining,
    label: `${daysRemaining}d remaining`,
    badgeClass: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300',
    borderClass: 'border-emerald-300 dark:border-emerald-800',
    bgLightClass: 'bg-emerald-50/30 dark:bg-emerald-950/10',
  };
}

export function getDosageFormBadge(dosageForm: DosageForm): { label: string; color: string } {
  switch (dosageForm) {
    case 'tablets':
      return { label: 'Tab', color: 'bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300' };
    case 'capsules':
      return { label: 'Cap', color: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/50 dark:text-indigo-300' };
    case 'syrup':
    case 'suspension':
      return { label: 'Syrup', color: 'bg-purple-100 text-purple-700 dark:bg-purple-900/50 dark:text-purple-300' };
    case 'ampoules':
    case 'vials':
    case 'injection':
      return { label: 'Inject', color: 'bg-rose-100 text-rose-700 dark:bg-rose-900/50 dark:text-rose-300' };
    case 'inhaler':
      return { label: 'Inhaler', color: 'bg-cyan-100 text-cyan-700 dark:bg-cyan-900/50 dark:text-cyan-300' };
    case 'cream':
    case 'ointment':
      return { label: 'Topical', color: 'bg-teal-100 text-teal-700 dark:bg-teal-900/50 dark:text-teal-300' };
    case 'drops':
      return { label: 'Drops', color: 'bg-sky-100 text-sky-700 dark:bg-sky-900/50 dark:text-sky-300' };
    default:
      return { label: dosageForm, color: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300' };
  }
}
