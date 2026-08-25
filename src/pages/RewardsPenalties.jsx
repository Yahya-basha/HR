import { useState } from 'react';
import { Gift, AlertTriangle, Plus } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';

export default function RewardsPenalties() {
  const [items, setItems] = useState([
    { id: '1', title: 'مكافأة تميز في المبيعات', type: 'reward', amount: '500 ر.س', description: 'مكافأة شهرية لتحقيق مستهدف المبيعات' },
    { id: '2', title: 'خصم تأخير متكرر', type: 'penalty', amount: 'نصف يوم', description: 'تأخير أكثر من 3 مرات في الشهر' },
    { id: '3', title: 'مكافأة انضباط وحضور كامل', type: 'reward', amount: '300 ر.س', description: 'حضور بدون أي تأخير أو غياب' }
  ]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-amber-100 text-amber-900 flex items-center justify-center font-bold">
            <Gift className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-2xl font-heading font-bold text-foreground">إعدادات المكافآت والجزاءات</h1>
            <p className="text-sm text-muted-foreground mt-0.5">تحديد بنود الحوافز وخصومات الحضور والغياب</p>
          </div>
        </div>
        <Button className="bg-[#2D164D] text-white"><Plus className="w-4 h-4 me-2" /> إضافة بند جديد</Button>
      </div>

      <Card className="border-border/60 shadow-sm rounded-2xl overflow-hidden bg-white">
        <Table>
          <TableHeader>
            <TableRow className="bg-secondary/40">
              <TableHead className="font-bold text-xs">البند</TableHead>
              <TableHead className="font-bold text-xs">النوع</TableHead>
              <TableHead className="font-bold text-xs">القيمة / النسبة</TableHead>
              <TableHead className="font-bold text-xs">الوصف</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.map((it) => (
              <TableRow key={it.id}>
                <TableCell className="font-bold text-sm">{it.title}</TableCell>
                <TableCell>
                  <Badge variant="outline" className={it.type === 'reward' ? 'bg-emerald-100 text-emerald-800 border-emerald-200' : 'bg-red-100 text-red-800 border-red-200'}>
                    {it.type === 'reward' ? 'مكافأة' : 'جزاء / خصم'}
                  </Badge>
                </TableCell>
                <TableCell className="font-bold font-mono text-sm">{it.amount}</TableCell>
                <TableCell className="text-xs text-muted-foreground">{it.description}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}
