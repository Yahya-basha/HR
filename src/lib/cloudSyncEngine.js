/**
 * Green Arrow HR — Resilient Bidirectional Cloud Sync Engine
 * Non-destructive merging: Local data is NEVER erased by empty cloud queries.
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
  LEAVES: 'hr_leave_requests',
  CORRECTIONS: 'hr_correction_requests',
  PAYROLL_RUNS: 'payroll_runs_v1',
};

const SUPABASE_SYNC_MAP = {
  [SYNC_KEYS.ADVANCES]: 'sync_advances_v2',
  [SYNC_KEYS.ADVANCES_ALIAS]: 'sync_advances_v2',
  [SYNC_KEYS.LEAVES]: 'sync_leaves_v2',
  [SYNC_KEYS.CORRECTIONS]: 'sync_corrections_v2',
  [SYNC_KEYS.APPROVALS]: 'sync_approvals_v2',
  [SYNC_KEYS.ADJUSTMENTS]: 'sync_adjustments_v2',
  [SYNC_KEYS.LOCKED_PAYROLLS_LIST]: 'sync_locked_payrolls_v2',
  [SYNC_KEYS.AUDIT_LOGS]: 'sync_audit_logs_v2',
  [SYNC_KEYS.REQUESTS]: 'sync_requests_v2',
  [SYNC_KEYS.PAYROLL_RUNS]: 'sync_payroll_runs_v2',
};

/**
 * Smart Merge: Merges two arrays of records by their unique .id
 */
export function mergeRecords(primary = [], secondary = []) {
  const pList = Array.isArray(primary) ? primary : [];
  const sList = Array.isArray(secondary) ? secondary : [];
  const map = new Map();

  // 1. Add secondary items first
  sList.forEach(item => {
    if (item && item.id) map.set(String(item.id), item);
  });

  // 2. Add or override with primary items
  pList.forEach(item => {
    if (item && item.id) {
      const existing = map.get(String(item.id));
      if (!existing) {
        map.set(String(item.id), item);
      } else {
        // Keep the one with newer action/timestamp or merged fields
        map.set(String(item.id), { ...existing, ...item });
      }
    }
  });

  return Array.from(map.values());
}

/**
 * Save data locally AND push to Supabase Cloud
 */
export async function cloudSave(key, data) {
  try {
    if (!data) return;
    const serialized = JSON.stringify(data);
    localStorage.setItem(key, serialized);

    if (key === SYNC_KEYS.ADVANCES) {
      localStorage.setItem(SYNC_KEYS.ADVANCES_ALIAS, serialized);
    } else if (key === SYNC_KEYS.ADVANCES_ALIAS) {
      localStorage.setItem(SYNC_KEYS.ADVANCES, serialized);
    }

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
 * Load data with Non-Destructive Bidirectional Merge
 */
export async function cloudLoad(key, defaultValue = []) {
  try {
    // 1. Get current local data
    let localData = [];
    const local = localStorage.getItem(key);
    if (local !== null) {
      try {
        const parsed = JSON.parse(local);
        if (Array.isArray(parsed)) localData = parsed;
      } catch (e) {}
    }

    // Also check alias if advances
    if (key === SYNC_KEYS.ADVANCES || key === SYNC_KEYS.ADVANCES_ALIAS) {
      try {
        const altKey = key === SYNC_KEYS.ADVANCES ? SYNC_KEYS.ADVANCES_ALIAS : SYNC_KEYS.ADVANCES;
        const alt = JSON.parse(localStorage.getItem(altKey) || '[]');
        if (Array.isArray(alt) && alt.length > 0) {
          localData = mergeRecords(localData, alt);
        }
      } catch (e) {}
    }

    // 2. Fetch from Supabase Cloud
    const syncId = SUPABASE_SYNC_MAP[key] || (key.startsWith('hr_flow_approval_') ? ('sync_appr_' + key.replace('hr_flow_approval_', '')) : null);
    let cloudData = [];

    if (syncId && base44.supabase) {
      const { data, error } = await base44.supabase
        .from('announcements')
        .select('content')
        .eq('id', syncId)
        .single();

      if (!error && data && data.content) {
        try {
          const parsed = JSON.parse(data.content);
          if (Array.isArray(parsed)) cloudData = parsed;
        } catch (e) {}
      }
    }

    // 3. Smart Merge: NEVER erase local with empty cloud
    const merged = mergeRecords(cloudData, localData);

    // If local had items not in cloud, push merged back to cloud!
    if (merged.length > 0) {
      const serialized = JSON.stringify(merged);
      localStorage.setItem(key, serialized);
      if (key === SYNC_KEYS.ADVANCES) localStorage.setItem(SYNC_KEYS.ADVANCES_ALIAS, serialized);
      else if (key === SYNC_KEYS.ADVANCES_ALIAS) localStorage.setItem(SYNC_KEYS.ADVANCES, serialized);

      if (cloudData.length < merged.length && syncId && base44.supabase) {
        cloudSave(key, merged);
      }
    }

    return merged.length > 0 ? merged : (Array.isArray(defaultValue) ? defaultValue : []);
  } catch (e) {
    console.warn('CloudLoad warning for key ' + key + ':', e);
    try {
      const fallback = JSON.parse(localStorage.getItem(key) || '[]');
      return Array.isArray(fallback) ? fallback : defaultValue;
    } catch(err) {
      return defaultValue;
    }
  }
}

/**
 * Initial Full Cloud Sync on App Startup with Non-Destructive Merging
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
            const cloudArr = JSON.parse(row.content);
            if (Array.isArray(cloudArr)) {
              let localArr = [];
              try { localArr = JSON.parse(localStorage.getItem(row.title) || '[]'); } catch(e) {}
              const merged = mergeRecords(cloudArr, localArr);
              localStorage.setItem(row.title, JSON.stringify(merged));
              if (row.title === SYNC_KEYS.ADVANCES) {
                localStorage.setItem(SYNC_KEYS.ADVANCES_ALIAS, JSON.stringify(merged));
              } else if (row.title === SYNC_KEYS.ADVANCES_ALIAS) {
                localStorage.setItem(SYNC_KEYS.ADVANCES, JSON.stringify(merged));
              }
            } else {
              localStorage.setItem(row.title, row.content);
            }
          } catch (e) {}
        }
      });
      console.log('✓ Green Arrow Cloud Sync: Merged ' + data.length + ' datasets from Supabase Cloud');
      window.dispatchEvent(new Event('cloud_data_synced'));
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
