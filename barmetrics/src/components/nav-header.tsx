'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Wine, Package, Scale, ClipboardList, FileBarChart, Tag, QrCode, Scan, History, Users, LogOut, LogIn, Settings } from 'lucide-react';
import { useAuth } from '@/contexts/auth-context';
import { PERMISSIONS, getRoleDisplayName, getRoleBadgeColor } from '@/lib/permissions';

const navItems = [
  { href: '/', label: 'Home', icon: Wine, permission: null },
  { href: '/products', label: 'Products', icon: Package, permission: null },
  { href: '/skus', label: 'SKUs', icon: Tag, permission: PERMISSIONS.SKU_VIEW },
  { href: '/labels', label: 'Labels', icon: QrCode, permission: PERMISSIONS.LABEL_VIEW },
  { href: '/scan', label: 'Scan', icon: Scan, permission: PERMISSIONS.LABEL_SCAN },
  { href: '/measure', label: 'Measure', icon: Scale, permission: null },
  { href: '/sessions', label: 'Sessions', icon: ClipboardList, permission: null },
  { href: '/audit/labels', label: 'Audit', icon: History, permission: PERMISSIONS.AUDIT_VIEW },
  { href: '/reports', label: 'Reports', icon: FileBarChart, permission: null },
  { href: '/users', label: 'Users', icon: Users, permission: PERMISSIONS.USER_VIEW },
];

export function NavHeader() {
  const pathname = usePathname();
  const router = useRouter();
  const { user, isAuthenticated, isLoading, logout, hasPermission } = useAuth();

  const handleLogout = async () => {
    await logout();
    router.push('/login');
  };

  // Filter nav items based on permissions
  const visibleNavItems = navItems.filter((item) => {
    if (!item.permission) return true;
    if (!isAuthenticated) return false;
    return hasPermission(item.permission);
  });

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-14 items-center justify-between">
        <div className="flex items-center">
          <Link href="/" className="mr-6 flex items-center space-x-2">
            <Wine className="h-6 w-6" />
            <span className="hidden font-bold sm:inline-block">BarMetrics</span>
          </Link>
          <nav className="flex items-center space-x-1 text-sm font-medium">
            {visibleNavItems.map((item) => {
              const isActive = pathname === item.href ||
                (item.href !== '/' && pathname.startsWith(item.href));
              return (
                <Button
                  key={item.href}
                  asChild
                  variant={isActive ? 'secondary' : 'ghost'}
                  size="sm"
                  className={cn(
                    'gap-2',
                    isActive && 'bg-muted font-semibold'
                  )}
                >
                  <Link href={item.href}>
                    <item.icon className="h-4 w-4" />
                    <span className="hidden md:inline">{item.label}</span>
                  </Link>
                </Button>
              );
            })}
          </nav>
        </div>

        <div className="flex items-center gap-4">
          {isLoading ? (
            <div className="text-sm text-gray-500">Loading...</div>
          ) : isAuthenticated && user ? (
            <div className="flex items-center gap-3">
              <div className="hidden sm:flex items-center gap-2">
                <span className="text-sm font-medium">{user.displayName}</span>
                <span className={cn('px-2 py-0.5 text-xs font-medium rounded', getRoleBadgeColor(user.role))}>
                  {getRoleDisplayName(user.role)}
                </span>
              </div>
              <Button asChild variant="ghost" size="sm" className="gap-2">
                <Link href="/settings">
                  <Settings className="h-4 w-4" />
                  <span className="hidden sm:inline">Settings</span>
                </Link>
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleLogout}
                className="gap-2"
              >
                <LogOut className="h-4 w-4" />
                <span className="hidden sm:inline">Logout</span>
              </Button>
            </div>
          ) : (
            <Button asChild variant="ghost" size="sm" className="gap-2">
              <Link href="/login">
                <LogIn className="h-4 w-4" />
                <span className="hidden sm:inline">Login</span>
              </Link>
            </Button>
          )}
        </div>
      </div>
    </header>
  );
}
