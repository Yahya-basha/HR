import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '@/lib/AuthContext';
import { useI18n } from '@/lib/i18n';
import { Globe, Settings as SettingsIcon, MessageSquare, Bell, User, LogOut, ShieldCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';

export default function Header() {
  const { user, logout } = useAuth();
  const { lang, setLang } = useI18n();
  const navigate = useNavigate();

  const toggleLanguage = () => {
    setLang(lang === 'ar' ? 'en' : 'ar');
  };

  const handleLogout = () => {
    logout(true);
  };

  const initials = user?.full_name 
    ? user.full_name.split(' ').slice(0, 2).map(n => n[0]).join('') 
    : 'HR';

  return (
    <header className="sticky top-0 z-20 bg-background/95 backdrop-blur border-b border-border/50 px-5 lg:px-8 py-3 flex items-center justify-between">
      {/* Right User Info */}
      <div className="flex items-center gap-3">
        <Avatar className="w-9 h-9 border border-border shrink-0 bg-[#0B1F3A] text-white">
          <AvatarFallback className="bg-[#0B1F3A] text-[#D4AF37] font-bold text-xs">
            {initials}
          </AvatarFallback>
        </Avatar>
        <div className="text-right">
          <p className="font-bold text-xs text-foreground leading-tight">
            {user?.full_name || 'فهد ناصر محمد الجوعي'}
          </p>
          <div className="flex items-center gap-1.5 mt-0.5">
            <span className="text-[10px] text-muted-foreground font-medium">
              {user?.role === 'admin' ? 'مدير النظام' : (user?.job_title || 'موظف')}
            </span>
            {user?.employee_number && (
              <span className="text-[9px] font-mono font-bold px-1.5 py-0.2 rounded bg-primary/10 text-primary">
                #{user.employee_number}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Left Action Controls */}
      <div className="flex items-center gap-2">
        <Button 
          variant="outline" 
          size="sm" 
          onClick={toggleLanguage}
          className="h-8 text-xs font-semibold rounded-lg px-2.5 gap-1.5 border-border/80"
        >
          <Globe className="w-3.5 h-3.5" />
          <span>{lang === 'ar' ? 'English' : 'العربية'}</span>
        </Button>

        {user?.role === 'admin' && (
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={() => navigate('/settings')}
            className="h-8 w-8 text-muted-foreground hover:text-foreground"
            title="إعدادات الشركة"
          >
            <SettingsIcon className="w-4 h-4" />
          </Button>
        )}

        <Button 
          variant="ghost" 
          size="sm" 
          onClick={handleLogout}
          className="h-8 text-xs font-bold text-red-600 hover:text-red-700 hover:bg-red-50 rounded-lg px-2.5 gap-1"
          title="تسجيل الخروج"
        >
          <LogOut className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">خروج</span>
        </Button>
      </div>
    </header>
  );
}
