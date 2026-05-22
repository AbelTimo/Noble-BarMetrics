'use client';

import { useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import Link from 'next/link';
import { ShieldAlert } from 'lucide-react';
import { useAuth } from '@/contexts/auth-context';
import { PERMISSIONS, type Permission } from '@/lib/permissions';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';

/**
 * Page-level role gate. Each rule maps a path pattern to the permission needed
 * to view it. Most-specific patterns first — the first match wins. Paths with
 * no rule are open to any authenticated user.
 *
 * This mirrors the API-route guards (requirePermission); the API remains the
 * real security boundary — this is the UX layer so a user sees a clean
 * "no access" screen instead of a form they can't submit.
 */
const RULES: Array<[RegExp, Permission]> = [
  [/^\/products\/new$/, PERMISSIONS.PRODUCT_CREATE],
  [/^\/products\/import$/, PERMISSIONS.PRODUCT_CREATE],
  [/^\/products\/[^/]+\/edit$/, PERMISSIONS.PRODUCT_UPDATE],
  [/^\/skus\/new$/, PERMISSIONS.SKU_CREATE],
  [/^\/skus\/[^/]+\/edit$/, PERMISSIONS.SKU_UPDATE],
  [/^\/skus(\/[^/]+)?$/, PERMISSIONS.SKU_VIEW],
  [/^\/recipes\/new$/, PERMISSIONS.RECIPE_CREATE],
  [/^\/recipes\/[^/]+\/edit$/, PERMISSIONS.RECIPE_UPDATE],
  [/^\/labels\/generate$/, PERMISSIONS.LABEL_GENERATE],
  [/^\/labels(\/.*)?$/, PERMISSIONS.LABEL_VIEW],
  [/^\/locations(\/.*)?$/, PERMISSIONS.LOCATION_VIEW],
  [/^\/users(\/.*)?$/, PERMISSIONS.USER_VIEW],
  [/^\/variance$/, PERMISSIONS.VARIANCE_VIEW],
  [/^\/daily-report$/, PERMISSIONS.VARIANCE_VIEW],
  [/^\/audit\/.*$/, PERMISSIONS.AUDIT_VIEW],
  [/^\/reports$/, PERMISSIONS.AUDIT_VIEW],
];

function AccessDenied() {
  return (
    <div className="flex justify-center py-16">
      <Card className="max-w-md">
        <CardContent className="flex flex-col items-center gap-4 py-10 text-center">
          <span className="flex h-12 w-12 items-center justify-center rounded-full bg-destructive/10 text-destructive">
            <ShieldAlert className="h-6 w-6" />
          </span>
          <div className="space-y-1">
            <p className="text-lg font-semibold">Access restricted</p>
            <p className="text-sm text-muted-foreground">
              Your role doesn&apos;t have permission to view this page. Ask a
              manager if you need access.
            </p>
          </div>
          <Button asChild variant="outline" size="sm">
            <Link href="/dashboard">Back to Home</Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

export function RouteGuard({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { hasPermission, isLoading, isAuthenticated } = useAuth();

  // No valid session → bounce to login. The middleware only checks that a
  // session cookie *exists*, so a stale/expired cookie otherwise lands the
  // user on an empty app shell. This is the real auth gate on the client.
  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.replace(`/login?redirect=${encodeURIComponent(pathname)}`);
    }
  }, [isLoading, isAuthenticated, pathname, router]);

  // Wait for the auth context to resolve before deciding.
  if (isLoading) return null;
  if (!isAuthenticated) return null; // redirecting to /login

  const rule = RULES.find(([pattern]) => pattern.test(pathname));
  if (rule && !hasPermission(rule[1])) return <AccessDenied />;

  return <>{children}</>;
}
