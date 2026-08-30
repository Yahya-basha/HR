import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { base44 } from '@/api/base44Client';
import { useAuth } from '@/lib/AuthContext';
import { MaskedSalary } from '@/lib/FinancialPrivacyContext';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Link, useNavigate } from 'react-router-dom';
import {
  Users, Wallet, AlertTriangle, Clock, CheckCircle2,
  XCircle, ArrowUpRight, TrendingUp, Calendar, FileText,
  Building2, ShieldAlert, Sparkles, RefreshCw, Send,
  UserCheck, UserX, Phone, MessageSquare, ExternalLink,
  ChevronRight, Filter, Search, Award, MapPin
} from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';

const todayStr = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

const BRANCH_LIST = [
  { id: 'all', name: 'كافة الفروع', icon: '🏢' },
  { id: 'فرع كيا ( السليم )', name: 'فرع كيا (السليم)', icon: '📍' },
  { id: 'فرع هونداي ( الرواف )', name: 'فرع هونداي (الرواف)', icon: '📍' },
  { id: 'الفرع الرئيسي', name: 'الفرع الرئيسي', icon: '📍' },
  { id: 'فرع تويوتا ( الشاحنات )', name: 'فرع تويوتا (الشاحنات)', icon: '📍' },
  { id: 'مكتب الإدارة', name: 'مكتب الإدارة', icon: '🏛️' },
];

export default function OwnerDashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [employees, setEmployees] = useState([]);
  const [attendanceLogs, setAttendanceLogs] = useState([]);
  const [leaveRequests, setLeaveRequests] = useState([]);
  const [advancesList, setAdvancesList] = useState([]);
  const [loading, setLoading] = useState(true);

  // Live Attendance Interactive Filters
  const [selectedBranch, setSelectedBranch] = useState('all');
  const [selectedStatusTab, setSelectedStatusTab] = useState('all'); // all, present, excused, absent, late
  const [searchQuery, setSearchQuery] = useState('');

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [emps, logs, leaves] = await Promise.all([
        base44.entities.Employee.list(),
        base44.entities.AttendanceLog.list('-log_date', 1500),
        base44.entities.LeaveRequest.list(),
      ]);

      setEmployees(emps || []);
      setAttendanceLogs(logs || []);
      setLeaveRequests(leaves || []);

      // Load advances
      try {
        const adv = JSON.parse(localStorage.getItem('hr_advances_list') || '[]');
        setAdvancesList(adv);
      } catch (e) {}

    } catch (e) {
      console.error(e);
      toast({ title: 'خطأ في تحميل البيانات', description: e.message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    loadData();
    const timer = setInterval(() => loadData(), 60000); // live refresh every 1 min
    return () => clearInterval(timer);
  }, [loadData]);

  const today = todayStr();

  // ─── ATTENDANCE ENGINE PER EMPLOYEE TODAY ─────────────────────────────────
  const attendanceData = useMemo(() => {
    const todayLogs = (attendanceLogs || []).filter(l => (l.log_date || l.date) === today);

    return (employees || []).map(emp => {
      const isMatch = l =>
        String(l.employee_number || l.employee_id) === String(emp.employee_number) ||
        String(l.employee_id) === String(emp.id) ||
        (l.employee_name && emp.full_name && l.employee_name.trim() === emp.full_name.trim());

      const log = todayLogs.find(isMatch);

      // Check approved leave today
      const leave = (leaveRequests || []).find(lv =>
        (String(lv.employee_number) === String(emp.employee_number) || String(lv.employee_id) === String(emp.id)) &&
        lv.status === 'approved' &&
        lv.start_date <= today &&
        lv.end_date >= today
      );

      let status = 'absent'; // present, excused, absent, late
      let statusLabel = 'غائب بدون إذن';
      let statusColor = 'rose';
      let checkIn = '--:--';
      let checkOut = '--:--';
      let hoursWorked = 0;
      let lateMins = 0;

      if (log) {
        checkIn = log.check_in || (log.punches && log.punches[0]) || '--:--';
        checkOut = log.check_out || (log.punches && log.punches[log.punches.length - 1]) || '--:--';
        hoursWorked = log.work_hours || log.hours || 0;
        lateMins = log.late_minutes || 0;

        if (log.status === 'excused' || log.is_excused) {
          status = 'excused';
          statusLabel = 'مستأذن بعذر معتمد';
          statusColor = 'amber';
        } else if (log.status === 'late' || lateMins > 0) {
          status = 'late';
          statusLabel = `متأخر (${lateMins} دقيقة)`;
          statusColor = 'orange';
        } else if (log.status === 'present' || checkIn !== '--:--') {
          status = 'present';
          statusLabel = 'حاضر على رأس العمل';
          statusColor = 'emerald';
        }
      } else if (leave) {
        status = 'excused';
        statusLabel = `إجازة (${leave.leave_type || 'معتمدة'})`;
        statusColor = 'amber';
      }

      return {
        emp,
        log,
        leave,
        status,
        statusLabel,
        statusColor,
        checkIn,
        checkOut,
        hoursWorked,
        lateMins,
        branch: emp.branch_name || emp.branch || 'مكتب الإدارة',
        shift: emp.shift || 'فترة عمل غير سعودي'
      };
    });
  }, [employees, attendanceLogs, leaveRequests, today]);

  // ─── FILTERED ATTENDANCE ──────────────────────────────────────────────────
  const filteredStaff = useMemo(() => {
    return attendanceData.filter(item => {
      // Branch filter
      if (selectedBranch !== 'all') {
        const itemBranch = item.branch.trim();
        if (!itemBranch.includes(selectedBranch) && !selectedBranch.includes(itemBranch)) {
          return false;
        }
      }

      // Status filter
      if (selectedStatusTab === 'present' && item.status !== 'present') return false;
      if (selectedStatusTab === 'excused' && item.status !== 'excused') return false;
      if (selectedStatusTab === 'absent' && item.status !== 'absent') return false;
      if (selectedStatusTab === 'late' && item.status !== 'late') return false;

      // Search
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchName = item.emp.full_name?.toLowerCase().includes(q);
        const matchNum = String(item.emp.employee_number || '').includes(q);
        const matchJob = item.emp.job_title?.toLowerCase().includes(q);
        if (!matchName && !matchNum && !matchJob) return false;
      }

      return true;
    });
  }, [attendanceData, selectedBranch, selectedStatusTab, searchQuery]);

  // ─── BRANCH ATTENDANCE STATS ──────────────────────────────────────────────
  const branchStats = useMemo(() => {
    const branchItems = attendanceData.filter(item => {
      if (selectedBranch === 'all') return true;
      const b = item.branch.trim();
      return b.includes(selectedBranch) || selectedBranch.includes(b);
    });

    const total = branchItems.length;
    const present = branchItems.filter(i => i.status === 'present').length;
    const late = branchItems.filter(i => i.status === 'late').length;
    const excused = branchItems.filter(i => i.status === 'excused').length;
    const absent = branchItems.filter(i => i.status === 'absent').length;
    const totalAttended = present + late;
    const presentPct = total > 0 ? Math.round((totalAttended / total) * 100) : 0;

    return { total, present, late, excused, absent, totalAttended, presentPct };
  }, [attendanceData, selectedBranch]);

  // ─── OVERALL COMPANY KPI METRICS ─────────────────────────────────────────
  const metrics = useMemo(() => {
    const active = employees.filter(e => e.status === 'active');
    const totalBasic = active.reduce((s, e) => s + (Number(e.salary) || 0), 0);
    const totalAllowances = active.reduce((s, e) => s + (Number(e.housing_allowance) || 0) + (Number(e.transport_allowance) || 0), 0);

    const pendingAdvances = advancesList.filter(a => a.status === 'pending' || a.status === 'hr_approved' || a.status === 'accountant_approved').length;
    const pendingLeaves = leaveRequests.filter(l => l.status === 'pending').length;

    return {
      totalEmployees: employees.length,
      activeEmployees: active.length,
      totalPayroll: totalBasic + totalAllowances,
      pendingApprovals: pendingAdvances + pendingLeaves
    };
  }, [employees, advancesList, leaveRequests]);

  const sendWhatsApp = (phone, name, branch, reason) => {
    if (!phone) {
      toast({ title: 'تنبيه', description: 'لا يوجد رقم هاتف مسجل للموظف', variant: 'destructive' });
      return;
    }
    const cleanPhone = String(phone).replace(/[^0-9]/g, '');
    const fullPhone = cleanPhone.startsWith('966') ? cleanPhone : ('966' + cleanPhone.replace(/^0/, ''));
    const msg = encodeURIComponent(`السلام عليكم ورحمة الله، الأخ ${name} (فرع ${branch})، نود الاستفسار عن سبب ${reason} اليوم (${today}). يرجى الرد للأهمية.`);
    window.open(`https://wa.me/${fullPhone}?text=${msg}`, '_blank');
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-16" dir="rtl">
      
      {/* ─── EXECUTIVE HEADER ────────────────────────────────────────── */}
      <div className="bg-gradient-to-l from-slate-900 via-slate-800 to-indigo-950 text-white p-6 rounded-3xl shadow-xl border border-indigo-900/50 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-indigo-600/30 border border-indigo-400/30 flex items-center justify-center text-3xl shadow-inner">
            👑
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-black font-heading tracking-tight">لوحة تحكم المدير العام</h1>
              <Badge className="bg-emerald-500/20 text-emerald-300 border-emerald-400/30 text-[10px] font-bold">بث مباشر 🟢</Badge>
            </div>
            <p className="text-xs text-slate-300 mt-1 flex items-center gap-2">
              <span>مركز المتابعة الحية للدوام، الحضور، وتوزيع الفروع</span>
              <span>•</span>
              <span className="font-mono text-indigo-300">{today}</span>
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button onClick={loadData} variant="outline" size="sm" className="bg-white/10 hover:bg-white/20 border-white/20 text-white text-xs rounded-xl h-9 gap-1.5">
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>تحديث حي</span>
          </Button>
          <Button onClick={() => navigate('/payroll')} size="sm" className="bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold rounded-xl h-9 shadow-md gap-1.5">
            <Wallet className="w-3.5 h-3.5" />
            <span>مسير الرواتب ➔</span>
          </Button>
        </div>
      </div>

      {/* ─── 1. LIVE ATTENDANCE BY BRANCH COMMAND CENTER (اللوحة التفاعلية) ─── */}
      <Card className="p-6 rounded-3xl border-2 border-indigo-200 dark:border-indigo-900/60 bg-gradient-to-b from-indigo-50/40 via-background to-background shadow-md space-y-6">
        
        {/* Top Header & Branch Pills */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b pb-4">
          <div>
            <h2 className="text-lg font-heading font-black text-foreground flex items-center gap-2">
              <Building2 className="w-5 h-5 text-indigo-600" />
              <span>لوحة المتابعة الحية للحضور والانصراف (حسب الفرع)</span>
            </h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              مراقبة فورية للمتواجدين، المستأذنين، والغائبين بدون إذن اليوم
            </p>
          </div>

          {/* Branch Pills */}
          <div className="flex flex-wrap items-center gap-1.5 bg-slate-200/70 dark:bg-slate-900 p-1.5 rounded-2xl border">
            {BRANCH_LIST.map(b => (
              <button
                key={b.id}
                type="button"
                onClick={() => setSelectedBranch(b.id)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                  selectedBranch === b.id
                    ? 'bg-indigo-600 text-white shadow-md'
                    : 'text-muted-foreground hover:bg-white dark:hover:bg-slate-800'
                }`}
              >
                <span>{b.icon}</span>
                <span>{b.name}</span>
                {b.id === 'all' ? (
                  <span className="text-[10px] opacity-80 font-mono">({attendanceData.length})</span>
                ) : (
                  <span className="text-[10px] opacity-80 font-mono">
                    ({attendanceData.filter(i => i.branch.includes(b.id) || b.id.includes(i.branch)).length})
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Live Attendance KPI Cards for the Selected Branch */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          
          {/* Present */}
          <button
            type="button"
            onClick={() => setSelectedStatusTab(selectedStatusTab === 'present' ? 'all' : 'present')}
            className={`p-4 rounded-2xl border text-right transition-all ${
              selectedStatusTab === 'present'
                ? 'ring-2 ring-emerald-500 bg-emerald-100/60 dark:bg-emerald-950/60 border-emerald-400'
                : 'bg-emerald-50/50 dark:bg-emerald-950/20 border-emerald-200 hover:shadow-md'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-emerald-800 dark:text-emerald-300">🟢 الحاضرون اليوم</span>
              <UserCheck className="w-4 h-4 text-emerald-600" />
            </div>
            <div className="text-2xl sm:text-3xl font-black font-mono text-emerald-700 dark:text-emerald-400 mt-2">
              {branchStats.present}
            </div>
            <div className="text-[11px] text-emerald-600 font-bold mt-1">
              نسبة حضور: {branchStats.presentPct}% من إجمالي الفرع
            </div>
          </button>

          {/* Excused & On Leave */}
          <button
            type="button"
            onClick={() => setSelectedStatusTab(selectedStatusTab === 'excused' ? 'all' : 'excused')}
            className={`p-4 rounded-2xl border text-right transition-all ${
              selectedStatusTab === 'excused'
                ? 'ring-2 ring-amber-500 bg-amber-100/60 dark:bg-amber-950/60 border-amber-400'
                : 'bg-amber-50/50 dark:bg-amber-950/20 border-amber-200 hover:shadow-md'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-amber-800 dark:text-amber-300">🟡 المستأذنون والمجازون</span>
              <Calendar className="w-4 h-4 text-amber-600" />
            </div>
            <div className="text-2xl sm:text-3xl font-black font-mono text-amber-700 dark:text-amber-400 mt-2">
              {branchStats.excused}
            </div>
            <div className="text-[11px] text-amber-600 font-bold mt-1">
              إجازات وأذونات رسمية معتمدة
            </div>
          </button>

          {/* Absent Without Permission */}
          <button
            type="button"
            onClick={() => setSelectedStatusTab(selectedStatusTab === 'absent' ? 'all' : 'absent')}
            className={`p-4 rounded-2xl border text-right transition-all ${
              selectedStatusTab === 'absent'
                ? 'ring-2 ring-rose-500 bg-rose-100/60 dark:bg-rose-950/60 border-rose-400'
                : 'bg-rose-50/50 dark:bg-rose-950/20 border-rose-200 hover:shadow-md'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-rose-800 dark:text-rose-300">🔴 الغائبون بدون إذن</span>
              <UserX className="w-4 h-4 text-rose-600" />
            </div>
            <div className="text-2xl sm:text-3xl font-black font-mono text-rose-700 dark:text-rose-400 mt-2">
              {branchStats.absent}
            </div>
            <div className="text-[11px] text-rose-600 font-bold mt-1">
              {branchStats.absent > 0 ? '⚠️ يتطلب اتخاذ إجراء فوري' : '✓ لا يوجد غياب غير مبرر'}
            </div>
          </button>

          {/* Late */}
          <button
            type="button"
            onClick={() => setSelectedStatusTab(selectedStatusTab === 'late' ? 'all' : 'late')}
            className={`p-4 rounded-2xl border text-right transition-all ${
              selectedStatusTab === 'late'
                ? 'ring-2 ring-orange-500 bg-orange-100/60 dark:bg-orange-950/60 border-orange-400'
                : 'bg-orange-50/50 dark:bg-orange-950/20 border-orange-200 hover:shadow-md'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-orange-800 dark:text-orange-300">⏱️ المتأخرون عن الوردية</span>
              <Clock className="w-4 h-4 text-orange-600" />
            </div>
            <div className="text-2xl sm:text-3xl font-black font-mono text-orange-700 dark:text-orange-400 mt-2">
              {branchStats.late}
            </div>
            <div className="text-[11px] text-orange-600 font-bold mt-1">
              دخول بعد الموعد الرسمي
            </div>
          </button>

        </div>

        {/* Sub-Filters and Search Bar */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2">
          
          {/* Status Tabs */}
          <div className="flex flex-wrap items-center gap-1 w-full sm:w-auto">
            {[
              { id: 'all', label: 'الكل', count: branchStats.total },
              { id: 'present', label: '🟢 الحاضرون', count: branchStats.present },
              { id: 'excused', label: '🟡 المستأذنون', count: branchStats.excused },
              { id: 'absent', label: '🔴 الغائبون بدون إذن', count: branchStats.absent },
              { id: 'late', label: '⏱️ المتأخرون', count: branchStats.late },
            ].map(t => (
              <button
                key={t.id}
                type="button"
                onClick={() => setSelectedStatusTab(t.id)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                  selectedStatusTab === t.id
                    ? 'bg-slate-900 text-white shadow-sm'
                    : 'bg-white dark:bg-slate-800 text-muted-foreground hover:bg-slate-100 border'
                }`}
              >
                <span>{t.label}</span>
                <span className="font-mono mr-1.5 opacity-80">({t.count})</span>
              </button>
            ))}
          </div>

          {/* Search Box */}
          <div className="relative w-full sm:w-64">
            <Search className="w-3.5 h-3.5 absolute right-3 top-2.5 text-muted-foreground" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="بحث بالاسم أو الرقم الوظيفي..."
              className="rounded-xl pr-9 text-xs h-9"
            />
          </div>
        </div>

        {/* Live Attendance Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
          {filteredStaff.length === 0 ? (
            <div className="col-span-full text-center py-10 bg-slate-50 dark:bg-slate-900 rounded-2xl border text-muted-foreground text-xs font-bold">
              لا يوجد موظفون مطابقون لهذا الفلتر في الوقت الحالي ✓
            </div>
          ) : (
            filteredStaff.map(({ emp, status, statusLabel, statusColor, checkIn, checkOut, hoursWorked, lateMins, branch, shift }) => (
              <div
                key={emp.id}
                className={`p-4 rounded-2xl border bg-white dark:bg-slate-900 shadow-sm transition-all hover:shadow-md space-y-3 ${
                  status === 'absent' ? 'border-rose-300 dark:border-rose-900 bg-rose-50/20' :
                  status === 'excused' ? 'border-amber-300 dark:border-amber-900 bg-amber-50/20' :
                  status === 'late' ? 'border-orange-300 dark:border-orange-900 bg-orange-50/20' :
                  'border-emerald-200 dark:border-emerald-900 bg-emerald-50/20'
                }`}
              >
                {/* Employee Header */}
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2.5">
                    <div className="w-10 h-10 rounded-xl bg-slate-900 text-white font-black flex items-center justify-center text-sm font-heading">
                      {(emp.full_name || 'م')[0]}
                    </div>
                    <div>
                      <div className="font-bold text-xs text-foreground hover:text-indigo-600 transition-colors">
                        {emp.full_name}
                      </div>
                      <div className="text-[10px] text-muted-foreground flex items-center gap-1 mt-0.5">
                        <span>{emp.job_title || 'موظف'}</span>
                        <span>•</span>
                        <span className="font-mono text-indigo-600">#{emp.employee_number}</span>
                      </div>
                    </div>
                  </div>

                  {/* Status Badge */}
                  <Badge
                    className={`text-[10px] font-bold px-2 py-0.5 rounded-lg ${
                      status === 'absent' ? 'bg-rose-600 text-white' :
                      status === 'excused' ? 'bg-amber-500 text-white' :
                      status === 'late' ? 'bg-orange-500 text-white' :
                      'bg-emerald-600 text-white'
                    }`}
                  >
                    {statusLabel}
                  </Badge>
                </div>

                {/* Branch & Shift Details */}
                <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border text-[11px] space-y-1.5">
                  <div className="flex items-center justify-between text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <MapPin className="w-3 h-3 text-indigo-500" />
                      <span>الفرع:</span>
                    </span>
                    <span className="font-bold text-foreground truncate max-w-[140px]">{branch}</span>
                  </div>

                  <div className="flex items-center justify-between text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Clock className="w-3 h-3 text-indigo-500" />
                      <span>الوردية:</span>
                    </span>
                    <span className="font-bold text-foreground text-[10px] truncate max-w-[150px]">{shift}</span>
                  </div>

                  <div className="grid grid-cols-2 gap-2 pt-1 border-t border-border/50 text-[10px]">
                    <div>
                      <span className="text-muted-foreground">دخول: </span>
                      <span className="font-mono font-bold text-emerald-600">{checkIn}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">خروج: </span>
                      <span className="font-mono font-bold text-indigo-600">{checkOut}</span>
                    </div>
                  </div>
                </div>

                {/* Quick Actions for General Manager */}
                <div className="flex items-center gap-1.5 pt-1">
                  
                  {/* WhatsApp Quick Link if Absent or Late */}
                  {(status === 'absent' || status === 'late') && (
                    <Button
                      size="sm"
                      onClick={() => sendWhatsApp(emp.phone, emp.full_name, branch, status === 'absent' ? 'عدم الحضور' : 'التأخير')}
                      className="flex-1 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-[10px] font-bold h-8 gap-1 shadow-sm"
                    >
                      <MessageSquare className="w-3 h-3" />
                      <span>واتساب مباشر</span>
                    </Button>
                  )}

                  {/* Profile Link */}
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => navigate(`/employees/${emp.id || emp.employee_number}`)}
                    className="flex-1 rounded-xl text-[10px] font-bold h-8 gap-1 hover:bg-slate-100"
                  >
                    <ExternalLink className="w-3 h-3 text-muted-foreground" />
                    <span>الملف 360°</span>
                  </Button>
                </div>

              </div>
            ))
          )}
        </div>

      </Card>

      {/* ─── 2. GENERAL MANAGER FINANCIAL & APPROVAL METRICS ──────────── */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        
        <Card className="p-5 rounded-3xl border bg-white dark:bg-slate-900 shadow-sm space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-muted-foreground">الكتلة الراتبية الإجمالية</span>
            <Wallet className="w-4 h-4 text-indigo-600" />
          </div>
          <div className="text-2xl font-black font-mono text-indigo-900 dark:text-indigo-200">
            <MaskedSalary value={metrics.totalPayroll} />
          </div>
          <div className="text-[11px] text-muted-foreground">
            تشمل الرواتب الأساسية والبدلات لـ {metrics.activeEmployees} موظفاً نشطاً
          </div>
        </Card>

        <Card className="p-5 rounded-3xl border bg-white dark:bg-slate-900 shadow-sm space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-muted-foreground">إجمالي القوة العاملة</span>
            <Users className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-2xl font-black font-mono text-foreground">
            {metrics.totalEmployees} موظف
          </div>
          <div className="text-[11px] text-emerald-600 font-bold">
            ✓ كافة الموظفين مسجلون بالمنشأة
          </div>
        </Card>

        <Card className="p-5 rounded-3xl border bg-white dark:bg-slate-900 shadow-sm space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-muted-foreground">طلبات بانتظار الاعتماد</span>
            <AlertTriangle className="w-4 h-4 text-amber-600" />
          </div>
          <div className="text-2xl font-black font-mono text-amber-600">
            {metrics.pendingApprovals} طلب
          </div>
          <div className="text-[11px]">
            <Link to="/approvals" className="text-indigo-600 hover:underline font-bold">
              فتح مركز الاعتمادات والموافقات ←
            </Link>
          </div>
        </Card>

      </div>

    </div>
  );
}
