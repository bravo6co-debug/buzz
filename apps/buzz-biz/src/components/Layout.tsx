import { ReactNode, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { 
  Menu, 
  X, 
  QrCode, 
  BarChart3, 
  Calculator, 
  Settings, 
  Home,
  LogOut,
  User,
  Store
} from 'lucide-react';
import { Link, useLocation } from 'wouter';
import { cn } from '@/lib/utils';

interface LayoutProps {
  children: ReactNode;
}

interface NavItem {
  label: string;
  href: string;
  icon: ReactNode;
}

const navItems: NavItem[] = [
  { label: '대시보드', href: '/', icon: <Home className="h-5 w-5" /> },
  { label: 'QR 스캔', href: '/scan', icon: <QrCode className="h-5 w-5" /> },
  { label: '정산 관리', href: '/settlements', icon: <Calculator className="h-5 w-5" /> },
  { label: '통계', href: '/stats', icon: <BarChart3 className="h-5 w-5" /> },
  { label: '매장 관리', href: '/business', icon: <Store className="h-5 w-5" /> },
  { label: '설정', href: '/settings', icon: <Settings className="h-5 w-5" /> }
];

export function Layout({ children }: LayoutProps) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [location] = useLocation();

  const currentPath = location;
  const isAuthPage = currentPath === '/login';

  const toggleSidebar = () => {
    setIsSidebarOpen(!isSidebarOpen);
  };

  if (isAuthPage) {
    return <div className="min-h-screen">{children}</div>;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-40">
        <div className="flex items-center justify-between px-4 py-3">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="icon"
              onClick={toggleSidebar}
              className="md:hidden"
            >
              <Menu className="h-5 w-5" />
            </Button>
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-sm">B</span>
              </div>
              <div>
                <h1 className="font-bold text-lg text-gray-900">Buzz비즈</h1>
                <p className="text-xs text-gray-500">사업자 앱</p>
              </div>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon">
              <User className="h-5 w-5" />
            </Button>
            <Button variant="ghost" size="icon">
              <LogOut className="h-5 w-5" />
            </Button>
          </div>
        </div>
      </header>

      <div className="flex">
        {/* Sidebar */}
        <aside className={cn(
          "fixed inset-y-0 left-0 z-50 w-64 bg-white border-r border-gray-200 transform transition-transform duration-200 ease-in-out md:translate-x-0 md:static md:inset-0",
          isSidebarOpen ? "translate-x-0" : "-translate-x-full"
        )}>
          <div className="flex flex-col h-full pt-16 md:pt-0">
            {/* Sidebar Header */}
            <div className="flex items-center justify-between p-4 border-b border-gray-200 md:hidden">
              <span className="font-semibold text-gray-900">메뉴</span>
              <Button
                variant="ghost"
                size="icon"
                onClick={toggleSidebar}
              >
                <X className="h-5 w-5" />
              </Button>
            </div>

            {/* Navigation */}
            <nav className="flex-1 p-4 space-y-2">
              {navItems.map((item) => {
                const isActive = currentPath === item.href;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={cn(
                      "flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors",
                      isActive
                        ? "bg-blue-50 text-blue-700 border border-blue-200"
                        : "text-gray-700 hover:bg-gray-100"
                    )}
                    onClick={() => setIsSidebarOpen(false)}
                  >
                    {item.icon}
                    {item.label}
                  </Link>
                );
              })}
            </nav>

            {/* Business Status */}
            <div className="p-4 border-t border-gray-200">
              <Card>
                <CardContent className="p-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">매장 상태</span>
                    <div className="flex items-center gap-1">
                      <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                      <span className="text-sm font-medium text-green-600">영업중</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </aside>

        {/* Sidebar Overlay */}
        {isSidebarOpen && (
          <div
            className="fixed inset-0 z-40 bg-black bg-opacity-50 md:hidden"
            onClick={toggleSidebar}
          />
        )}

        {/* Main Content */}
        <main className="flex-1 md:ml-0">
          <div className="p-4 md:p-6 max-w-7xl mx-auto">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}