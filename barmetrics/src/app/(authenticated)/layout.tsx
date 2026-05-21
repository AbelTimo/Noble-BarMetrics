import { NavHeader } from "@/components/nav-header";
import { RouteGuard } from "@/components/route-guard";

export default function AuthenticatedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <NavHeader />
      <main className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 sm:py-8">
        <RouteGuard>{children}</RouteGuard>
      </main>
    </div>
  );
}
