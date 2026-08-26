import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Timer, Plus, Clock, Users, Coffee, Edit, Trash2, Sun, Moon, Sparkles, DollarSign } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import ShiftForm from '@/components/ShiftForm';
import { useToast } from '@/components/ui/use-toast';

const initialShifts = [
  {
    "id": "sh_non_saudi_overtime",
    "name": "فترة عمل غير سعودي (9 ساعات + إضافي 100 ريال)",
    "type": "multi",
    "morning_start": "09:00",
    "morning_end": "13:00",
    "break_start": "13:00",
    "break_end": "16:00",
    "evening_start": "16:00",
    "evening_end": "21:00",
    "start_time": "09:00",
    "end_time": "21:00",
    "working_hours": 9,
    "total_hours": 9,
    "has_overtime": true,
    "overtime_hours": 1,
    "overtime_daily_rate": 100,
    "grace_minutes": 15,
    "description": "دوام فترتين مخصص (يحيى باشا): 9:00 ص إلى 1:00 م & 4:00 ع إلى 9:00 م (ساعة إضافية يومية = 100 ريال)"
  },
  {
    "id": "sh_non_saudi",
    "name": "فترة عمل غير سعودي (الأساسي 8 ساعات)",
    "type": "multi",
    "morning_start": "08:00",
    "morning_end": "12:00",
    "break_start": "12:00",
    "break_end": "16:00",
    "evening_start": "16:00",
    "evening_end": "20:00",
    "start_time": "08:00",
    "end_time": "20:00",
    "working_hours": 8,
    "total_hours": 8,
    "has_overtime": false,
    "grace_minutes": 15,
    "description": "دوام فترتين أساسي: 8:00 ص إلى 12:00 م & 4:00 ع إلى 8:00 م مع استراحة 4 ساعات"
  },
  {
    "id": "sh_saudi_morning",
    "name": "فترة عمل سعودي صباحي",
    "type": "morning",
    "start_time": "08:00",
    "end_time": "13:00",
    "working_hours": 5,
    "total_hours": 5,
    "grace_minutes": 15,
    "description": "دوام صباحي 5 ساعات للكوادر الوطنية"
  },
  {
    "id": "sh_saudi_evening",
    "name": "فترة عمل سعودي مسائي",
    "type": "evening",
    "start_time": "15:30",
    "end_time": "21:30",
    "working_hours": 6,
    "total_hours": 6,
    "grace_minutes": 15,
    "description": "دوام مسائي للكوادر الوطنية (مثل عزام السعوي 1015)"
  },
  {
    "id": "sh_gm",
    "name": "شفت المدير العام",
    "type": "flexible",
    "start_time": "09:00",
    "end_time": "17:00",
    "working_hours": 8,
    "total_hours": 8,
    "grace_minutes": 0,
    "description": "دوام الإدارة العامة حضور وانصراف مرن"
  },
  {
    "id": "sh_ramadan",
    "name": "شفت رمضان",
    "type": "ramadan",
    "start_time": "20:30",
    "end_time": "02:00",
    "working_hours": 5.5,
    "total_hours": 5.5,
    "grace_minutes": 20,
    "description": "دوام شهر رمضان المبارك المسائي"
  }
];

export default function Shifts() {
  const { toast } = useToast();
  const [shifts, setShifts] = useState(initialShifts);
  const [employees, setEmployees] = useState([]);
  const [formOpen, setFormOpen] = useState(false);
  const [selectedShift, setSelectedShift] = useState(null);

  const loadData = async () => {
    try {
      const [sList, eList] = await Promise.all([
        base44.entities.Shift.list(),
        base44.entities.Employee.list()
      ]);
      if (sList && sList.length > 0) {
        const merged = [...initialShifts];
        sList.forEach(s => {
          if (!merged.find(m => m.name === s.name)) merged.push(s);
        });
        setShifts(merged);
      } else {
        setShifts(initialShifts);
      }
      setEmployees(eList || []);
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const getEmployeeCount = (shiftName) => {
    return employees.filter(e => e.shift === shiftName || (shiftName?.includes('غير سعودي') && e.shift?.includes('غير سعودي'))).length;
  };

  const handleEdit = (shift) => {
    setSelectedShift(shift);
    setFormOpen(true);
  };

  const handleAdd = () => {
    setSelectedShift(null);
    setFormOpen(true);
  };

  const handleDelete = async (id, name) => {
    if (!confirm(`هل أنت متأكد من حذف وردية "${name}"؟`)) return;
    try {
      await base44.entities.Shift.delete(id);
      setShifts(prev => prev.filter(s => s.id !== id));
      toast({ title: 'تم حذف الوردية بنجاح' });
    } catch (e) {
      toast({ title: 'حدث خطأ أثناء الحذف', variant: 'destructive' });
    }
  };

  return (
    <div className="space-y-6" dir="rtl">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 flex items-center justify-center font-bold shadow-sm">
            <Timer className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-2xl font-heading font-extrabold text-foreground">ورديات العمل وفترات الدوام</h1>
            <p className="text-xs text-muted-foreground mt-0.5">تحديد مواعيد الفترات الصباحية والمسائية والبريك وبدل العمل الإضافي</p>
          </div>
        </div>

        <Button onClick={handleAdd} className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl shadow-md gap-2 text-xs">
          <Plus className="w-4 h-4" /> إضافة وردية جديدة
        </Button>
      </div>

      {/* Grid of Shifts */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {shifts.map((s) => {
          const empCount = getEmployeeCount(s.name);
          const isSplit = s.type === 'multi';

          return (
            <Card key={s.id} className="p-5 border-border/60 shadow-sm rounded-2xl bg-white dark:bg-slate-900 flex flex-col justify-between space-y-4 hover:shadow-md transition-shadow">
              <div>
                <div className="flex items-start justify-between">
                  <div className="min-w-0">
                    <h3 className="font-heading font-bold text-sm text-foreground truncate">{s.name}</h3>
                    <div className="flex items-center gap-1.5 mt-1">
                      <Badge variant="outline" className="text-[10px] bg-emerald-50 text-emerald-800 border-emerald-200">
                        {isSplit ? 'دوام فترتين' : s.type === 'morning' ? 'دوام صباحي' : s.type === 'evening' ? 'دوام مسائي' : s.type === 'ramadan' ? 'شفت رمضان' : 'دوام مرن'}
                      </Badge>
                      {s.has_overtime && (
                        <Badge className="bg-amber-500 text-white text-[10px] font-bold">
                          ⭐ +100 ريال إضافي
                        </Badge>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-1 text-muted-foreground shrink-0">
                    <button onClick={() => handleEdit(s)} className="p-1 hover:text-primary"><Edit className="w-4 h-4" /></button>
                    <button onClick={() => handleDelete(s.id, s.name)} className="p-1 hover:text-destructive"><Trash2 className="w-4 h-4" /></button>
                  </div>
                </div>

                {/* Structured Timetable Breakdown */}
                {isSplit ? (
                  <div className="mt-3.5 p-3 rounded-xl bg-secondary/40 space-y-2 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground flex items-center gap-1">
                        <Sun className="w-3.5 h-3.5 text-amber-500" />
                        <span>الفترة الصباحية:</span>
                      </span>
                      <span className="font-mono font-bold text-foreground" dir="ltr">{s.morning_start || s.start_time} - {s.morning_end || s.break_start || '12:00'}</span>
                    </div>

                    <div className="flex items-center justify-between text-amber-800 dark:text-amber-300">
                      <span className="flex items-center gap-1">
                        <Coffee className="w-3.5 h-3.5 text-amber-600" />
                        <span>فترة الاستراحة (البريك):</span>
                      </span>
                      <span className="font-mono font-semibold" dir="ltr">{s.break_start || '12:00'} - {s.break_end || '16:00'}</span>
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground flex items-center gap-1">
                        <Moon className="w-3.5 h-3.5 text-indigo-500" />
                        <span>الفترة المسائية:</span>
                      </span>
                      <span className="font-mono font-bold text-foreground" dir="ltr">{s.evening_start || s.break_end || '16:00'} - {s.evening_end || s.end_time}</span>
                    </div>

                    <div className="pt-2 border-t border-border/40 flex items-center justify-between">
                      <span className="text-muted-foreground">ساعات العمل الأساسية:</span>
                      <span className="font-bold text-emerald-600">{s.working_hours} ساعات</span>
                    </div>

                    {s.has_overtime && (
                      <div className="flex items-center justify-between text-amber-700 dark:text-amber-400 font-bold">
                        <span>بدل الإضافي اليومي:</span>
                        <span>{s.overtime_daily_rate || 100} ريال / يوم</span>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="mt-3.5 p-3 rounded-xl bg-secondary/40 space-y-2 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">الفترة الزمنية:</span>
                      <span className="font-mono font-bold text-foreground" dir="ltr">{s.start_time} - {s.end_time}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">ساعات العمل:</span>
                      <span className="font-bold text-primary">{s.working_hours} ساعات</span>
                    </div>
                  </div>
                )}

                {s.description && (
                  <p className="text-[11px] text-muted-foreground mt-2 line-clamp-2">{s.description}</p>
                )}
              </div>

              <div className="pt-3 border-t border-border/40 flex items-center justify-between text-xs">
                <span className="text-muted-foreground">الموظفون المخصصون:</span>
                <span className="font-bold font-mono text-xs px-2.5 py-0.5 rounded-lg bg-emerald-500/10 text-emerald-700">
                  {empCount} موظف
                </span>
              </div>
            </Card>
          );
        })}
      </div>

      <ShiftForm 
        open={formOpen} 
        onOpenChange={setFormOpen} 
        shift={selectedShift} 
        onSaved={loadData} 
      />
    </div>
  );
}
