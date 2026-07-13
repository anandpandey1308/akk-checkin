import { HeartPulse, Lock, Home, Heart, Shield, RefreshCw } from 'lucide-react';
import { DashboardPreview } from '@/components/ui/DashboardPreview';

interface AuthLayoutProps {
  children: React.ReactNode;
}

export function AuthLayout({ children }: AuthLayoutProps) {
  return (
    <div className="h-screen w-full flex flex-col md:flex-row bg-slate-50/50 relative overflow-hidden">
      
      {/* Background visual detail (Subtle horizontal grid lines - similar to Stripe/Vercel) */}
      <div className="absolute inset-0 opacity-[0.015] pointer-events-none -z-10">
        <svg className="w-full h-full" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <pattern id="overall-grid" width="40" height="40" patternUnits="userSpaceOnUse">
              <path d="M 40 0 L 0 0 0 40" fill="none" stroke="currentColor" strokeWidth="1" />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#overall-grid)" />
        </svg>
      </div>

      {/* Left side: Branding (Desktop Only) - Light Canvas with Teal Highlights - 58% */}
      <div className="hidden md:flex md:w-[58%] bg-slate-50 text-slate-800 px-8 lg:px-14 xl:px-16 pt-8 pb-6 flex-col justify-start gap-5 relative overflow-hidden border-r border-slate-200 h-full">
        
        {/* Brand Header */}
        <div className="flex items-center gap-3.5 z-10 select-none">
          <div className="bg-white p-2.5 rounded-xl border border-slate-200/80 shadow-[0_2px_10px_rgba(15,23,42,0.02)]">
            <img
              src="/gk-nyaas-logo.webp"
              alt="Gopal Kiran Nyaas Logo"
              className="h-9 w-9 object-contain"
              onError={(e) => {
                e.currentTarget.style.display = 'none';
                const fallback = e.currentTarget.parentElement?.querySelector('.fallback-icon');
                if (fallback) fallback.classList.remove('hidden');
              }}
            />
            <HeartPulse className="fallback-icon hidden h-9 w-9 text-brand-primary" />
          </div>
          <div>
            <h1 className="text-lg font-extrabold tracking-tight m-0 p-0 text-slate-900 leading-none">
              Gopal Kiran Nyaas
            </h1>
            <p className="text-[10px] text-brand-primary font-bold tracking-widest uppercase mt-1">
              Asha Ki Kiran Camps
            </p>
          </div>
        </div>

        {/* Hero Title, Spacing & Description */}
        <div className="py-2 z-10 w-full max-w-2xl text-left">
          <h2 className="text-[32px] lg:text-[38px] font-black leading-[1.1] text-slate-900 tracking-tight mb-2.5 select-none">
            Empowering Healthcare Camps <span className="text-brand-primary">Across Rural India</span>
          </h2>
          
          <p className="text-brand-text-secondary text-sm leading-relaxed mb-4 max-w-xl font-medium">
            A unified Patient Health Management system coordinating live camp operations, instant registration checkpoints, structured consultations, pharmacy releases, and secure diagnostic test operations.
          </p>

          <div className="w-full bg-white border border-slate-200 p-6 rounded-2xl shadow-[0_20px_40px_-16px_rgba(15,23,42,0.04)]">
            <DashboardPreview />
          </div>
        </div>

        {/* Trust Indicators Section wrapped in a clean, elevated horizontal status strip */}
        <div className="border border-slate-200/80 bg-white rounded-2xl p-3.5 mt-2 z-10 shadow-[0_2px_12px_rgba(15,23,42,0.015)] w-full max-w-2xl">
          <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 text-slate-500 font-bold text-[10.5px] leading-none select-none">
            <div className="flex items-center gap-1.5 justify-center lg:justify-start">
              <Lock className="h-3.5 w-3.5 text-brand-primary flex-shrink-0" />
              <span>256-bit Secure</span>
            </div>
            <div className="flex items-center gap-1.5 justify-center lg:justify-start border-l border-slate-100 lg:pl-3">
              <Home className="h-3.5 w-3.5 text-brand-primary flex-shrink-0" />
              <span>Camp Trusted</span>
            </div>
            <div className="flex items-center gap-1.5 justify-center lg:justify-start border-l border-slate-100 lg:pl-3">
              <Heart className="h-3.5 w-3.5 text-brand-primary flex-shrink-0" />
              <span>NGO Designed</span>
            </div>
            <div className="flex items-center gap-1.5 justify-center lg:justify-start border-l border-slate-100 lg:pl-3">
              <Shield className="h-3.5 w-3.5 text-brand-primary flex-shrink-0" />
              <span>HIPAA-ready</span>
            </div>
            <div className="flex items-center gap-1.5 justify-center lg:justify-start border-l border-slate-100 lg:pl-3">
              <RefreshCw className="h-3.5 w-3.5 text-brand-primary flex-shrink-0 animate-spin-slow" />
              <span>Real-time Sync</span>
            </div>
          </div>
        </div>
      </div>

      {/* Right side: Login Card Section - Occupies 42% */}
      <div className="w-full md:w-[42%] flex flex-col justify-between p-6 sm:p-12 md:p-8 lg:p-12 relative overflow-y-auto h-full bg-slate-50/50">
        
        {/* Mobile Header (Hidden on Desktop) */}
        <div className="md:hidden flex items-center justify-between w-full mb-6 select-none">
          <div className="flex items-center gap-3">
            <div className="bg-white p-2.5 rounded-xl border border-slate-200 shadow-sm">
              <img
                src="/gk-nyaas-logo.webp"
                alt="Gopal Kiran Nyaas Logo"
                className="h-8 w-8 object-contain"
                onError={(e) => {
                  e.currentTarget.style.display = 'none';
                  const fallback = e.currentTarget.parentElement?.querySelector('.fallback-icon-mob');
                  if (fallback) fallback.classList.remove('hidden');
                }}
              />
              <HeartPulse className="fallback-icon-mob hidden h-8 w-8 text-brand-primary" />
            </div>
            <div className="text-left">
              <h1 className="text-sm font-bold text-slate-900 tracking-tight m-0 p-0 leading-none">
                Gopal Kiran Nyaas
              </h1>
              <p className="text-[10px] text-brand-primary font-bold uppercase tracking-wider mt-1">
                Asha Ki Kiran Camps
              </p>
            </div>
          </div>
        </div>

        {/* Content Container (Card sits here) */}
        <div className="my-auto flex items-center justify-center w-full py-8">
          <div className="w-full max-w-[480px]">
            {children}
          </div>
        </div>

        {/* Empty placeholder for flex alignment */}
        <div className="hidden md:block h-2" />
      </div>
    </div>
  );
}
