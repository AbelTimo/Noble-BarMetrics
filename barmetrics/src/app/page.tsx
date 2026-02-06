'use client';

import Link from 'next/link';
import { Card } from '@/components/ui/card';
import { Package, FileBarChart, QrCode, Tag, ScanLine, FileText, ArrowRight, Wine } from 'lucide-react';

export default function Home() {

  return (
    <div className="min-h-screen bg-[#D4C5B0] text-[#3E3226] relative">
      {/* Subtle texture overlay */}
      <div className="absolute inset-0 opacity-[0.03] pointer-events-none bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZmlsdGVyIGlkPSJub2lzZSI+PGZlVHVyYnVsZW5jZSB0eXBlPSJmcmFjdGFsTm9pc2UiIGJhc2VGcmVxdWVuY3k9IjAuOSIgbnVtT2N0YXZlcz0iNCIgLz48L2ZpbHRlcj48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWx0ZXI9InVybCgjbm9pc2UpIiAvPjwvc3ZnPg==')]" />

      <div className="container mx-auto py-6 sm:py-8 px-4 relative">
        {/* Header Section */}
        <div className="text-center mb-8 sm:mb-12">
          {/* Decorative top element */}
          <div className="flex items-center justify-center gap-2 sm:gap-3 mb-2 sm:mb-3">
            <div className="h-px w-8 sm:w-12 bg-[#3E3226]/30" />
            <Wine className="h-5 w-5 sm:h-6 sm:w-6 text-[#3E3226]/60" strokeWidth={1.5} />
            <div className="h-px w-8 sm:w-12 bg-[#3E3226]/30" />
          </div>

          {/* Main title */}
          <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold mb-3 sm:mb-4 tracking-[0.15em] sm:tracking-[0.25em] uppercase text-[#3E3226]">
            BarMetrics
          </h1>

          {/* Subtitle */}
          <div className="flex items-center justify-center gap-2 sm:gap-4 text-[10px] sm:text-xs tracking-[0.15em] sm:tracking-[0.3em] uppercase mb-3 sm:mb-4 font-semibold">
            <span>Inventory</span>
            <span className="text-[#3E3226]/40">|</span>
            <span>QR Labels</span>
            <span className="text-[#3E3226]/40">|</span>
            <span>Analytics</span>
          </div>

          {/* Description */}
          <p className="text-xs sm:text-sm text-[#3E3226]/70 max-w-2xl mx-auto leading-relaxed px-4">
            Premium bar inventory management crafted for modern establishments
          </p>

          {/* Decorative bottom element */}
          <div className="flex items-center justify-center gap-2 mt-4">
            <div className="h-1 w-1 rounded-full bg-[#3E3226]/30" />
            <div className="h-1 w-1 rounded-full bg-[#3E3226]/30" />
            <div className="h-1 w-1 rounded-full bg-[#3E3226]/30" />
          </div>
        </div>

        {/* Main Actions - 3 Condensed Cards */}
        <div className="mb-12 sm:mb-16">

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6 md:gap-8 max-w-6xl mx-auto">
            {/* 1. Scan & Track - Featured (PRIMARY POSITION) */}
            <Link href="/scan?auto=true" className="group">
              <Card className="bg-[#9C8B7A]/40 backdrop-blur border-[#3E3226]/30 hover:border-[#3E3226]/50 transition-all duration-500 h-full p-6 sm:p-8 md:p-12 shadow-[0_6px_20px_rgb(62,50,38,0.12)] sm:shadow-[0_12px_40px_rgb(62,50,38,0.18)] hover:shadow-[0_15px_50px_rgb(62,50,38,0.28)] sm:hover:shadow-[0_25px_70px_rgb(62,50,38,0.35)] hover:-translate-y-1.5 sm:-translate-y-2 sm:hover:-translate-y-4 overflow-hidden relative">
                {/* Animated scanning lines */}
                <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-700">
                  <div className="absolute inset-0 bg-gradient-to-b from-transparent via-[#3E3226]/5 to-transparent animate-scan" />
                </div>
                <div className="flex flex-col items-center text-center h-full relative z-10">
                  <div className="mb-4 sm:mb-6 md:mb-8 w-24 h-24 sm:w-28 sm:h-28 md:w-36 md:h-36 rounded-full bg-[#F5F0E8]/95 backdrop-blur flex items-center justify-center shadow-[3px_3px_6px_rgba(62,50,38,0.3),-3px_-3px_6px_rgba(62,50,38,0.15)] sm:shadow-[5px_5px_10px_rgba(62,50,38,0.35),-5px_-5px_10px_rgba(62,50,38,0.18)] group-hover:shadow-[6px_6px_12px_rgba(62,50,38,0.4),-6px_-6px_12px_rgba(62,50,38,0.2)] sm:group-hover:shadow-[8px_8px_16px_rgba(62,50,38,0.45),-8px_-8px_16px_rgba(62,50,38,0.22)] transition-all duration-500 group-hover:scale-105 sm:group-hover:scale-110 relative overflow-hidden">
                    {/* Subtle inner shadow for depth */}
                    <div className="absolute inset-0 rounded-full shadow-[inset_2px_2px_4px_rgba(62,50,38,0.04)] sm:shadow-[inset_3px_3px_6px_rgba(62,50,38,0.06)]" />
                    {/* Elegant Scanning Frame Icon */}
                    <svg className="h-11 w-11 sm:h-13 sm:w-13 md:h-16 md:w-16 text-[#3E3226]/70 group-hover:text-[#3E3226] transition-all duration-500 relative z-10" viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
                      {/* Top corners */}
                      <path d="M12 12H20M12 12V20" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/>
                      <path d="M52 12H44M52 12V20" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/>
                      {/* Bottom corners */}
                      <path d="M12 52H20M12 52V44" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/>
                      <path d="M52 52H44M52 52V44" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/>
                      {/* Center scan line */}
                      <path d="M16 32H48" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" opacity="0.6"/>
                      {/* Animated dots */}
                      <circle cx="24" cy="32" r="1.5" fill="currentColor" opacity="0.8"/>
                      <circle cx="32" cy="32" r="2" fill="currentColor"/>
                      <circle cx="40" cy="32" r="1.5" fill="currentColor" opacity="0.8"/>
                    </svg>
                  </div>
                  <h3 className="text-xl sm:text-2xl md:text-3xl tracking-[0.12em] sm:tracking-[0.15em] md:tracking-[0.2em] uppercase font-bold mb-2 sm:mb-3 md:mb-4 text-[#3E3226]">
                    Scan & Track
                  </h3>
                  <p className="text-[10px] sm:text-xs tracking-[0.15em] sm:tracking-[0.25em] uppercase text-[#3E3226]/70 mb-2 sm:mb-3 md:mb-4 font-semibold">
                    QR Labels & Recognition
                  </p>
                  <p className="text-xs sm:text-sm text-[#3E3226]/60 leading-relaxed mb-4 sm:mb-6 md:mb-8 px-2">
                    Generate QR labels, scan items instantly, and track inventory in real-time
                  </p>
                  <div className="mt-auto flex flex-col gap-1 sm:gap-2 w-full">
                    <div className="text-[10px] sm:text-xs text-[#3E3226]/50 flex items-center justify-center gap-1.5 sm:gap-2">
                      <QrCode className="h-2.5 w-2.5 sm:h-3 sm:w-3" strokeWidth={1.5} />
                      <span>Labels</span>
                      <span>•</span>
                      <ScanLine className="h-2.5 w-2.5 sm:h-3 sm:w-3" strokeWidth={1.5} />
                      <span>Scan</span>
                    </div>
                    <ArrowRight className="h-5 w-5 sm:h-6 sm:w-6 text-[#3E3226]/60 group-hover:text-[#3E3226]/80 group-hover:translate-x-1 transition-all mx-auto mt-1 sm:mt-2" strokeWidth={1.5} />
                  </div>
                </div>
              </Card>
            </Link>

            {/* 2. Manage - SKUs + Products */}
            <Link href="/skus" className="group">
              <Card className="bg-[#9C8B7A]/40 backdrop-blur border-[#3E3226]/30 hover:border-[#3E3226]/50 transition-all duration-500 h-full p-6 sm:p-8 md:p-12 shadow-[0_6px_20px_rgb(62,50,38,0.12)] sm:shadow-[0_12px_40px_rgb(62,50,38,0.18)] hover:shadow-[0_15px_50px_rgb(62,50,38,0.28)] sm:hover:shadow-[0_25px_70px_rgb(62,50,38,0.35)] hover:-translate-y-1.5 sm:-translate-y-2 sm:hover:-translate-y-4 overflow-hidden relative">
                <div className="flex flex-col items-center text-center h-full relative z-10">
                  <div className="mb-4 sm:mb-6 md:mb-8 w-20 h-20 sm:w-24 sm:h-24 md:w-32 md:h-32 rounded-full bg-[#F5F0E8]/95 backdrop-blur flex items-center justify-center shadow-[3px_3px_6px_rgba(62,50,38,0.3),-3px_-3px_6px_rgba(62,50,38,0.15)] sm:shadow-[5px_5px_10px_rgba(62,50,38,0.35),-5px_-5px_10px_rgba(62,50,38,0.18)] group-hover:shadow-[6px_6px_12px_rgba(62,50,38,0.4),-6px_-6px_12px_rgba(62,50,38,0.2)] sm:group-hover:shadow-[8px_8px_16px_rgba(62,50,38,0.45),-8px_-8px_16px_rgba(62,50,38,0.22)] transition-all duration-500 group-hover:scale-105 sm:group-hover:scale-110 relative overflow-hidden">
                    {/* Subtle inner shadow for depth */}
                    <div className="absolute inset-0 rounded-full shadow-[inset_1px_1px_3px_rgba(62,50,38,0.04)] sm:shadow-[inset_2px_2px_5px_rgba(62,50,38,0.05)]" />
                    {/* Elegant Tag Icon */}
                    <svg className="h-9 w-9 sm:h-11 sm:w-11 md:h-14 md:w-14 text-[#3E3226]/70 group-hover:text-[#3E3226] transition-all duration-500 relative z-10" viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path d="M32 8L52 28L32 56L12 28L32 8Z" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
                      <path d="M32 24L42 34L32 48L22 34L32 24Z" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" opacity="0.4"/>
                      <circle cx="32" cy="34" r="3" fill="currentColor" opacity="0.6"/>
                    </svg>
                  </div>
                  <h3 className="text-xl sm:text-xl md:text-2xl tracking-[0.12em] sm:tracking-[0.15em] md:tracking-[0.2em] uppercase font-bold mb-2 sm:mb-3 md:mb-4 text-[#3E3226]">
                    Manage
                  </h3>
                  <p className="text-[10px] sm:text-xs tracking-[0.15em] sm:tracking-[0.25em] uppercase text-[#3E3226]/60 mb-2 sm:mb-3 md:mb-4 font-semibold">
                    SKUs & Products
                  </p>
                  <p className="text-xs sm:text-sm text-[#3E3226]/50 leading-relaxed mb-4 sm:mb-6 md:mb-8 px-2">
                    Create and organize stock keeping units, manage product catalog with calibrations
                  </p>
                  <div className="mt-auto flex flex-col gap-1 sm:gap-2 w-full">
                    <div className="text-[10px] sm:text-xs text-[#3E3226]/40 flex items-center justify-center gap-1.5 sm:gap-2">
                      <Package className="h-2.5 w-2.5 sm:h-3 sm:w-3" strokeWidth={1.5} />
                      <span>Products</span>
                      <span>•</span>
                      <Tag className="h-2.5 w-2.5 sm:h-3 sm:w-3" strokeWidth={1.5} />
                      <span>SKUs</span>
                    </div>
                    <ArrowRight className="h-4 w-4 sm:h-5 sm:w-5 text-[#3E3226]/40 group-hover:text-[#3E3226]/60 group-hover:translate-x-1 transition-all mx-auto mt-1 sm:mt-2" strokeWidth={1.5} />
                  </div>
                </div>
              </Card>
            </Link>

            {/* 3. Reports - Audit + Analytics */}
            <Link href="/audit/labels" className="group">
              <Card className="bg-[#9C8B7A]/40 backdrop-blur border-[#3E3226]/30 hover:border-[#3E3226]/50 transition-all duration-500 h-full p-6 sm:p-8 md:p-12 shadow-[0_6px_20px_rgb(62,50,38,0.12)] sm:shadow-[0_12px_40px_rgb(62,50,38,0.18)] hover:shadow-[0_15px_50px_rgb(62,50,38,0.28)] sm:hover:shadow-[0_25px_70px_rgb(62,50,38,0.35)] hover:-translate-y-1.5 sm:-translate-y-2 sm:hover:-translate-y-4 overflow-hidden relative">
                <div className="flex flex-col items-center text-center h-full relative z-10">
                  <div className="mb-4 sm:mb-6 md:mb-8 w-20 h-20 sm:w-24 sm:h-24 md:w-32 md:h-32 rounded-full bg-[#F5F0E8]/95 backdrop-blur flex items-center justify-center shadow-[3px_3px_6px_rgba(62,50,38,0.3),-3px_-3px_6px_rgba(62,50,38,0.15)] sm:shadow-[5px_5px_10px_rgba(62,50,38,0.35),-5px_-5px_10px_rgba(62,50,38,0.18)] group-hover:shadow-[6px_6px_12px_rgba(62,50,38,0.4),-6px_-6px_12px_rgba(62,50,38,0.2)] sm:group-hover:shadow-[8px_8px_16px_rgba(62,50,38,0.45),-8px_-8px_16px_rgba(62,50,38,0.22)] transition-all duration-500 group-hover:scale-105 sm:group-hover:scale-110 relative overflow-hidden">
                    {/* Subtle inner shadow for depth */}
                    <div className="absolute inset-0 rounded-full shadow-[inset_1px_1px_3px_rgba(62,50,38,0.04)] sm:shadow-[inset_2px_2px_5px_rgba(62,50,38,0.05)]" />
                    {/* Elegant Analytics Icon */}
                    <svg className="h-9 w-9 sm:h-11 sm:w-11 md:h-14 md:w-14 text-[#3E3226]/70 group-hover:text-[#3E3226] transition-all duration-500 relative z-10" viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
                      {/* Document outline */}
                      <path d="M18 10H38L48 20V54H18V10Z" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
                      {/* Folded corner */}
                      <path d="M38 10V20H48" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" opacity="0.5"/>
                      {/* Chart bars */}
                      <path d="M26 38V46M33 34V46M40 40V46" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
                      {/* Trend line */}
                      <path d="M24 32L30 28L36 30L42 26" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" opacity="0.4"/>
                    </svg>
                  </div>
                  <h3 className="text-xl sm:text-xl md:text-2xl tracking-[0.12em] sm:tracking-[0.15em] md:tracking-[0.2em] uppercase font-bold mb-2 sm:mb-3 md:mb-4 text-[#3E3226]">
                    Reports
                  </h3>
                  <p className="text-[10px] sm:text-xs tracking-[0.15em] sm:tracking-[0.25em] uppercase text-[#3E3226]/60 mb-2 sm:mb-3 md:mb-4 font-semibold">
                    Audit & Analytics
                  </p>
                  <p className="text-xs sm:text-sm text-[#3E3226]/50 leading-relaxed mb-4 sm:mb-6 md:mb-8 px-2">
                    View complete audit history, export data, and analyze inventory trends
                  </p>
                  <div className="mt-auto flex flex-col gap-1 sm:gap-2 w-full">
                    <div className="text-[10px] sm:text-xs text-[#3E3226]/40 flex items-center justify-center gap-1.5 sm:gap-2">
                      <FileText className="h-2.5 w-2.5 sm:h-3 sm:w-3" strokeWidth={1.5} />
                      <span>Audit</span>
                      <span>•</span>
                      <FileBarChart className="h-2.5 w-2.5 sm:h-3 sm:w-3" strokeWidth={1.5} />
                      <span>Analytics</span>
                    </div>
                    <ArrowRight className="h-4 w-4 sm:h-5 sm:w-5 text-[#3E3226]/40 group-hover:text-[#3E3226]/60 group-hover:translate-x-1 transition-all mx-auto mt-1 sm:mt-2" strokeWidth={1.5} />
                  </div>
                </div>
              </Card>
            </Link>
          </div>

        </div>

        {/* How It Works Section */}
        <div className="max-w-5xl mx-auto">
          {/* Decorative divider */}
          <div className="flex items-center justify-center gap-3 sm:gap-4 mb-8 sm:mb-12">
            <div className="h-px flex-1 bg-[#3E3226]/20" />
            <div className="text-[10px] sm:text-xs tracking-[0.2em] sm:tracking-[0.3em] uppercase text-[#3E3226]/60">
              The Process
            </div>
            <div className="h-px flex-1 bg-[#3E3226]/20" />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 sm:gap-8">
            {/* Step 1 */}
            <div className="text-center">
              <div className="inline-flex items-center justify-center w-12 h-12 sm:w-14 sm:h-14 md:w-16 md:h-16 rounded-full border-2 border-[#3E3226]/30 mb-4 sm:mb-6">
                <span className="text-xl sm:text-2xl font-bold text-[#3E3226]/60">1</span>
              </div>
              <h3 className="text-xs sm:text-sm tracking-[0.12em] sm:tracking-[0.2em] uppercase font-bold mb-2 sm:mb-3 text-[#3E3226]">
                Define Products
              </h3>
              <p className="text-xs sm:text-sm text-[#3E3226]/60 leading-relaxed px-2">
                Add your liquor products with brand, ABV, and bottle size. Calibrate tare weights for accuracy.
              </p>
            </div>

            {/* Step 2 */}
            <div className="text-center">
              <div className="inline-flex items-center justify-center w-12 h-12 sm:w-14 sm:h-14 md:w-16 md:h-16 rounded-full border-2 border-[#3E3226]/30 mb-4 sm:mb-6">
                <span className="text-xl sm:text-2xl font-bold text-[#3E3226]/60">2</span>
              </div>
              <h3 className="text-xs sm:text-sm tracking-[0.12em] sm:tracking-[0.2em] uppercase font-bold mb-2 sm:mb-3 text-[#3E3226]">
                Weigh Bottles
              </h3>
              <p className="text-xs sm:text-sm text-[#3E3226]/60 leading-relaxed px-2">
                Place bottles on a scale. The app calculates remaining volume using precise density formulas.
              </p>
            </div>

            {/* Step 3 */}
            <div className="text-center">
              <div className="inline-flex items-center justify-center w-12 h-12 sm:w-14 sm:h-14 md:w-16 md:h-16 rounded-full border-2 border-[#3E3226]/30 mb-4 sm:mb-6">
                <span className="text-xl sm:text-2xl font-bold text-[#3E3226]/60">3</span>
              </div>
              <h3 className="text-xs sm:text-sm tracking-[0.12em] sm:tracking-[0.2em] uppercase font-bold mb-2 sm:mb-3 text-[#3E3226]">
                Track Inventory
              </h3>
              <p className="text-xs sm:text-sm text-[#3E3226]/60 leading-relaxed px-2">
                Monitor remaining volume, percentage full, and pours. Export detailed reports for analysis.
              </p>
            </div>
          </div>
        </div>

        {/* Footer decorative element */}
        <div className="flex items-center justify-center gap-2 sm:gap-3 mt-12 sm:mt-16 md:mt-20">
          <div className="h-px w-8 sm:w-12 bg-[#3E3226]/20" />
          <Wine className="h-4 w-4 sm:h-5 sm:w-5 text-[#3E3226]/40" strokeWidth={1.5} />
          <div className="h-px w-8 sm:w-12 bg-[#3E3226]/20" />
        </div>
      </div>
    </div>
  );
}
