import { useAuth } from '@/lib/AuthContext';
import { useI18n } from '@/lib/i18n';
import { Languages, Bell, User } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';

export default function Settings() {
  const { user } = useAuth();
  const { t, lang, setLang } = useI18n();
  const isAdmin = user?.role === 'admin';

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <h1 className="text-2xl font-heading font-bold">{t('settings.title')}</h1>
      </div>

      <Card className="p-6 border-border/60 shadow-sm">
        <div className="flex items-center gap-3 mb-5">
          <div className="w-11 h-11 rounded-xl bg-accent/20 text-accent-foreground flex items-center justify-center shrink-0">
            <Languages className="w-5 h-5" />
          </div>
          <div>
            <p className="font-semibold">{t('settings.language')}</p>
            <p className="text-sm text-muted-foreground">{t('settings.languageDesc')}</p>
          </div>
        </div>
        <div className="flex gap-3">
          <button
            onClick={() => setLang('en')}
            className={`flex-1 h-12 rounded-xl border text-sm font-medium transition-colors ${lang === 'en' ? 'bg-accent text-accent-foreground border-accent' : 'border-border hover:bg-secondary'}`}
          >
            English
          </button>
          <button
            onClick={() => setLang('ar')}
            className={`flex-1 h-12 rounded-xl border text-sm font-medium transition-colors ${lang === 'ar' ? 'bg-accent text-accent-foreground border-accent' : 'border-border hover:bg-secondary'}`}
          >
            العربية
          </button>
        </div>
      </Card>

      <Card className="p-6 border-border/60 shadow-sm">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
              <User className="w-5 h-5" />
            </div>
            <div>
              <p className="font-semibold">{t('settings.account')}</p>
              <p className="text-sm text-muted-foreground">{user?.email}</p>
            </div>
          </div>
          <Badge className={isAdmin ? 'bg-accent text-accent-foreground' : 'bg-primary/10 text-primary'}>
            {isAdmin ? t('nav.administrator') : t('nav.employee')}
          </Badge>
        </div>
      </Card>

      <Card className="p-6 border-border/60 shadow-sm">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl bg-emerald-100 text-emerald-600 flex items-center justify-center shrink-0">
              <Bell className="w-5 h-5" />
            </div>
            <div>
              <p className="font-semibold">{t('settings.notifications')}</p>
              <p className="text-sm text-muted-foreground">{t('settings.notificationsDesc')}</p>
            </div>
          </div>
          <Switch defaultChecked />
        </div>
      </Card>
    </div>
  );
}