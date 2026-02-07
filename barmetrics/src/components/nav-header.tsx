'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Wine, Package, Scale, ClipboardList, FileBarChart, Tag, Users, LogOut, LogIn, Settings, Menu, X, PackagePlus, QrCode, Tags } from 'lucide-react';
import { useAuth } from '@/contexts/auth-context';
import { PERMISSIONS, getRoleDisplayName, getRoleBadgeColor } from '@/lib/permissions';
import { useState, useEffect, useRef } from 'react';

const navItems = [
  { href: '/dashboard', label: 'Home', icon: Wine, permission: null },
  { href: '/products', label: 'Products', icon: Package, permission: null },
  { href: '/skus', label: 'SKUs', icon: Tag, permission: PERMISSIONS.SKU_VIEW },
  { href: '/labels', label: 'Labels', icon: Tags, permission: PERMISSIONS.LABEL_VIEW },
  { href: '/scan', label: 'Scan QR', icon: QrCode, permission: null },
  { href: '/weigh', label: 'Weigh & Track', icon: Scale, permission: null },
  { href: '/requests', label: 'Requests', icon: PackagePlus, permission: null },
  { href: '/sessions', label: 'Sessions', icon: ClipboardList, permission: null },
  { href: '/reports', label: 'Reports', icon: FileBarChart, permission: null },
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

  // Filter nav items based on permissions
  const visibleNavItems = navItems.filter((item) => {
    if (!item.permission) return true;
    if (!isAuthenticated) return false;
    return hasPermission(item.permission);
  });

  // Close menu when clicking outside
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
    <header className="sticky top-0 z-50 w-full border-b border-[#3E3226]/10 bg-[#D4C5B0]/95 backdrop-blur text-[#3E3226]">
      <div className="container flex h-14 items-center justify-between">
        <div className="flex items-center gap-2 sm:gap-3 relative">
          <Link href="/dashboard" className="flex items-center space-x-2 hover:opacity-70 transition-opacity">
            <Wine className="h-6 w-6 text-[#3E3226]/80" strokeWidth={1.5} />
            <span className="hidden font-bold sm:inline-block tracking-[0.25em] uppercase text-[#3E3226]">BarMetrics</span>
          </Link>

          {/* Hamburger Menu Button */}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowMenu(!showMenu)}
            className="gap-2 text-[#3E3226]/70 hover:text-[#3E3226] hover:bg-[#3E3226]/5 font-semibold"
          >
            <Menu className="h-5 w-5" strokeWidth={1.5} />
            <span className="text-xs tracking-[0.25em] uppercase">Menu</span>
          </Button>
        </div>

        <div className="flex items-center gap-4" suppressHydrationWarning>
          {isLoading ? (
            <div className="text-sm text-[#3E3226]/50">Loading...</div>
          ) : isAuthenticated && user ? (
            <div className="flex items-center gap-3">
              <div className="hidden sm:flex items-center gap-2">
                <span className="text-sm font-medium text-[#3E3226]">{user.displayName}</span>
                <span className={cn('px-2 py-0.5 text-xs font-medium rounded', getRoleBadgeColor(user.role))}>
                  {getRoleDisplayName(user.role)}
                </span>
              </div>
              <Button asChild variant="ghost" size="sm" className="gap-2 text-[#3E3226]/70 hover:text-[#3E3226] hover:bg-[#3E3226]/5">
                <Link href="/settings">
                  <Settings className="h-4 w-4" strokeWidth={1.5} />
                  <span className="hidden sm:inline">Settings</span>
                </Link>
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleLogout}
                className="gap-2 text-[#3E3226]/70 hover:text-[#3E3226] hover:bg-[#3E3226]/5"
              >
                <LogOut className="h-4 w-4" strokeWidth={1.5} />
                <span className="hidden sm:inline">Logout</span>
              </Button>
            </div>
          ) : (
            <Button asChild variant="ghost" size="sm" className="gap-2 text-[#3E3226]/70 hover:text-[#3E3226] hover:bg-[#3E3226]/5">
              <Link href="/login">
                <LogIn className="h-4 w-4" strokeWidth={1.5} />
                <span className="hidden sm:inline">Login</span>
              </Link>
            </Button>
          )}
        </div>
      </div>

      {/* Dropdown Navigation Menu */}
      {showMenu && (
        <div
          ref={menuRef}
          className="absolute left-0 top-full mt-2 w-64 bg-[#EAE0D5]/98 backdrop-blur-lg border border-[#3E3226]/20 rounded-lg shadow-2xl z-[110] overflow-hidden"
        >
          <div className="p-3">
            <h3 className="text-xs tracking-[0.35em] uppercase text-[#3E3226]/60 font-bold mb-3 px-3">
              Navigation
            </h3>

            <nav className="space-y-1">
              {visibleNavItems.map((item) => {
                const isActive = pathname === item.href ||
                  (item.href !== '/' && pathname.startsWith(item.href));
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setShowMenu(false)}
                    className={cn(
                      'flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-300',
                      isActive
                        ? 'bg-[#3E3226]/10 text-[#3E3226] font-bold'
                        : 'text-[#3E3226]/70 hover:text-[#3E3226] hover:bg-[#3E3226]/5 font-semibold'
                    )}
                  >
                    <item.icon className="h-4 w-4" strokeWidth={1.5} />
                    <span className="text-sm tracking-[0.15em]">{item.label}</span>
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
