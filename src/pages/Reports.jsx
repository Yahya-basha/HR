import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useAuth } from '@/lib/AuthContext';
import { useI18n } from '@/lib/i18n';
import { CheckCircle2, Clock, XCircle, TrendingUp, Award, UserSearch, BarChart3, Users } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import EmployeeReportCard from '@/components/EmployeeReportCard';

export default function Reports() {
  const { user } = useAuth();
  const { t, lang } = useI18n();
  const [logs, setLogs] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [trackEmp, setTrackEmp] = useState('');
  const [from, setFrom] = useState('2026-08-01');
  const [to, setTo] = useState('2026-08-31');
  const [shifts, setShifts] = useState([]);

  useEffect(() => {
    (async () => {
      try {
        const [recent, emps, shfs] = await Promise.all([
          base44.entities.AttendanceLog.list('-log_date', 800),
          base44.entities.Employee.list(),
          base44.entities.Shift.list(),
        ]);
        setLogs(recent || []);
        setEmployees(emps || []);
        setShifts(shfs || []);

        if (emps && emps.length > 0) {
          const defaultEmp = emps.find(e => e.employee_number === '1002') || emps[0];
          setTrackEmp(defaultEmp.id);
        }
      } catch (e) {
        console.error('Reports load error:', e);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const selectedEmp = employees.find(e => e.id === trackEmp || e.employee_number === trackEmp);

  if (loading) {
    return (
      <div className="space-y-6" dir="rtl">
        <div className="p-8 text-center bg-white dark:bg-slate-900 rounded-3xl border border-border/60 shadow-sm space-y-3">
          <div className="w-10 h-10 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
          <p className="text-sm font-bold text-muted-foreground">جاري تحميل تقارير الحضور وسجلات الدوام...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6" dir="rtl">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 flex items-center justify-center font-bold shadow-sm">
            <BarChart3 className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-2xl font-heading font-extrabold text-foreground">تقارير الحضور وسجلات دوام الموظفين</h1>
            <p className="text-xs text-muted-foreground mt-0.5">متابعة دقيقة لحركات الفترتين الصباحية والمسائية وبصمات الجمعة</p>
          </div>
        </div>
      </div>

      {/* Filter Bar */}
      <Card className="p-4 border-border/60 shadow-sm rounded-2xl bg-white dark:bg-slate-900">
        <div className="flex flex-wrap items-center justify-between gap-4">
          
          {/* Employee Selector */}
          <div className="flex items-center gap-2 flex-1 min-w-[240px]">
            <Users className="w-4 h-4 text-emerald-600 shrink-0" />
            <div className="flex-1">
              <Select value={trackEmp} onValueChange={setTrackEmp}>
                <SelectTrigger className="h-10 text-xs font-bold bg-secondary/30 rounded-xl">
                  <SelectValue placeholder="اختر الموظف لعرض تقريره" />
                </SelectTrigger>
                <SelectContent className="text-xs">
                  {employees.map((e) => (
                    <SelectItem key={e.id} value={e.id}>
                      #{e.employee_number} • {e.full_name} ({e.branch_name || 'فرع كيا'})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Date Range */}
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-muted-foreground">من:</span>
            <Input 
              type="date" 
              value={from} 
              onChange={(e) => setFrom(e.target.value)} 
              className="h-10 text-xs font-mono w-[140px] rounded-xl"
            />
            <span className="text-xs font-bold text-muted-foreground">إلى:</span>
            <Input 
              type="date" 
              value={to} 
              onChange={(e) => setTo(e.target.value)} 
              className="h-10 text-xs font-mono w-[140px] rounded-xl"
            />
          </div>

        </div>
      </Card>

      {/* Detailed Employee Report Card */}
      {selectedEmp && (
        <EmployeeReportCard 
          empId={selectedEmp.id}
          from={from}
          to={to}
          logs={logs}
          employees={employees}
          shifts={shifts}
        />
      )}

    </div>
  );
}
