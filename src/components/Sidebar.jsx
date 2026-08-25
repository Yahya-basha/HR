import { Link, useLocation } from 'react-router-dom';
import { useI18n } from '@/lib/i18n';
import { getNavItems } from '@/lib/nav';
import { ShieldCheck } from 'lucide-react';

export default function Sidebar({ isAdmin }) {
  const { t } = useI18n();
  const location = useLocation();
  const items = getNavItems(isAdmin, t);

  const isActive = (path) => (path === '/' ? location.pathname === '/' : location.pathname.startsWith(path));

  return (
    <aside className="hidden lg:flex fixed inset-y-0 start-0 w-20 bg-primary flex-col items-center z-30 py-6">
      <div className="w-11 h-11 rounded-2xl bg-accent flex items-center justify-center mb-8 shrink-0">
        <ShieldCheck className="w-5 h-5 text-accent-foreground" />
      </div>
      <nav className="flex-1 flex flex-col items-center gap-2 w-full">
        {items.map((item) => {
          const active = isActive(item.to);
          return (
            <Link
              key={item.to}
              to={item.to}
              className={`group relative w-12 h-12 rounded-2xl flex items-center justify-center transition-colors ${
                active
                  ? 'bg-accent text-accent-foreground'
                  : 'text-primary-foreground/60 hover:bg-white/10 hover:text-primary-foreground'
              }`}
            >
              <item.icon className="w-5 h-5" />
              <span className="absolute start-full ms-3 top-1/2 -translate-y-1/2 whitespace-nowrap bg-primary text-primary-foreground px-3 py-1.5 rounded-lg text-xs font-medium opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none shadow-xl z-50">
                {item.label}
              </span>
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}