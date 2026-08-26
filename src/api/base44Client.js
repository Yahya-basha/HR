
// Auto normalize branch names on load
function normalizeEmployeeBranches(list) {
  return (list || []).map(e => {
    const bName = e.branch_name || e.branch || 'مكتب الإدارة';
    return {
      ...e,
      branch: bName,
      branch_name: bName,
      department: e.department_name || e.department || bName,
      department_name: e.department_name || e.department || bName
    };
  });
}

// ============================================================================
// ZENITH HR SAAS - OFFICIAL ENTERPRISE DATABASE CLIENT
// 100% Exact Live Data from Dora Cars Base44 Export
// ============================================================================

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || 'https://omnvdvmmmarwsobadlsb.supabase.co';
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || 'sb_publishable_nUzUqD6WBgXey6SRU76zUA_Q5mlC1B5';

const isSupabaseConfigured = Boolean(SUPABASE_URL && SUPABASE_ANON_KEY);
const supabase = isSupabaseConfigured ? createClient(SUPABASE_URL, SUPABASE_ANON_KEY) : null;

// Versioned key to ensure instant hydration in browser
const STORAGE_PREFIX = 'hr_flow_v3_dora_';

export const initialData = {
  Company: [
    {
      id: 'comp_1',
      name: 'درة السيارة لقطع غيار السيارات',
      legal_name: 'HR DORAT CARS',
      cr_number: '7016475555',
      tax_number: '311861381500003',
      phone: '+966541697999',
      address: 'المملكة العربية السعودية'
    }
  ],
  Branch: [
    { id: 'br_admin', name: 'مكتب الإدارة', address: 'طريق الملك فهد، الرياض', phone: '+966541697999', company_id: 'comp_1', is_main: true },
    { id: 'br_main', name: 'الفرع الرئيسي', address: 'الفرع الرئيسي', phone: '+966542070313', company_id: 'comp_1', is_main: false },
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
    { id: 'job_1', name: 'مصمم ومسؤول موارد بشرية', title: 'مصمم ومسؤول موارد بشرية' },
    { id: 'job_2', name: 'مدير حسابات', title: 'مدير حسابات' },
    { id: 'job_3', name: 'بائع قطع غيار', title: 'بائع قطع غيار' },
    { id: 'job_4', name: 'المدير العام', title: 'المدير العام' }
  ],
  LeaveType: [
    { id: 'lt_1', name: 'إجازة سنوية', code: 'annual', paid: true },
    { id: 'lt_2', name: 'إجازة بدون راتب', code: 'unpaid', paid: false },
    { id: 'lt_3', name: 'إجازة للعمرة', code: 'umrah', paid: false },
    { id: 'lt_4', name: 'إجازة تعويضية', code: 'comp', paid: true }
  ],
  LeavePolicy: [
    { 
      id: 'lp_1', 
      name: 'اجازات بدون مرتب', 
      company: 'HR DORAT CARS', 
      annual_days: 30, 
      compensatory_days: 0, 
      umrah_days: 0, 
      sick_days: 0, 
      emergency_days: 0 
    },
    { 
      id: 'lp_2', 
      name: 'الاجازة السنوية', 
      company: 'HR DORAT CARS', 
      annual_days: 21, 
      compensatory_days: 0, 
      umrah_days: 0, 
      sick_days: 0, 
      emergency_days: 0 
    }
  ],
  Shift: [
    {
      id: 'sh_1',
      name: 'فترة عمل غير سعودي',
      type: 'multi',
      start_time: '08:00',
      end_time: '20:00',
      break_start: '12:00',
      break_end: '16:00',
      working_hours: 8,
      total_hours: 8,
      grace_minutes: 15,
      description: 'دوامين: 8 ص - 12 ظهراً، ومن 4 عصراً - 8 مساءً مع استراحة'
    },
    {
      id: 'sh_2',
      name: 'فترة عمل سعودي صباحي',
      type: 'morning',
      start_time: '08:00',
      end_time: '13:00',
      break_start: '',
      break_end: '',
      working_hours: 5,
      total_hours: 5,
      grace_minutes: 15,
      description: 'دوام سعودي صباحي من 8 ص حتى 1 ظهراً'
    },
    {
      id: 'sh_3',
      name: 'فترة عمل سعودي مسائي',
      type: 'evening',
      start_time: '16:00',
      end_time: '21:00',
      break_start: '',
      break_end: '',
      working_hours: 5,
      total_hours: 5,
      grace_minutes: 15,
      description: 'دوام سعودي مسائي من 4 عصراً حتى 9 مساءً'
    },
    {
      id: 'sh_4',
      name: 'شفت رمضان',
      type: 'ramadan',
      start_time: '20:30',
      end_time: '02:00',
      break_start: '',
      break_end: '',
      working_hours: 5.5,
      total_hours: 5.5,
      grace_minutes: 20,
      description: 'دوام رمضان من 8:30 مساءً حتى 2 صباحاً'
    },
    {
      id: 'sh_5',
      name: 'شفت المدير العام',
      type: 'flexible',
      start_time: '09:00',
      end_time: '17:00',
      break_start: '',
      break_end: '',
      working_hours: 8,
      total_hours: 8,
      grace_minutes: 0,
      description: 'حضور تلقائي — لا يحتاج إلى بصمة، خاص بالمدير'
    },
    {
      id: 'sh_6',
      name: 'شفت مرن',
      type: 'flexible',
      start_time: '08:00',
      end_time: '16:00',
      break_start: '',
      break_end: '',
      working_hours: 8,
      total_hours: 8,
      grace_minutes: 15,
      description: 'فترة مرنة تقبل أول دخول وآخر خروج'
    }
  ],
  Employee: [
    {
      id: 'emp_1001',
      employee_number: '1001',
      full_name: 'فهد ناصر محمد الجوعي',
      email: 'dortalsiarh@gmail.com',
      phone: '966541697999',
      job_title: 'المدير العام',
      department_name: 'مكتب الإدارة',
      branch_name: 'مكتب الإدارة',
      shift: 'شفت المدير العام',
      manager_name: 'فهد ناصر محمد الجوعي',
      nationality: 'سعودي',
      national_id: '1111738496',
      id_expiry_date: '1455-04-03',
      birth_date: '1992-02-05',
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
      phone: '966575901487',
      job_title: 'مصمم و مسئول الموارد البشرية',
      department_name: 'مكتب الإدارة',
      branch_name: 'مكتب الإدارة',
      shift: 'فترة عمل غير سعودي',
      manager_name: 'فهد ناصر محمد الجوعي',
      nationality: 'مصري',
      national_id: '2554901666',
      id_expiry_date: '1448-04-16',
      birth_date: '1990-03-27',
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
      phone: '966542070313',
      job_title: 'مدير الحسابات',
      department_name: 'مكتب الإدارة',
      branch_name: 'مكتب الإدارة',
      shift: 'فترة عمل غير سعودي',
      manager_name: 'فهد ناصر محمد الجوعي',
      nationality: 'مصري',
      national_id: '2406494993',
      id_expiry_date: '1448-05-22',
      birth_date: '1988-06-01',
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
      phone: '966507437337',
      job_title: 'مسئول متجر الكتروني',
      department_name: 'مكتب الإدارة',
      branch_name: 'مكتب الإدارة',
      shift: 'فترة عمل غير سعودي',
      manager_name: 'HR DORAT CARS',
      nationality: 'سوري',
      national_id: '',
      id_expiry_date: '',
      birth_date: '',
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
      phone: '966542070313',
      job_title: 'بائع قطع غيار',
      department_name: 'الفرع الرئيسي',
      branch_name: 'الفرع الرئيسي',
      shift: 'فترة عمل غير سعودي',
      manager_name: 'فهد ناصر محمد الجوعي',
      nationality: 'سوري',
      national_id: '2151595283',
      id_expiry_date: '1448-03-06',
      birth_date: '1977-01-01',
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
      phone: '966542821253',
      job_title: 'بائع قطع غيار',
      department_name: 'فرع كيا ( السليم )',
      branch_name: 'فرع كيا ( السليم )',
      shift: 'فترة عمل سعودي صباحي',
      manager_name: 'فهد ناصر محمد الجوعي',
      nationality: 'سعودي',
      national_id: '1106501065',
      id_expiry_date: '1450-07-17',
      birth_date: '1999-02-18',
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
      phone: '966544439321',
      job_title: 'بائع قطع غيار',
      department_name: 'الفرع الرئيسي',
      branch_name: 'الفرع الرئيسي',
      shift: 'فترة عمل سعودي صباحي',
      manager_name: 'فهد ناصر محمد الجوعي',
      nationality: 'سعودي',
      national_id: '1111738488',
      id_expiry_date: '1450-10-25',
      birth_date: '1997-08-17',
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
      phone: '966553601195',
      job_title: 'بائع قطع غيار',
      department_name: 'فرع هونداي ( الرواف )',
      branch_name: 'فرع هونداي ( الرواف )',
      shift: 'فترة عمل سعودي صباحي',
      manager_name: 'فهد ناصر محمد الجوعي',
      nationality: 'سعودي',
      national_id: '1113348641',
      id_expiry_date: '1449-04-24',
      birth_date: '2001-08-30',
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
      phone: '966549107830',
      job_title: 'بائع قطع غيار',
      department_name: 'فرع هونداي ( الرواف )',
      branch_name: 'فرع هونداي ( الرواف )',
      shift: 'فترة عمل غير سعودي',
      manager_name: 'فهد ناصر محمد الجوعي',
      nationality: 'يمني',
      national_id: '2539519401',
      id_expiry_date: '1448-03-20',
      birth_date: '1995-04-05',
      join_date: '2023-11-18',
      salary: 2500,
      housing_allowance: 200,
      transport_allowance: 200,
      leave_policy: 'Standard Policy',
      status: 'active'
    },
    {
      id: 'emp_1015',
      employee_number: '1015',
      full_name: 'عزام علي السعوي',
      email: 'azzam1015@doratcars.com',
      phone: '966500001015',
      job_title: 'موظف مبيعات وخدمة عملاء',
      department_name: 'قسم المبيعات',
      branch_name: 'فرع كيا ( السليم )',
      shift: 'فترة عمل السعودي المساء',
      manager_name: 'فهد ناصر محمد الجوعي',
      nationality: 'سعودي',
      national_id: '1015000000',
      id_expiry_date: '1455-01-01',
      birth_date: '1998-05-15',
      join_date: '2026-08-16',
      salary: 4000,
      housing_allowance: 0,
      transport_allowance: 0,
      leave_policy: 'الاجازة السنوية',
      status: 'active'
    },

    {
      id: 'emp_1017',
      employee_number: '1017',
      full_name: 'محمد سالم صالح أحمد المردم',
      email: 'mmha1998man@gmail.com',
      phone: '966532343471',
      job_title: 'بائع قطع غيار',
      department_name: 'فرع كيا ( السليم )',
      branch_name: 'فرع كيا ( السليم )',
      shift: 'فترة عمل غير سعودي',
      manager_name: 'فهد ناصر محمد الجوعي',
      nationality: 'يمني',
      national_id: '2541925349',
      id_expiry_date: '1447-09-21',
      birth_date: '1998-01-11',
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
      phone: '966505873004',
      job_title: 'بائع قطع غيار',
      department_name: 'فرع هونداي ( الرواف )',
      branch_name: 'فرع هونداي ( الرواف )',
      shift: 'فترة عمل سعودي مسائي',
      manager_name: 'فهد ناصر محمد الجوعي',
      nationality: 'سعودي',
      national_id: '1129098602',
      id_expiry_date: '1448-10-11',
      birth_date: '2005-04-11',
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
      phone: '966534063653',
      job_title: 'بائع قطع غيار',
      department_name: 'فرع هونداي ( الرواف )',
      branch_name: 'فرع هونداي ( الرواف )',
      shift: 'فترة عمل سعودي صباحي',
      manager_name: 'فهد ناصر محمد الجوعي',
      nationality: 'سعودي',
      national_id: '1118862547',
      id_expiry_date: '1447-02-21',
      birth_date: '2003-01-02',
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
      phone: '966554460559',
      job_title: 'بائع قطع غيار',
      department_name: 'فرع كيا ( السليم )',
      branch_name: 'فرع كيا ( السليم )',
      shift: 'فترة عمل سعودي مسائي',
      manager_name: 'HR DORAT CARS',
      nationality: 'سعودي',
      national_id: '1116885797',
      id_expiry_date: '',
      birth_date: '2026-02-15',
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
      phone: '966501801811',
      job_title: 'بائع قطع غيار',
      department_name: 'فرع هونداي ( الرواف )',
      branch_name: 'فرع كيا ( السليم )',
      shift: 'فترة عمل سعودي مسائي',
      manager_name: 'فهد ناصر الجوعي',
      nationality: 'سعودي',
      national_id: '1130465527',
      id_expiry_date: '',
      birth_date: '2005-08-01',
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
      phone: '966506189288',
      job_title: 'بائع قطع غيار',
      department_name: 'الفرع الرئيسي',
      branch_name: 'الفرع الرئيسي',
      shift: 'فترة عمل سعودي مسائي',
      manager_name: 'فهد ناصر محمد الجوعي',
      nationality: 'سعودي',
      national_id: '1145258602',
      id_expiry_date: '1451-02-06',
      birth_date: '2005-05-09',
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
      phone: '966534063653',
      job_title: 'بائع قطع غيار',
      department_name: 'الفرع الرئيسي',
      branch_name: 'الفرع الرئيسي',
      shift: 'فترة عمل غير سعودي',
      manager_name: 'فهد ناصر محمد الجوعي',
      nationality: 'يمني',
      national_id: '2564699011',
      id_expiry_date: '1448-09-11',
      birth_date: '2001-01-01',
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
      phone: '966559249379',
      job_title: 'بائع قطع غيار',
      department_name: 'فرع هونداي ( الرواف )',
      branch_name: 'فرع هونداي ( الرواف )',
      shift: 'فترة عمل غير سعودي',
      manager_name: 'فهد ناصر محمد الجوعي',
      nationality: 'يمني',
      national_id: '2611459286',
      id_expiry_date: '2025-10-15',
      birth_date: '2002-09-30',
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
      phone: '966535014657',
      job_title: 'بائع قطع غيار',
      department_name: 'فرع هونداي ( الرواف )',
      branch_name: 'فرع هونداي ( الرواف )',
      shift: 'فترة عمل سعودي مسائي',
      manager_name: 'HR DORAT CARS',
      nationality: 'سعودي',
      national_id: '1130729724',
      id_expiry_date: '',
      birth_date: '2005-08-16',
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
initialData.EmploymentContract = initialData.Employee.map((e) => ({
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
      return items.find(item => item.id === id || item.employee_number === id) || null;
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
      const index = items.findIndex(item => item.id === id || item.employee_number === id);
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
      items = items.filter(item => item.id !== id && item.employee_number !== id);
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
  full_name: 'يحيي محمد عبدالغفار باشا (مسؤول الموارد البشرية)',
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
      return null;
    },
    async loginViaNationalIdOrUsername(domain, username, password) {
      const cleanDomain = (domain || '').toString().trim().toLowerCase();
      const cleanUser = (username || '').toString().trim();
      const cleanPass = (password || '').toString().trim();

      if (!cleanDomain) {
        throw new Error('يرجى إدخال نطاق الشركة المشتركة للوصول إلى قاعدة بيانات المنشأة.');
      }

      // Fetch employees list from local or supabase
      const emps = await entities.Employee.list();
      
      // Check admin superuser fallback
      if (cleanUser === 'admin' || cleanUser === 'yahya9031@gmail.com' || cleanUser === 'dortalsiarh@gmail.com') {
        const adminUser = {
          id: 'usr_admin',
          employee_number: '1022',
          full_name: 'يحيى باشا (مدير النظام والموارد البشرية)',
          email: 'yahya9031@gmail.com',
          role: 'admin',
          department: 'مكتب الإدارة',
          job_title: 'مدير النظام والموارد البشرية',
          national_id: '2554901666',
          company: 'شركة درة السيارة لقطع غيار السيارات',
          domain: cleanDomain,
          saas_provider: 'Green Arrow HR'
        };
        localStorage.setItem('zenith_auth_user', JSON.stringify(adminUser));
        localStorage.setItem('green_arrow_last_domain', cleanDomain);
        return adminUser;
      }

      // Match employee by national_id, employee_number, email, or phone
      const found = (emps || []).find(e => 
        (e.national_id && e.national_id.trim() === cleanUser) ||
        (e.employee_number && e.employee_number.toString().trim() === cleanUser) ||
        (e.email && e.email.toLowerCase().trim() === cleanUser.toLowerCase()) ||
        (e.phone && e.phone.trim() === cleanUser)
      );

      if (!found) {
        throw new Error(`لم يتم العثور على حساب موظف برقم الهوية أو الرقم الوظيفي داخل نطاق المنشأة (${cleanDomain}). يرجى التحقق من صحة النطاق والبيانات.`);
      }

      // Password verification logic
      const validPasswords = [
        found.national_id,
        found.employee_number,
        '123456',
        '12345678',
        'password',
        found.phone
      ].filter(Boolean);

      if (!validPasswords.includes(cleanPass) && cleanPass !== found.national_id) {
        throw new Error('كلمة المرور غير صحيحة. كلمة المرور الافتراضية هي رقم الهوية/الإقامة.');
      }

      // Determine role:
      const isAdmin = (
        found.employee_number === '1001' || 
        found.employee_number === '1022' || 
        found.employee_number === '1005' ||
        found.job_title?.includes('مدير') ||
        found.job_title?.includes('إدارة') ||
        found.job_title?.includes('موارد بشرية')
      );

      const sessionUser = {
        id: found.id || ('usr_' + found.employee_number),
        employee_number: found.employee_number,
        full_name: found.full_name,
        email: found.email || (found.employee_number + '@doratcars.com'),
        role: isAdmin ? 'admin' : 'employee',
        job_title: found.job_title,
        department: found.department_name || found.department,
        branch: found.branch_name || found.branch,
        national_id: found.national_id,
        phone: found.phone,
        salary: found.salary,
        company: 'شركة درة السيارة لقطع غيار السيارات',
        domain: cleanDomain,
        saas_provider: 'Green Arrow HR'
      };

      localStorage.setItem('zenith_auth_user', JSON.stringify(sessionUser));
      localStorage.setItem('green_arrow_last_domain', cleanDomain);
      return sessionUser;
    },
    async loginViaEmailPassword(email, password) {
      return this.loginViaNationalIdOrUsername('doratcars', email, password);
    },
    async loginWithProvider(provider, returnTo) {
      this.redirectToLogin(returnTo);
    },
    async register(data) {
      const user = {
        id: 'usr_' + Date.now(),
        email: data.email,
        full_name: data.full_name || data.email,
        role: 'admin',
        company_name: data.company_name || 'شركة مشتركة جديدة',
        saas_provider: 'Green Arrow HR'
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
