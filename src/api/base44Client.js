// ============================================================================
// ZENITH HR SAAS - OFFICIAL ENTERPRISE DATABASE CLIENT
// Loaded with Dora Cars Official Live Data
// ============================================================================

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || '';
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

const isSupabaseConfigured = Boolean(SUPABASE_URL && SUPABASE_ANON_KEY);
const supabase = isSupabaseConfigured ? createClient(SUPABASE_URL, SUPABASE_ANON_KEY) : null;

const STORAGE_PREFIX = 'hr_flow_v2_';

export const initialData = {
  Company: [
    {
      id: 'comp_1',
      name: 'درة السيارة لقطع غيار السيارات',
      legal_name: 'شركة درة السيارة للتجارة',
      cr_number: '7016475555',
      tax_number: '311861381500003',
      phone: '+966538834212',
      address: 'المملكة العربية السعودية'
    }
  ],
  Branch: [
    { id: 'br_admin', name: 'مكتب الإدارة', address: 'طريق الملك فهد، الرياض', phone: '+966541697999', company_id: 'comp_1', is_main: true },
    { id: 'br_main', name: 'الفرع الرئيسي', address: 'الفرع الرئيسي، الرياض', phone: '+966542070313', company_id: 'comp_1', is_main: false },
    { id: 'br_kia', name: 'فرع كيا ( السليم )', address: 'حي السليم', phone: '+966542821253', company_id: 'comp_1', is_main: false },
    { id: 'br_hyundai', name: 'فرع هونداي ( الرواف )', address: 'حي الرواف', phone: '+966553601195', company_id: 'comp_1', is_main: false }
  ],
  Department: [
    { id: 'dep_admin', name: 'مكتب الإدارة', code: 'ADMIN', manager_name: 'فهد ناصر محمد الجوعي' },
    { id: 'dep_main', name: 'الفرع الرئيسي', code: 'MAIN', manager_name: 'محمود طه المحيميد' },
    { id: 'dep_kia', name: 'فرع كيا ( السليم )', code: 'KIA', manager_name: 'صالح علي المحيميد' },
    { id: 'dep_hyundai', name: 'فرع هونداي ( الرواف )', code: 'HYUNDAI', manager_name: 'عبد العزيز ناصر محمد الجوعي' }
  ],
  JobTitle: [
    { id: 'job_gm', title: 'المدير العام' },
    { id: 'job_hr', title: 'مصمم و مسئول الموارد البشرية' },
    { id: 'job_acc', title: 'مدير الحسابات' },
    { id: 'job_store', title: 'مسئول متجر الكتروني' },
    { id: 'job_sales', title: 'بائع قطع غيار' }
  ],
  Shift: [
    { id: 'sh_gm', name: 'شفت المدير العام', type: 'flexible', start_time: '09:00', end_time: '17:00', total_hours: 8, grace_minutes: 30, description: 'دوام الإدارة العامة' },
    { id: 'sh_saudi_morning', name: 'فترة عمل سعودي صباحي', type: 'morning', start_time: '08:00', end_time: '16:00', total_hours: 8, grace_minutes: 15, description: 'الدوام الصباحي للكادر السعودي' },
    { id: 'sh_saudi_evening', name: 'فترة عمل سعودي مسائي', type: 'evening', start_time: '16:00', end_time: '00:00', total_hours: 8, grace_minutes: 15, description: 'الدوام المسائي للكادر السعودي' },
    { id: 'sh_non_saudi', name: 'فترة عمل غير سعودي', type: 'morning', start_time: '08:00', end_time: '20:00', total_hours: 10, grace_minutes: 15, description: 'دوام فترات العمل للكوادر غير السعودية' }
  ],
  LeavePolicy: [
    { id: 'lp_annual', name: 'الاجازة السنوية', annual_days: 30, carry_over_days: 5 },
    { id: 'lp_unpaid', name: 'اجازات بدون مرتب', annual_days: 0, carry_over_days: 0 },
    { id: 'lp_standard', name: 'Standard Policy', annual_days: 21, carry_over_days: 0 }
  ],
  Employee: [
    {
      id: 'emp_1001',
      employee_number: '1001',
      full_name: 'فهد ناصر محمد الجوعي',
      email: 'dortalsiarh@gmail.com',
      phone: '+966541697999',
      job_title: 'المدير العام',
      department_name: 'مكتب الإدارة',
      branch_name: 'مكتب الإدارة',
      shift: 'شفت المدير العام',
      nationality: 'سعودي',
      national_id: '1111738496',
      join_date: '2022-11-01',
      salary: 4000,
      housing_allowance: 0,
      transport_allowance: 0,
      leave_policy: 'الاجازة السنوية',
      status: 'active'
    },
    {
      id: 'emp_1022',
      employee_number: '1022',
      full_name: 'يحيي محمد عبدالغفار باشا',
      email: 'yahya9031@gmail.com',
      phone: '+966575901487',
      job_title: 'مصمم و مسئول الموارد البشرية',
      department_name: 'مكتب الإدارة',
      branch_name: 'مكتب الإدارة',
      shift: 'فترة عمل غير سعودي',
      nationality: 'مصري',
      national_id: '2554901666',
      join_date: '2025-01-01',
      salary: 4000,
      housing_allowance: 200,
      transport_allowance: 0,
      leave_policy: 'الاجازة السنوية',
      status: 'active'
    },
    {
      id: 'emp_1005',
      employee_number: '1005',
      full_name: 'هشام ابوالفضل زغلول',
      email: 'hes.ham42@yahoo.com',
      phone: '+966542070313',
      job_title: 'مدير الحسابات',
      department_name: 'مكتب الإدارة',
      branch_name: 'مكتب الإدارة',
      shift: 'فترة عمل غير سعودي',
      nationality: 'مصري',
      national_id: '2406494993',
      join_date: '2022-11-01',
      salary: 5500,
      housing_allowance: 150,
      transport_allowance: 150,
      leave_policy: 'الاجازة السنوية',
      status: 'active'
    },
    {
      id: 'emp_1034',
      employee_number: '1034',
      full_name: 'طه محمود المحيميد',
      email: 'taha141318@gmail.com',
      phone: '+966507437337',
      job_title: 'مسئول متجر الكتروني',
      department_name: 'مكتب الإدارة',
      branch_name: 'مكتب الإدارة',
      shift: 'فترة عمل غير سعودي',
      nationality: 'سوري',
      national_id: '',
      join_date: '2026-04-13',
      salary: 1500,
      housing_allowance: 0,
      transport_allowance: 0,
      leave_policy: 'اجازات بدون مرتب',
      status: 'active'
    },
    {
      id: 'emp_1002',
      employee_number: '1002',
      full_name: 'محمود طه المحيميد',
      email: 'ma-h77@hotmail.com',
      phone: '+966542070313',
      job_title: 'بائع قطع غيار',
      department_name: 'الفرع الرئيسي',
      branch_name: 'الفرع الرئيسي',
      shift: 'فترة عمل غير سعودي',
      nationality: 'سوري',
      national_id: '2151595283',
      join_date: '2022-11-01',
      salary: 4200,
      housing_allowance: 150,
      transport_allowance: 150,
      leave_policy: 'الاجازة السنوية',
      status: 'active'
    },
    {
      id: 'emp_1004',
      employee_number: '1004',
      full_name: 'صالح علي المحيميد',
      email: 'salehali.e@gmail.com',
      phone: '+966542821253',
      job_title: 'بائع قطع غيار',
      department_name: 'فرع كيا ( السليم )',
      branch_name: 'فرع كيا ( السليم )',
      shift: 'فترة عمل سعودي صباحي',
      nationality: 'سعودي',
      national_id: '1106501065',
      join_date: '2022-11-01',
      salary: 4000,
      housing_allowance: 0,
      transport_allowance: 0,
      leave_policy: 'الاجازة السنوية',
      status: 'active'
    },
    {
      id: 'emp_1008',
      employee_number: '1008',
      full_name: 'خالد ناصر محمد الجوعي',
      email: 'khaled@gmail.com',
      phone: '+966544439321',
      job_title: 'بائع قطع غيار',
      department_name: 'الفرع الرئيسي',
      branch_name: 'الفرع الرئيسي',
      shift: 'فترة عمل سعودي صباحي',
      nationality: 'سعودي',
      national_id: '1111738488',
      join_date: '2023-02-01',
      salary: 3300,
      housing_allowance: 0,
      transport_allowance: 0,
      leave_policy: 'الاجازة السنوية',
      status: 'active'
    },
    {
      id: 'emp_1011',
      employee_number: '1011',
      full_name: 'عبد العزيز ناصر محمد الجوعي',
      email: 'azooz7998@gmail.com',
      phone: '+966553601195',
      job_title: 'بائع قطع غيار',
      department_name: 'فرع هونداي ( الرواف )',
      branch_name: 'فرع هونداي ( الرواف )',
      shift: 'فترة عمل سعودي صباحي',
      nationality: 'سعودي',
      national_id: '1113348641',
      join_date: '2023-05-23',
      salary: 2500,
      housing_allowance: 0,
      transport_allowance: 0,
      leave_policy: 'اجازات بدون مرتب',
      status: 'active'
    },
    {
      id: 'emp_1013',
      employee_number: '1013',
      full_name: 'وضاح صالح سالم أحمد العولقي',
      email: 'abosaleh7830@gmail.com',
      phone: '+966549107830',
      job_title: 'بائع قطع غيار',
      department_name: 'فرع هونداي ( الرواف )',
      branch_name: 'فرع هونداي ( الرواف )',
      shift: 'فترة عمل غير سعودي',
      nationality: 'يمني',
      national_id: '2539519401',
      join_date: '2023-11-18',
      salary: 2500,
      housing_allowance: 200,
      transport_allowance: 200,
      leave_policy: 'Standard Policy',
      status: 'active'
    },
    {
      id: 'emp_1017',
      employee_number: '1017',
      full_name: 'محمد سالم صالح أحمد المردم',
      email: 'mmha1998man@gmail.com',
      phone: '+966532343471',
      job_title: 'بائع قطع غيار',
      department_name: 'فرع كيا ( السليم )',
      branch_name: 'فرع كيا ( السليم )',
      shift: 'فترة عمل غير سعودي',
      nationality: 'يمني',
      national_id: '2541925349',
      join_date: '2024-09-24',
      salary: 2000,
      housing_allowance: 200,
      transport_allowance: 100,
      leave_policy: 'الاجازة السنوية',
      status: 'active'
    },
    {
      id: 'emp_1018',
      employee_number: '1018',
      full_name: 'عاصم ابراهيم الرياعي',
      email: 'abosa4er33@hotmail.com',
      phone: '+966505873004',
      job_title: 'بائع قطع غيار',
      department_name: 'فرع هونداي ( الرواف )',
      branch_name: 'فرع هونداي ( الرواف )',
      shift: 'فترة عمل سعودي مسائي',
      nationality: 'سعودي',
      national_id: '1129098602',
      join_date: '2026-02-12',
      salary: 1800,
      housing_allowance: 0,
      transport_allowance: 0,
      leave_policy: 'اجازات بدون مرتب',
      status: 'active'
    },
    {
      id: 'emp_1020',
      employee_number: '1020',
      full_name: 'عبد الله يحيى إبراهيم التويجري',
      email: 'abodytw26@icloud.com',
      phone: '+966534063653',
      job_title: 'بائع قطع غيار',
      department_name: 'فرع هونداي ( الرواف )',
      branch_name: 'فرع هونداي ( الرواف )',
      shift: 'فترة عمل سعودي صباحي',
      nationality: 'سعودي',
      national_id: '1118862547',
      join_date: '2024-10-12',
      salary: 3000,
      housing_allowance: 0,
      transport_allowance: 0,
      leave_policy: 'الاجازة السنوية',
      status: 'active'
    },
    {
      id: 'emp_1021',
      employee_number: '1021',
      full_name: 'إبراهيم عبد العزيز التويجري',
      email: 'ab0790468@gmail.com',
      phone: '+966554460559',
      job_title: 'بائع قطع غيار',
      department_name: 'فرع كيا ( السليم )',
      branch_name: 'فرع كيا ( السليم )',
      shift: 'فترة عمل سعودي مسائي',
      nationality: 'سعودي',
      national_id: '1116885797',
      join_date: '2026-02-15',
      salary: 1800,
      housing_allowance: 0,
      transport_allowance: 0,
      leave_policy: 'اجازات بدون مرتب',
      status: 'active'
    },
    {
      id: 'emp_1024',
      employee_number: '1024',
      full_name: 'سفيان عبد الرحمن الضالع',
      email: 'sfyan5401@gmail.com',
      phone: '+966501801811',
      job_title: 'بائع قطع غيار',
      department_name: 'فرع هونداي ( الرواف )',
      branch_name: 'فرع كيا ( السليم )',
      shift: 'فترة عمل سعودي مسائي',
      nationality: 'سعودي',
      national_id: '1130465527',
      join_date: '2025-03-01',
      salary: 1500,
      housing_allowance: 0,
      transport_allowance: 0,
      leave_policy: 'اجازات بدون مرتب',
      status: 'active'
    },
    {
      id: 'emp_1027',
      employee_number: '1027',
      full_name: 'محمد صالح محمد السعوي',
      email: 'mohammedsa.2005a@gmail.com',
      phone: '+966506189288',
      job_title: 'بائع قطع غيار',
      department_name: 'الفرع الرئيسي',
      branch_name: 'الفرع الرئيسي',
      shift: 'فترة عمل سعودي مسائي',
      nationality: 'سعودي',
      national_id: '1145258602',
      join_date: '2025-09-01',
      salary: 1500,
      housing_allowance: 0,
      transport_allowance: 0,
      leave_policy: 'اجازات بدون مرتب',
      status: 'active'
    },
    {
      id: 'emp_1032',
      employee_number: '1032',
      full_name: 'محمد عادل احمد نعمان',
      email: 'mo7781199@gmail.com',
      phone: '+966534063653',
      job_title: 'بائع قطع غيار',
      department_name: 'الفرع الرئيسي',
      branch_name: 'الفرع الرئيسي',
      shift: 'فترة عمل غير سعودي',
      nationality: 'يمني',
      national_id: '2564699011',
      join_date: '2025-12-24',
      salary: 1500,
      housing_allowance: 200,
      transport_allowance: 0,
      leave_policy: 'الاجازة السنوية',
      status: 'active'
    },
    {
      id: 'emp_1033',
      employee_number: '1033',
      full_name: 'عبد الله ناصر عبد الله محمد عمر',
      email: 'lkhg964@gmail.com',
      phone: '+966559249379',
      job_title: 'بائع قطع غيار',
      department_name: 'فرع هونداي ( الرواف )',
      branch_name: 'فرع هونداي ( الرواف )',
      shift: 'فترة عمل غير سعودي',
      nationality: 'يمني',
      national_id: '2611459286',
      join_date: '2026-01-18',
      salary: 1500,
      housing_allowance: 200,
      transport_allowance: 0,
      leave_policy: 'الاجازة السنوية',
      status: 'active'
    },
    {
      id: 'emp_1035',
      employee_number: '1035',
      full_name: 'محمدعبد محمد البليهي',
      email: '1035@durracars.sa',
      phone: '+966535014657',
      job_title: 'بائع قطع غيار',
      department_name: 'فرع هونداي ( الرواف )',
      branch_name: 'فرع هونداي ( الرواف )',
      shift: 'فترة عمل سعودي مسائي',
      nationality: 'سعودي',
      national_id: '1130729724',
      join_date: '2026-04-15',
      salary: 1500,
      housing_allowance: 0,
      transport_allowance: 0,
      leave_policy: 'اجازات بدون مرتب',
      status: 'active'
    }
  ],
  EmploymentContract: [],
  AttendanceLog: [],
  LeaveRequest: []
};

// Generate matching employment contracts
initialData.EmploymentContract = initialData.Employee.map((e, idx) => ({
  id: 'cont_' + e.employee_number,
  employee_id: e.id,
  employee_name: e.full_name,
  contract_type: 'full_time',
  start_date: e.join_date,
  end_date: '2027-12-31',
  basic_salary: e.salary,
  housing_allowance: e.housing_allowance || 0,
  transport_allowance: e.transport_allowance || 0,
  status: 'active'
}));

// Generate today attendance records
const todayStr = new Date().toISOString().split('T')[0];
initialData.AttendanceLog = [
  { id: 'att_1', employee_id: 'emp_1001', employee_name: 'فهد ناصر محمد الجوعي', log_date: todayStr, check_in: '08:55', check_out: null, status: 'present' },
  { id: 'att_2', employee_id: 'emp_1022', employee_name: 'يحيي محمد عبدالغفار باشا', log_date: todayStr, check_in: '08:00', check_out: null, status: 'present' },
  { id: 'att_3', employee_id: 'emp_1005', employee_name: 'هشام ابوالفضل زغلول', log_date: todayStr, check_in: '08:10', check_out: null, status: 'present' },
  { id: 'att_4', employee_id: 'emp_1002', employee_name: 'محمود طه المحيميد', log_date: todayStr, check_in: '08:20', check_out: null, status: 'late' },
  { id: 'att_5', employee_id: 'emp_1004', employee_name: 'صالح علي المحيميد', log_date: todayStr, check_in: '07:55', check_out: null, status: 'present' },
  { id: 'att_6', employee_id: 'emp_1013', employee_name: 'وضاح صالح سالم أحمد العولقي', log_date: todayStr, check_in: '08:05', check_out: null, status: 'present' }
];

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
  id: 'usr_1022',
  email: 'yahya9031@gmail.com',
  full_name: 'يحيي محمد عبدالغفار باشا (مسئول الموارد البشرية)',
  role: 'admin',
  department: 'مكتب الإدارة',
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
        email: email || 'yahya9031@gmail.com',
        full_name: email ? (email.includes('@') ? email.split('@')[0] : email) : 'يحيي محمد عبدالغفار باشا',
        role: 'admin',
        department: 'مكتب الإدارة'
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
        company_name: data.company_name || 'درة السيارة لقطع غيار السيارات'
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
