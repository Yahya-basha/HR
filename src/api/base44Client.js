// ============================================================================
// ZENITH HR SAAS - UNIFIED DATABASE & AUTH CLIENT
// Supports Supabase Cloud Database + High-Performance Local-First Fallback
// ============================================================================

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || '';
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

const isSupabaseConfigured = Boolean(SUPABASE_URL && SUPABASE_ANON_KEY);
const supabase = isSupabaseConfigured ? createClient(SUPABASE_URL, SUPABASE_ANON_KEY) : null;

const STORAGE_PREFIX = 'zenith_saas_';

const initialData = {
  Company: [
    { id: 'comp_1', name: 'شركة درة السيارة', legal_name: 'شركة درة السيارة للتجارة', cr_number: '7016475555', tax_number: '311861381500003' }
  ],
  Branch: [
    { id: 'br_1', name: 'الفرع الرئيسي - الرياض', address: 'طريق الملك فهد، الرياض', phone: '+966538834212', company_id: 'comp_1', is_main: true },
    { id: 'br_2', name: 'فرع جدة', address: 'طريق المدينة، جدة', phone: '+966539454377', company_id: 'comp_1', is_main: false }
  ],
  Department: [
    { id: 'dep_1', name: 'الموارد البشرية والشؤون الإدارية', code: 'HR', manager_name: 'يحيى باشا' },
    { id: 'dep_2', name: 'المبيعات وخدمة العملاء', code: 'SALES', manager_name: 'محمد عبدالله' },
    { id: 'dep_3', name: 'المستودعات وسلاسل الإمداد', code: 'LOGISTICS', manager_name: 'أحمد سعيد' },
    { id: 'dep_4', name: 'المالية والمحاسبة', code: 'FINANCE', manager_name: 'سارة خالد' }
  ],
  JobTitle: [
    { id: 'job_1', title: 'مدير موارد بشرية', department_id: 'dep_1' },
    { id: 'job_2', title: 'أخصائي مبيعات قطع غيار', department_id: 'dep_2' },
    { id: 'job_3', title: 'أمين مستودع', department_id: 'dep_3' },
    { id: 'job_4', title: 'محاسب عام', department_id: 'dep_4' }
  ],
  Shift: [
    { id: 'sh_1', name: 'الدوام الصباحي (8 ص - 4 م)', type: 'morning', start_time: '08:00', end_time: '16:00', total_hours: 8, grace_minutes: 15, description: 'فترة العمل الصباحية الرسمية' },
    { id: 'sh_2', name: 'الدوام المسائي (4 م - 12 ص)', type: 'evening', start_time: '16:00', end_time: '00:00', total_hours: 8, grace_minutes: 15, description: 'فترة العمل المسائية' }
  ],
  LeavePolicy: [
    { id: 'lp_1', name: 'سياسة الإجازات السنوية', annual_days: 30, carry_over_days: 5 },
    { id: 'lp_2', name: 'سياسة الإجازات المرضية والطارئة', annual_days: 15, carry_over_days: 0 }
  ],
  Employee: [
    {
      id: 'emp_1',
      employee_number: 'EMP-001',
      full_name: 'يحيى باشا',
      email: 'yahya@doracars.com',
      phone: '+966538834212',
      department_id: 'dep_1',
      department_name: 'الموارد البشرية والشؤون الإدارية',
      job_title: 'مدير الموارد البشرية',
      branch_id: 'br_1',
      status: 'active',
      join_date: '2023-01-15',
      salary: 14000,
      id_expiry_date: '2027-12-30',
      passport_expiry_date: '2028-05-20'
    },
    {
      id: 'emp_2',
      employee_number: 'EMP-002',
      full_name: 'محمد عبدالله',
      email: 'mohamed@doracars.com',
      phone: '+966539454377',
      department_id: 'dep_2',
      department_name: 'المبيعات وخدمة العملاء',
      job_title: 'أخصائي مبيعات قطع غيار',
      branch_id: 'br_1',
      status: 'active',
      join_date: '2023-06-01',
      salary: 8500,
      id_expiry_date: '2026-11-15',
      passport_expiry_date: '2027-08-10'
    },
    {
      id: 'emp_3',
      employee_number: 'EMP-003',
      full_name: 'أحمد سعيد العتيبي',
      email: 'ahmed@doracars.com',
      phone: '+966551234567',
      department_id: 'dep_3',
      department_name: 'المستودعات وسلاسل الإمداد',
      job_title: 'مشرف مستودع',
      branch_id: 'br_2',
      status: 'active',
      join_date: '2024-02-10',
      salary: 7200,
      id_expiry_date: '2026-09-20',
      passport_expiry_date: '2027-01-15'
    }
  ],
  EmploymentContract: [
    {
      id: 'cont_1',
      employee_id: 'emp_1',
      employee_name: 'يحيى باشا',
      contract_type: 'full_time',
      start_date: '2023-01-15',
      end_date: '2027-01-14',
      basic_salary: 11000,
      housing_allowance: 2000,
      transport_allowance: 1000,
      status: 'active'
    },
    {
      id: 'cont_2',
      employee_id: 'emp_2',
      employee_name: 'محمد عبدالله',
      contract_type: 'full_time',
      start_date: '2023-06-01',
      end_date: '2026-05-31',
      basic_salary: 6500,
      housing_allowance: 1500,
      transport_allowance: 500,
      status: 'active'
    }
  ],
  AttendanceLog: [
    {
      id: 'att_1',
      employee_id: 'emp_1',
      employee_name: 'يحيى باشا',
      log_date: new Date().toISOString().split('T')[0],
      check_in: '08:00',
      check_out: null,
      status: 'present'
    },
    {
      id: 'att_2',
      employee_id: 'emp_2',
      employee_name: 'محمد عبدالله',
      log_date: new Date().toISOString().split('T')[0],
      check_in: '08:15',
      check_out: null,
      status: 'late'
    }
  ],
  LeaveRequest: [
    {
      id: 'leave_1',
      employee_id: 'emp_3',
      employee_name: 'أحمد سعيد العتيبي',
      leave_type: 'annual',
      start_date: '2026-09-01',
      end_date: '2026-09-07',
      days_count: 7,
      status: 'pending',
      reason: 'إجازة سنوية اعتيادية'
    }
  ]
};

function getLocalItems(entityName) {
  try {
    const raw = localStorage.getItem(STORAGE_PREFIX + entityName);
    if (!raw) {
      const init = initialData[entityName] || [];
      localStorage.setItem(STORAGE_PREFIX + entityName, JSON.stringify(init));
      return init;
    }
    return JSON.parse(raw);
  } catch (e) {
    return initialData[entityName] || [];
  }
}

function saveLocalItems(entityName, items) {
  try {
    localStorage.setItem(STORAGE_PREFIX + entityName, JSON.stringify(items));
  } catch (e) {
    console.error('Storage save error:', e);
  }
}

function createEntityHandler(entityName) {
  return {
    async list(params = {}) {
      if (isSupabaseConfigured) {
        const table = entityName.toLowerCase() + 's';
        const { data, error } = await supabase.from(table).select('*');
        if (!error && data) return data;
      }
      return getLocalItems(entityName);
    },
    async filter(criteria = {}) {
      const items = await this.list();
      return items.filter(item => {
        return Object.entries(criteria).every(([k, v]) => item[k] === v);
      });
    },
    async get(id) {
      if (isSupabaseConfigured) {
        const table = entityName.toLowerCase() + 's';
        const { data, error } = await supabase.from(table).select('*').eq('id', id).single();
        if (!error && data) return data;
      }
      const items = getLocalItems(entityName);
      return items.find(item => item.id === id) || null;
    },
    async create(data) {
      if (isSupabaseConfigured) {
        const table = entityName.toLowerCase() + 's';
        const { data: created, error } = await supabase.from(table).insert([data]).select().single();
        if (!error && created) return created;
      }
      const items = getLocalItems(entityName);
      const newItem = {
        id: entityName.toLowerCase() + '_' + Date.now() + '_' + Math.floor(Math.random() * 1000),
        created_at: new Date().toISOString(),
        ...data
      };
      items.unshift(newItem);
      saveLocalItems(entityName, items);
      return newItem;
    },
    async update(id, data) {
      if (isSupabaseConfigured) {
        const table = entityName.toLowerCase() + 's';
        const { data: updated, error } = await supabase.from(table).update(data).eq('id', id).select().single();
        if (!error && updated) return updated;
      }
      const items = getLocalItems(entityName);
      const index = items.findIndex(item => item.id === id);
      if (index !== -1) {
        items[index] = { ...items[index], ...data, updated_at: new Date().toISOString() };
        saveLocalItems(entityName, items);
        return items[index];
      }
      return data;
    },
    async delete(id) {
      if (isSupabaseConfigured) {
        const table = entityName.toLowerCase() + 's';
        await supabase.from(table).delete().eq('id', id);
      }
      let items = getLocalItems(entityName);
      items = items.filter(item => item.id !== id);
      saveLocalItems(entityName, items);
      return { success: true };
    }
  };
}

const entities = new Proxy({}, {
  get(target, prop) {
    if (!target[prop]) {
      target[prop] = createEntityHandler(prop);
    }
    return target[prop];
  }
});

const DEFAULT_ADMIN_USER = {
  id: 'usr_admin',
  email: 'admin@doracars.com',
  full_name: 'يحيى باشا (مدير النظام)',
  role: 'admin',
  department: 'الموارد البشرية والشؤون الإدارية',
  avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=150'
};

export const base44 = {
  entities,
  supabase,
  auth: {
    async me() {
      const stored = localStorage.getItem('zenith_auth_user');
      if (stored) {
        try {
          return JSON.parse(stored);
        } catch (e) {}
      }
      localStorage.setItem('zenith_auth_user', JSON.stringify(DEFAULT_ADMIN_USER));
      return DEFAULT_ADMIN_USER;
    },
    async loginViaEmailPassword(email, password) {
      const user = {
        id: 'usr_' + Date.now(),
        email: email || 'admin@doracars.com',
        full_name: email ? (email.includes('@') ? email.split('@')[0] : email) : 'يحيى باشا (مدير النظام)',
        role: 'admin',
        department: 'الإدارة العامة'
      };
      localStorage.setItem('zenith_auth_user', JSON.stringify(user));
      return user;
    },
    async loginWithProvider(provider, returnTo) {
      const user = { ...DEFAULT_ADMIN_USER };
      localStorage.setItem('zenith_auth_user', JSON.stringify(user));
      window.location.href = returnTo || '/';
      return user;
    },
    async register(data) {
      const user = {
        id: 'usr_' + Date.now(),
        email: data.email,
        full_name: data.full_name || data.email,
        role: 'admin',
        company_name: data.company_name || 'شركة جديدة'
      };
      localStorage.setItem('zenith_auth_user', JSON.stringify(user));
      return user;
    },
    logout(redirectUrl) {
      localStorage.removeItem('zenith_auth_user');
      if (redirectUrl) {
        window.location.href = redirectUrl;
      }
    },
    redirectToLogin(returnTo) {
      window.location.href = '/login' + (returnTo ? '?returnTo=' + encodeURIComponent(returnTo) : '');
    }
  },
  functions: {
    async call(name, payload) {
      return { success: true };
    }
  }
};
