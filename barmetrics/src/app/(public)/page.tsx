import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Wine, Scale, BarChart3, Package, Users, TrendingUp, ArrowRight, CheckCircle } from 'lucide-react';

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-[#EAE0D5] via-[#D4C5B0] to-[#C4B5A0]">
      {/* Hero Section */}
      <div className="container mx-auto px-4 pt-20 pb-16">
        <div className="max-w-4xl mx-auto text-center">
          {/* Logo & Brand */}
          <div className="flex items-center justify-center gap-3 mb-6">
            <Wine className="h-12 w-12 text-[#3E3226]/80" strokeWidth={1.5} />
            <h1 className="text-5xl md:text-6xl font-bold tracking-[0.25em] uppercase text-[#3E3226]">
              BarMetrics
            </h1>
          </div>

          {/* Tagline */}
          <p className="text-xl md:text-2xl text-[#3E3226]/80 mb-4 font-medium">
            Premium Bar Inventory Management
          </p>
          <p className="text-lg text-[#3E3226]/60 mb-12 max-w-2xl mx-auto">
            Transform your inventory tracking with Bluetooth scale integration,
            real-time analytics, and intelligent automation
          </p>

          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center mb-16">
            <Button asChild size="lg" className="bg-[#3E3226] hover:bg-[#3E3226]/90 text-[#EAE0D5] px-8 py-6 text-lg">
              <Link href="/login">
                Sign In
                <ArrowRight className="ml-2 h-5 w-5" />
              </Link>
            </Button>
            <Button asChild size="lg" variant="outline" className="border-[#3E3226] text-[#3E3226] hover:bg-[#3E3226]/10 px-8 py-6 text-lg">
              <Link href="#features">
                Learn More
              </Link>
            </Button>
          </div>
        </div>
      </div>

      {/* Features Section */}
      <div id="features" className="container mx-auto px-4 py-16">
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-bold text-[#3E3226] mb-4 tracking-wide">
            Everything You Need
          </h2>
          <p className="text-lg text-[#3E3226]/60 max-w-2xl mx-auto">
            Designed for bars, restaurants, and hospitality venues that demand precision
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8 max-w-6xl mx-auto">
          {/* Feature 1 */}
          <div className="bg-[#F5F0E8]/60 backdrop-blur border border-[#3E3226]/20 rounded-lg p-6 hover:shadow-xl transition-shadow">
            <div className="w-14 h-14 bg-[#3E3226]/10 rounded-full flex items-center justify-center mb-4">
              <Scale className="h-7 w-7 text-[#3E3226]" strokeWidth={1.5} />
            </div>
            <h3 className="text-xl font-bold text-[#3E3226] mb-3">Bluetooth Scale Integration</h3>
            <p className="text-[#3E3226]/70">
              Connect your Bluetooth scale and automatically capture bottle weights with precision. No manual entry needed.
            </p>
          </div>

          {/* Feature 2 */}
          <div className="bg-[#F5F0E8]/60 backdrop-blur border border-[#3E3226]/20 rounded-lg p-6 hover:shadow-xl transition-shadow">
            <div className="w-14 h-14 bg-[#3E3226]/10 rounded-full flex items-center justify-center mb-4">
              <BarChart3 className="h-7 w-7 text-[#3E3226]" strokeWidth={1.5} />
            </div>
            <h3 className="text-xl font-bold text-[#3E3226] mb-3">Real-Time Analytics</h3>
            <p className="text-[#3E3226]/70">
              Track inventory levels, usage patterns, and cost metrics in real-time with comprehensive reporting.
            </p>
          </div>

          {/* Feature 3 */}
          <div className="bg-[#F5F0E8]/60 backdrop-blur border border-[#3E3226]/20 rounded-lg p-6 hover:shadow-xl transition-shadow">
            <div className="w-14 h-14 bg-[#3E3226]/10 rounded-full flex items-center justify-center mb-4">
              <Package className="h-7 w-7 text-[#3E3226]" strokeWidth={1.5} />
            </div>
            <h3 className="text-xl font-bold text-[#3E3226] mb-3">Product Management</h3>
            <p className="text-[#3E3226]/70">
              Comprehensive database with 100+ pre-loaded bottles. Manage SKUs, products, and inventory effortlessly.
            </p>
          </div>

          {/* Feature 4 */}
          <div className="bg-[#F5F0E8]/60 backdrop-blur border border-[#3E3226]/20 rounded-lg p-6 hover:shadow-xl transition-shadow">
            <div className="w-14 h-14 bg-[#3E3226]/10 rounded-full flex items-center justify-center mb-4">
              <Users className="h-7 w-7 text-[#3E3226]" strokeWidth={1.5} />
            </div>
            <h3 className="text-xl font-bold text-[#3E3226] mb-3">Role-Based Access</h3>
            <p className="text-[#3E3226]/70">
              Secure access control for bartenders, storekeepers, and managers with tailored permissions.
            </p>
          </div>

          {/* Feature 5 */}
          <div className="bg-[#F5F0E8]/60 backdrop-blur border border-[#3E3226]/20 rounded-lg p-6 hover:shadow-xl transition-shadow">
            <div className="w-14 h-14 bg-[#3E3226]/10 rounded-full flex items-center justify-center mb-4">
              <TrendingUp className="h-7 w-7 text-[#3E3226]" strokeWidth={1.5} />
            </div>
            <h3 className="text-xl font-bold text-[#3E3226] mb-3">Smart Requests</h3>
            <p className="text-[#3E3226]/70">
              Bartenders can request inventory items with urgency levels. Managers approve with one click.
            </p>
          </div>

          {/* Feature 6 */}
          <div className="bg-[#F5F0E8]/60 backdrop-blur border border-[#3E3226]/20 rounded-lg p-6 hover:shadow-xl transition-shadow">
            <div className="w-14 h-14 bg-[#3E3226]/10 rounded-full flex items-center justify-center mb-4">
              <Wine className="h-7 w-7 text-[#3E3226]" strokeWidth={1.5} />
            </div>
            <h3 className="text-xl font-bold text-[#3E3226] mb-3">Anomaly Detection</h3>
            <p className="text-[#3E3226]/70">
              Automatically detect unusual patterns, over-pouring, and potential shrinkage with intelligent alerts.
            </p>
          </div>
        </div>
      </div>

      {/* Benefits Section */}
      <div className="container mx-auto px-4 py-16">
        <div className="max-w-4xl mx-auto">
          <div className="bg-[#3E3226] text-[#EAE0D5] rounded-2xl p-8 md:p-12">
            <h2 className="text-3xl md:text-4xl font-bold mb-6 text-center">Why Choose BarMetrics?</h2>
            <div className="grid md:grid-cols-2 gap-6">
              <div className="flex items-start gap-3">
                <CheckCircle className="h-6 w-6 text-[#D4C5B0] flex-shrink-0 mt-1" />
                <div>
                  <h4 className="font-semibold mb-1">Reduce Waste</h4>
                  <p className="text-[#EAE0D5]/80 text-sm">Track every drop and minimize over-pouring</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <CheckCircle className="h-6 w-6 text-[#D4C5B0] flex-shrink-0 mt-1" />
                <div>
                  <h4 className="font-semibold mb-1">Save Time</h4>
                  <p className="text-[#EAE0D5]/80 text-sm">Automated tracking eliminates manual counting</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <CheckCircle className="h-6 w-6 text-[#D4C5B0] flex-shrink-0 mt-1" />
                <div>
                  <h4 className="font-semibold mb-1">Increase Accuracy</h4>
                  <p className="text-[#EAE0D5]/80 text-sm">Precise measurements down to the milliliter</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <CheckCircle className="h-6 w-6 text-[#D4C5B0] flex-shrink-0 mt-1" />
                <div>
                  <h4 className="font-semibold mb-1">Better Insights</h4>
                  <p className="text-[#EAE0D5]/80 text-sm">Data-driven decisions for inventory optimization</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* CTA Section */}
      <div className="container mx-auto px-4 py-16 pb-24">
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="text-3xl md:text-4xl font-bold text-[#3E3226] mb-6">
            Ready to Transform Your Bar?
          </h2>
          <p className="text-lg text-[#3E3226]/70 mb-8">
            Join modern establishments using BarMetrics for precision inventory management
          </p>
          <Button asChild size="lg" className="bg-[#3E3226] hover:bg-[#3E3226]/90 text-[#EAE0D5] px-12 py-6 text-lg">
            <Link href="/login">
              Get Started
              <ArrowRight className="ml-2 h-5 w-5" />
            </Link>
          </Button>
        </div>
      </div>

      {/* Footer */}
      <footer className="border-t border-[#3E3226]/20 bg-[#3E3226]/5">
        <div className="container mx-auto px-4 py-8">
          <div className="text-center text-sm text-[#3E3226]/60">
            <p>&copy; 2026 BarMetrics. Premium inventory management for the hospitality industry.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
