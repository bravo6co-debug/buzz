import { Home, MapPin, Calendar, User, Rocket } from 'lucide-react';
import { useLocation } from 'wouter';
import { cn } from '../lib/utils';

const navItems = [
  {
    key: 'home',
    label: '홈',
    href: '/',
    icon: Home,
  },
  {
    key: 'recommendations',
    label: '지역추천',
    href: '/recommendations',
    icon: MapPin,
  },
  {
    key: 'referrals',
    label: '마케터',
    href: '/referrals',
    icon: Rocket,
  },
  {
    key: 'events',
    label: '이벤트',
    href: '/events',
    icon: Calendar,
  },
  {
    key: 'my',
    label: '마이',
    href: '/my',
    icon: User,
  },
];

export function BottomNavigation() {
  const [location, navigate] = useLocation();

  const handleNavigate = (href: string) => {
    navigate(href);
  };

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-background border-t border-border z-50 safe-area-pb">
      <div className="flex items-center justify-around px-2 py-1">
        {navItems.map((item) => {
          const IconComponent = item.icon;
          const isActive = location === item.href;

          return (
            <button
              key={item.key}
              onClick={() => handleNavigate(item.href)}
              className={cn(
                "flex flex-col items-center justify-center min-w-0 flex-1 py-2 px-1 transition-colors",
                "hover:bg-accent/50 rounded-lg",
                isActive
                  ? "text-primary"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <IconComponent 
                className={cn(
                  "h-5 w-5 mb-1",
                  isActive ? "stroke-2" : "stroke-1.5"
                )} 
              />
              <span className={cn(
                "text-xs leading-none",
                isActive ? "font-semibold" : "font-normal"
              )}>
                {item.label}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}