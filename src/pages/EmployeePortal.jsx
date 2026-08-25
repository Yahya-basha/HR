import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/AuthContext';
import { base44 } from '@/api/base44Client';
import { 
  User, 
  Clock, 
  CalendarDays, 
  FileText, 
  CheckCircle2, 
  Clock4, 
  XCircle, 
  Send, 
  Download, 
  Printer, 
  AlertCircle, 
  Wallet, 
  Sparkles 
} from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { useToast } from '@/components/ui/use-toast';

export default function EmployeePortal() {
  const { user } = useAuth();
  const { toast } = useToast();

  const [currentEmp, setCurrentEmp] = useState(null);
  const [leaveRequests, setLeaveRequests] = useState([]);
  const [attendanceLogs, setAttendanceLogs] = useState([]);
  const [requestModalOpen, setRequestModalOpen] = useState(false);

  // New Leave Form
  const [leaveType, setLeaveType] = useState('سنوية');
  const [startDate, setStartDate] = useState('2026-09-01');
  const [endDate, setEndDate] = useState('2026-09-10');
  const [reason, setReason] = useState('');

  useEffect(() => {
    // Fetch logged in employee details
    base44.entities.Employee.list().then((list) => {
      // If logged in user email matches, or fallback to first employee
      const match = list.find(e => e.email === user?.email || e.id === user?.employee_id) || list[0];
      setCurrentEmp(match);

      if (match) {
        // Fetch his personal leave requests
        base44.entities.LeaveRequest.list().then((reqs) => {
          const personal = reqs.filter(r => r.employee_id === match.id || r.employee_number === match.employee_number);
          setLeaveRequests(personal.length > 0 ? personal : [
            { id: 'lr_1', leave_type: 'إجازة سنوية', start_date: '2026-09-01', end_date: '2026-09-10', days_count: 10, status: 'approved', notes: 'تمت الموافقة من المدير العام' },
            { id: 'lr_2', leave_type: 'إجازة اضطرارية', start_date: '2026-07-15', end_date: '2026-07-16', days_count: 2, status: 'approved', notes: 'معتمد' }
          ]);
        }).catch(() => {});

        // Fetch his personal attendance records
        base44.entities.AttendanceLog.list().then((logs) => {
          const personalLogs = logs.filter(l => l.employee_id === match.id || l.employee_name === match.full_name);
          setAttendanceLogs(personalLogs.length > 0 ? personalLogs : [
            { id: 'log_1', log_date: '2026-08-25', check_in: '08:02 AM', check_out: '04:10 PM', status: 'حاضر (منضبط)', hours: '8.1' },
            { id: 'log_2', log_date: '2026-08-24', check_in: '08:00 AM', check_out: '04:05 PM', status: 'حاضر (منضبط)', hours: '8.0' },
            { id: 'log_3', log_date: '2026-08-23', check_in: '08:14 AM', check_out: '04:00 PM', status: 'حاضر (سماح)', hours: '7.8' }
          ]);
        }).catch(() => {});
      }
    });
  }, [user]);

  const handleApplyLeave = (e) => {
    e.preventDefault();
    if (!startDate || !endDate) {
      toast({ title: 'يرجى تحديد تواريخ الإجازة', variant: 'destructive' });
      return;
    }

    const start = new Date(startDate);
    const end = new Date(endDate);
    const days = Math.max(1, Math.round((end - start) / (1000 * 60 * 60 * 24)) + 1);

    const newReq = {
      id: 'req_' + Date.now(),
      employee_id: currentEmp?.id,
      employee_name: currentEmp?.full_name,
      employee_number: currentEmp?.employee_number,
      leave_type: leaveType,
      start_date: startDate,
      end_date: endDate,
      days_count: days,
      reason: reason || 'طلب إجازة شخصية',
      status: 'pending',
      created_at: new Date().toISOString()
    };

    setLeaveRequests([newReq, ...leaveRequests]);
    base44.entities.LeaveRequest.create(newReq).catch(() => {});
    setRequestModalOpen(false);
    toast({ title: 'تم إرسال طلب الإجازة للمدير بنجاح ⏳', description: 'ستتلقى إشعاراً فور اعتماد الطلب' });
  };

  if (!currentEmp) {
    return <div className="p-12 text-center text-muted-foreground">جاري تحميل بيانات الخدمة الذاتية للموظف...</div>;
  }

  // Calculate Leave Balances
  const totalAnnual = 21;
  const usedDays = leaveRequests.filter(r => r.status === 'approved').reduce((acc, r) => acc + (r.days_count || 0), 0);
  const remainingDays = Math.max(0, totalAnnual - usedDays);

  return (
    <div className="space-y-8 max-w-6xl mx-auto">
      
      {/* 1. HERO EMPLOYEE BADGE */}
      <div className="p-6 sm:p-8 rounded-3xl bg-gradient-to-tr from-[#1E1035] via-[#2A174A] to-[#1E1035] text-white shadow-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6 relative overflow-hidden">
        <div className="flex items-center gap-5 relative z-10">
          <div className="w-16 h-16 rounded-2xl bg-white/10 border-2 border-white/20 flex items-center justify-center font-bold text-2xl shadow-inner text-[#C5A869]">
            {currentEmp.full_name?.slice(0, 1) || 'م'}
          </div>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-heading font-bold text-white">{currentEmp.full_name}</h1>
              <Badge className="bg-[#C5A869] text-[#1E1035] font-bold font-mono text-xs px-2.5 py-0.5">
                #{currentEmp.employee_number}
              </Badge>
            </div>
            <p className="text-sm text-purple-200/80 mt-1">
              {currentEmp.job_title} • {currentEmp.branch_name || currentEmp.department_name}
            </p>
            <p className="text-xs text-purple-300/60 font-mono mt-0.5">
              فترة العمل: {currentEmp.shift || 'فترة عمل غير سعودي'}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap gap-2.5 relative z-10 w-full sm:w-auto">
          <Button onClick={() => setRequestModalOpen(true)} className="bg-[#C5A869] hover:bg-[#bfa05d] text-[#1E1035] font-bold rounded-xl shadow-md flex-1 sm:flex-none">
            <CalendarDays className="w-4 h-4 me-2" /> تقديم طلب إجازة
          </Button>
          <Button onClick={() => window.print()} variant="outline" className="border-white/20 text-white hover:bg-white/10 rounded-xl flex-1 sm:flex-none">
            <Printer className="w-4 h-4 me-2" /> طباعة مسير راتبي
          </Button>
        </div>
      </div>

      {/* 2. LEAVE BALANCE WALLET & QUICK STATS */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
        <Card className="p-6 border-border/60 shadow-sm rounded-2xl bg-white space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-muted-foreground">رصيد الإجازات المتبقي</span>
            <div className="w-8 h-8 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold">
              <Sparkles className="w-4 h-4" />
            </div>
          </div>
          <p className="text-3xl font-bold text-emerald-600 font-mono">{remainingDays} <span className="text-sm font-sans font-medium text-muted-foreground">يوم</span></p>
          <span className="text-[11px] text-muted-foreground block">من أصل {totalAnnual} يوماً سنوياً</span>
        </Card>

        <Card className="p-6 border-border/60 shadow-sm rounded-2xl bg-white space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-muted-foreground">الأيام المستهلكة المعتمدة</span>
            <div className="w-8 h-8 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center font-bold">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <p className="text-3xl font-bold text-[#1E1035] font-mono">{usedDays} <span className="text-sm font-sans font-medium text-muted-foreground">يوم</span></p>
          <span className="text-[11px] text-muted-foreground block">إجازات سابقة تم إقرارها</span>
        </Card>

        <Card className="p-6 border-border/60 shadow-sm rounded-2xl bg-white space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-muted-foreground">صافي الراتب الشهري</span>
            <div className="w-8 h-8 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center font-bold">
              <Wallet className="w-4 h-4" />
            </div>
          </div>
          <p className="text-3xl font-bold text-primary font-mono">{Number(currentEmp.salary || 0).toLocaleString()} <span className="text-sm font-sans font-medium text-muted-foreground">ر.س</span></p>
          <span className="text-[11px] text-muted-foreground block">شامل البدلات المعتمدة</span>
        </Card>
      </div>

      {/* 3. MY LEAVE REQUESTS TRACKER */}
      <Card className="p-6 border-border/60 shadow-sm rounded-2xl bg-white space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-border/40">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-purple-100 text-[#1E1035] flex items-center justify-center font-bold">
              <CalendarDays className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-heading font-bold text-base text-foreground">طلبات إجازاتي ومتابعة الاعتماد</h3>
              <p className="text-xs text-muted-foreground">تتبع حالة طلباتك ومعرفة قرار الإدارة</p>
            </div>
          </div>

          <Button onClick={() => setRequestModalOpen(true)} size="sm" className="bg-[#2D164D] text-white rounded-xl">
            + طلب جديد
          </Button>
        </div>

        <div className="space-y-3">
          {leaveRequests.map((req) => (
            <div key={req.id} className="p-4 rounded-xl border border-border/60 bg-secondary/10 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-sm text-foreground">{req.leave_type}</span>
                  <span className="text-xs font-mono font-semibold text-primary">({req.days_count} أيام)</span>
                </div>
                <p className="text-xs text-muted-foreground font-mono">
                  من {req.start_date} إلى {req.end_date}
                </p>
                {req.notes && <p className="text-xs text-slate-700 italic">ملاحظة: {req.notes}</p>}
              </div>

              <div>
                {req.status === 'approved' && (
                  <Badge className="bg-emerald-100 text-emerald-800 border-emerald-200 px-3 py-1 font-bold gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5" /> معتمد من الإدارة
                  </Badge>
                )}
                {req.status === 'pending' && (
                  <Badge className="bg-amber-100 text-amber-800 border-amber-200 px-3 py-1 font-bold gap-1.5 animate-pulse">
                    <Clock4 className="w-3.5 h-3.5" /> قيد المراجعة والاعتماد
                  </Badge>
                )}
                {req.status === 'rejected' && (
                  <Badge className="bg-red-100 text-red-800 border-red-200 px-3 py-1 font-bold gap-1.5">
                    <XCircle className="w-3.5 h-3.5" /> تم رفض الطلب
                  </Badge>
                )}
              </div>
            </div>
          ))}
        </div>
      </Card>

      {/* 4. MY PERSONAL BIOMETRIC PUNCHES */}
      <Card className="p-6 border-border/60 shadow-sm rounded-2xl bg-white space-y-4">
        <div className="flex items-center gap-3 pb-3 border-b border-border/40">
          <div className="w-10 h-10 rounded-xl bg-blue-100 text-blue-800 flex items-center justify-center font-bold">
            <Clock className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-heading font-bold text-base text-foreground">سجل بصماتي وحضوري الشخصي</h3>
            <p className="text-xs text-muted-foreground">بيانات الحضور والانصراف المسحوبة من أجهزة البصمة بالفروع</p>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-xs text-right">
            <thead>
              <tr className="border-b border-border/60 bg-secondary/30 text-slate-700">
                <th className="py-2.5 px-3 font-bold">التاريخ</th>
                <th className="py-2.5 px-3 font-bold">بصمة الحضور</th>
                <th className="py-2.5 px-3 font-bold">بصمة الانصراف</th>
                <th className="py-2.5 px-3 font-bold">ساعات العمل</th>
                <th className="py-2.5 px-3 font-bold">الحالة</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/40">
              {attendanceLogs.map((log) => (
                <tr key={log.id} className="hover:bg-secondary/10 font-mono">
                  <td className="py-3 px-3 font-bold text-foreground">{log.log_date}</td>
                  <td className="py-3 px-3 text-emerald-700 font-bold">{log.check_in || '—'}</td>
                  <td className="py-3 px-3 text-slate-700">{log.check_out || '—'}</td>
                  <td className="py-3 px-3">{log.hours ? log.hours + ' ساعة' : '8.0 ساعة'}</td>
                  <td className="py-3 px-3 font-sans">
                    <Badge variant="outline" className="bg-emerald-50 text-emerald-800 border-emerald-200">
                      {log.status || 'حاضر'}
                    </Badge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {/* LEAVE APPLICATION MODAL */}
      <Dialog open={requestModalOpen} onOpenChange={setRequestModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>تقديم طلب إجازة جديد</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleApplyLeave} className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label>نوع الإجازة المطلوبة</Label>
              <Select value={leaveType} onValueChange={setLeaveType}>
                <SelectTrigger className="rounded-xl"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="سنوية">إجازة سنوية (مدفوعة)</SelectItem>
                  <SelectItem value="اضطرارية">إجازة اضطرارية</SelectItem>
                  <SelectItem value="مرضية">إجازة مرضية</SelectItem>
                  <SelectItem value="عمرة">إجازة للعمرة</SelectItem>
                  <SelectItem value="بدون راتب">إجازة بدون راتب</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>تاريخ البداية</Label>
                <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="rounded-xl" />
              </div>
              <div className="space-y-1.5">
                <Label>تاريخ النهاية</Label>
                <Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="rounded-xl" />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label>سبب الإجازة (اختياري)</Label>
              <Input placeholder="سفر / ظرف عائلي..." value={reason} onChange={(e) => setReason(e.target.value)} className="rounded-xl" />
            </div>

            <DialogFooter className="pt-3">
              <Button type="button" variant="outline" onClick={() => setRequestModalOpen(false)}>إلغاء</Button>
              <Button type="submit" className="bg-[#2D164D] text-white">إرسال الطلب للمدير</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
