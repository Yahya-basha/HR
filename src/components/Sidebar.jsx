import { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '@/lib/AuthContext';
import { useTheme } from '@/lib/theme';
import { EKTEFA_MODULES } from '@/lib/nav';
import { 
  Search, 
  ChevronLeft, 
  ChevronRight, 
  Sparkles, 
  UserCheck, 
  Check, 
  PanelLeftClose, 
  PanelLeftOpen 
} from 'lucide-react';

export default function Sidebar({ isAdmin, isSubMenuOpen, setIsSubMenuOpen }) {
  const { user } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  // Find active module based on current pathname
  const findModuleForPath = (pathname) => {
    for (const mod of EKTEFA_MODULES) {
      for (const item of mod.items) {
        if (item.to === '/' && pathname === '/') return mod.id;
        if (item.to !== '/' && pathname.startsWith(item.to.split('?')[0])) {
          return mod.id;
        }
      }
    }
    return 'dashboard';
  };

  const [activeModuleId, setActiveModuleId] = useState(() => findModuleForPath(location.pathname));
  const [searchQuery, setSearchQuery] = useState('');

  // Sync active module when location changes
  useEffect(() => {
    const modId = findModuleForPath(location.pathname);
    if (modId) setActiveModuleId(modId);
  }, [location.pathname]);

  const activeModule = EKTEFA_MODULES.find(m => m.id === activeModuleId) || EKTEFA_MODULES[0];

  const filteredItems = activeModule.items.filter(it => {
    const permMatch = !it.admin || isAdmin;
    const searchMatch = !searchQuery || it.label.toLowerCase().includes(searchQuery.toLowerCase());
    return permMatch && searchMatch;
  });

  const isItemActive = (to) => {
    const basePath = to.split('?')[0];
    if (basePath === '/') return location.pathname === '/';
    return location.pathname.startsWith(basePath);
  };

  return (
    <div className="hidden lg:flex fixed inset-y-0 end-0 z-40" dir="rtl">
      
      {/* ─── RAIL 1: SLIM PRIMARY ICON RAIL (68px) ────────────────────────── */}
      <aside 
        className="w-[68px] bg-white dark:bg-slate-900 border-s border-border/80 flex flex-col items-center py-3 z-20 shadow-sm shrink-0"
        style={{ borderInlineStartWidth: '1px' }}
      >
        {/* Brand Mini Logo */}
        <Link 
          to="/" 
          className="w-11 h-11 rounded-2xl bg-slate-900 text-white flex items-center justify-center shadow-md mb-4 hover:scale-105 transition-transform"
          title="Green Arrow HR"
        >
          <img src="/green-arrow-logo.png" alt="logo" className="w-7 h-7 object-contain" />
        </Link>

        {/* Primary Module Icons */}
        <div className="flex-1 flex flex-col items-center gap-2 overflow-y-auto no-scrollbar w-full px-1.5">
          {EKTEFA_MODULES.map((mod) => {
            const isCurrent = activeModuleId === mod.id;
            const Icon = mod.icon;

            return (
              <button
                key={mod.id}
                type="button"
                onClick={() => {
                  setActiveModuleId(mod.id);
                  if (!isSubMenuOpen) setIsSubMenuOpen(true);
                  // Automatically navigate to first item in module
                  const firstItem = mod.items.find(it => !it.admin || isAdmin);
                  if (firstItem && !isItemActive(firstItem.to)) {
                    navigate(firstItem.to);
                  }
                }}
                className={`group relative flex flex-col items-center justify-center w-12 h-12 rounded-2xl transition-all duration-200 ${
                  isCurrent 
                    ? 'shadow-md ring-2 ring-offset-2 ring-offset-background' 
                    : 'hover:bg-slate-100 dark:hover:bg-slate-800/80 text-muted-foreground'
                }`}
                style={{
                  backgroundColor: isCurrent ? mod.color : 'transparent',
                  color: isCurrent ? '#FFFFFF' : undefined,
                  boxShadow: isCurrent ? `0 4px 14px ${mod.color}40` : undefined
                }}
                title={mod.label}
              >
                <div 
                  className={`w-8 h-8 rounded-xl flex items-center justify-center transition-transform group-hover:scale-110 ${
                    !isCurrent ? 'bg-slate-100 dark:bg-slate-800' : ''
                  }`}
                  style={{
                    backgroundColor: !isCurrent ? `${mod.color}15` : 'transparent',
                    color: !isCurrent ? mod.color : '#FFFFFF'
                  }}
                >
                  <Icon className="w-4 h-4" />
                </div>
                <span 
                  className={`text-[9px] font-bold mt-0.5 leading-tight truncate max-w-[48px] ${
                    isCurrent ? 'text-white' : 'text-slate-600 dark:text-slate-400'
                  }`}
                >
                  {mod.label}
                </span>

                {/* Active Indicator Strip */}
                {isCurrent && (
                  <span 
                    className="absolute -end-1.5 top-1/2 -translate-y-1/2 w-1.5 h-6 rounded-s-full"
                    style={{ backgroundColor: mod.color }}
                  />
                )}
              </button>
            );
          })}
        </div>

        {/* Bottom Panel Toggle Button */}
        <button
          type="button"
          onClick={() => setIsSubMenuOpen(!isSubMenuOpen)}
          className="w-10 h-10 rounded-xl flex items-center justify-center text-muted-foreground hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors mt-2"
          title={isSubMenuOpen ? 'إخفاء القائمة الفرعية' : 'إظهار القائمة الفرعية'}
        >
          {isSubMenuOpen ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
        </button>
      </aside>

      {/* ─── RAIL 2: SECONDARY SUB-MENU PANEL (200px) ────────────────────── */}
      {isSubMenuOpen && (
        <aside 
          className="w-[200px] bg-slate-50/95 dark:bg-slate-900/95 border-s border-border/70 flex flex-col py-4 px-3 shadow-lg z-10 animate-in slide-in-from-right-2 duration-200"
        >
          {/* Sub-Menu Header & Search Input */}
          <div className="space-y-3 mb-3">
            <div className="flex items-center gap-2 px-1">
              <div 
                className="w-6 h-6 rounded-lg flex items-center justify-center text-white text-xs shrink-0"
                style={{ backgroundColor: activeModule.color }}
              >
                <activeModule.icon className="w-3.5 h-3.5" />
              </div>
              <h3 className="font-heading font-black text-xs text-foreground truncate">
                {activeModule.label}
              </h3>
            </div>

            {/* Cyan / Blue Search Bar like in Ektefa */}
            <div className="relative">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="بحث في القائمة..."
                className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl py-1.5 pe-8 ps-2 text-[11px] font-medium focus:outline-none focus:ring-1 focus:ring-sky-500"
              />
              <div className="absolute top-1/2 -translate-y-1/2 end-1 w-6 h-6 bg-sky-500 text-white rounded-lg flex items-center justify-center">
                <Search className="w-3 h-3" />
              </div>
            </div>
          </div>

          {/* Sub-Items Navigation List */}
          <nav className="flex-1 space-y-1 overflow-y-auto no-scrollbar">
            {filteredItems.map((item) => {
              const active = isItemActive(item.to);
              const ItemIcon = item.icon;

              return (
                <Link
                  key={item.to}
                  to={item.to}
                  className={`flex items-center justify-between px-3 py-2 rounded-xl text-xs font-bold transition-all duration-150 group ${
                    active
                      ? 'bg-sky-100/80 dark:bg-sky-950/60 text-sky-900 dark:text-sky-200 shadow-sm border-r-2 border-sky-600'
                      : 'text-slate-600 dark:text-slate-400 hover:bg-white dark:hover:bg-slate-800 hover:text-foreground'
                  }`}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <ItemIcon className={`w-3.5 h-3.5 shrink-0 ${active ? 'text-sky-600 dark:text-sky-400' : 'text-slate-400 group-hover:text-slate-600'}`} />
                    <span className="truncate">{item.label}</span>
                  </div>
                  {active && <Check className="w-3 h-3 text-sky-600 dark:text-sky-400 shrink-0" />}
                </Link>
              );
            })}
          </nav>

          {/* Footer Info / User Role */}
          <div className="pt-3 border-t border-border/60 text-[10px] text-muted-foreground flex items-center justify-between px-1">
            <span className="font-mono">Green Arrow HR</span>
            <span className="px-1.5 py-0.5 rounded bg-slate-200 dark:bg-slate-800 font-bold">v2.4</span>
          </div>
        </aside>
      )}

    </div>
  );
}
