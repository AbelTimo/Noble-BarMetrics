'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Wine, Package, Scale, ClipboardList, FileBarChart } from 'lucide-react';

const navItems = [
  { href: '/', label: 'Home', icon: Wine },
  { href: '/products', label: 'Products', icon: Package },
  { href: '/measure', label: 'Quick Measure', icon: Scale },
  { href: '/sessions', label: 'Sessions', icon: ClipboardList },
  { href: '/reports', label: 'Reports', icon: FileBarChart },
];

export function NavHeader() {
  const pathname = usePathname();

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-14 items-center">
        <Link href="/" className="mr-6 flex items-center space-x-2">
          <Wine className="h-6 w-6" />
          <span className="hidden font-bold sm:inline-block">BarMetrics</span>
        </Link>
        <nav className="flex items-center space-x-1 text-sm font-medium">
          {navItems.map((item) => {
            const isActive = pathname === item.href ||
              (item.href !== '/' && pathname.startsWith(item.href));
            return (
              <Link key={item.href} href={item.href}>
                <Button
                  variant={isActive ? 'secondary' : 'ghost'}
                  size="sm"
                  className={cn(
                    'gap-2',
                    isActive && 'bg-muted font-semibold'
                  )}
                >
                  <item.icon className="h-4 w-4" />
                  <span className="hidden md:inline">{item.label}</span>
                </Button>
              </Link>
            );
          })}
        </nav>
      </div>
    </header>
  );
}
