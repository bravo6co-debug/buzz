import { useState } from 'react';
import { Link, useLocation } from 'wouter';
import {
  BarChart3,
  Settings,
  Store,
  FileText,
  Users,
  TrendingUp,
  Shield,
  LogOut,
  Menu,
  X,
} from 'lucide-react';
import { cn } from '../lib/utils';
import { Button } from './ui/button';

const navigation = [
  {
    name: '대시보드',
    href: '/',
    icon: BarChart3,
  },
  {
    name: '정책 관리',
    href: '/policies',
    icon: Settings,
  },
  {
    name: '사업자 관리',
    href: '/businesses',
    icon: Store,
  },
  {
    name: '컨텐츠 관리',
    href: '/contents',
    icon: FileText,
  },
  {
    name: '사용자 관리',
    href: '/users',
    icon: Users,
  },
  {
    name: '통계/분석',
    href: '/analytics',
    icon: TrendingUp,
  },
];

export const Sidebar = () => {
  const [location] = useLocation();
  const [isCollapsed, setIsCollapsed] = useState(false);

  return (
    <>
      {/* Mobile backdrop */}
      {!isCollapsed && (
        <div 
          className="lg:hidden fixed inset-0 bg-black bg-opacity-50 z-40"
          onClick={() => setIsCollapsed(true)}
        />
      )}
      
      {/* Sidebar */}
      <div className={cn(
        "bg-white shadow-lg transition-all duration-300 z-50",
        "lg:relative lg:block",
        isCollapsed ? "w-16" : "w-64",
        "lg:translate-x-0",
        !isCollapsed ? "fixed inset-y-0 left-0" : "fixed inset-y-0 -translate-x-full lg:translate-x-0"
      )}>
        <div className="flex flex-col h-full">
          {/* Header */}
          <div className="flex items-center justify-between h-16 px-4 border-b border-gray-200">
            {!isCollapsed && (
              <div className="flex items-center space-x-2">
                <Shield className="w-8 h-8 text-primary" />
                <span className="text-xl font-bold text-gray-900">Buzz 관리자</span>
              </div>
            )}
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setIsCollapsed(!isCollapsed)}
              className="lg:hidden"
            >
              {isCollapsed ? <Menu className="w-5 h-5" /> : <X className="w-5 h-5" />}
            </Button>
          </div>

          {/* Navigation */}
          <nav className="flex-1 px-4 py-6 space-y-2">
            {navigation.map((item) => {
              const isActive = location === item.href || 
                (item.href !== '/' && location.startsWith(item.href));
              
              return (
                <Link key={item.name} href={item.href}>
                  <a className={cn(
                    "flex items-center px-3 py-2 rounded-lg text-sm font-medium transition-colors",
                    "hover:bg-gray-100 hover:text-gray-900",
                    isActive 
                      ? "bg-primary text-primary-foreground" 
                      : "text-gray-700",
                    isCollapsed && "justify-center px-2"
                  )}>
                    <item.icon className={cn(
                      "w-5 h-5",
                      !isCollapsed && "mr-3"
                    )} />
                    {!isCollapsed && <span>{item.name}</span>}
                  </a>
                </Link>
              );
            })}
          </nav>

          {/* Footer */}
          <div className="p-4 border-t border-gray-200">
            <Button
              variant="ghost"
              className={cn(
                "w-full justify-start text-gray-700 hover:text-gray-900",
                isCollapsed && "justify-center px-2"
              )}
            >
              <LogOut className={cn(
                "w-5 h-5",
                !isCollapsed && "mr-3"
              )} />
              {!isCollapsed && <span>로그아웃</span>}
            </Button>
          </div>
        </div>
      </div>
    </>
  );
};