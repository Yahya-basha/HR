import { cloudSave } from '@/lib/cloudSyncEngine';
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useAuth } from '@/lib/AuthContext';
import { hasPermission } from '@/lib/rbac';
import { useToast } from '@/components/ui/use-toast';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import {
  CheckCircle2, XCircle, Clock, Search, CreditCard, Calendar,
  ClipboardList, DollarSign, FileText, AlertCircle, Eye
} from 'lucide-react';

const STATUS_CONFIG = {
  pending:              { label: 'بانتظار المراجعة', class: 'bg-amber-100 text-amber-800 border-amber-200', icon: <Clock className="w-3 h-3" /> },
  hr_approved:          { label: 'اعتمد HR', class: 'bg-sky-100 text-sky-800 border-sky-200', icon: <CheckCircle2 className="w-3 h-3" /> },
  accountant_approved:  { label: 'اعتمد المحاسب', class: 'bg-indigo-100 text-indigo-800 border-indigo-200', icon: <CheckCircle2 className="w-3 h-3" /> },
  approved:             { label: 'معتمد', class: 'bg-emerald-100 text-emerald-800 border-emerald-200', icon: <CheckCircle2 className="w-3 h-3" /> },
  rejected:             { label: 'مرفوض', class: 'bg-red-100 text-red-800 border-red-200', icon: <XCircle className="w-3 h-3" /> },
  disbursed:            { label: 'تم الصرف', class: 'bg-purple-100 text-purple-800 border-purple-200', icon: <DollarSign className="w-3 h-3" /> },
};

function useRequests() {
  const load = (key) => { try { return JSON.parse(localStorage.getItem(key)||'[]'); } catch(e) { return []; } };
  const save = (key, data) => { localStorage.setItem(key, JSON.stringify(data)); cloudSave(key, data); };

  const [advances,   setAdvances]   = useState(load('hr_advances_list'));
  const [leaves,     setLeaves]     = useState(load('hr_leave_requests'));
  const [corrections,setCorrections]= useState(load('hr_correction_requests'));

  const refresh = useCallback(() => {
    setAdvances(load('hr_advances_list'));
    setLeaves(load('hr_leave_requests'));
    setCorrections(load('hr_correction_requests'));
  }, []);

  const updateAdvance = (id, fields) => {
    const updated = advances.map(a => a.id===id ? {...a,...fields} : a);
    save('hr_advances_list', updated);
    setAdvances(updated);
  };
  const updateLeave = (id, fields) => {
    const updated = leaves.map(a => a.id===id ? {...a,...fields} : a);
    save('hr_leave_requests', updated);
    setLeaves(updated);
  };
  const updateCorrection = (id, fields) => {
    const updated = corrections.map(a => a.id===id ? {...a,...fields} : a);
    save('hr_correction_requests', updated);
    setCorrections(updated);
  };

  return { advances, leaves, corrections, refresh, updateAdvance, updateLeave, updateCorrection };
}

export default function ApprovalsCenter() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [search, setSearch] = useState('');
  const [activeTab, setActiveTab] = useState('advances');
  const [viewModal, setViewModal] = useState(null);
  const [rejectReason, setRejectReason] = useState('');
  const { advances, leaves, corrections, refresh, updateAdvance, updateLeave, updateCorrection } = useRequests();

  const isOwner      = user?.role === 'owner';
  const isAccountant = user?.role === 'accountant';
  const isHR         = user?.role === 'hr';
  const isAdmin      = user?.role === 'system_admin';

  const handleAdvanceAction = (adv, action) => {
    const now = new Date().toISOString();
    const stamp = { by: user.full_name, at: now };

    if (action === 'hr_approve' && (isHR || isAdmin)) {
      updateAdvance(adv.id, { status: 'hr_approved', hr_approved_at: now, hr_approved_by: user.full_name });
      toast({ title: '✅ تم اعتماد السلفة من قبل HR' });
    } else if (action === 'accountant_approve' && (isAccountant || isAdmin)) {
      updateAdvance(adv.id, { status: 'accountant_approved', accountant_approved_at: now, accountant_approved_by: user.full_name });
      toast({ title: '✅ تم الاعتماد المالي للسلفة' });
    } else if (action === 'owner_approve' && (isOwner || isAdmin)) {
      updateAdvance(adv.id, { status: 'approved', owner_approved_at: now, owner_approved_by: user.full_name });
      toast({ title: '✅ تم اعتماد السلفة نهائياً من المدير العام' });
    } else if (action === 'disburse' && (isAccountant || isAdmin)) {
      updateAdvance(adv.id, { status: 'disbursed', disbursed_at: now, disbursed_by: user.full_name });
      toast({ title: '💰 تم تسجيل صرف السلفة' });
    } else if (action === 'reject') {
      updateAdvance(adv.id, { status: 'rejected', rejected_at: now, rejected_by: user.full_name, rejection_reason: rejectReason });
      setViewModal(null);
      setRejectReason('');
      toast({ title: '❌ تم رفض السلفة', variant: 'destructive' });
    }
    setViewModal(null);
  };

  const handleLeaveAction = (lv, action) => {
    const now = new Date().toISOString();
    if (action === 'approve' && (isHR || isOwner || isAdmin)) {
      updateLeave(lv.id, { status: 'approved', approved_at: now, approved_by: user.full_name });
      toast({ title: '✅ تم اعتماد الإجازة' });
    } else if (action === 'reject') {
      updateLeave(lv.id, { status: 'rejected', rejected_at: now, rejected_by: user.full_name, rejection_reason: rejectReason });
      setViewModal(null); setRejectReason('');
      toast({ title: '❌ تم رفض الإجازة', variant: 'destructive' });
    }
    setViewModal(null);
  };

  const handleCorrectionAction = (cr, action) => {
    const now = new Date().toISOString();
    if (action === 'approve' && (isHR || isAdmin)) {
      updateCorrection(cr.id, { status: 'approved', approved_at: now, approved_by: user.full_name });
      toast({ title: '✅ تم اعتماد تعديل البصمة' });
    } else if (action === 'reject') {
      updateCorrection(cr.id, { status: 'rejected', rejected_at: now, rejected_by: user.full_name, rejection_reason: rejectReason });
      setViewModal(null); setRejectReason('');
      toast({ title: '❌ تم رفض تعديل البصمة', variant: 'destructive' });
    }
    setViewModal(null);
  };

  const filterList = (list) => list.filter(item => {
    if (!search) return true;
    const s = search.toLowerCase();
    return (item.employee_name||'').toLowerCase().includes(s) || (item.reason||'').toLowerCase().includes(s);
  });

  const pendingAdvances    = advances.filter(a => ['pending','hr_approved','accountant_approved'].includes(a.status));
  const pendingLeaves      = leaves.filter(l => l.status === 'pending');
  const pendingCorrections = corrections.filter(c => c.status === 'pending');
  const totalPending       = pendingAdvances.length + pendingLeaves.length + pendingCorrections.length;

  const StatusBadge = ({ status }) => {
    const cfg = STATUS_CONFIG[status] || STATUS_CONFIG.pending;
    return <Badge className={"text-xs gap-1 border flex items-center " + cfg.class}>{cfg.icon}{cfg.label}</Badge>;
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-16" dir="rtl">
      <div className="flex items-center gap-3">
        <div className="w-12 h-12 rounded-2xl bg-indigo-100 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-200 flex items-center justify-center">
          <CheckCircle2 className="w-6 h-6" />
        </div>
        <div>
          <h1 className="text-2xl font-heading font-black text-foreground">مركز الاعتمادات</h1>
          <p className="text-xs text-muted-foreground mt-0.5">{totalPending} طلب بانتظار المراجعة</p>
        </div>
      </div>

      <div className="relative">
        <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input placeholder="ابحث باسم الموظف أو السبب..." value={search} onChange={e=>setSearch(e.target.value)} className="pr-9 rounded-xl h-10" />
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="rounded-2xl h-10 p-1 gap-1">
          <TabsTrigger value="advances" className="rounded-xl text-xs font-bold gap-1.5 data-[state=active]:bg-white data-[state=active]:shadow-sm">
            <CreditCard className="w-3.5 h-3.5" /> السلف {pendingAdvances.length > 0 && <span className="bg-amber-500 text-white text-[10px] rounded-full w-4 h-4 flex items-center justify-center font-bold">{pendingAdvances.length}</span>}
          </TabsTrigger>
          <TabsTrigger value="leaves" className="rounded-xl text-xs font-bold gap-1.5 data-[state=active]:bg-white data-[state=active]:shadow-sm">
            <Calendar className="w-3.5 h-3.5" /> الإجازات {pendingLeaves.length > 0 && <span className="bg-amber-500 text-white text-[10px] rounded-full w-4 h-4 flex items-center justify-center font-bold">{pendingLeaves.length}</span>}
          </TabsTrigger>
          <TabsTrigger value="corrections" className="rounded-xl text-xs font-bold gap-1.5 data-[state=active]:bg-white data-[state=active]:shadow-sm">
            <Clock className="w-3.5 h-3.5" /> تعديلات البصمة {pendingCorrections.length > 0 && <span className="bg-amber-500 text-white text-[10px] rounded-full w-4 h-4 flex items-center justify-center font-bold">{pendingCorrections.length}</span>}
          </TabsTrigger>
        </TabsList>

        {/* Advances Tab */}
        <TabsContent value="advances" className="mt-4 space-y-2">
          {filterList(advances).length === 0 ? (
            <Card className="p-10 rounded-2xl text-center text-muted-foreground text-sm">لا توجد طلبات سلفة</Card>
          ) : filterList(advances).map(adv => (
            <Card key={adv.id} className="p-4 rounded-2xl border hover:shadow-sm transition-all">
              <div className="flex items-start gap-3">
                <div className="flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-black text-foreground text-sm">{adv.employee_name}</span>
                    <span className="text-xs font-mono text-muted-foreground">#{adv.employee_number}</span>
                    <StatusBadge status={adv.status} />
                  </div>
                  <div className="text-xs text-muted-foreground mt-1">
                    مبلغ: <span className="font-bold text-foreground">{Number(adv.amount||0).toLocaleString()} ر.س</span>
                    {adv.installments > 1 && <> • {adv.installments} أقساط ({Math.ceil(adv.amount/adv.installments).toLocaleString()} ر.س/شهر)</>}
                    {adv.reason && <> • السبب: {adv.reason}</>}
                  </div>
                  <div className="text-xs text-muted-foreground mt-0.5">
                    تاريخ الطلب: {new Date(adv.date||adv.created_at||Date.now()).toLocaleDateString('ar-SA')}
                    {adv.hr_approved_by && <> • HR: {adv.hr_approved_by}</>}
                    {adv.accountant_approved_by && <> • محاسب: {adv.accountant_approved_by}</>}
                  </div>
                </div>
                <div className="flex gap-2 flex-shrink-0">
                  {adv.status === 'pending' && (isHR || isAdmin) && (
                    <Button size="sm" className="h-7 text-xs rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white" onClick={()=>handleAdvanceAction(adv,'hr_approve')}>
                      <CheckCircle2 className="w-3 h-3 mr-1" /> اعتماد HR
                    </Button>
                  )}
                  {adv.status === 'hr_approved' && (isAccountant || isAdmin) && (
                    <Button size="sm" className="h-7 text-xs rounded-xl bg-sky-600 hover:bg-sky-700 text-white" onClick={()=>handleAdvanceAction(adv,'accountant_approve')}>
                      <CheckCircle2 className="w-3 h-3 mr-1" /> اعتماد مالي
                    </Button>
                  )}
                  {adv.status === 'accountant_approved' && (isOwner || isAdmin) && (
                    <Button size="sm" className="h-7 text-xs rounded-xl bg-amber-600 hover:bg-amber-700 text-white" onClick={()=>handleAdvanceAction(adv,'owner_approve')}>
                      <CheckCircle2 className="w-3 h-3 mr-1" /> اعتماد نهائي 👑
                    </Button>
                  )}
                  {adv.status === 'approved' && (isAccountant || isAdmin) && (
                    <Button size="sm" className="h-7 text-xs rounded-xl bg-purple-600 hover:bg-purple-700 text-white" onClick={()=>handleAdvanceAction(adv,'disburse')}>
                      💰 تسجيل الصرف
                    </Button>
                  )}
                  {['pending','hr_approved','accountant_approved'].includes(adv.status) && (
                    <Button size="sm" variant="destructive" className="h-7 text-xs rounded-xl" onClick={()=>{setViewModal({type:'advance',item:adv,action:'reject'});setRejectReason('');}}>
                      <XCircle className="w-3 h-3 mr-1" /> رفض
                    </Button>
                  )}
                </div>
              </div>
            </Card>
          ))}
        </TabsContent>

        {/* Leaves Tab */}
        <TabsContent value="leaves" className="mt-4 space-y-2">
          {filterList(leaves).length === 0 ? (
            <Card className="p-10 rounded-2xl text-center text-muted-foreground text-sm">لا توجد طلبات إجازة</Card>
          ) : filterList(leaves).map(lv => (
            <Card key={lv.id} className="p-4 rounded-2xl border hover:shadow-sm transition-all">
              <div className="flex items-start gap-3">
                <div className="flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-black text-foreground text-sm">{lv.employee_name}</span>
                    <StatusBadge status={lv.status} />
                    <Badge variant="outline" className="text-xs">{lv.leave_type}</Badge>
                  </div>
                  <div className="text-xs text-muted-foreground mt-1">
                    من: <span className="font-bold">{lv.start_date}</span> إلى: <span className="font-bold">{lv.end_date}</span>
                    {lv.reason && <> • {lv.reason}</>}
                  </div>
                </div>
                <div className="flex gap-2 flex-shrink-0">
                  {lv.status === 'pending' && (isHR || isOwner || isAdmin) && (
                    <Button size="sm" className="h-7 text-xs rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white" onClick={()=>handleLeaveAction(lv,'approve')}>
                      <CheckCircle2 className="w-3 h-3 mr-1" /> اعتماد
                    </Button>
                  )}
                  {lv.status === 'pending' && (
                    <Button size="sm" variant="destructive" className="h-7 text-xs rounded-xl" onClick={()=>{setViewModal({type:'leave',item:lv,action:'reject'});setRejectReason('');}}>
                      <XCircle className="w-3 h-3 mr-1" /> رفض
                    </Button>
                  )}
                </div>
              </div>
            </Card>
          ))}
        </TabsContent>

        {/* Corrections Tab */}
        <TabsContent value="corrections" className="mt-4 space-y-2">
          {filterList(corrections).length === 0 ? (
            <Card className="p-10 rounded-2xl text-center text-muted-foreground text-sm">لا توجد طلبات تعديل بصمة</Card>
          ) : filterList(corrections).map(cr => (
            <Card key={cr.id} className="p-4 rounded-2xl border hover:shadow-sm transition-all">
              <div className="flex items-start gap-3">
                <div className="flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-black text-foreground text-sm">{cr.employee_name}</span>
                    <StatusBadge status={cr.status} />
                  </div>
                  <div className="text-xs text-muted-foreground mt-1">
                    يوم: <span className="font-bold">{cr.log_date}</span>
                    {cr.check_in && <> • دخول: <span className="font-mono">{cr.check_in}</span></>}
                    {cr.check_out && <> • خروج: <span className="font-mono">{cr.check_out}</span></>}
                    {cr.reason && <> • {cr.reason}</>}
                  </div>
                </div>
                <div className="flex gap-2 flex-shrink-0">
                  {cr.status === 'pending' && (isHR || isAdmin) && (
                    <Button size="sm" className="h-7 text-xs rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white" onClick={()=>handleCorrectionAction(cr,'approve')}>
                      <CheckCircle2 className="w-3 h-3 mr-1" /> اعتماد
                    </Button>
                  )}
                  {cr.status === 'pending' && (
                    <Button size="sm" variant="destructive" className="h-7 text-xs rounded-xl" onClick={()=>{setViewModal({type:'correction',item:cr,action:'reject'});setRejectReason('');}}>
                      <XCircle className="w-3 h-3 mr-1" /> رفض
                    </Button>
                  )}
                </div>
              </div>
            </Card>
          ))}
        </TabsContent>
      </Tabs>

      {/* Rejection Dialog */}
      <Dialog open={!!viewModal} onOpenChange={()=>setViewModal(null)}>
        <DialogContent className="rounded-3xl max-w-md" dir="rtl">
          <DialogHeader><DialogTitle className="font-black">سبب الرفض</DialogTitle></DialogHeader>
          <Textarea placeholder="اكتب سبب الرفض (اختياري)..." value={rejectReason} onChange={e=>setRejectReason(e.target.value)} className="rounded-xl min-h-[80px]" />
          <DialogFooter className="gap-2">
            <Button variant="outline" className="rounded-xl" onClick={()=>setViewModal(null)}>إلغاء</Button>
            <Button variant="destructive" className="rounded-xl font-bold" onClick={()=>{
              if (viewModal?.type==='advance') handleAdvanceAction(viewModal.item,'reject');
              else if (viewModal?.type==='leave') handleLeaveAction(viewModal.item,'reject');
              else if (viewModal?.type==='correction') handleCorrectionAction(viewModal.item,'reject');
            }}>
              <XCircle className="w-4 h-4 mr-1" /> تأكيد الرفض
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
