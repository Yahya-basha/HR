import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { UploadCloud, FileSpreadsheet } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
export default function ImportData() {
  const { toast } = useToast();
  return (
    <div className="space-y-6 max-w-4xl">
      <div className="flex items-center gap-3">
        <div className="w-12 h-12 rounded-2xl bg-emerald-100 text-emerald-900 flex items-center justify-center font-bold">
          <UploadCloud className="w-6 h-6" />
        </div>
        <div>
          <h1 className="text-2xl font-heading font-bold text-foreground">استيراد البيانات وسجلات البصمة</h1>
          <p className="text-sm text-muted-foreground mt-0.5">رفع ملفات Excel و CSV لسحب كشوفات الحضور أو إضافة موظفين دفعة واحدة</p>
        </div>
      </div>
      <Card className="p-10 border-dashed border-2 border-primary/30 rounded-2xl bg-white text-center space-y-4">
        <FileSpreadsheet className="w-12 h-12 text-primary mx-auto opacity-70" />
        <div>
          <h3 className="font-bold text-base text-foreground">اسحب وأفلت ملف الـ Excel هنا</h3>
          <p className="text-xs text-muted-foreground mt-1">يدعم ملفات .xlsx و .csv لكافة أجهزة البصمة</p>
        </div>
        <Button onClick={() => toast({ title: 'يرجى اختيار ملف Excel من جهازك' })} className="bg-[#2D164D] text-white">
          اختيار ملف من الجهاز
        </Button>
      </Card>
    </div>
  );
}
