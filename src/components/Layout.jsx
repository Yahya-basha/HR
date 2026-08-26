import { useState } from 'react';
import { Outlet, Link, useLocation } from 'react-router-dom';
import { useAuth } from '@/lib/AuthContext';
import { useI18n } from '@/lib/i18n';
import { useTheme } from '@/lib/theme';
import Sidebar from '@/components/Sidebar';
import Header from '@/components/Header';
import MobileSidebar from '@/components/MobileSidebar';
import { getNavItems } from '@/lib/nav';
import { Grid, Menu, ChevronLeft } from 'lucide-react';

export default function Layout() {
  const { user } = useAuth();
  const { t } = useI18n();
  const { currentTheme } = useTheme();
  const location = useLocation();
  const isAdmin = user?.role === 'admin';
  const items = getNavItems(isAdmin, t);

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const isActive = (path) => (path === '/' ? location.pathname === '/' : location.pathname.startsWith(path));

  return (
    <div className="min-h-screen bg-[#F8FAFC] dark:bg-slate-950 text-foreground font-sans selection:bg-emerald-500 selection:text-white">
      
      {/* 1. Desktop Persistent Sidebar */}
      <Sidebar isAdmin={isAdmin} />

      {/* 2. Mobile Slide-out Navigation Drawer (Full Menu) */}
      <MobileSidebar 
        isOpen={mobileMenuOpen} 
        onClose={() => setMobileMenuOpen(false)} 
        isAdmin={isAdmin} 
      />

      {/* 3. Main Content Area */}
      <div className="lg:ps-64 flex flex-col min-h-screen">
        <Header onOpenMobileMenu={() => setMobileMenuOpen(true)} />
        
        <main className="flex-1 px-3 sm:px-6 lg:px-8 py-5 lg:py-8 pb-28 lg:pb-12 max-w-7xl w-full mx-auto">
          <Outlet />
        </main>
      </div>

      {/* 4. Luxury Touch-Scrollable Mobile Bottom Bar (All 19 Items + Full Menu Button) */}
      <div 
        className="lg:hidden fixed bottom-0 inset-x-0 z-40 border-t border-white/10 shadow-2xl backdrop-blur-xl transition-colors duration-300"
        style={{ backgroundColor: currentTheme?.sidebarBg ? (currentTheme.sidebarBg + 'F2') : '#081C15F2' }}
        dir="rtl"
      >
        <div className="flex items-center justify-between px-2 py-1.5">
          
          {/* Scrollable Horizontal Bar for Touch Swipe (Right & Left) */}
          <div className="flex-1 flex items-center gap-1 overflow-x-auto no-scrollbar scroll-smooth touch-pan-x pe-2">
            {items.map((item) => {
              const active = isActive(item.to);
              return (
                <Link
                  key={item.to}
                  to={item.to}
                  className="flex flex-col items-center justify-center gap-0.5 px-3 py-1.5 rounded-xl shrink-0 transition-all text-center min-w-[58px]"
                  style={{
                    backgroundColor: active ? (currentTheme?.sidebarActive || '#10B981') : 'transparent',
                    color: active ? (currentTheme?.sidebarActiveText || '#FFFFFF') : 'rgba(255, 255, 255, 0.75)'
                  }}
                >
                  <item.icon className="w-4 h-4" />
                  <span className="text-[10px] font-bold leading-tight truncate max-w-[56px]">
                    {item.label}
                  </span>
                </Link>
              );
            })}
          </div>

          {/* Fixed "All Menus" Button on the Left */}
          <button
            type="button"
            onClick={() => setMobileMenuOpen(true)}
            className="flex flex-col items-center justify-center gap-0.5 px-3 py-1.5 rounded-xl shrink-0 bg-white/10 hover:bg-white/20 border border-white/20 text-white font-bold transition-all shadow-md ms-1"
            title="فتح كافة القوائم"
          >
            <Grid className="w-4 h-4 text-emerald-400" />
            <span className="text-[10px] font-extrabold text-emerald-300">القائمة</span>
          </button>

        </div>
      </div>

    </div>
  );
}
