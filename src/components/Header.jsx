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
  Check,
  Menu
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

export default function Header({ onOpenMobileMenu }) {
  const { user, logout } = useAuth();
  const { lang, setLang } = useI18n();
  const { currentTheme, themes, setTheme, isDark, toggleDarkMode } = useTheme();
  const navigate = useNavigate();

  const [companyProfile, setCompanyProfile] = useState(() => {
    const saved = localStorage.getItem('hr_flow_company_profile');
    return saved ? JSON.parse(saved) : { name: 'Green Arrow HR', logo_url: '/green-arrow-logo.png' };
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
    : 'GA';

  return (
    <header className="sticky top-0 z-20 bg-white/85 dark:bg-slate-900/85 backdrop-blur-md border-b border-border/50 px-4 lg:px-8 py-2.5 lg:py-3 flex items-center justify-between transition-colors shadow-sm">
      
      {/* Right User & Mobile Brand Toggle */}
      <div className="flex items-center gap-2.5">
        
        {/* Mobile Hamburger Button */}
        <Button
          variant="outline"
          size="icon"
          onClick={onOpenMobileMenu}
          className="lg:hidden h-9 w-9 rounded-xl border-border/60 bg-white/90 dark:bg-slate-800/90 shadow-sm hover:bg-secondary shrink-0 text-foreground"
          aria-label="فتح القائمة الكاملة"
        >
          <Menu className="w-5 h-5 text-primary" />
        </Button>

        {/* Mobile Logo for instant brand recognition */}
        <div className="lg:hidden w-8 h-8 rounded-xl bg-white border border-slate-200 shadow-sm flex items-center justify-center p-1 shrink-0">
          <img src="/green-arrow-logo.png" alt="Logo" className="w-full h-full object-contain" />
        </div>

        <Avatar className="hidden sm:flex w-9 h-9 border border-border shrink-0 bg-primary text-primary-foreground shadow-sm">
          <AvatarFallback className="bg-primary text-primary-foreground font-bold text-xs">
            {initials}
          </AvatarFallback>
        </Avatar>

        <div className="text-right min-w-0">
          <p className="font-bold text-xs text-foreground leading-tight truncate max-w-[140px] sm:max-w-[200px]">
            {user?.full_name || 'يحيى باشا'}
          </p>
          <div className="flex items-center gap-1.5 mt-0.5">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0"></span>
            <p className="text-[10px] text-muted-foreground font-medium truncate max-w-[120px] sm:max-w-[180px]">
              {user?.job_title || (user?.role === 'admin' ? 'مدير الموارد البشرية' : 'موظف')}
            </p>
          </div>
        </div>
      </div>

      {/* Left Action Buttons: Theme Customizer, Dark Mode, Language, Settings, Logout */}
      <div className="flex items-center gap-1.5 sm:gap-2">
        
        {/* Quick Theme Palette Switcher Dropdown */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button 
              variant="outline" 
              size="sm" 
              className="h-8 sm:h-9 px-2 sm:px-3 gap-1.5 rounded-xl text-xs font-bold border-border/60 bg-white/90 dark:bg-slate-800/90 shadow-sm hover:bg-secondary transition-all"
            >
              <div className="flex items-center gap-1">
                <span 
                  className="w-3 h-3 sm:w-3.5 sm:h-3.5 rounded-full border border-black/10 shadow-inner" 
                  style={{ backgroundColor: currentTheme.previewPrimary }}
                />
                <span 
                  className="w-2 h-2 sm:w-2.5 sm:h-2.5 rounded-full -ms-1.5 border border-black/10 shadow-inner" 
                  style={{ backgroundColor: currentTheme.previewAccent }}
                />
              </div>
              <span className="hidden md:inline">الثيم</span>
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
                      <span className={isSelected ? 'text-primary font-black' : 'text-foreground'}>{th.name.split('(')[0]}</span>
                    </div>
                    {isSelected && <Check className="w-4 h-4 text-emerald-600 font-bold" />}
                  </DropdownMenuItem>
                );
              })}
            </div>

            <DropdownMenuSeparator />
            
            <DropdownMenuItem 
              onClick={toggleDarkMode}
              className="flex items-center justify-between p-2 rounded-xl text-xs font-bold cursor-pointer hover:bg-secondary"
            >
              <div className="flex items-center gap-2">
                {isDark ? <Sun className="w-4 h-4 text-amber-500" /> : <Moon className="w-4 h-4 text-slate-700" />}
                <span>{isDark ? 'الوضع الفاتح' : 'الوضع الداكن'}</span>
              </div>
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-secondary text-muted-foreground font-mono">
                {isDark ? 'ON' : 'OFF'}
              </span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Language Switcher */}
        <Button
          variant="outline"
          size="sm"
          onClick={toggleLanguage}
          className="h-8 sm:h-9 px-2 sm:px-2.5 rounded-xl text-xs font-bold border-border/60 bg-white/90 dark:bg-slate-800/90 shadow-sm hover:bg-secondary gap-1"
          title="تغيير اللغة"
        >
          <Globe className="w-3.5 h-3.5 text-primary" />
          <span className="font-mono text-[11px]">{lang.toUpperCase()}</span>
        </Button>

        {/* Settings Link */}
        {user?.role === 'admin' && (
          <Link to="/settings">
            <Button
              variant="outline"
              size="icon"
              className="h-8 sm:h-9 w-8 sm:w-9 rounded-xl border-border/60 bg-white/90 dark:bg-slate-800/90 shadow-sm hover:bg-secondary"
              title="إعدادات المنظومة"
            >
              <SettingsIcon className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-foreground" />
            </Button>
          </Link>
        )}

        {/* Logout Button */}
        <Button
          variant="ghost"
          size="icon"
          onClick={handleLogout}
          className="h-8 sm:h-9 w-8 sm:w-9 rounded-xl text-destructive hover:bg-destructive/10"
          title="تسجيل الخروج"
        >
          <LogOut className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
        </Button>
      </div>

    </header>
  );
}
