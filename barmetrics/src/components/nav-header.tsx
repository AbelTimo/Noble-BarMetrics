'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Wine, Package, Scale, ClipboardList, FileBarChart, Tag, Users, LogOut, LogIn, Settings, Menu, PackagePlus, QrCode, Tags, MapPin, CookingPot, DollarSign, TrendingDown, FileText } from 'lucide-react';
import { useAuth } from '@/contexts/auth-context';
import { PERMISSIONS, getRoleDisplayName } from '@/lib/permissions';
import { BluetoothStatusIndicator } from '@/components/bluetooth-status-indicator';
import { useState, useEffect, useRef } from 'react';

const navItems = [
  { href: '/dashboard', label: 'Home', icon: Wine, permission: null },
  { href: '/products', label: 'Products', icon: Package, permission: null },
  { href: '/skus', label: 'SKUs', icon: Tag, permission: PERMISSIONS.SKU_VIEW },
  { href: '/labels', label: 'Labels', icon: Tags, permission: PERMISSIONS.LABEL_VIEW },
  { href: '/locations', label: 'Locations', icon: MapPin, permission: PERMISSIONS.LOCATION_VIEW },
  { href: '/scan', label: 'Scan QR', icon: QrCode, permission: null },
  { href: '/weigh', label: 'Weigh & Track', icon: Scale, permission: null },
  { href: '/requests', label: 'Requests', icon: PackagePlus, permission: null },
  { href: '/recipes', label: 'Recipes', icon: CookingPot, permission: PERMISSIONS.RECIPE_VIEW },
  { href: '/sales', label: 'Sales', icon: DollarSign, permission: PERMISSIONS.SALE_VIEW },
  { href: '/sessions', label: 'Sessions', icon: ClipboardList, permission: null },
  { href: '/variance', label: 'Variance', icon: TrendingDown, permission: PERMISSIONS.VARIANCE_VIEW },
  { href: '/daily-report', label: 'Daily Report', icon: FileText, permission: PERMISSIONS.VARIANCE_VIEW },
  { href: '/reports', label: 'Reports', icon: FileBarChart, permission: PERMISSIONS.AUDIT_VIEW },
  { href: '/users', label: 'Users', icon: Users, permission: PERMISSIONS.USER_VIEW },
];

export function NavHeader() {
  const pathname = usePathname();
  const router = useRouter();
  const { user, isAuthenticated, isLoading, logout, hasPermission } = useAuth();
  const [showMenu, setShowMenu] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  const handleLogout = async () => {
    await logout();
    router.push('/login');
  };

  const visibleNavItems = navItems.filter((item) => {
    if (!item.permission) return true;
    if (!isAuthenticated) return false;
    return hasPermission(item.permission);
  });

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setShowMenu(false);
      }
    }
    if (showMenu) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [showMenu]);

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border bg-card/80 backdrop-blur-xl">
      <div className="mx-auto flex h-14 max-w-7xl items-center justify-between px-4 sm:px-6">
        <div className="relative flex items-center gap-1 sm:gap-2">
          <Link
            href="/dashboard"
            className="flex items-center gap-2 transition-opacity hover:opacity-80"
          >
            <img
              src="/logo-mark.png"
              alt="Melekyia"
              className="h-9 w-auto"
            />
            <span className="hidden text-sm font-semibold tracking-tight sm:inline-block">
              Melekyia
            </span>
          </Link>

          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowMenu(!showMenu)}
            className="ml-1 gap-2 text-muted-foreground"
          >
            <Menu className="h-4 w-4" strokeWidth={1.75} />
            <span className="text-xs font-medium">Menu</span>
          </Button>
        </div>

        <div className="flex items-center gap-2 sm:gap-3" suppressHydrationWarning>
          {isLoading ? (
            <div className="text-sm text-muted-foreground">Loading…</div>
          ) : isAuthenticated && user ? (
            <div className="flex items-center gap-2 sm:gap-3">
              <BluetoothStatusIndicator />
              <div className="hidden items-center gap-2 sm:flex">
                <span className="text-sm font-medium text-foreground">
                  {user.displayName}
                </span>
                <span className="rounded-full border border-border bg-secondary px-2 py-0.5 text-xs font-medium text-secondary-foreground">
                  {getRoleDisplayName(user.role)}
                </span>
              </div>
              <Button asChild variant="ghost" size="sm" className="gap-2 text-muted-foreground">
                <Link href="/settings">
                  <Settings className="h-4 w-4" strokeWidth={1.75} />
                  <span className="hidden sm:inline">Settings</span>
                </Link>
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleLogout}
                className="gap-2 text-muted-foreground"
              >
                <LogOut className="h-4 w-4" strokeWidth={1.75} />
                <span className="hidden sm:inline">Logout</span>
              </Button>
            </div>
          ) : (
            <Button asChild variant="ghost" size="sm" className="gap-2 text-muted-foreground">
              <Link href="/login">
                <LogIn className="h-4 w-4" strokeWidth={1.75} />
                <span className="hidden sm:inline">Login</span>
              </Link>
            </Button>
          )}
        </div>
      </div>

      {showMenu && (
        <div
          ref={menuRef}
          className="absolute left-4 top-full mt-2 w-64 overflow-hidden rounded-xl border border-border bg-popover shadow-2xl"
        >
          <div className="p-2">
            <h3 className="px-3 py-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Navigation
            </h3>
            <nav className="space-y-0.5">
              {visibleNavItems.map((item) => {
                const isActive =
                  pathname === item.href ||
                  (item.href !== '/' && pathname.startsWith(item.href));
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setShowMenu(false)}
                    className={cn(
                      'flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors',
                      isActive
                        ? 'bg-primary/10 font-medium text-primary'
                        : 'text-muted-foreground hover:bg-accent hover:text-foreground'
                    )}
                  >
                    <item.icon className="h-4 w-4" strokeWidth={1.75} />
                    <span>{item.label}</span>
                  </Link>
                );
              })}
            </nav>
          </div>
        </div>
      )}
    </header>
  );
}
