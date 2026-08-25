import { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '@/lib/AuthContext';
import { useI18n } from '@/lib/i18n';
import { getNavGroups } from '@/lib/nav';
import { ChevronLeft, UserCheck, Sparkles } from 'lucide-react';

export default function Sidebar({ isAdmin }) {
  const { user } = useAuth();
  const { t } = useI18n();
  const location = useLocation();
  const groups = getNavGroups(isAdmin, t);

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

  const isActive = (path) => (path === '/' ? location.pathname === '/' : location.pathname.startsWith(path));

  return (
    <aside className="hidden lg:flex fixed inset-y-0 start-0 w-64 bg-[#1E1035] text-white flex-col z-30 shadow-2xl border-e border-white/5 overflow-y-auto">
      {/* Brand Header with Uploaded/Default Logo */}
      <div className="p-5 flex items-center justify-between border-b border-white/10 shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-white/10 border border-white/20 flex items-center justify-center overflow-hidden shrink-0 shadow-md">
            {companyProfile.logo_url ? (
              <img src={companyProfile.logo_url} alt="Logo" className="w-full h-full object-contain p-1" />
            ) : (
              <div className="w-full h-full bg-gradient-to-tr from-blue-600 to-indigo-500 flex items-center justify-center font-bold text-xs text-white">
                DC
              </div>
            )}
          </div>
          <div>
            <h2 className="font-heading font-bold text-sm tracking-wide text-white truncate max-w-[150px]">
              {companyProfile.name || 'HR DORAT CARS'}
            </h2>
            <p className="text-[11px] text-purple-300/70 font-medium">
              {user?.role === 'employee' ? 'بوابة الموظف الذاتية' : 'مدير النظام'}
            </p>
          </div>
        </div>
      </div>

      {/* Navigation Links */}
      <nav className="flex-1 p-3 space-y-6">
        {/* If user is an employee, show Dedicated Employee Portal Nav */}
        {user?.role === 'employee' ? (
          <div className="space-y-2">
            <p className="px-3 text-[11px] font-bold text-purple-300/50 uppercase tracking-wider mb-2">
              الخدمة الذاتية
            </p>
            <Link
              to="/portal"
              className={`flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all ${
                isActive('/portal') ? 'bg-[#C5A869] text-[#1E1035] font-bold shadow-md' : 'text-purple-100/75 hover:bg-white/10'
              }`}
            >
              <div className="flex items-center gap-3">
                <UserCheck className="w-4 h-4" />
                <span>لوحة خدماتي وبصماتي</span>
              </div>
              <ChevronLeft className="w-3.5 h-3.5" />
            </Link>
          </div>
        ) : (
          /* Full Admin Nav Groups */
          groups.map((grp, gIdx) => {
            const visibleItems = grp.items.filter(it => !it.admin || isAdmin);
            if (visibleItems.length === 0) return null;

            return (
              <div key={gIdx} className="space-y-1">
                <p className="px-3 text-[11px] font-bold text-purple-300/50 uppercase tracking-wider mb-2">
                  {grp.group}
                </p>
                <div className="space-y-1">
                  {visibleItems.map((item) => {
                    const active = isActive(item.to);
                    return (
                      <Link
                        key={item.to}
                        to={item.to}
                        className={`flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all group ${
                          active
                            ? 'bg-[#C5A869] text-[#1E1035] font-bold shadow-md'
                            : 'text-purple-100/75 hover:text-white hover:bg-white/10'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <item.icon className={`w-4 h-4 ${active ? 'text-[#1E1035]' : 'text-purple-300/80 group-hover:text-white'}`} />
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
