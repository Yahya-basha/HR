import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '@/lib/AuthContext';
import { useI18n } from '@/lib/i18n';
import { useTheme } from '@/lib/theme';
import { 
  Globe, 
  Settings as SettingsIcon, 
  Palette, 
  Sun, 
  Moon, 
  LogOut, 
  ShieldCheck, 
  Sparkles,
  Check
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

export default function Header() {
  const { user, logout } = useAuth();
  const { lang, setLang } = useI18n();
  const { currentTheme, themes, setTheme, isDark, toggleDarkMode } = useTheme();
  const navigate = useNavigate();

  const [companyProfile, setCompanyProfile] = useState(() => {
    const saved = localStorage.getItem('hr_flow_company_profile');
    return saved ? JSON.parse(saved) : { name: 'HR DORAT CARS', logo_url: '' };
  });

  useEffect(() => {
    const updateHandler = () => {
      const saved = localStorage.getItem('hr_flow_company_profile');
      if (saved) setCompanyProfile(JSON.parse(saved));
    };
    window.addEventListener('company_profile_updated', updateHandler);
    return () => window.removeEventListener('company_profile_updated', updateHandler);
  }, []);

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
    <header className="sticky top-0 z-20 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border-b border-border/50 px-5 lg:px-8 py-3 flex items-center justify-between transition-colors shadow-sm">
      
      {/* Right User Info */}
      <div className="flex items-center gap-3">
        <Avatar className="w-9 h-9 border border-border shrink-0 bg-primary text-primary-foreground shadow-sm">
          <AvatarFallback className="bg-primary text-primary-foreground font-bold text-xs">
            {initials}
          </AvatarFallback>
        </Avatar>
        <div className="text-right">
          <p className="font-bold text-xs text-foreground leading-tight">
            {user?.full_name || 'يحيى باشا'}
          </p>
          <div className="flex items-center gap-1.5 mt-0.5">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
            <p className="text-[10px] text-muted-foreground font-medium">
              {user?.job_title || (user?.role === 'admin' ? 'مدير الموارد البشرية والأنظمة' : 'موظف')}
            </p>
          </div>
        </div>
      </div>

      {/* Left Action Buttons: Theme Customizer, Dark Mode, Language, Settings, Logout */}
      <div className="flex items-center gap-2">
        
        {/* 1. Quick Theme Palette Switcher Dropdown */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button 
              variant="outline" 
              size="sm" 
              className="h-9 px-3 gap-2 rounded-xl text-xs font-bold border-border/60 bg-white/90 dark:bg-slate-800/90 shadow-sm hover:bg-secondary transition-all"
            >
              <div className="flex items-center gap-1.5">
                <span 
                  className="w-3.5 h-3.5 rounded-full border border-black/10 shadow-inner" 
                  style={{ backgroundColor: currentTheme.previewPrimary }}
                />
                <span 
                  className="w-2.5 h-2.5 rounded-full -ms-2 border border-black/10 shadow-inner" 
                  style={{ backgroundColor: currentTheme.previewAccent }}
                />
              </div>
              <span className="hidden sm:inline">الثيم والمظهر</span>
              <Palette className="w-3.5 h-3.5 text-primary" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-64 p-2 rounded-2xl shadow-xl border border-border/60">
            <DropdownMenuLabel className="text-xs font-bold text-muted-foreground flex items-center justify-between pb-1">
              <span>اختر ثيم النظام الفاخر:</span>
              <Sparkles className="w-3.5 h-3.5 text-amber-500" />
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <div className="space-y-1 py-1">
              {themes.map((th) => {
                const isSelected = currentTheme.id === th.id;
                return (
                  <DropdownMenuItem
                    key={th.id}
                    onClick={() => setTheme(th.id)}
                    className="flex items-center justify-between p-2 rounded-xl text-xs font-bold cursor-pointer hover:bg-secondary transition-colors"
                  >
                    <div className="flex items-center gap-2.5">
                      <div className="flex items-center">
                        <span 
                          className="w-4 h-4 rounded-full border border-black/10 shadow-sm" 
                          style={{ backgroundColor: th.previewPrimary }} 
                        />
                        <span 
                          className="w-3 h-3 rounded-full -ms-2 border border-black/10 shadow-sm" 
                          style={{ backgroundColor: th.previewAccent }} 
                        />
                      </div>
                      <span className={isSelected ? 'text-primary' : 'text-foreground'}>{th.name.split('(')[0]}</span>
                    </div>
                    {isSelected && <Check className="w-4 h-4 text-emerald-600 font-bold" />}
                  </DropdownMenuItem>
                );
              })}
            </div>

            <DropdownMenuSeparator />
            
            {/* Dark / Light Mode Toggle */}
            <DropdownMenuItem 
              onClick={toggleDarkMode}
              className="flex items-center justify-between p-2 rounded-xl text-xs font-bold cursor-pointer hover:bg-secondary"
            >
              <div className="flex items-center gap-2">
                {isDark ? <Sun className="w-4 h-4 text-amber-500" /> : <Moon className="w-4 h-4 text-slate-700" />}
                <span>{isDark ? 'الوضع الفاتح (Light Mode)' : 'الوضع الداكن (Dark Mode)'}</span>
              </div>
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-secondary text-muted-foreground font-mono">
                {isDark ? 'ON' : 'OFF'}
              </span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        {/* 2. Language Switcher */}
        <Button
          variant="outline"
          size="sm"
          onClick={toggleLanguage}
          className="h-9 px-2.5 rounded-xl text-xs font-bold border-border/60 bg-white/90 dark:bg-slate-800/90 shadow-sm hover:bg-secondary gap-1.5"
          title="تغيير اللغة"
        >
          <Globe className="w-3.5 h-3.5 text-primary" />
          <span className="font-mono">{lang.toUpperCase()}</span>
        </Button>

        {/* 3. Settings Link */}
        {user?.role === 'admin' && (
          <Link to="/settings">
            <Button
              variant="outline"
              size="icon"
              className="h-9 w-9 rounded-xl border-border/60 bg-white/90 dark:bg-slate-800/90 shadow-sm hover:bg-secondary"
              title="إعدادات المنظومة وهوية الشركة"
            >
              <SettingsIcon className="w-4 h-4 text-foreground" />
            </Button>
          </Link>
        )}

        {/* 4. Logout Button */}
        <Button
          variant="ghost"
          size="icon"
          onClick={handleLogout}
          className="h-9 w-9 rounded-xl text-destructive hover:bg-destructive/10"
          title="تسجيل الخروج"
        >
          <LogOut className="w-4 h-4" />
        </Button>
      </div>

    </header>
  );
}
