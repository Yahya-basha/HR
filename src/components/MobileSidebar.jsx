import { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '@/lib/AuthContext';
import { useI18n } from '@/lib/i18n';
import { getNavGroups } from '@/lib/nav';
import { useTheme } from '@/lib/theme';
import { 
  X, 
  ChevronLeft, 
  UserCheck, 
  Sparkles, 
  ShieldCheck, 
  Palette, 
  Sun, 
  Moon, 
  LogOut,
  Layers,
  Building2
} from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function MobileSidebar({ isOpen, onClose, isAdmin }) {
  const { user, logout } = useAuth();
  const { t } = useI18n();
  const { currentTheme, themes, setTheme, isDark, toggleDarkMode } = useTheme();
  const location = useLocation();
  const groups = getNavGroups(isAdmin, t);

  const [companyProfile, setCompanyProfile] = useState(() => {
    const saved = localStorage.getItem('hr_flow_company_profile');
    return saved ? JSON.parse(saved) : { 
      name: 'Green Arrow HR', 
      logo_url: '/green-arrow-logo.png' 
    };
  });

  useEffect(() => {
    const updateHandler = () => {
      const saved = localStorage.getItem('hr_flow_company_profile');
      if (saved) setCompanyProfile(JSON.parse(saved));
    };
    window.addEventListener('company_profile_updated', updateHandler);
    return () => window.removeEventListener('company_profile_updated', updateHandler);
  }, []);

  // Lock body scroll when mobile drawer is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  const isActive = (path) => (path === '/' ? location.pathname === '/' : location.pathname.startsWith(path));

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 lg:hidden flex justify-end" dir="rtl">
      
      {/* 1. Backdrop Overlay */}
      <div 
        onClick={onClose}
        className="fixed inset-0 bg-black/60 backdrop-blur-sm transition-opacity duration-300 animate-in fade-in"
      />

      {/* 2. Slide-out Drawer Panel */}
      <div 
        className="relative w-[85%] max-w-sm h-full flex flex-col shadow-2xl z-10 overflow-hidden animate-in slide-in-from-right duration-300 border-s border-white/10"
        style={{ backgroundColor: currentTheme?.sidebarBg || '#081C15' }}
      >
        
        {/* Drawer Header */}
        <div className="p-4 flex items-center justify-between border-b border-white/10 shrink-0 bg-black/20">
          <div className="flex items-center gap-3">
            {/* White Glass Logo Container */}
            <div className="w-11 h-11 rounded-2xl bg-white/95 backdrop-blur-md border border-white shadow-md ring-2 ring-emerald-400/30 flex items-center justify-center p-1 shrink-0">
              <img 
                src={companyProfile.logo_url || '/green-arrow-logo.png'} 
                alt="Logo" 
                className="w-full h-full object-contain filter drop-shadow-sm" 
              />
            </div>
            <div className="min-w-0">
              <h2 className="font-heading font-black text-sm text-white truncate max-w-[150px]">
                {companyProfile.name || 'Green Arrow HR'}
              </h2>
              <p className="text-[11px] text-emerald-300 font-bold truncate">
                {user?.full_name || 'بوابة منسوبي المنشأة'}
              </p>
            </div>
          </div>

          <Button 
            variant="ghost" 
            size="icon" 
            onClick={onClose}
            className="w-9 h-9 rounded-xl text-white/80 hover:text-white hover:bg-white/10 shrink-0"
            aria-label="إغلاق القائمة"
          >
            <X className="w-5 h-5" />
          </Button>
        </div>

        {/* Scrollable Navigation Groups */}
        <div className="flex-1 overflow-y-auto p-3 space-y-5 no-scrollbar">
          
          {user?.role === 'employee' ? (
            <div className="space-y-2">
              <p className="px-3 text-[11px] font-bold text-white/40 uppercase tracking-wider">
                الخدمة الذاتية
              </p>
              <Link
                to="/portal"
                onClick={onClose}
                className="flex items-center justify-between px-3.5 py-3 rounded-xl text-xs font-bold transition-all shadow-md"
                style={{
                  backgroundColor: isActive('/portal') ? (currentTheme?.sidebarActive || '#10B981') : 'rgba(255, 255, 255, 0.06)',
                  color: isActive('/portal') ? (currentTheme?.sidebarActiveText || '#FFFFFF') : '#FFFFFF'
                }}
              >
                <div className="flex items-center gap-3">
                  <UserCheck className="w-4 h-4" />
                  <span>لوحة خدماتي وبصماتي</span>
                </div>
                <ChevronLeft className="w-4 h-4" />
              </Link>
            </div>
          ) : (
            groups.map((grp, gIdx) => {
              const visibleItems = grp.items.filter(it => !it.admin || isAdmin);
              if (visibleItems.length === 0) return null;

              return (
                <div key={gIdx} className="space-y-1">
                  <p className="px-3 text-[11px] font-bold text-emerald-400/80 uppercase tracking-wider mb-1.5 flex items-center justify-between">
                    <span>{grp.label || grp.group || "القائمة"}</span>
                    <span className="text-[10px] text-white/30 font-mono">({visibleItems.length})</span>
                  </p>
                  <div className="space-y-1">
                    {visibleItems.map((item) => {
                      const active = isActive(item.to);
                      return (
                        <Link
                          key={item.to}
                          to={item.to}
                          onClick={onClose}
                          className="flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all"
                          style={{
                            backgroundColor: active ? (currentTheme?.sidebarActive || '#10B981') : 'rgba(255, 255, 255, 0.04)',
                            color: active ? (currentTheme?.sidebarActiveText || '#FFFFFF') : 'rgba(255, 255, 255, 0.85)',
                            fontWeight: active ? '700' : '500'
                          }}
                        >
                          <div className="flex items-center gap-3">
                            <item.icon 
                              className="w-4 h-4" 
                              style={{ color: active ? (currentTheme?.sidebarActiveText || '#FFFFFF') : 'rgba(255, 255, 255, 0.7)' }}
                            />
                            <span>{item.label}</span>
                          </div>
                          {active && <ChevronLeft className="w-3.5 h-3.5" />}
                        </Link>
                      );
                    })}
                  </div>
                </div>
              );
            })
          )}

        </div>

        {/* Drawer Footer Actions: Theme, Dark Mode, Logout */}
        <div className="p-3 border-t border-white/10 bg-black/30 shrink-0 space-y-2">
          <div className="grid grid-cols-2 gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={toggleDarkMode}
              className="h-9 text-[11px] font-bold rounded-xl border-white/20 bg-white/10 text-white hover:bg-white/20 justify-center gap-1.5"
            >
              {isDark ? <Sun className="w-3.5 h-3.5 text-amber-400" /> : <Moon className="w-3.5 h-3.5 text-emerald-300" />}
              <span>{isDark ? 'الوضع الفاتح' : 'الوضع الداكن'}</span>
            </Button>

            <Button
              variant="outline"
              size="sm"
              onClick={() => logout(true)}
              className="h-9 text-[11px] font-bold rounded-xl border-red-500/30 bg-red-500/15 text-red-300 hover:bg-red-500/25 justify-center gap-1.5"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>تسجيل الخروج</span>
            </Button>
          </div>
        </div>

      </div>

    </div>
  );
}
