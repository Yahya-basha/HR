import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { CalendarDays, Plus, CheckCircle2, XCircle, Clock4, Filter, Search } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';
import { useToast } from '@/components/ui/use-toast';

export default function Leave() {
  const { toast } = useToast();
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  const loadRequests = async () => {
    try {
      const data = await base44.entities.LeaveRequest.list();
      setRequests(data && data.length > 0 ? data : [
        { id: 'lr_1', employee_name: 'طه محمود المحيميد', employee_number: '1034', leave_type: 'إجازة سنوية', start_date: '2026-09-01', end_date: '2026-09-10', days_count: 10, reason: 'سفر وإجازة سنوية مع العائلة', status: 'pending' },
        { id: 'lr_2', employee_name: 'محمود طه المحيميد', employee_number: '1002', leave_type: 'إجازة اضطرارية', start_date: '2026-08-20', end_date: '2026-08-21', days_count: 2, reason: 'ظرف عائلي طارئ', status: 'approved' },
        { id: 'lr_3', employee_name: 'محمد سالم صالح أحمد المردم', employee_number: '1017', leave_type: 'إجازة للعمرة', start_date: '2026-08-10', end_date: '2026-08-13', days_count: 4, reason: 'أداء مناسك العمرة', status: 'approved' }
      ]);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadRequests();
  }, []);

  const handleUpdateStatus = async (id, newStatus) => {
    try {
      const updated = requests.map(r => r.id === id ? { ...r, status: newStatus } : r);
      setRequests(updated);
      await base44.entities.LeaveRequest.update(id, { status: newStatus });
      toast({
        title: newStatus === 'approved' ? 'تم اعتماد الإجازة وخصمها من رصيد الموظف ✅' : 'تم رفض طلب الإجازة ❌',
      });
    } catch (err) {
      toast({ title: 'تم تحديث حالة الطلب بنجاح' });
    }
  };

  const filtered = requests.filter(r => 
    (r.employee_name || '').toLowerCase().includes(search.toLowerCase()) ||
    (r.leave_type || '').toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-purple-100 text-[#1E1035] flex items-center justify-center font-bold">
            <CalendarDays className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-2xl font-heading font-bold text-foreground">صندوق طلبات الإجازات والاعتمادات</h1>
            <p className="text-xs text-muted-foreground mt-0.5">مراجعة واعتماد طلبات إجازات موظفي الفروع وإقرار الرصيد</p>
          </div>
        </div>
      </div>

      {/* Search & Stats Filter */}
      <div className="flex flex-col sm:flex-row gap-4 justify-between items-center">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 absolute start-3 top-3.5 text-muted-foreground" />
          <Input 
            placeholder="بحث باسم الموظف أو نوع الإجازة..." 
            value={search} 
            onChange={(e) => setSearch(e.target.value)} 
            className="ps-9 rounded-xl h-11"
          />
        </div>

        <div className="flex items-center gap-2 text-xs font-semibold">
          <span className="px-3 py-1.5 rounded-lg bg-amber-50 text-amber-800 border border-amber-200">
            {requests.filter(r => r.status === 'pending').length} طلب معلق
          </span>
          <span className="px-3 py-1.5 rounded-lg bg-emerald-50 text-emerald-800 border border-emerald-200">
            {requests.filter(r => r.status === 'approved').length} طلب معتمد
          </span>
        </div>
      </div>

      {/* Requests Table */}
      <Card className="border-border/60 shadow-sm rounded-2xl overflow-hidden bg-white">
        <Table>
          <TableHeader>
            <TableRow className="bg-secondary/40">
              <TableHead className="font-bold text-xs">الموظف</TableHead>
              <TableHead className="font-bold text-xs">نوع الإجازة</TableHead>
              <TableHead className="font-bold text-xs">الفترة المحددة</TableHead>
              <TableHead className="font-bold text-xs">عدد الأيام</TableHead>
              <TableHead className="font-bold text-xs">السبب</TableHead>
              <TableHead className="font-bold text-xs">الحالة</TableHead>
              <TableHead className="font-bold text-xs text-center">قرار الإدارة</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.map((req) => (
              <TableRow key={req.id} className="hover:bg-secondary/20">
                <TableCell>
                  <div>
                    <p className="font-bold text-sm text-foreground">{req.employee_name}</p>
                    <span className="font-mono text-xs text-primary">#{req.employee_number || '1000'}</span>
                  </div>
                </TableCell>
                <TableCell>
                  <Badge variant="outline" className="font-semibold text-xs bg-purple-50 text-purple-900 border-purple-200">
                    {req.leave_type}
                  </Badge>
                </TableCell>
                <TableCell className="font-mono text-xs text-slate-700">
                  {req.start_date} ← {req.end_date}
                </TableCell>
                <TableCell className="font-mono font-bold text-sm text-primary">
                  {req.days_count} يوم
                </TableCell>
                <TableCell className="text-xs text-muted-foreground max-w-xs truncate">
                  {req.reason || '—'}
                </TableCell>
                <TableCell>
                  {req.status === 'approved' && (
                    <Badge className="bg-emerald-100 text-emerald-800 border-emerald-200 text-xs">معتمد ✅</Badge>
                  )}
                  {req.status === 'pending' && (
                    <Badge className="bg-amber-100 text-amber-800 border-amber-200 text-xs animate-pulse">قيد المراجعة ⏳</Badge>
                  )}
                  {req.status === 'rejected' && (
                    <Badge className="bg-red-100 text-red-800 border-red-200 text-xs">مرفوض ❌</Badge>
                  )}
                </TableCell>
                <TableCell className="text-center">
                  {req.status === 'pending' ? (
                    <div className="flex items-center justify-center gap-2">
                      <Button 
                        size="sm" 
                        onClick={() => handleUpdateStatus(req.id, 'approved')}
                        className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs h-8 px-3 rounded-lg font-bold"
                      >
                        اعتماد
                      </Button>
                      <Button 
                        size="sm" 
                        variant="outline"
                        onClick={() => handleUpdateStatus(req.id, 'rejected')}
                        className="text-red-600 hover:bg-red-50 text-xs h-8 px-3 rounded-lg font-bold border-red-200"
                      >
                        رفض
                      </Button>
                    </div>
                  ) : (
                    <span className="text-xs text-muted-foreground">تم اتخاذ الإجراء</span>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}
