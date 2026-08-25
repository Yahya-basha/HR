import { Outlet, Link, useLocation } from 'react-router-dom';
import { useAuth } from '@/lib/AuthContext';
import { useI18n } from '@/lib/i18n';
import Sidebar from '@/components/Sidebar';
import Header from '@/components/Header';
import { getNavItems } from '@/lib/nav';

export default function Layout() {
  const { user } = useAuth();
  const { t } = useI18n();
  const location = useLocation();
  const isAdmin = user?.role === 'admin';
  const items = getNavItems(isAdmin, t);

  const isActive = (path) => (path === '/' ? location.pathname === '/' : location.pathname.startsWith(path));

  return (
    <div className="min-h-screen bg-[#FBF9F5] dark:bg-background text-foreground font-sans">
      <Sidebar isAdmin={isAdmin} />
      <div className="lg:ps-64">
        <Header />
        <main className="px-5 lg:px-8 py-6 lg:py-8 pb-24 lg:pb-10 max-w-7xl mx-auto">
          <Outlet />
        </main>
      </div>

      <nav className="lg:hidden fixed bottom-0 inset-x-0 z-30 bg-[#1E1035] border-t border-white/10 flex items-center justify-around h-16 px-1 text-white">
        {items.slice(0, 5).map((item) => {
          const active = isActive(item.to);
          return (
            <Link
              key={item.to}
              to={item.to}
              className={`flex flex-col items-center justify-center gap-1 flex-1 h-full transition-colors ${
                active ? 'text-[#C5A869] font-bold' : 'text-purple-200/60'
              }`}
            >
              <item.icon className="w-5 h-5" />
              <span className="text-[10px] font-medium leading-none truncate max-w-[60px]">{item.label}</span>
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
