import { useState, useEffect } from 'react';
import { Megaphone, Plus, Pencil, Trash2, Power, CheckCircle2 } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/components/ui/use-toast';

const initialAnnouncements = [
  {
    id: 'ann_1',
    title: 'ترحيب بالموظف الجديد',
    category: 'إعلان',
    date: '16/8 هذا الشهر',
    content: 'نرحب بالموظف الجديد عسى الله يباركله ويوفقة فيما هو قادم',
    status: 'active'
  }
];

export default function Announcements() {
  const { toast } = useToast();
  const [items, setItems] = useState(() => {
    const saved = localStorage.getItem('hr_flow_announcements');
    return saved ? JSON.parse(saved) : initialAnnouncements;
  });
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({ title: '', category: 'إعلان', date: 'هذا الشهر', content: '' });

  const saveItems = (data) => {
    setItems(data);
    localStorage.setItem('hr_flow_announcements', JSON.stringify(data));
  };

  const handleOpenAdd = () => {
    setEditing(null);
    setForm({ title: '', category: 'إعلان', date: 'اليوم', content: '' });
    setFormOpen(true);
  };

  const handleSave = () => {
    if (!form.title || !form.content) {
      toast({ title: 'يرجى إدخال عنوان ومحتوى الإعلان', variant: 'destructive' });
      return;
    }

    if (editing) {
      const updated = items.map(it => it.id === editing.id ? { ...it, ...form } : it);
      saveItems(updated);
      toast({ title: 'تم تعديل الإعلان بنجاح' });
    } else {
      const newItem = {
        id: 'ann_' + Date.now(),
        ...form,
        status: 'active'
      };
      saveItems([newItem, ...items]);
      toast({ title: 'تمت إضافة الإعلان بنجاح' });
    }
    setFormOpen(false);
  };

  const toggleStatus = (id) => {
    const updated = items.map(it => it.id === id ? { ...it, status: it.status === 'active' ? 'inactive' : 'active' } : it);
    saveItems(updated);
    toast({ title: 'تم تغيير حالة الإعلان' });
  };

  const handleDelete = (id) => {
    if (!confirm('هل أنت متأكد من حذف الإعلان؟')) return;
    const filtered = items.filter(it => it.id !== id);
    saveItems(filtered);
    toast({ title: 'تم حذف الإعلان بنجاح' });
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-purple-100 text-purple-900 flex items-center justify-center font-bold">
            <Megaphone className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-2xl font-heading font-bold text-foreground">الإعلانات والأحداث</h1>
            <p className="text-sm text-muted-foreground mt-0.5">إدارة الإعلانات وأحداث الشركة الظاهرة في لوحة التحكم</p>
          </div>
        </div>

        <Button onClick={handleOpenAdd} className="bg-[#2D164D] hover:bg-[#1E1035] text-white shadow-sm">
          <Plus className="w-4 h-4 me-2" /> إضافة إعلان
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5 pt-2">
        {items.map((item) => (
          <Card key={item.id} className="p-6 border-border/60 shadow-sm rounded-2xl bg-white space-y-4">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-amber-50 text-amber-700 flex items-center justify-center font-bold">
                  <Megaphone className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-heading font-bold text-base text-foreground">{item.title}</h3>
                    <Badge className="bg-[#2D164D] text-white text-[10px] px-2 py-0.5">{item.category}</Badge>
                  </div>
                  <span className="text-xs text-muted-foreground mt-0.5 block">{item.date}</span>
                </div>
              </div>
            </div>

            <p className="text-sm text-muted-foreground leading-relaxed bg-secondary/20 p-3.5 rounded-xl border border-border/40">
              {item.content}
            </p>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-border/40 text-xs">
              <button onClick={() => toggleStatus(item.id)} className="flex items-center gap-1 text-foreground hover:text-primary font-medium">
                <Power className="w-3.5 h-3.5" /> {item.status === 'active' ? 'إيقاف' : 'تفعيل'}
              </button>
              <button onClick={() => { setEditing(item); setForm(item); setFormOpen(true); }} className="flex items-center gap-1 text-foreground hover:text-primary font-medium">
                <Pencil className="w-3.5 h-3.5" /> تعديل
              </button>
              <button onClick={() => handleDelete(item.id)} className="flex items-center gap-1 text-destructive hover:opacity-80 font-medium">
                <Trash2 className="w-3.5 h-3.5" /> حذف
              </button>
            </div>
          </Card>
        ))}
      </div>

      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{editing ? 'تعديل الإعلان' : 'إضافة إعلان أو حدث جديد'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5"><Label>عنوان الإعلان *</Label><Input value={form.title} onChange={(e) => setForm(prev => ({ ...prev, title: e.target.value }))} /></div>
            <div className="space-y-1.5"><Label>نوع المنشور</Label><Input value={form.category} onChange={(e) => setForm(prev => ({ ...prev, category: e.target.value }))} placeholder="إعلان / حدث" /></div>
            <div className="space-y-1.5"><Label>نص الإعلان *</Label><Textarea rows={3} value={form.content} onChange={(e) => setForm(prev => ({ ...prev, content: e.target.value }))} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setFormOpen(false)}>إلغاء</Button>
            <Button onClick={handleSave} className="bg-[#2D164D] text-white">حفظ ونشر</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
