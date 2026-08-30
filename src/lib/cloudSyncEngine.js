/**
 * Green Arrow HR — Cloud Sync Engine
 * Permanent Cloud Persistence for Approvals, Advances, Adjustments & Locked Payrolls
 * Ensures zero data loss across devices, browsers, and domain changes.
 */

import { base44 } from '@/api/base44Client';

export const SYNC_KEYS = {
  ADVANCES: 'hr_flow_employee_advances',
  ADVANCES_ALIAS: 'hr_advances_list',
  APPROVALS: 'hr_flow_approvals_all',
  ADJUSTMENTS: 'hr_flow_payroll_adjustments',
  LOCKED_PAYROLLS_LIST: 'hr_flow_locked_payrolls_list',
  AUDIT_LOGS: 'hr_audit_logs',
  REQUESTS: 'hr_flow_requests_all',
  PAYROLL_RUNS: 'payroll_runs_v1',
};

// Map each sync category to a Supabase sync ID
const SUPABASE_SYNC_MAP = {
  [SYNC_KEYS.ADVANCES]: 'sync_advances_v2',
  [SYNC_KEYS.APPROVALS]: 'sync_approvals_v2',
  [SYNC_KEYS.ADJUSTMENTS]: 'sync_adjustments_v2',
  [SYNC_KEYS.LOCKED_PAYROLLS_LIST]: 'sync_locked_payrolls_v2',
  [SYNC_KEYS.AUDIT_LOGS]: 'sync_audit_logs_v2',
  [SYNC_KEYS.REQUESTS]: 'sync_requests_v2',
  [SYNC_KEYS.PAYROLL_RUNS]: 'sync_payroll_runs_v2',
};

/**
 * Save data locally AND push to Supabase Cloud
 */
export async function cloudSave(key, data) {
  try {
    // 1. Instant local write
    const serialized = JSON.stringify(data);
    localStorage.setItem(key, serialized);

    // Sync aliases
    if (key === SYNC_KEYS.ADVANCES) {
      localStorage.setItem(SYNC_KEYS.ADVANCES_ALIAS, serialized);
    } else if (key === SYNC_KEYS.ADVANCES_ALIAS) {
      localStorage.setItem(SYNC_KEYS.ADVANCES, serialized);
    }

    // 2. Cloud write to Supabase
    const syncId = SUPABASE_SYNC_MAP[key] || (key.startsWith('hr_flow_approval_') ? ('sync_appr_' + key.replace('hr_flow_approval_', '')) : null);
    
    if (syncId && base44.supabase) {
      const payload = {
        id: syncId,
        title: key,
        content: serialized,
        category: 'cloud_sync',
        status: 'active',
        date: new Date().toISOString().split('T')[0],
      };

      await base44.supabase
        .from('announcements')
        .upsert([payload], { onConflict: 'id' });
    }
  } catch (e) {
    console.warn('CloudSave warning for key ' + key + ':', e);
  }
}

/**
 * Load data from LocalStorage, and if empty/stale, pull from Supabase Cloud
 */
export async function cloudLoad(key, defaultValue = null) {
  try {
    const local = localStorage.getItem(key);
    if (local !== null) {
      try {
        const parsed = JSON.parse(local);
        if (parsed && (Array.isArray(parsed) ? parsed.length > 0 : Object.keys(parsed).length > 0)) {
          return parsed;
        }
      } catch (e) {}
    }

    // Fetch from Supabase Cloud
    const syncId = SUPABASE_SYNC_MAP[key] || (key.startsWith('hr_flow_approval_') ? ('sync_appr_' + key.replace('hr_flow_approval_', '')) : null);
    
    if (syncId && base44.supabase) {
      const { data, error } = await base44.supabase
        .from('announcements')
        .select('content')
        .eq('id', syncId)
        .single();

      if (!error && data && data.content) {
        const cloudData = JSON.parse(data.content);
        localStorage.setItem(key, data.content);
        if (key === SYNC_KEYS.ADVANCES) {
          localStorage.setItem(SYNC_KEYS.ADVANCES_ALIAS, data.content);
        }
        return cloudData;
      }
    }

    return defaultValue !== null ? defaultValue : (local ? JSON.parse(local) : null);
  } catch (e) {
    console.warn('CloudLoad warning for key ' + key + ':', e);
    return defaultValue;
  }
}

/**
 * Initial Full Cloud Sync on App Startup
 * Pulls all cloud records from Supabase into LocalStorage seamlessly
 */
export async function initFullCloudSync() {
  if (!base44.supabase) return;

  try {
    const { data, error } = await base44.supabase
      .from('announcements')
      .select('id, title, content')
      .eq('category', 'cloud_sync');

    if (!error && Array.isArray(data) && data.length > 0) {
      data.forEach(row => {
        if (row.title && row.content) {
          try {
            // Write to localStorage
            localStorage.setItem(row.title, row.content);
            if (row.title === SYNC_KEYS.ADVANCES) {
              localStorage.setItem(SYNC_KEYS.ADVANCES_ALIAS, row.content);
            }
          } catch (e) {}
        }
      });
      console.log('✓ Green Arrow Cloud Sync: Synced ' + data.length + ' persistent datasets from Supabase Cloud');
    }
  } catch (e) {
    console.warn('Initial Cloud Sync Error:', e);
  }
}

/**
 * Export full system JSON backup
 */
export function exportSystemBackupJSON() {
  const backup = {
    version: '2.5',
    exported_at: new Date().toISOString(),
    system: 'Green Arrow HR Cloud',
    data: {}
  };

  for (let i = 0; i < localStorage.length; i++) {
    const k = localStorage.key(i);
    if (k && (k.startsWith('hr_') || k.startsWith('payroll_') || k.includes('advance') || k.includes('approval') || k.includes('settings'))) {
      try {
        backup.data[k] = JSON.parse(localStorage.getItem(k));
      } catch (e) {
        backup.data[k] = localStorage.getItem(k);
      }
    }
  }

  const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'green_arrow_hr_backup_' + new Date().toISOString().slice(0, 10) + '.json';
  a.click();
  URL.revokeObjectURL(url);
}

/**
 * Import system JSON backup
 */
export async function importSystemBackupJSON(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const json = JSON.parse(e.target.result);
        if (json.data && typeof json.data === 'object') {
          for (const [key, val] of Object.entries(json.data)) {
            const strVal = typeof val === 'object' ? JSON.stringify(val) : String(val);
            localStorage.setItem(key, strVal);
            await cloudSave(key, val);
          }
          resolve({ success: true, keysRestored: Object.keys(json.data).length });
        } else {
          reject(new Error('ملف النسخ الاحتياطي غير صالح'));
        }
      } catch (err) {
        reject(err);
      }
    };
    reader.onerror = reject;
    reader.readAsText(file);
  });
}
