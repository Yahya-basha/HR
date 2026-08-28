import SessionGuardian from '@/components/SessionGuardian';
import { useState } from 'react';
import { Outlet, Link, useLocation } from 'react-router-dom';
import { useAuth } from '@/lib/AuthContext';
import { useI18n } from '@/lib/i18n';
import Sidebar from '@/components/Sidebar';
import Header from '@/components/Header';
import MobileSidebar from '@/components/MobileSidebar';
import { getNavItems } from '@/lib/nav';
import { Grid, Menu, ChevronLeft } from 'lucide-react';

export default function Layout() {
  const { user } = useAuth();
  const { t } = useI18n();
  const location = useLocation();
  const isAdmin = user?.role === 'admin' || true;
  const items = getNavItems(isAdmin, t);

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isSubMenuOpen, setIsSubMenuOpen] = useState(true);

  const isActive = (path) => {
    const base = path.split('?')[0];
    if (base === '/') return location.pathname === '/';
    return location.pathname.startsWith(base);
  };

  // Explicit physical RIGHT padding on desktop:
  // When submenu is open: 68px + 200px = 268px -> lg:pr-[268px]
  // When submenu is closed: 68px -> lg:pr-[68px]
  const desktopRightPadding = isSubMenuOpen ? 'lg:pr-[268px]' : 'lg:pr-[68px]';

  return (
    <div className="min-h-screen bg-[#F8FAFC] dark:bg-slate-950 text-foreground font-sans selection:bg-sky-500 selection:text-white" dir="rtl">
      <SessionGuardian />
      
      {/* 1. Desktop Persistent Dual-Sidebar (Fixed on the RIGHT) */}
      <Sidebar 
        isAdmin={isAdmin} 
        isSubMenuOpen={isSubMenuOpen} 
        setIsSubMenuOpen={setIsSubMenuOpen} 
      />

      {/* 2. Mobile Slide-out Drawer */}
      <MobileSidebar 
        isOpen={mobileMenuOpen} 
        onClose={() => setMobileMenuOpen(false)} 
        isAdmin={isAdmin} 
      />

      {/* 3. Main Content Area with EXPLICIT right padding */}
      <div className={`${desktopRightPadding} flex flex-col min-h-screen transition-all duration-200`}>
        <Header onOpenMobileMenu={() => setMobileMenuOpen(true)} />
        
        <main className="flex-1 px-4 sm:px-6 lg:px-8 py-5 lg:py-6 pb-28 lg:pb-12 max-w-[1650px] w-full mx-auto">
          <Outlet />
        </main>
      </div>

      {/* 4. Mobile Bottom Touch-Bar */}
      <div 
        className="lg:hidden fixed bottom-0 inset-x-0 z-40 bg-white/95 dark:bg-slate-900/95 border-t border-border/80 shadow-2xl backdrop-blur-xl"
        dir="rtl"
      >
        <div className="flex items-center justify-between px-2 py-1.5">
          
          <div className="flex-1 flex items-center gap-1 overflow-x-auto no-scrollbar scroll-smooth touch-pan-x pe-2">
            {items.map((item, idx) => {
              const active = isActive(item.to);
              const ItemIcon = item.icon;
              return (
                <Link
                  key={idx}
                  to={item.to}
                  className={`flex flex-col items-center justify-center gap-0.5 px-3 py-1.5 rounded-xl shrink-0 transition-all text-center min-w-[58px] ${
                    active
                      ? 'bg-sky-500 text-white shadow-md'
                      : 'text-muted-foreground hover:bg-slate-100 dark:hover:bg-slate-800'
                  }`}
                >
                  <ItemIcon className="w-4 h-4" />
                  <span className="text-[10px] font-bold leading-tight truncate max-w-[56px]">
                    {item.label}
                  </span>
                </Link>
              );
            })}
          </div>

          <button
            type="button"
            onClick={() => setMobileMenuOpen(true)}
            className="flex flex-col items-center justify-center gap-0.5 px-3 py-1.5 rounded-xl shrink-0 bg-slate-900 text-white font-bold transition-all shadow-md ms-1"
            title="فتح كافة القوائم"
          >
            <Grid className="w-4 h-4 text-sky-400" />
            <span className="text-[10px] font-extrabold text-sky-300">القائمة</span>
          </button>

        </div>
      </div>

    </div>
  );
}
