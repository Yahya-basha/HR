import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '@/lib/AuthContext';
import { useI18n } from '@/lib/i18n';
import { getNavGroups } from '@/lib/nav';
import { ChevronLeft } from 'lucide-react';

export default function Sidebar({ isAdmin }) {
  const { t } = useI18n();
  const location = useLocation();
  const groups = getNavGroups(isAdmin, t);

  const isActive = (path) => (path === '/' ? location.pathname === '/' : location.pathname.startsWith(path));

  return (
    <aside className="hidden lg:flex fixed inset-y-0 start-0 w-64 bg-[#1E1035] text-white flex-col z-30 shadow-2xl border-e border-white/5 overflow-y-auto">
      {/* Brand Header */}
      <div className="p-5 flex items-center justify-between border-b border-white/10 shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-blue-600 to-indigo-500 border-2 border-white/20 flex items-center justify-center font-bold text-sm shadow-md text-white">
            DC
          </div>
          <div>
            <h2 className="font-heading font-bold text-sm tracking-wide text-white">HR DORAT CARS</h2>
            <p className="text-[11px] text-purple-300/70 font-medium">مدير النظام</p>
          </div>
        </div>
      </div>

      {/* Navigation Groups */}
      <nav className="flex-1 p-3 space-y-6">
        {groups.map((grp, gIdx) => {
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
        })}
      </nav>
    </aside>
  );
}
