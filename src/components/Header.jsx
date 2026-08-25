import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '@/lib/AuthContext';
import { useI18n } from '@/lib/i18n';
import { Globe, Settings as SettingsIcon, MessageSquare, Bell, User } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';

export default function Header() {
  const { user } = useAuth();
  const { lang, setLang } = useI18n();
  const navigate = useNavigate();

  const toggleLanguage = () => {
    setLang(lang === 'ar' ? 'en' : 'ar');
  };

  return (
    <header className="sticky top-0 z-20 bg-background/95 backdrop-blur border-b border-border/50 px-5 lg:px-8 py-3 flex items-center justify-between">
      {/* Right User Info */}
      <div className="flex items-center gap-3">
        <Avatar className="w-9 h-9 border border-border shrink-0 bg-[#2D164D] text-white">
          <AvatarFallback className="bg-[#2D164D] text-white font-bold text-xs">
            ف
          </AvatarFallback>
        </Avatar>
        <div className="text-right">
          <p className="font-bold text-xs text-foreground leading-tight">فهد ناصر محمد الجوعي</p>
          <span className="text-[10px] text-muted-foreground font-medium">مدير</span>
        </div>
      </div>

      {/* Left Action Controls */}
      <div className="flex items-center gap-2">
        <Button 
          variant="outline" 
          size="sm" 
          onClick={toggleLanguage}
          className="h-8 text-xs font-semibold rounded-lg px-2.5 gap-1.5 border-border/80"
        >
          <Globe className="w-3.5 h-3.5" />
          <span>{lang === 'ar' ? 'English' : 'العربية'}</span>
        </Button>

        <Button 
          variant="ghost" 
          size="icon" 
          onClick={() => navigate('/settings')}
          className="h-8 w-8 text-muted-foreground hover:text-foreground"
        >
          <SettingsIcon className="w-4 h-4" />
        </Button>

        <Button 
          variant="ghost" 
          size="icon" 
          className="h-8 w-8 text-muted-foreground hover:text-foreground"
        >
          <MessageSquare className="w-4 h-4" />
        </Button>

        <Button 
          variant="ghost" 
          size="icon" 
          className="h-8 w-8 text-muted-foreground hover:text-foreground"
        >
          <Bell className="w-4 h-4" />
        </Button>
      </div>
    </header>
  );
}
