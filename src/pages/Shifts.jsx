import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Timer, Plus, Clock, Users, Coffee, Edit, Trash2 } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import ShiftForm from '@/components/ShiftForm';
import { useToast } from '@/components/ui/use-toast';

const initialShifts = [
  {
    "id": "sh_non_saudi",
    "name": "فترة عمل غير سعودي",
    "type": "multi",
    "start_time": "08:00",
    "end_time": "20:00",
    "break_start": "12:00",
    "break_end": "16:00",
    "working_hours": 8,
    "total_hours": 12,
    "grace_minutes": 15,
    "description": "دوام فترتين صباحية ومسائية مع استراحة من 12:00 إلى 16:00"
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
    "start_time": "16:00",
    "end_time": "21:00",
    "working_hours": 5,
    "total_hours": 5,
    "grace_minutes": 15,
    "description": "دوام مسائي 5 ساعات للكوادر الوطنية"
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
    "id": "sh_flexible",
    "name": "شفت مرن",
    "type": "flexible",
    "start_time": "08:00",
    "end_time": "16:00",
    "working_hours": 8,
    "total_hours": 8,
    "grace_minutes": 15,
    "description": "دوام 8 ساعات بفترة مرنة"
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
        // Merge with initialShifts to ensure none are missing
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
    return employees.filter(e => e.shift === shiftName).length;
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
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-amber-100 text-amber-900 flex items-center justify-center font-bold">
            <Timer className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-2xl font-heading font-bold text-foreground">ورديات العمل وفترات الدوام</h1>
            <p className="text-xs text-muted-foreground mt-0.5">تحديد أنواع الورديات وتوزيع الموظفين وساعات العمل الرسمية</p>
          </div>
        </div>

        <Button onClick={handleAdd} className="bg-[#2D164D] hover:bg-[#1E1035] text-white font-bold rounded-xl shadow-sm">
          <Plus className="w-4 h-4 me-2" /> إضافة وردية جديدة
        </Button>
      </div>

      {/* Grid of 6 Official Shifts */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {shifts.map((s) => {
          const empCount = getEmployeeCount(s.name);
          return (
            <Card key={s.id} className="p-6 border-border/60 shadow-sm rounded-2xl bg-white flex flex-col justify-between space-y-4 hover:shadow-md transition-shadow">
              <div>
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="font-heading font-bold text-base text-foreground">{s.name}</h3>
                    <Badge variant="outline" className="mt-1 text-[11px] bg-amber-50 text-amber-800 border-amber-200">
                      {s.type === 'multi' ? 'دوام فترتين' : s.type === 'morning' ? 'دوام صباحي' : s.type === 'evening' ? 'دوام مسائي' : s.type === 'ramadan' ? 'شفت رمضان' : 'دوام مرن'}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-1.5 text-muted-foreground">
                    <button onClick={() => handleEdit(s)} className="p-1 hover:text-primary"><Edit className="w-4 h-4" /></button>
                    <button onClick={() => handleDelete(s.id, s.name)} className="p-1 hover:text-destructive"><Trash2 className="w-4 h-4" /></button>
                  </div>
                </div>

                <div className="mt-4 p-3.5 rounded-xl bg-secondary/30 space-y-2 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">الفترة الزمنية:</span>
                    <span className="font-mono font-bold text-foreground">{s.start_time} - {s.end_time}</span>
                  </div>
                  {s.break_start && s.break_end && (
                    <div className="flex items-center justify-between text-amber-800">
                      <span>فترة الاستراحة:</span>
                      <span className="font-mono font-semibold">{s.break_start} - {s.break_end}</span>
                    </div>
                  )}
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">ساعات العمل الصافية:</span>
                    <span className="font-bold text-primary">{s.working_hours} ساعات</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">فترة السماح:</span>
                    <span className="font-bold text-emerald-600">{s.grace_minutes || 15} دقيقة</span>
                  </div>
                </div>

                {s.description && (
                  <p className="text-xs text-muted-foreground mt-2">{s.description}</p>
                )}
              </div>

              <div className="pt-3 border-t border-border/40 flex items-center justify-between text-xs">
                <span className="text-muted-foreground">الموظفون المخصصون:</span>
                <span className="font-bold font-mono text-sm px-2.5 py-0.5 rounded-lg bg-primary/10 text-primary">
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
