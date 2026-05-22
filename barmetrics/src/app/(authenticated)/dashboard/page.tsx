'use client';

import Link from 'next/link';
import { Card, CardContent } from '@/components/ui/card';
import { Package, FileBarChart, Scale, Tag, FileText, ArrowRight } from 'lucide-react';

const primaryActions = [
  {
    href: '/weigh',
    title: 'Weigh & Track',
    subtitle: 'Bluetooth Scale Integration',
    description:
      'Connect your Bluetooth scale and weigh bottles automatically for accurate inventory tracking.',
    icon: Scale,
    featured: true,
  },
  {
    href: '/skus',
    title: 'Manage',
    subtitle: 'SKUs & Products',
    description:
      'Create and organize stock keeping units, and manage your product catalog with calibrations.',
    icon: Tag,
    featured: false,
  },
  {
    href: '/reports',
    title: 'Reports',
    subtitle: 'Audit & Analytics',
    description:
      'View complete audit history, export data, and analyze inventory trends over time.',
    icon: FileBarChart,
    featured: false,
  },
];

const steps = [
  {
    n: 1,
    title: 'Define Products',
    body: 'Add liquor products with brand, ABV, and bottle size. Calibrate tare weights for accuracy.',
  },
  {
    n: 2,
    title: 'Weigh Bottles',
    body: 'Place bottles on a scale. The app calculates remaining volume using precise density formulas.',
  },
  {
    n: 3,
    title: 'Track Inventory',
    body: 'Monitor remaining volume, percentage full, and pours. Export detailed reports for analysis.',
  },
];

export default function Home() {
  return (
    <div className="space-y-12">
      {/* Header */}
      <div className="flex flex-col items-center text-center">
        <img src="/logo.png" alt="Melekyia" className="mb-2 h-36 w-auto" />
        <p className="mt-2 max-w-xl text-sm text-muted-foreground">
          Premium bar inventory management — inventory, Bluetooth scale, and analytics in one place.
        </p>
      </div>

      {/* Primary actions */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        {primaryActions.map(({ href, title, subtitle, description, icon: Icon, featured }) => (
          <Link key={href} href={href} className="group">
            <Card
              className={
                'h-full transition-colors group-hover:border-primary/50 ' +
                (featured ? 'border-primary/30 bg-primary/5' : '')
              }
            >
              <CardContent className="flex h-full flex-col p-6">
                <span
                  className={
                    'mb-4 flex h-12 w-12 items-center justify-center rounded-xl ' +
                    (featured
                      ? 'bg-primary/15 text-primary'
                      : 'bg-secondary text-muted-foreground group-hover:text-foreground')
                  }
                >
                  <Icon className="h-6 w-6" strokeWidth={1.75} />
                </span>
                <h3 className="text-lg font-semibold">{title}</h3>
                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  {subtitle}
                </p>
                <p className="mt-3 flex-1 text-sm text-muted-foreground">{description}</p>
                <span className="mt-4 inline-flex items-center gap-1 text-sm font-medium text-primary">
                  Open
                  <ArrowRight
                    className="h-4 w-4 transition-transform group-hover:translate-x-1"
                    strokeWidth={1.75}
                  />
                </span>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

      {/* How it works */}
      <div>
        <div className="mb-6 flex items-center gap-4">
          <div className="h-px flex-1 bg-border" />
          <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            The Process
          </span>
          <div className="h-px flex-1 bg-border" />
        </div>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          {steps.map(({ n, title, body }) => (
            <Card key={n}>
              <CardContent className="p-6">
                <span className="flex h-9 w-9 items-center justify-center rounded-full border border-border text-sm font-semibold text-muted-foreground">
                  {n}
                </span>
                <h3 className="mt-4 font-semibold">{title}</h3>
                <p className="mt-2 text-sm text-muted-foreground">{body}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      <div className="flex items-center justify-center gap-3 pt-4 text-muted-foreground/40">
        <div className="h-px w-10 bg-border" />
        <FileText className="h-4 w-4" strokeWidth={1.5} />
        <Package className="h-4 w-4" strokeWidth={1.5} />
        <div className="h-px w-10 bg-border" />
      </div>
    </div>
  );
}
