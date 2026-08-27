import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '@/lib/AuthContext';
import { useI18n } from '@/lib/i18n';
import { 
  Bell, 
  Mail, 
  Sun, 
  Moon, 
  Globe, 
  LogOut, 
  Settings as SettingsIcon, 
  Menu, 
  User, 
  Sparkles,
  HelpCircle
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

export default function Header({ onOpenMobileMenu }) {
  const { user, logout } = useAuth();
  const { lang, toggleLanguage } = useI18n();
  const navigate = useNavigate();

  const [isDark, setIsDark] = useState(() => {
    return document.documentElement.classList.contains('dark') ||
      localStorage.getItem('theme') === 'dark';
  });

  const toggleDarkMode = () => {
    const next = !isDark;
    setIsDark(next);
    if (next) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
  };

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  // Get user display name
  const userName = user?.full_name || user?.name || (user?.email?.includes('dortal') ? 'فهد ناصر محمد الجوعي' : (user?.email?.includes('yahya') ? 'يحيي محمد عبدالغفار باشا' : 'المشرف العام'));

  return (
    <header 
      className="sticky top-0 z-30 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-b border-border/80 px-4 sm:px-6 py-2.5 flex items-center justify-between transition-colors"
      dir="rtl"
    >
      
      {/* ─── RIGHT: BRAND & MOBILE MENU TRIGGER ───────────────────────────── */}
      <div className="flex items-center gap-3">
        {/* Mobile Hamburger Toggle */}
        <Button
          variant="ghost"
          size="icon"
          onClick={onOpenMobileMenu}
          className="lg:hidden rounded-xl text-foreground hover:bg-slate-100 dark:hover:bg-slate-800"
        >
          <Menu className="w-5 h-5" />
        </Button>

        {/* Brand Logo & Name */}
        <Link to="/" className="flex items-center gap-2.5 group">
          <div className="w-9 h-9 rounded-xl bg-slate-900 text-white flex items-center justify-center shadow-sm group-hover:scale-105 transition-transform p-1">
            <img src="/green-arrow-logo.png" alt="logo" className="w-full h-full object-contain" />
          </div>
          <div className="hidden sm:block">
            <div className="text-sm font-heading font-black text-foreground tracking-tight flex items-center gap-1.5">
              <span>Green Arrow</span>
              <span className="text-[10px] bg-emerald-500/10 text-emerald-600 font-bold px-1.5 py-0.2 rounded-md font-mono">HR</span>
            </div>
            <div className="text-[10px] text-muted-foreground font-medium">منظومة الموارد البشرية المتكاملة</div>
          </div>
        </Link>
      </div>

      {/* ─── CENTER: GREETING MESSAGE (EKTEFA STYLE) ───────────────────────── */}
      <div className="hidden md:flex items-center gap-2 bg-slate-50 dark:bg-slate-800/60 border border-border/60 px-4 py-1.5 rounded-full shadow-inner">
        <span className="text-sm">👋</span>
        <span className="text-xs font-bold text-foreground">
          مرحباً بعودتك، <strong className="text-emerald-600 dark:text-emerald-400 font-black">{userName}</strong>
        </span>
      </div>

      {/* ─── LEFT: CONTROLS & USER AVATAR ─────────────────────────────────── */}
      <div className="flex items-center gap-2">
        
        {/* English / Arabic Pill Switcher (Ektefa Style) */}
        <Button
          variant="outline"
          size="sm"
          onClick={toggleLanguage}
          className="h-8 px-3 rounded-full text-xs font-bold bg-sky-500 hover:bg-sky-600 text-white border-0 shadow-sm gap-1"
        >
          <Globe className="w-3.5 h-3.5" />
          <span className="font-sans text-[11px]">{lang === 'ar' ? 'English' : 'عربي'}</span>
        </Button>

        {/* Notifications Bell with Badge */}
        <Button
          variant="ghost"
          size="icon"
          onClick={() => navigate('/announcements')}
          className="relative h-8 w-8 rounded-full text-muted-foreground hover:bg-slate-100 dark:hover:bg-slate-800"
          title="الإشعارات"
        >
          <Bell className="w-4 h-4" />
          <span className="absolute 0 top-0.5 end-0.5 w-4 h-4 bg-rose-500 text-white text-[9px] font-black rounded-full flex items-center justify-center font-mono ring-2 ring-background">
            18
          </span>
        </Button>

        {/* Mail / Announcements */}
        <Button
          variant="ghost"
          size="icon"
          onClick={() => navigate('/announcements')}
          className="h-8 w-8 rounded-full text-muted-foreground hover:bg-slate-100 dark:hover:bg-slate-800 hidden sm:flex"
          title="الرسائل"
        >
          <Mail className="w-4 h-4" />
        </Button>

        {/* Night / Day Mode Toggle */}
        <Button
          variant="ghost"
          size="icon"
          onClick={toggleDarkMode}
          className="h-8 w-8 rounded-full text-muted-foreground hover:bg-slate-100 dark:hover:bg-slate-800"
          title={isDark ? 'الوضع النهاري' : 'الوضع الليلي'}
        >
          {isDark ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-slate-700" />}
        </Button>

        {/* User Avatar & Dropdown Menu */}
        <DropdownMenu dir="rtl">
          <DropdownMenuTrigger asChild>
            <button className="flex items-center gap-2 pe-1 ps-1.5 py-1 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors border border-border/80">
              <div className="w-7 h-7 rounded-full bg-gradient-to-tr from-sky-600 to-emerald-500 text-white flex items-center justify-center font-bold text-xs shadow-sm">
                {userName[0]}
              </div>
              <span className="hidden xl:inline text-xs font-bold text-foreground max-w-[120px] truncate">
                {userName.split(' ')[0]}
              </span>
            </button>
          </DropdownMenuTrigger>
          
          <DropdownMenuContent align="start" className="w-56 p-2 rounded-2xl shadow-xl">
            <DropdownMenuLabel className="font-bold text-xs">
              <div className="font-black text-foreground">{userName}</div>
              <div className="text-[11px] text-muted-foreground font-normal">{user?.email || 'admin@greenarrow.com'}</div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            
            <DropdownMenuItem 
              onClick={() => navigate('/employee-profile')}
              className="rounded-xl py-2 text-xs font-bold gap-2 cursor-pointer"
            >
              <User className="w-4 h-4 text-sky-600" />
              <span>ملفي الشخصي 360°</span>
            </DropdownMenuItem>

            <DropdownMenuItem 
              onClick={() => navigate('/settings')}
              className="rounded-xl py-2 text-xs font-bold gap-2 cursor-pointer"
            >
              <SettingsIcon className="w-4 h-4 text-purple-600" />
              <span>إعدادات النظام والمنشأة</span>
            </DropdownMenuItem>

            <DropdownMenuSeparator />

            <DropdownMenuItem 
              onClick={handleLogout}
              className="rounded-xl py-2 text-xs font-bold gap-2 cursor-pointer text-rose-600 hover:bg-rose-50"
            >
              <LogOut className="w-4 h-4" />
              <span>تسجيل الخروج</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

      </div>

    </header>
  );
}
