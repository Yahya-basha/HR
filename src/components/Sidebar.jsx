import { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '@/lib/AuthContext';
import { useI18n } from '@/lib/i18n';
import { getNavGroups } from '@/lib/nav';
import { useTheme } from '@/lib/theme';
import { ChevronLeft, UserCheck, Sparkles } from 'lucide-react';

export default function Sidebar({ isAdmin }) {
  const { user } = useAuth();
  const { t } = useI18n();
  const { currentTheme } = useTheme();
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

  const isActive = (path) => (path === '/' ? location.pathname === '/' : location.pathname.startsWith(path));

  return (
    <aside 
      className="hidden lg:flex fixed inset-y-0 start-0 w-64 text-white flex-col z-30 shadow-2xl border-e border-white/10 overflow-y-auto transition-colors duration-300"
      style={{ backgroundColor: currentTheme?.sidebarBg || '#081C15' }}
    >
      {/* Brand Header with Luxury White Glass Green Arrow Logo */}
      <div className="p-5 flex items-center justify-between border-b border-white/10 shrink-0">
        <div className="flex items-center gap-3.5">
          {/* Ultra-White Glass Logo Container */}
          <div className="w-12 h-12 rounded-2xl bg-white/95 backdrop-blur-md border-2 border-white shadow-[0_8px_25px_rgba(0,0,0,0.3)] ring-2 ring-emerald-400/40 flex items-center justify-center overflow-hidden shrink-0 transition-transform duration-300 hover:scale-105 p-1">
            <img 
              src={companyProfile.logo_url || '/green-arrow-logo.png'} 
              alt="Green Arrow Logo" 
              className="w-full h-full object-contain filter drop-shadow-sm" 
            />
          </div>

          <div className="min-w-0">
            <h2 className="font-heading font-black text-sm tracking-wide text-white truncate max-w-[145px] drop-shadow-sm">
              {companyProfile.name || 'Green Arrow HR'}
            </h2>
            <div className="flex items-center gap-1.5 mt-0.5">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
              <p className="text-[11px] text-emerald-200/80 font-medium truncate">
                {user?.role === 'employee' ? 'بوابة الخدمة الذاتية' : 'إدارة الموارد البشرية'}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Navigation Links */}
      <nav className="flex-1 p-3 space-y-6">
        {user?.role === 'employee' ? (
          <div className="space-y-2">
            <p className="px-3 text-[11px] font-bold text-white/40 uppercase tracking-wider mb-2">
              الخدمة الذاتية
            </p>
            <Link
              to="/portal"
              className="flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all shadow-md"
              style={{
                backgroundColor: isActive('/portal') ? (currentTheme?.sidebarActive || '#10B981') : 'transparent',
                color: isActive('/portal') ? (currentTheme?.sidebarActiveText || '#FFFFFF') : 'rgba(255, 255, 255, 0.8)'
              }}
            >
              <div className="flex items-center gap-3">
                <UserCheck className="w-4 h-4" />
                <span>لوحة خدماتي وبصماتي</span>
              </div>
              <ChevronLeft className="w-3.5 h-3.5" />
            </Link>
          </div>
        ) : (
          groups.map((grp, gIdx) => {
            const visibleItems = grp.items.filter(it => !it.admin || isAdmin);
            if (visibleItems.length === 0) return null;

            return (
              <div key={gIdx} className="space-y-1">
                <p className="px-3 text-[11px] font-bold text-white/40 uppercase tracking-wider mb-2">
                  {grp.group}
                </p>
                <div className="space-y-1">
                  {visibleItems.map((item) => {
                    const active = isActive(item.to);
                    return (
                      <Link
                        key={item.to}
                        to={item.to}
                        className="flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all group"
                        style={{
                          backgroundColor: active ? (currentTheme?.sidebarActive || '#10B981') : 'transparent',
                          color: active ? (currentTheme?.sidebarActiveText || '#FFFFFF') : 'rgba(255, 255, 255, 0.75)',
                          fontWeight: active ? '700' : '500'
                        }}
                      >
                        <div className="flex items-center gap-3">
                          <item.icon 
                            className="w-4 h-4 transition-colors" 
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
      </nav>
    </aside>
  );
}
