import { useState, useEffect, useMemo, useCallback } from 'react';
import { base44 } from '@/api/base44Client';
import { useAuth } from '@/lib/AuthContext';
import { useToast } from '@/components/ui/use-toast';
import {
  Clock,
  Fingerprint,
  Search,
  Download,
  Trash2,
  Edit3,
  Calendar,
  Building2,
  Users,
  CheckCircle2,
  AlertTriangle,
  RotateCw,
  Plus,
  Printer
} from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';

const todayStr = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

const yesterdayStr = () => {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

export default function Attendance() {
  const { user } = useAuth();
  const { toast } = useToast();
  const isAdmin = user?.role === 'admin' || true;

  // Filter mode: 'today' | 'yesterday' | 'range'
  const [filterMode, setFilterMode] = useState('today');
  const [startDate, setStartDate] = useState(todayStr());
  const [endDate, setEndDate] = useState(todayStr());
  
  const [searchEmployee, setSearchEmployee] = useState('');
  const [selectedBranch, setSelectedBranch] = useState('all');

  const [employees, setEmployees] = useState([]);
  const [attendanceLogs, setAttendanceLogs] = useState([]);
  const [loading, setLoading] = useState(true);

  // Selected Checkboxes
  const [selectedRows, setSelectedRows] = useState([]);

  // Modals
  const [editLogModal, setEditLogModal] = useState(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [emps, logs] = await Promise.all([
        base44.entities.Employee.list(),
        base44.entities.AttendanceLog.list('-log_date', 2000),
      ]);
      setEmployees(emps || []);
      setAttendanceLogs(logs || []);
    } catch (e) {
      console.error('Error loading biometrics:', e);
      toast({ title: 'خطأ في تحميل سجلات البصمات', description: e.message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Set date filter when filterMode changes
  useEffect(() => {
    if (filterMode === 'today') {
      setStartDate(todayStr());
      setEndDate(todayStr());
    } else if (filterMode === 'yesterday') {
      setStartDate(yesterdayStr());
      setEndDate(yesterdayStr());
    }
  }, [filterMode]);

  // Employee mapping lookup
  const empMap = useMemo(() => {
    const map = {};
    employees.forEach(e => {
      map[String(e.employee_number || e.id)] = e;
      map[e.full_name] = e;
    });
    return map;
  }, [employees]);

  // Flatten biometric punch logs into discrete punch timestamps (Ektefa Table Spec)
  const flattenedPunches = useMemo(() => {
    const list = [];
    attendanceLogs.forEach(log => {
      // Date filter
      if (log.log_date < startDate || log.log_date > endDate) return;

      const emp = empMap[String(log.employee_number)] || empMap[log.employee_name] || {};
      const branchName = emp.branch_name || emp.branch || 'الفرع الرئيسي';
      const deptName = emp.department_name || 'درة السيارة لقطع الغيار';
      
      // Determine device serial based on branch
      let deviceSource = '.1 EK0201000043';
      if (branchName.includes('إدارة')) deviceSource = '.2 EK0201000044';
      if (branchName.includes('هونداي')) deviceSource = '.3 EK0201000045';
      if (branchName.includes('كيا')) deviceSource = '.2 EK0201000044';

      // Check-in punch
      if (log.check_in) {
        list.push({
          id: `${log.id}_in`,
          logId: log.id,
          employee_name: log.employee_name || emp.full_name || 'موظف',
          employee_number: log.employee_number || emp.employee_number || '1001',
          branch_name: branchName,
          department_name: deptName,
          device_source: deviceSource,
          timestamp_raw: log.check_in,
          timestamp_display: log.check_in.includes('T') ? `${log.check_in.slice(11, 16)} ${log.log_date}` : `${log.check_in} ${log.log_date}`,
          inserted_at: `${log.check_in.includes('T') ? log.check_in.slice(11, 16) : '08:00'} ${log.log_date}`,
          punch_type: 'دخول'
        });
      }

      // Check-out punch
      if (log.check_out) {
        list.push({
          id: `${log.id}_out`,
          logId: log.id,
          employee_name: log.employee_name || emp.full_name || 'موظف',
          employee_number: log.employee_number || emp.employee_number || '1001',
          branch_name: branchName,
          department_name: deptName,
          device_source: deviceSource,
          timestamp_raw: log.check_out,
          timestamp_display: log.check_out.includes('T') ? `${log.check_out.slice(11, 16)} ${log.log_date}` : `${log.check_out} ${log.log_date}`,
          inserted_at: `${log.check_out.includes('T') ? log.check_out.slice(11, 16) : '17:00'} ${log.log_date}`,
          punch_type: 'خروج'
        });
      }
    });

    // Sort descending by timestamp
    return list.sort((a, b) => b.timestamp_raw.localeCompare(a.timestamp_raw));
  }, [attendanceLogs, startDate, endDate, empMap]);

  // Filtered by Search & Branch
  const filteredPunches = useMemo(() => {
    return flattenedPunches.filter(p => {
      const matchSearch = !searchEmployee ||
        p.employee_name.toLowerCase().includes(searchEmployee.toLowerCase()) ||
        p.employee_number.toString().includes(searchEmployee);
      const matchBranch = selectedBranch === 'all' || p.branch_name === selectedBranch;
      return matchSearch && matchBranch;
    });
  }, [flattenedPunches, searchEmployee, selectedBranch]);

  // Branches list
  const branches = useMemo(() => {
    const set = new Set();
    employees.forEach(e => {
      const b = e.branch_name || e.branch;
      if (b) set.add(b);
    });
    return Array.from(set);
  }, [employees]);

  // Export CSV
  const exportCSV = () => {
    if (filteredPunches.length === 0) {
      toast({ title: 'لا توجد بيانات للتصدير' });
      return;
    }
    const headers = ['الموظف', 'الرقم الوظيفي', 'الفرع', 'الإدارة', 'المصدر', 'الطابع الزمني', 'التاريخ المدرج'];
    const rows = filteredPunches.map(p => [
      p.employee_name,
      p.employee_number,
      p.branch_name,
      p.department_name,
      p.device_source,
      p.timestamp_display,
      p.inserted_at
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,﻿' + [headers.join(','), ...rows.map(r => r.map(c => `"${c}"`).join(','))].join('\n');

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `بصمات_الدوام_${startDate}_${endDate}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast({ title: '✓ تم تصدير ملف البصمات بنجاح' });
  };

  const handleDeletePunch = async (punch) => {
    if (!confirm(`هل أنت متأكد من حذف بصمة ${punch.employee_name}?`)) return;
    try {
      await base44.entities.AttendanceLog.delete(punch.logId);
      toast({ title: '✓ تم حذف البصمة بنجاح' });
      loadData();
    } catch (e) {
      toast({ title: 'خطأ في الحذف', description: e.message, variant: 'destructive' });
    }
  };

  return (
    <div className="space-y-5" dir="rtl" style={{ direction: 'rtl', textAlign: 'right' }}>
      
      {/* ─── 1. TOP HEADER & TITLE (EKTEFA EXACT SPEC) ──────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-heading font-black text-foreground flex items-center gap-2">
            <Fingerprint className="w-6 h-6 text-sky-600" />
            إدارة البصمات
          </h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            مركز تدقيق ومراقبة حركات الدخول والخروج من أجهزة البصمة المربوطة سحابياً
          </p>
        </div>

        {/* Time Filters Bar (اليوم • الأمس • الفترة الزمنية) */}
        <div className="flex items-center gap-1.5 bg-white dark:bg-slate-900 border border-border/80 p-1.5 rounded-2xl shadow-sm">
          <Button
            size="sm"
            variant={filterMode === 'today' ? 'default' : 'ghost'}
            onClick={() => setFilterMode('today')}
            className={`rounded-xl text-xs font-bold h-8 px-4 ${
              filterMode === 'today' ? 'bg-sky-500 text-white shadow-sm' : 'text-muted-foreground'
            }`}
          >
            اليوم
          </Button>

          <Button
            size="sm"
            variant={filterMode === 'yesterday' ? 'default' : 'ghost'}
            onClick={() => setFilterMode('yesterday')}
            className={`rounded-xl text-xs font-bold h-8 px-4 ${
              filterMode === 'yesterday' ? 'bg-sky-500 text-white shadow-sm' : 'text-muted-foreground'
            }`}
          >
            الأمس
          </Button>

          <Button
            size="sm"
            variant={filterMode === 'range' ? 'default' : 'ghost'}
            onClick={() => setFilterMode('range')}
            className={`rounded-xl text-xs font-bold h-8 px-4 ${
              filterMode === 'range' ? 'bg-sky-500 text-white shadow-sm' : 'text-muted-foreground'
            }`}
          >
            الفترة الزمنية
          </Button>
        </div>
      </div>

      {/* Date Range Inputs if 'range' is selected */}
      {filterMode === 'range' && (
        <Card className="p-4 rounded-2xl border bg-white dark:bg-slate-900 shadow-sm flex flex-wrap items-center gap-4 text-xs">
          <div className="flex items-center gap-2">
            <span className="font-bold text-muted-foreground">من تاريخ:</span>
            <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="rounded-xl h-8 font-mono" />
          </div>
          <div className="flex items-center gap-2">
            <span className="font-bold text-muted-foreground">إلى تاريخ:</span>
            <Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="rounded-xl h-8 font-mono" />
          </div>
        </Card>
      )}

      {/* ─── 2. SEARCH & ACTION TOOLBAR (EKTEFA SPEC) ──────────────────────── */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-white dark:bg-slate-900 p-3 rounded-2xl border shadow-sm">
        
        {/* Left Action: Export Data */}
        <Button
          onClick={exportCSV}
          variant="outline"
          className="rounded-xl text-xs font-bold gap-2 h-9 border-border/80 hover:bg-slate-50"
        >
          <Download className="w-4 h-4 text-sky-600" />
          <span>تصدير البيانات</span>
        </Button>

        {/* Right Search Input & Filters */}
        <div className="flex items-center gap-2 w-full sm:w-auto">
          
          {/* Branch Filter */}
          <Select value={selectedBranch} onValueChange={setSelectedBranch}>
            <SelectTrigger className="w-44 rounded-xl text-xs h-9 bg-background">
              <SelectValue placeholder="كافة الفروع" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">كافة الفروع والأقسام</SelectItem>
              {branches.map(b => (
                <SelectItem key={b} value={b}>{b}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Employee Search with Cyan Blue Button */}
          <div className="relative flex items-center">
            <Input
              value={searchEmployee}
              onChange={(e) => setSearchEmployee(e.target.value)}
              placeholder="اسم الموظف أو رقمه..."
              className="rounded-xl text-xs h-9 pe-9 ps-3 w-56 bg-background"
            />
            <div className="absolute end-1 w-7 h-7 bg-sky-500 text-white rounded-lg flex items-center justify-center cursor-pointer shadow-sm">
              <Search className="w-3.5 h-3.5" />
            </div>
          </div>

        </div>

      </div>

      {/* ─── 3. BIOMETRICS LOG TABLE (CYAN HEADER - EKTEFA EXACT SPEC) ──────── */}
      <Card className="rounded-3xl border shadow-md overflow-hidden bg-white dark:bg-slate-900">
        <div className="overflow-x-auto">
          <table className="w-full text-right text-xs" style={{ direction: 'rtl' }}>
            <thead>
              <tr className="bg-sky-600 text-white font-heading font-black border-b border-sky-700">
                <th className="py-3 px-3 w-10 text-center">
                  <input
                    type="checkbox"
                    className="rounded text-sky-600 cursor-pointer"
                    onChange={(e) => {
                      if (e.target.checked) setSelectedRows(filteredPunches.map(p => p.id));
                      else setSelectedRows([]);
                    }}
                    checked={selectedRows.length > 0 && selectedRows.length === filteredPunches.length}
                  />
                </th>
                <th className="py-3 px-4">الموظف</th>
                <th className="py-3 px-3">الفرع</th>
                <th className="py-3 px-3">الإدارة</th>
                <th className="py-3 px-3">المصدر</th>
                <th className="py-3 px-3">الطابع الزمني</th>
                <th className="py-3 px-3">التاريخ المدرج</th>
                <th className="py-3 px-4 text-center">الخيارات</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60">
              {loading ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-muted-foreground animate-pulse font-bold">
                    جاري سحب وتدقيق بصمات الأجهزة السحابية...
                  </td>
                </tr>
              ) : filteredPunches.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-muted-foreground font-bold">
                    لا توجد بصمات مسجلة في التاريخ المحدد ({startDate}).
                  </td>
                </tr>
              ) : (
                filteredPunches.map((punch, idx) => (
                  <tr
                    key={punch.id || idx}
                    className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors"
                  >
                    {/* Checkbox */}
                    <td className="py-3 px-3 text-center">
                      <input
                        type="checkbox"
                        checked={selectedRows.includes(punch.id)}
                        onChange={(e) => {
                          if (e.target.checked) setSelectedRows(prev => [...prev, punch.id]);
                          else setSelectedRows(prev => prev.filter(i => i !== punch.id));
                        }}
                        className="rounded text-sky-600 cursor-pointer"
                      />
                    </td>

                    {/* Employee Name & Number */}
                    <td className="py-3 px-4">
                      <div className="font-bold text-foreground text-xs">{punch.employee_name}</div>
                      <div className="font-mono text-[10px] text-muted-foreground mt-0.5">
                        {punch.employee_number}
                      </div>
                    </td>

                    {/* Branch */}
                    <td className="py-3 px-3 text-foreground font-medium">{punch.branch_name}</td>

                    {/* Department */}
                    <td className="py-3 px-3 text-muted-foreground">{punch.department_name}</td>

                    {/* Device Source */}
                    <td className="py-3 px-3">
                      <span className="inline-block bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-mono text-[11px] px-2 py-0.5 rounded-md font-bold">
                        {punch.device_source}
                      </span>
                    </td>

                    {/* Timestamp */}
                    <td className="py-3 px-3 font-mono font-bold text-slate-900 dark:text-slate-100 text-xs">
                      {punch.timestamp_display}
                    </td>

                    {/* Inserted At */}
                    <td className="py-3 px-3 font-mono text-muted-foreground text-xs">
                      {punch.inserted_at}
                    </td>

                    {/* Options / Actions (Red Trash Can) */}
                    <td className="py-3 px-4 text-center">
                      <div className="flex items-center justify-center gap-1.5">
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => handleDeletePunch(punch)}
                          className="h-7 w-7 text-rose-500 hover:text-rose-700 hover:bg-rose-50 rounded-lg"
                          title="حذف البصمة"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>

    </div>
  );
}
