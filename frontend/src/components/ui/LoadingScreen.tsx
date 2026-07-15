
export function LoadingScreen({ message = 'Verifying secure session...' }: { message?: string }) {
  return (
    <div className="fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-slate-50 overflow-hidden select-none">
      {/* Subtle dynamic background gradient waves */}
      <div className="absolute inset-0 opacity-40 bg-[radial-gradient(circle_at_50%_120%,rgba(20,184,166,0.08),transparent_50%)]" />
      
      {/* Main central card container */}
      <div className="flex flex-col items-center z-10 space-y-6">
        
        {/* Pulsing branding container with expanding ripples */}
        <div className="relative">
          {/* Double expanding background rings */}
          <div className="absolute -inset-4 rounded-3xl bg-teal-500/10 blur-xs animate-ping" style={{ animationDuration: '3s' }} />
          <div className="absolute -inset-2 rounded-3xl bg-teal-500/5 blur-xs animate-pulse" />
          
          {/* Branded white capsule */}
          <div className="relative h-18 w-18 bg-white border border-slate-200/80 rounded-3xl flex items-center justify-center shadow-lg transition-transform duration-500 hover:scale-105 shrink-0">
            <img 
              src="/gk-nyaas-logo.webp" 
              alt="Gopal Kiran Nyaas Logo" 
              className="h-11 w-11 object-contain animate-pulse" 
            />
          </div>
        </div>

        {/* Text descriptions */}
        <div className="text-center space-y-3">
          <p className="text-xs font-black text-slate-800 tracking-wider uppercase">
            Asha Ki Kiran
          </p>
          
          <div className="flex flex-col items-center">
            <span className="text-[11.5px] font-bold text-slate-500">
              {message}
            </span>
            
            {/* Minimal sliding glow loader line */}
            <div className="w-28 h-0.75 bg-slate-200 rounded-full overflow-hidden mt-3.5 relative">
              {/* Dynamic inline keyframes for the sliding shimmer effect */}
              <style dangerouslySetInnerHTML={{__html: `
                @keyframes slideProgress {
                  0% { left: -100%; width: 50%; }
                  50% { left: 30%; width: 70%; }
                  100% { left: 100%; width: 50%; }
                }
                .animate-slide-progress {
                  position: absolute;
                  top: 0;
                  bottom: 0;
                  background: linear-gradient(90deg, #0d9488, #14b8a6);
                  border-radius: 9999px;
                  animation: slideProgress 1.6s ease-in-out infinite;
                }
              `}} />
              <div className="animate-slide-progress" />
            </div>
          </div>
        </div>
      </div>
      
      {/* Fine-print footer branding */}
      <div className="absolute bottom-6 text-[9.5px] font-black text-slate-400 tracking-widest uppercase">
        Gopal Kiran Nyaas
      </div>
    </div>
  );
}
