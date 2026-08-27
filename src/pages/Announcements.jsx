import { useState, useEffect, useMemo, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { useAuth } from '@/lib/AuthContext';
import { useToast } from '@/components/ui/use-toast';
import {
  Mail,
  Send,
  Inbox,
  Users,
  Megaphone,
  Bell,
  CalendarDays,
  Search,
  Plus,
  Trash2,
  Printer,
  Sparkles,
  CheckCircle2,
  Clock,
  Building2,
  AlertCircle,
  FileText,
  Pin,
  ChevronLeft,
  ChevronRight,
  Filter,
  Eye,
  Star,
  Forward,
  Reply,
  ShieldCheck,
  CheckSquare,
  Square
} from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';

// Initial Mock Messages matching official company data
const DEFAULT_MESSAGES = [
  {
    id: 'msg_1',
    sender_name: 'فهد ناصر محمد الجوعي',
    sender_role: 'المدير العام',
    sender_branch: 'مكتب الإدارة',
    recipient_type: 'all', // 'all' | 'branch' | 'emp'
    recipient_label: 'كافة منسوبي المنشأة',
    subject: 'تحميل تطبيق اكتفاء لجميع الموظفين',
    content: 'السلام عليكم ورحمة الله وبركاته،\n\nنأمل من جميع الموظفين في كافة الفروع (الفرع الرئيسي، فرع كيا، فرع هونداي، ومكتب الإدارة) تحميل تطبيق الموارد البشرية وتحديث البيانات الشخصية وصور الهويات وتوثيق البصمات الشهرية.\n\nشاكرين ومقدرين حسن تعاونكم،\nإدارة المنشأة.',
    category: 'administrative', // 'administrative' | 'urgent' | 'general'
    date: '2025-12-17 20:21',
    is_read: true,
    is_starred: true,
    folder: 'inbox'
  },
  {
    id: 'msg_2',
    sender_name: 'هشام ابوالفضل زغلول',
    sender_role: 'مدير الحسابات والرواتب',
    sender_branch: 'مكتب الإدارة',
    recipient_type: 'all',
    recipient_label: 'كافة الموظفين',
    subject: 'اعتماد وإيداع مسير رواتب شهر أغسطس 2026',
    content: 'السادة الزملاء الكرام،\n\nتم بحمد الله اعتماد وتدقيق مسير الرواتب الشهري وإيداع المستحقات والمكافآت التشجيعية في الحسابات البنكية المعتمدة. يمكنكم الاطلاع على قسائم الرواتب عبر قسم الأجور.\n\nمع أطيب التمنيات بالتوفيق والنجاح.',
    category: 'urgent',
    date: '2026-08-27 15:45',
    is_read: false,
    is_starred: false,
    folder: 'inbox'
  },
  {
    id: 'msg_3',
    sender_name: 'يحيي محمد عبدالغفار باشا',
    sender_role: 'مسئول الموارد البشرية',
    sender_branch: 'مكتب الإدارة',
    recipient_type: 'all',
    recipient_label: 'كافة الموظفين',
    subject: 'الترحيب بالموظف الجديد: عزام علي السعوي',
    content: 'يسر إدارة الموارد البشرية أن ترحب بالزميل الجديد / عزام علي السعوي المنضم حديثاً لفريق مبيعات قطع الغيار بالفرع الرئيسي.\n\nسائلين المولى عز وجل له التوفيق والنجاح في مهام عمله.',
    category: 'general',
    date: '2026-08-16 09:00',
    is_read: true,
    is_starred: false,
    folder: 'inbox'
  }
];

// Initial Circulars
const DEFAULT_CIRCULARS = [
  {
    id: 'circ_1',
    number: 'CIRC-2026-004',
    title: 'تعميم رقم (4): تنظيم مواعيد الدوام الرسمي للورديات وفترة العمل المسائية',
    issued_by: 'فهد ناصر محمد الجوعي (المدير العام)',
    date: '2026-08-01',
    status: 'active',
    content: 'بناءً على مقتضيات مصلحة العمل وتنظيم حركة المبيعات في الفروع، تقرر اعتماد ساعات الدوام الرسمي من الساعة 08:00 صباحاً وحتى 16:00 للفترة الإدارية، ومن 08:00 حتى 12:00 ومن 16:00 حتى 21:00 لفروع المبيعات. ويلتزم الجميع بتسجيل البصمات وفقاً للوردية المحددة في النظام.'
  },
  {
    id: 'circ_2',
    number: 'CIRC-2026-003',
    title: 'تعميم رقم (3): سياسة منح السلف المالية واستقطاع الأقساط الشهرية',
    issued_by: 'الإدارة المالية - هشام ابوالفضل',
    date: '2026-07-15',
    status: 'active',
    content: 'يتم تقديم طلبات السلف عبر نظام الموارد البشرية مع الالتزام بالحد الأقصى لعدد الأقساط (24 شهراً)، ولا يتم إخلاء طرف أي موظف إلا بعد سداد وتصفية كامل رصيد السلفة المتبقي.'
  }
];

// Initial Notifications
const DEFAULT_NOTIFICATIONS = [
  {
    id: 'notif_1',
    title: 'تنبيه انتهاء إقامة / هوية',
    description: 'تم رصد اقتراب موعد تجديد إقامة الموظف طه محمود المحيميد (2027-03-25)',
    type: 'warning',
    date: 'اليوم 11:30 ص',
    is_read: false
  },
  {
    id: 'notif_2',
    title: 'مزامنة أجهزة البصمة السحابية',
    description: 'تمت مزامنة 1,840 حركة حضور وانصراف بنجاح من أجهزة الفروع الأربعة',
    type: 'success',
    date: 'اليوم 08:15 ص',
    is_read: true
  },
  {
    id: 'notif_3',
    title: 'اعتماد طلب إجازة سنوية',
    description: 'تمت الموافقة على طلب الإجازة المقدم من صالح علي المحيميد',
    type: 'info',
    date: 'أمس 14:20 م',
    is_read: true
  }
];

export default function Announcements() {
  const [searchParams, setSearchParams] = useSearchParams();
  const { user } = useAuth();
  const { toast } = useToast();

  const tabParam = searchParams.get('tab') || 'inbox'; // 'inbox' | 'circulars' | 'notifications' | 'calendar'

  // Sub-folder inside internal mail
  const [mailFolder, setMailFolder] = useState('inbox'); // 'inbox' | 'sent' | 'groups'

  // State Lists
  const [messages, setMessages] = useState(() => {
    const s = localStorage.getItem('ga_comm_messages');
    return s ? JSON.parse(s) : DEFAULT_MESSAGES;
  });

  const [circulars, setCirculars] = useState(() => {
    const s = localStorage.getItem('ga_comm_circulars');
    return s ? JSON.parse(s) : DEFAULT_CIRCULARS;
  });

  const [notifications, setNotifications] = useState(() => {
    const s = localStorage.getItem('ga_comm_notifications');
    return s ? JSON.parse(s) : DEFAULT_NOTIFICATIONS;
  });

  const [employees, setEmployees] = useState([]);
  const [search, setSearch] = useState('');
  const [selectedBranch, setSelectedBranch] = useState('all');

  // Selected message for reading
  const [readingMessage, setReadingMessage] = useState(null);

  // Compose Modal State
  const [composeOpen, setComposeOpen] = useState(false);
  const [composeForm, setComposeForm] = useState({
    recipient_type: 'all', // 'all' | 'branch' | 'emp'
    recipient_target: '',
    subject: '',
    content: '',
    category: 'administrative'
  });

  // Load Employees
  useEffect(() => {
    base44.entities.Employee.list().then(res => setEmployees(res || []));
  }, []);

  // Save to storage
  useEffect(() => {
    localStorage.setItem('ga_comm_messages', JSON.stringify(messages));
  }, [messages]);

  // Tab switcher
  const handleTabSwitch = (newTab) => {
    setSearchParams({ tab: newTab });
  };

  // Filtered Messages
  const filteredMessages = useMemo(() => {
    return messages.filter(m => {
      if (m.folder !== mailFolder && mailFolder !== 'groups') return false;
      const q = search.toLowerCase();
      const matchSearch = !search ||
        (m.subject || '').toLowerCase().includes(q) ||
        (m.sender_name || '').toLowerCase().includes(q) ||
        (m.content || '').toLowerCase().includes(q);

      const matchBranch = selectedBranch === 'all' || (m.sender_branch === selectedBranch);

      return matchSearch && matchBranch;
    });
  }, [messages, mailFolder, search, selectedBranch]);

  // Delete message
  const handleDeleteMessage = (id) => {
    setMessages(prev => prev.filter(m => m.id !== id));
    toast({ title: '✓ تم حذف الرسالة بنجاح' });
  };

  // Toggle Star
  const handleToggleStar = (id) => {
    setMessages(prev => prev.map(m => m.id === id ? { ...m, is_starred: !m.is_starred } : m));
  };

  // Send Message / Circular
  const handleSendMessage = () => {
    if (!composeForm.subject.trim() || !composeForm.content.trim()) {
      toast({ title: 'يرجى كتابة الموضوع ومحتوى الرسالة', variant: 'destructive' });
      return;
    }

    let recipientLabel = 'كافة منسوبي المنشأة';
    if (composeForm.recipient_type === 'branch') {
      recipientLabel = `فرع: ${composeForm.recipient_target || 'الفرع المختار'}`;
    } else if (composeForm.recipient_type === 'emp') {
      const emp = employees.find(e => String(e.employee_number || e.id) === String(composeForm.recipient_target));
      recipientLabel = emp ? emp.full_name : 'موظف محدد';
    }

    const newMsg = {
      id: `msg_${Date.now()}`,
      sender_name: user?.full_name || 'فهد ناصر محمد الجوعي (المدير العام)',
      sender_role: user?.role === 'admin' ? 'المدير العام' : 'الموارد البشرية',
      sender_branch: 'مكتب الإدارة',
      recipient_type: composeForm.recipient_type,
      recipient_label: recipientLabel,
      subject: composeForm.subject.trim(),
      content: composeForm.content.trim(),
      category: composeForm.category,
      date: new Date().toISOString().replace('T', ' ').slice(0, 16),
      is_read: true,
      is_starred: false,
      folder: 'inbox'
    };

    setMessages(prev => [newMsg, ...prev]);
    setComposeOpen(false);
    setComposeForm({
      recipient_type: 'all',
      recipient_target: '',
      subject: '',
      content: '',
      category: 'administrative'
    });
    toast({ title: '✓ تم إرسال الرسالة بنجاح وتوزيعها على المستلمين' });
  };

  return (
    <div className="space-y-6" dir="rtl" style={{ direction: 'rtl', textAlign: 'right' }}>
      
      {/* ─── 1. TOP HEADER & MAIN TAB SWITCHER ─────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-slate-900 p-4 sm:p-5 rounded-3xl border shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-pink-600 text-white flex items-center justify-center shadow-lg shadow-pink-500/20 font-bold shrink-0">
            <Mail className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-heading font-black text-foreground">
              مركز التواصل والبريد الداخلي والتعاميم
            </h1>
            <p className="text-xs text-muted-foreground mt-0.5">
              منظومة المراسلات الإدارية الرسمية، التعاميم، والتنبيهات اللحظية
            </p>
          </div>
        </div>

        {/* Compose Button (Pink Ektefa Style) */}
        <Button
          onClick={() => setComposeOpen(true)}
          className="bg-pink-600 hover:bg-pink-500 text-white rounded-2xl text-xs font-black gap-2 h-10 px-5 shadow-md shadow-pink-500/20"
        >
          <Plus className="w-4 h-4" />
          <span>إنشاء رسالة / تعميم</span>
        </Button>
      </div>

      {/* ─── 2. SUB-MENU TABS PILLS (EXACT 4 ITEMS FROM SIDEBAR) ─────────────── */}
      <div className="flex items-center gap-2 overflow-x-auto no-scrollbar py-1">
        {[
          { id: 'inbox', label: '📬 البريد الداخلي', count: messages.filter(m => !m.is_read).length },
          { id: 'circulars', label: '📢 التعاميم الرسمية', count: circulars.length },
          { id: 'notifications', label: '🔔 التنبيهات', count: notifications.filter(n => !n.is_read).length },
          { id: 'calendar', label: '📅 التقويم والأحداث', count: null }
        ].map(tab => (
          <button
            key={tab.id}
            type="button"
            onClick={() => handleTabSwitch(tab.id)}
            className={`px-4 py-2 rounded-2xl text-xs font-bold shrink-0 flex items-center gap-2 transition-all ${
              tabParam === tab.id
                ? 'bg-pink-600 text-white shadow-md shadow-pink-500/20 scale-[1.02]'
                : 'bg-white dark:bg-slate-900 text-muted-foreground border hover:bg-slate-50 dark:hover:bg-slate-800'
            }`}
          >
            <span>{tab.label}</span>
            {tab.count !== null && tab.count > 0 && (
              <span className={`px-1.5 py-0.2 text-[10px] rounded-full font-mono font-bold ${
                tabParam === tab.id ? 'bg-white text-pink-700' : 'bg-pink-100 text-pink-700 dark:bg-pink-950 dark:text-pink-300'
              }`}>
                {tab.count}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* ─── 3. TAB 1: INTERNAL MAILBOX (البريد الداخلي) ────────────────────── */}
      {tabParam === 'inbox' && (
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-5">
          
          {/* Right Rail: Mail Folders */}
          <Card className="p-3 rounded-3xl border bg-white dark:bg-slate-900 shadow-sm space-y-1 h-fit">
            {[
              { id: 'inbox', label: 'الصندوق الوارد', icon: Inbox, count: messages.length },
              { id: 'sent', label: 'البريد المرسل', icon: Send, count: 2 },
              { id: 'groups', label: 'المجموعات والفرق', icon: Users, count: 4 },
            ].map(f => {
              const Icon = f.icon;
              return (
                <button
                  key={f.id}
                  type="button"
                  onClick={() => setMailFolder(f.id)}
                  className={`w-full flex items-center justify-between p-3 rounded-2xl text-xs font-bold transition-all ${
                    mailFolder === f.id
                      ? 'bg-pink-50 dark:bg-pink-950/50 text-pink-700 dark:text-pink-300 border border-pink-200 dark:border-pink-900 shadow-sm'
                      : 'text-muted-foreground hover:bg-slate-50 dark:hover:bg-slate-800/60'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <Icon className="w-4 h-4 text-pink-600" />
                    <span>{f.label}</span>
                  </div>
                  <Badge variant="outline" className="text-[10px] font-mono font-bold">
                    {f.count}
                  </Badge>
                </button>
              );
            })}
          </Card>

          {/* Left Area: Messages List & Controls */}
          <div className="lg:col-span-3 space-y-4">
            
            {/* Search & Filter Toolbar */}
            <Card className="p-3 rounded-3xl border bg-white dark:bg-slate-900 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-3">
              <div className="relative flex-1 w-full">
                <Search className="absolute start-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-pink-500" />
                <Input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="ابحث في الرسائل بالاسم، الرقم الوظيفي، أو نص الموضوع..."
                  className="ps-10 rounded-2xl text-xs h-10 bg-slate-50 dark:bg-slate-800/60 border-0"
                />
              </div>

              <div className="flex items-center gap-2 w-full sm:w-auto">
                <Select value={selectedBranch} onValueChange={setSelectedBranch}>
                  <SelectTrigger className="w-full sm:w-48 rounded-2xl text-xs h-10 bg-background">
                    <SelectValue placeholder="كافة الفروع" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">كافة الفروع</SelectItem>
                    <SelectItem value="مكتب الإدارة">مكتب الإدارة</SelectItem>
                    <SelectItem value="الفرع الرئيسي">الفرع الرئيسي</SelectItem>
                    <SelectItem value="فرع هونداي ( الرواف )">فرع هونداي ( الرواف )</SelectItem>
                    <SelectItem value="فرع كيا ( السليم )">فرع كيا ( السليم )</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </Card>

            {/* Messages Cards List */}
            <Card className="rounded-3xl border bg-white dark:bg-slate-900 shadow-sm overflow-hidden divide-y divide-border/60">
              {filteredMessages.length === 0 ? (
                <div className="p-12 text-center text-muted-foreground">
                  <Mail className="w-12 h-12 mx-auto text-slate-300 mb-2" />
                  <div className="font-bold text-sm text-foreground">لا توجد رسائل مطابقة</div>
                </div>
              ) : (
                filteredMessages.map((msg) => (
                  <div
                    key={msg.id}
                    className="p-4 hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors flex items-center justify-between gap-3 group cursor-pointer"
                    onClick={() => setReadingMessage(msg)}
                  >
                    {/* Right: Star + Sender Info + Subject */}
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      
                      {/* Star Favorite Button */}
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleToggleStar(msg.id);
                        }}
                        className="text-amber-400 hover:scale-110 transition-transform shrink-0"
                      >
                        <Star className={`w-4 h-4 ${msg.is_starred ? 'fill-amber-400' : 'text-slate-300'}`} />
                      </button>

                      {/* Avatar */}
                      <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-pink-600 to-rose-500 text-white flex items-center justify-center font-bold text-xs shrink-0 shadow-sm">
                        {msg.sender_name ? msg.sender_name[0] : 'إ'}
                      </div>

                      {/* Sender & Subject Snippet */}
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="font-heading font-black text-xs text-foreground truncate">
                            {msg.sender_name}
                          </span>
                          <span className="text-[10px] text-muted-foreground font-medium truncate">
                            • {msg.sender_branch}
                          </span>
                          {msg.category === 'urgent' && (
                            <Badge className="bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300 text-[9px] font-bold px-1.5 py-0">
                              عاجل
                            </Badge>
                          )}
                        </div>

                        <div className="font-bold text-xs text-foreground/90 truncate mt-0.5 group-hover:text-pink-600 transition-colors">
                          {msg.subject}
                        </div>
                        <div className="text-[11px] text-muted-foreground truncate font-normal">
                          {msg.content.replace(/\n/g, ' ')}
                        </div>
                      </div>
                    </div>

                    {/* Left: Date & Actions */}
                    <div className="flex items-center gap-3 shrink-0">
                      <div className="text-left font-mono text-[10px] text-muted-foreground">
                        {msg.date}
                      </div>

                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteMessage(msg.id);
                        }}
                        className="w-8 h-8 rounded-xl text-rose-500 hover:bg-rose-50 opacity-80 group-hover:opacity-100"
                        title="حذف الرسالة"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </div>

                  </div>
                ))
              )}
            </Card>

          </div>

        </div>
      )}

      {/* ─── 4. TAB 2: CIRCULARS (التعاميم الرسمية) ─────────────────────────── */}
      {tabParam === 'circulars' && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {circulars.map((circ) => (
              <Card
                key={circ.id}
                className="p-5 rounded-3xl border bg-white dark:bg-slate-900 shadow-sm hover:shadow-md transition-all space-y-3"
              >
                <div className="flex items-start justify-between gap-2 border-b pb-3">
                  <div>
                    <Badge className="bg-pink-50 text-pink-800 dark:bg-pink-950 dark:text-pink-300 border border-pink-200 text-xs font-mono font-bold">
                      {circ.number}
                    </Badge>
                    <h3 className="font-heading font-black text-sm text-foreground mt-1.5 leading-snug">
                      {circ.title}
                    </h3>
                  </div>
                  <div className="w-9 h-9 rounded-2xl bg-pink-50 dark:bg-pink-950 text-pink-600 flex items-center justify-center font-bold shrink-0">
                    <Megaphone className="w-5 h-5" />
                  </div>
                </div>

                <p className="text-xs text-muted-foreground leading-relaxed">
                  {circ.content}
                </p>

                <div className="pt-3 border-t flex items-center justify-between text-xs">
                  <div className="text-[10px] text-muted-foreground font-bold">
                    صادر عن: <strong className="text-foreground">{circ.issued_by}</strong> • {circ.date}
                  </div>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => window.print()}
                    className="h-7 text-xs text-pink-600 font-bold gap-1 rounded-xl"
                  >
                    <Printer className="w-3 h-3" />
                    طباعة التعميم
                  </Button>
                </div>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* ─── 5. TAB 3: NOTIFICATIONS (التنبيهات) ─────────────────────────────── */}
      {tabParam === 'notifications' && (
        <Card className="rounded-3xl border bg-white dark:bg-slate-900 shadow-sm overflow-hidden divide-y divide-border/60">
          {notifications.map((notif) => (
            <div key={notif.id} className="p-4 flex items-center justify-between gap-3 hover:bg-slate-50/80 transition-colors">
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-2xl flex items-center justify-center font-bold text-xs shrink-0 ${
                  notif.type === 'warning' ? 'bg-amber-100 text-amber-700' : notif.type === 'success' ? 'bg-emerald-100 text-emerald-700' : 'bg-blue-100 text-blue-700'
                }`}>
                  <Bell className="w-5 h-5" />
                </div>
                <div>
                  <div className="font-heading font-black text-xs text-foreground">
                    {notif.title}
                  </div>
                  <div className="text-xs text-muted-foreground mt-0.5">
                    {notif.description}
                  </div>
                </div>
              </div>
              <div className="text-xs font-mono text-muted-foreground shrink-0">
                {notif.date}
              </div>
            </div>
          ))}
        </Card>
      )}

      {/* ─── 6. TAB 4: CALENDAR (التقويم والأحداث) ──────────────────────────── */}
      {tabParam === 'calendar' && (
        <Card className="p-6 rounded-3xl border bg-white dark:bg-slate-900 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b pb-3">
            <h3 className="font-heading font-black text-base text-foreground flex items-center gap-2">
              <CalendarDays className="w-5 h-5 text-pink-600" />
              أحداث ومواعيد شهر أغسطس 2026
            </h3>
            <Badge className="bg-pink-100 text-pink-800 text-xs font-bold">أغسطس 2026</Badge>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border space-y-1">
              <div className="text-pink-600 font-bold">25 أغسطس</div>
              <div className="font-black text-foreground">إقفال مسير الرواتب الشهري</div>
              <p className="text-[10px] text-muted-foreground">آخر موعد لاعتماد البصمات والسلف</p>
            </div>
            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border space-y-1">
              <div className="text-emerald-600 font-bold">27 أغسطس</div>
              <div className="font-black text-foreground">صرف وإيداع الرواتب</div>
              <p className="text-[10px] text-muted-foreground">إيداع المستحقات في الحسابات البنكية</p>
            </div>
            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border space-y-1">
              <div className="text-purple-600 font-bold">23 سبتمبر</div>
              <div className="font-black text-foreground">اليوم الوطني السعودي</div>
              <p className="text-[10px] text-muted-foreground">عطلة رسمية مدفوعة الأجر لكافة الكادر</p>
            </div>
          </div>
        </Card>
      )}

      {/* ─── MODAL: COMPOSE MESSAGE / CIRCULAR ──────────────────────────────── */}
      <Dialog open={composeOpen} onOpenChange={setComposeOpen}>
        <DialogContent className="sm:max-w-lg rounded-3xl" dir="rtl">
          <DialogHeader>
            <DialogTitle className="font-heading font-black text-base flex items-center gap-2">
              <Mail className="w-5 h-5 text-pink-600" />
              <span>إنشاء وإرسال رسالة / تعميم رسمي</span>
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-3.5 py-2 text-xs">
            
            {/* Recipient Type */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="font-bold">جهة الاستلام *:</Label>
                <Select
                  value={composeForm.recipient_type}
                  onValueChange={(v) => setComposeForm(prev => ({ ...prev, recipient_type: v, recipient_target: '' }))}
                >
                  <SelectTrigger className="rounded-xl text-xs font-bold">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">كافة منسوبي المنشأة (الكل)</SelectItem>
                    <SelectItem value="branch">فرع محدد</SelectItem>
                    <SelectItem value="emp">موظف محدد</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1">
                <Label className="font-bold">درجة الأهمية:</Label>
                <Select
                  value={composeForm.category}
                  onValueChange={(v) => setComposeForm(prev => ({ ...prev, category: v }))}
                >
                  <SelectTrigger className="rounded-xl text-xs font-bold">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="administrative">إداري رسمي</SelectItem>
                    <SelectItem value="urgent">عاجل ومهم</SelectItem>
                    <SelectItem value="general">عام وتوجيهي</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* If Specific Branch */}
            {composeForm.recipient_type === 'branch' && (
              <div className="space-y-1">
                <Label className="font-bold">اختر الفرع المستهدف:</Label>
                <Select
                  value={composeForm.recipient_target}
                  onValueChange={(v) => setComposeForm(prev => ({ ...prev, recipient_target: v }))}
                >
                  <SelectTrigger className="rounded-xl text-xs">
                    <SelectValue placeholder="اختر الفرع..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="الفرع الرئيسي">الفرع الرئيسي</SelectItem>
                    <SelectItem value="مكتب الإدارة">مكتب الإدارة</SelectItem>
                    <SelectItem value="فرع هونداي ( الرواف )">فرع هونداي ( الرواف )</SelectItem>
                    <SelectItem value="فرع كيا ( السليم )">فرع كيا ( السليم )</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* If Specific Employee */}
            {composeForm.recipient_type === 'emp' && (
              <div className="space-y-1">
                <Label className="font-bold">اختر الموظف المستهدف:</Label>
                <Select
                  value={composeForm.recipient_target}
                  onValueChange={(v) => setComposeForm(prev => ({ ...prev, recipient_target: v }))}
                >
                  <SelectTrigger className="rounded-xl text-xs">
                    <SelectValue placeholder="اختر الموظف..." />
                  </SelectTrigger>
                  <SelectContent>
                    {employees.map(e => (
                      <SelectItem key={e.id} value={String(e.employee_number || e.id)}>
                        {e.full_name} (#{e.employee_number})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Subject */}
            <div className="space-y-1">
              <Label className="font-bold">موضوع الرسالة / التعميم *:</Label>
              <Input
                value={composeForm.subject}
                onChange={(e) => setComposeForm(prev => ({ ...prev, subject: e.target.value }))}
                placeholder="مثال: تحديث أوقات الدوام، توثيق البصمات..."
                className="rounded-xl font-bold"
              />
            </div>

            {/* Content */}
            <div className="space-y-1">
              <Label className="font-bold">نص ومحتوى الرسالة *:</Label>
              <Textarea
                rows={5}
                value={composeForm.content}
                onChange={(e) => setComposeForm(prev => ({ ...prev, content: e.target.value }))}
                placeholder="اكتب تفاصيل ومضمون التعميم أو الرسالة هنا..."
                className="rounded-xl text-xs leading-relaxed"
              />
            </div>

          </div>

          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setComposeOpen(false)} className="rounded-xl font-bold">
              إلغاء
            </Button>
            <Button
              onClick={handleSendMessage}
              className="bg-pink-600 hover:bg-pink-500 text-white rounded-xl font-bold gap-1.5 shadow-md shadow-pink-500/20"
            >
              <Send className="w-3.5 h-3.5" />
              <span>إرسال الرسالة الآن</span>
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ─── MODAL: READ FULL MESSAGE DETAILS ──────────────────────────────── */}
      {readingMessage && (
        <Dialog open={!!readingMessage} onOpenChange={(o) => !o && setReadingMessage(null)}>
          <DialogContent className="sm:max-w-xl rounded-3xl" dir="rtl">
            <DialogHeader>
              <div className="flex items-center justify-between border-b pb-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-pink-600 text-white flex items-center justify-center font-bold text-sm shadow-md">
                    {readingMessage.sender_name ? readingMessage.sender_name[0] : 'إ'}
                  </div>
                  <div>
                    <h2 className="font-heading font-black text-sm text-foreground">
                      {readingMessage.sender_name}
                    </h2>
                    <div className="text-[10px] text-muted-foreground font-mono">
                      {readingMessage.sender_role} • {readingMessage.sender_branch}
                    </div>
                  </div>
                </div>

                <Badge className="bg-pink-50 text-pink-800 dark:bg-pink-950 dark:text-pink-300 border border-pink-200 text-[10px] font-mono">
                  {readingMessage.date}
                </Badge>
              </div>
            </DialogHeader>

            <div className="space-y-4 py-3 text-xs">
              <div>
                <div className="text-[10px] text-muted-foreground font-bold">الموضوع:</div>
                <div className="font-heading font-black text-base text-foreground mt-0.5">
                  {readingMessage.subject}
                </div>
              </div>

              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border text-xs text-foreground leading-relaxed whitespace-pre-line">
                {readingMessage.content}
              </div>

              <div className="text-[10px] text-muted-foreground flex items-center justify-between border-t pt-2">
                <span>المستلمون: <strong>{readingMessage.recipient_label}</strong></span>
                <span>نظام المراسلات الإدارية المعتمد • Green Arrow HR</span>
              </div>
            </div>

            <DialogFooter className="gap-2">
              <Button
                variant="outline"
                onClick={() => window.print()}
                className="rounded-xl text-xs font-bold gap-1"
              >
                <Printer className="w-3.5 h-3.5 text-pink-600" />
                <span>طباعة A4</span>
              </Button>
              <Button onClick={() => setReadingMessage(null)} className="bg-slate-900 text-white rounded-xl font-bold text-xs">
                إغلاق
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

    </div>
  );
}
