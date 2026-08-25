import { Link } from 'react-router-dom';
import { useAuth } from '@/lib/AuthContext';
import { useI18n } from '@/lib/i18n';
import { Bell, MessageSquare, Settings as SettingsIcon } from 'lucide-react';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';

export default function Header() {
  const { user } = useAuth();
  const { t, lang, toggleLang } = useI18n();
  const isAdmin = user?.role === 'admin';

  return (
    <header className="sticky top-0 z-20 bg-background/85 backdrop-blur-md border-b border-border/60 shadow-sm">
      <div className="flex items-center justify-between h-16 px-5 lg:px-8 max-w-7xl mx-auto">
        <div className="flex items-center gap-3">
          <Avatar className="w-9 h-9">
            <AvatarFallback className="bg-primary text-primary-foreground text-sm font-semibold">
              {user?.full_name?.[0]?.toUpperCase() || user?.email?.[0]?.toUpperCase() || 'U'}
            </AvatarFallback>
          </Avatar>
          <div className="hidden sm:block">
            <p className="text-sm font-medium leading-none">{user?.full_name || user?.email}</p>
            <p className="text-xs text-muted-foreground mt-1">{isAdmin ? t('nav.administrator') : t('nav.employee')}</p>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <button className="relative w-9 h-9 rounded-xl hover:bg-secondary flex items-center justify-center text-muted-foreground transition-colors">
            <Bell className="w-5 h-5" />
            <span className="absolute top-2 end-2 w-2 h-2 rounded-full bg-accent" />
          </button>
          <button className="relative w-9 h-9 rounded-xl hover:bg-secondary flex items-center justify-center text-muted-foreground transition-colors">
            <MessageSquare className="w-5 h-5" />
            <span className="absolute top-2 end-2 w-2 h-2 rounded-full bg-accent" />
          </button>
          <Link to="/settings" className="w-9 h-9 rounded-xl hover:bg-secondary flex items-center justify-center text-muted-foreground transition-colors">
            <SettingsIcon className="w-5 h-5" />
          </Link>
          <button
            onClick={toggleLang}
            className="ms-1 h-9 px-3 rounded-xl border border-border text-sm font-medium hover:bg-secondary transition-colors"
          >
            {lang === 'en' ? 'العربية' : 'English'}
          </button>
        </div>
      </div>
    </header>
  );
}