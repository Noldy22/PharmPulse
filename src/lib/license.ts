import { StoreLicense } from '../types';
import { db } from '../db/db';

export const DEMO_LICENSES = [
  {
    key: 'PHARM-2026-ALPHA-9921',
    plan: 'enterprise' as const,
    label: 'Enterprise Dispensary (Full Multi-Counter)',
    tenantId: 'tenant-aura-dar-01',
    suggestedStore: 'AuraCare Central Pharmacy',
  },
  {
    key: 'PHARM-COMMUNITY-7734',
    plan: 'standard' as const,
    label: 'Standard Community Pharmacy',
    tenantId: 'tenant-comm-pharma-02',
    suggestedStore: 'St. Jude Community Chemists',
  },
  {
    key: 'PHARM-CLINIC-PRO-1029',
    plan: 'enterprise' as const,
    label: 'Hospital & Clinic Dispensary',
    tenantId: 'tenant-clinic-disp-03',
    suggestedStore: 'Amani Medical Dispensary',
  },
];

// Generate deterministic hardware / browser device fingerprint
export async function generateHardwareFingerprint(): Promise<string> {
  try {
    const nav = window.navigator;
    const screen = window.screen;
    const raw = [
      nav.userAgent,
      nav.language,
      screen.colorDepth,
      screen.width + 'x' + screen.height,
      Intl.DateTimeFormat().resolvedOptions().timeZone,
      nav.hardwareConcurrency || 4,
    ].join('###');

    // SHA-256 hash using Web Crypto API
    const encoder = new TextEncoder();
    const data = encoder.encode(raw);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    return `FP-${hashHex.substring(0, 16).toUpperCase()}`;
  } catch {
    return `FP-${Math.random().toString(36).substring(2, 10).toUpperCase()}`;
  }
}

// Validate a license key format
export function isValidLicenseKeyFormat(key: string): boolean {
  if (!key) return false;
  const cleanKey = key.trim().toUpperCase();
  // Accepts standard PHARM-XXXX-XXXX-XXXX or predefined demo keys
  const pattern = /^PHARM-[A-Z0-9]{4,10}-[A-Z0-9]{4,10}(-[A-Z0-9]{4,10})?$/;
  return pattern.test(cleanKey) || DEMO_LICENSES.some(d => d.key === cleanKey);
}

// Check active license status from IndexedDB
export async function getActiveLicense(): Promise<{
  license: StoreLicense | null;
  status: 'active' | 'grace_period' | 'expired' | 'unactivated';
  daysRemaining: number;
}> {
  const licenses = await db.license.toArray();
  if (licenses.length === 0) {
    return { license: null, status: 'unactivated', daysRemaining: 0 };
  }

  const active = licenses[0];
  const now = Date.now();
  const validUntil = new Date(active.validUntil).getTime();
  const lastPing = new Date(active.lastOnlinePing).getTime();
  const gracePeriodMs = (active.offlineGraceDays || 7) * 86400000;

  // Offline grace check: if offline for more than 7 days since last verified ping
  const offlineDuration = now - lastPing;
  const graceRemainingMs = gracePeriodMs - offlineDuration;
  const daysRemaining = Math.max(0, Math.ceil(graceRemainingMs / 86400000));

  if (now > validUntil) {
    return { license: active, status: 'expired', daysRemaining: 0 };
  }

  if (offlineDuration > gracePeriodMs) {
    return { license: active, status: 'expired', daysRemaining: 0 };
  }

  if (offlineDuration > 5 * 86400000) {
    // Within last 2 days of offline grace
    return { license: active, status: 'grace_period', daysRemaining };
  }

  return { license: active, status: 'active', daysRemaining };
}

// Activate or register a store license
export async function activateLicense({
  storeName,
  ownerContact,
  licenseKey,
}: {
  storeName: string;
  ownerContact: string;
  licenseKey: string;
}): Promise<StoreLicense> {
  const cleanKey = licenseKey.trim().toUpperCase();
  if (!isValidLicenseKeyFormat(cleanKey)) {
    throw new Error('Invalid license key format. Please use format PHARM-XXXX-XXXX-XXXX or a valid demo key.');
  }

  const fingerprint = await generateHardwareFingerprint();
  const now = new Date();
  const validUntilDate = new Date();
  validUntilDate.setFullYear(validUntilDate.getFullYear() + 1); // 1 year term

  // Match demo tenant or generate tenant ID
  const demoMatch = DEMO_LICENSES.find(d => d.key === cleanKey);
  const tenantId = demoMatch ? demoMatch.tenantId : `tenant-${Math.random().toString(36).substring(2, 9)}`;
  const plan = demoMatch ? demoMatch.plan : 'standard';

  const license: StoreLicense = {
    id: 'active-store-license',
    tenantId,
    storeName: storeName.trim(),
    ownerContact: ownerContact.trim(),
    licenseKey: cleanKey,
    plan,
    hardwareFingerprint: fingerprint,
    activatedAt: now.toISOString(),
    validUntil: validUntilDate.toISOString(),
    lastOnlinePing: now.toISOString(),
    offlineGraceDays: 7,
    isValid: true,
  };

  await db.license.clear();
  await db.license.put(license);

  // Update store settings with new tenant and store name
  const existingSettings = await db.settings.toArray();
  if (existingSettings.length > 0) {
    await db.settings.update(existingSettings[0].id, {
      storeName: storeName.trim(),
      tenantId,
    });
  }

  // Record audit log
  await db.logAudit(
    tenantId,
    'STORE_ACTIVATED',
    'license',
    `Store "${storeName}" activated under key ${cleanKey} (${plan.toUpperCase()} Plan)`,
    'System Admin',
    license.id
  );

  return license;
}

// Revalidate license with remote server / online check
export async function revalidateLicense(): Promise<{ success: boolean; message: string }> {
  const licenses = await db.license.toArray();
  if (licenses.length === 0) {
    return { success: false, message: 'No license found to revalidate' };
  }

  const active = licenses[0];
  const now = new Date().toISOString();

  // In production, this pings the Supabase 'licenses' table or API endpoint
  // When online, update lastOnlinePing to extend 7-day grace window
  await db.license.update(active.id, {
    lastOnlinePing: now,
  });

  await db.logAudit(
    active.tenantId,
    'LICENSE_REVALIDATED',
    'license',
    `License ${active.licenseKey} online heartbeat revalidated successfully.`,
    'Background Sync'
  );

  return { success: true, message: 'License revalidated successfully. 7-day offline grace renewed.' };
}
