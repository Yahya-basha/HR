import { useState } from 'react';
import { Printer, FileText, Download } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

export default function DocumentsPrint() {
  const docs = [
    { title: 'شهادة تعريف بالراتب (موثقة)', desc: 'خطاب رسمي بتفاصيل الراتب للمصارف والجهات الحكومية' },
    { title: 'خطاب لمن يهمه الأمر', desc: 'إثبات استمرارية العمل على رأس العمل' },
    { title: 'شهادة خبرة رسمية', desc: 'إثبات فترة العمل والمسمى الوظيفي' },
    { title: 'نموذج إخلاء طرف ومخالصة نهائية', desc: 'تسوية المستحقات وتسليم العهد' }
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="w-12 h-12 rounded-2xl bg-blue-100 text-blue-900 flex items-center justify-center font-bold">
          <Printer className="w-6 h-6" />
        </div>
        <div>
          <h1 className="text-2xl font-heading font-bold text-foreground">طباعة المستندات والشهادات</h1>
          <p className="text-sm text-muted-foreground mt-0.5">توليد وطباعة خطابات التعريف وشهادات الخبرة للموظفين فورياً</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {docs.map((d, i) => (
          <Card key={i} className="p-6 border-border/60 shadow-sm rounded-2xl bg-white flex flex-col justify-between space-y-4">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-2xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
                <FileText className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-heading font-bold text-base text-foreground">{d.title}</h3>
                <p className="text-xs text-muted-foreground mt-1">{d.desc}</p>
              </div>
            </div>

            <Button onClick={() => window.print()} className="bg-[#2D164D] text-white w-full">
              <Printer className="w-4 h-4 me-2" /> معاينة وطباعة المستند
            </Button>
          </Card>
        ))}
      </div>
    </div>
  );
}
