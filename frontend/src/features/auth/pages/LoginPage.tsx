import * as React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { motion, AnimatePresence } from 'framer-motion';
import { User as UserIcon, Lock, ArrowRight, ShieldCheck, X, ShieldAlert, HeartPulse } from 'lucide-react';
import { loginSchema } from '../schemas/auth.schema';
import type { LoginCredentials } from '../schemas/auth.schema';
import { useAuth } from '@/context/AuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { PasswordInput } from '@/components/ui/PasswordInput';
import { Checkbox } from '@/components/ui/Checkbox';
import { Button } from '@/components/ui/Button';
import { Alert } from '@/components/ui/Alert';
import type { ApiError } from '@/types';

export function LoginPage() {
  const { login } = useAuth();
  const [errorMsg, setErrorMsg] = React.useState<string | null>(null);
  const [isForgotOpen, setIsForgotOpen] = React.useState(false);
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  
  // Custom healthcare loading transition states
  const [showLoadingScreen, setShowLoadingScreen] = React.useState(false);
  const [loadingStep, setLoadingStep] = React.useState(0);

  // Read remembered user from localStorage on mount
  const rememberedUser = React.useMemo(() => {
    return localStorage.getItem('akk_remembered_user') || '';
  }, []);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginCredentials>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      emailOrUsername: rememberedUser,
      password: '',
      rememberMe: !!rememberedUser,
    },
  });

  const onSubmit = async (data: LoginCredentials) => {
    setErrorMsg(null);
    setIsSubmitting(true);
    try {
      await login(data, async () => {
        // Successfully authenticated. Trigger beautiful matching healthcare sync screen
        setShowLoadingScreen(true);
        
        // Step 0: "Verifying secure credentials..."
        await new Promise((r) => setTimeout(r, 650));
        setLoadingStep(1); // "Securing camp session..."
        
        // Step 1: "Establishing connection to Camp #42..."
        await new Promise((r) => setTimeout(r, 650));
        setLoadingStep(2); // "Synchronizing camp logs..."
        
        await new Promise((r) => setTimeout(r, 550));
      });
      
      window.location.replace('/');
    } catch (err) {
      const apiErr = err as ApiError;
      setErrorMsg(apiErr.message || 'Unable to complete login. Please try again.');
      setIsSubmitting(false);
    }
  };

  // Subtle clean transitions
  const cardVariants = {
    hidden: { opacity: 0, y: 16 },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        duration: 0.4,
        ease: [0.16, 1, 0.3, 1] as [number, number, number, number],
        staggerChildren: 0.05,
      },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 8 },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        duration: 0.25,
        ease: 'easeOut' as const,
      },
    },
  };

  const steps = [
    'Verifying security tokens...',
    'Securing administrative session...',
    'Synchronizing Camp #42 records...',
  ];

  // Render Premium Healthcare Session Synced Loader
  if (showLoadingScreen) {
    return (
      <div className="w-full flex flex-col justify-between py-2 text-left">
        <Card className="border border-slate-200/60 bg-white rounded-[20px] shadow-[0_24px_80px_-20px_rgba(15,23,42,0.08)] overflow-hidden h-[476px] flex flex-col items-center justify-center p-8 sm:p-12 select-none">
          <motion.div
            initial={{ scale: 0.96, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.3, ease: 'easeOut' }}
            className="text-center flex flex-col items-center"
          >
            {/* Halo pulse medical icon */}
            <div className="relative mb-6">
              <span className="absolute inset-0 rounded-2xl bg-teal-150 animate-ping opacity-25"></span>
              <div className="w-16 h-16 bg-teal-50 border border-teal-100 rounded-2xl flex items-center justify-center text-brand-primary relative shadow-xs">
                <HeartPulse className="h-8.5 w-8.5 stroke-[1.8] animate-pulse" />
              </div>
            </div>

            <h3 className="text-2xl font-black text-slate-900 tracking-tight mb-2">
              Syncing Session
            </h3>
            
            {/* Animated linear progress bar */}
            <div className="w-48 h-1.5 bg-slate-100 rounded-full overflow-hidden mb-6 mt-4 relative">
              <motion.div
                className="h-full bg-brand-primary rounded-full"
                initial={{ width: '0%' }}
                animate={{ width: loadingStep === 0 ? '35%' : loadingStep === 1 ? '70%' : '100%' }}
                transition={{ duration: 0.5, ease: 'easeInOut' }}
              />
            </div>

            <AnimatePresence mode="wait">
              <motion.p
                key={loadingStep}
                initial={{ y: 5, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                exit={{ y: -5, opacity: 0 }}
                transition={{ duration: 0.15 }}
                className="text-sm font-bold text-slate-500 min-h-[20px]"
              >
                {steps[loadingStep]}
              </motion.p>
            </AnimatePresence>
          </motion.div>
        </Card>

        {/* Structured Footer remains visual-locked */}
        <div className="mt-8 text-center text-xs text-slate-400 font-semibold select-none">
          <div className="max-w-[440px] mx-auto">
            <hr className="border-slate-200 mb-4" />
            <div className="flex justify-between items-center text-[10px] text-slate-400 uppercase tracking-widest">
              <span>Version 2.0</span>
              <span>Powered by Gopal Kiran Nyaas</span>
            </div>
            <div className="flex justify-between items-center text-slate-400 mt-2 text-[11px] font-medium">
              <div className="flex gap-1.5 items-center">
                <a href="#" className="hover:text-brand-primary transition-colors">Privacy Policy</a>
                <span>&bull;</span>
                <a href="#" className="hover:text-brand-primary transition-colors">Support</a>
                <span>&bull;</span>
                <a href="#" className="hover:text-brand-primary transition-colors">Documentation</a>
              </div>
              <span>&copy; {new Date().getFullYear()}</span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full flex flex-col justify-between py-2 text-left">
      <motion.div
        variants={cardVariants}
        initial="hidden"
        animate="visible"
        className="w-full"
      >
        <Card className="border border-slate-200/60 bg-white rounded-[20px] shadow-[0_24px_80px_-20px_rgba(15,23,42,0.08),0_16px_24px_-8px_rgba(15,23,42,0.04)] overflow-hidden">
          
          {/* Flat, Left-Aligned Brand Header */}
          <CardHeader className="text-left pt-10 px-8 sm:px-10 lg:px-12 pb-2">
            {/* Left-Aligned Healthcare/Security Shield Icon */}
            <motion.div 
              variants={itemVariants}
              className="w-12 h-12 bg-teal-50 border border-teal-100/80 rounded-xl flex items-center justify-center text-brand-primary mb-4"
            >
              <ShieldCheck className="h-6.5 w-6.5 stroke-[1.8]" />
            </motion.div>
            
            <CardTitle className="text-[28px] font-extrabold text-slate-900 tracking-tight leading-tight">
              Welcome Back
            </CardTitle>
            <CardDescription className="text-slate-500 mt-2 text-sm leading-relaxed font-medium">
              Securely sign in to continue managing patient care.
            </CardDescription>
          </CardHeader>

          {/* Form Content - Aligned paddings */}
          <CardContent className="px-8 sm:px-10 lg:px-12 pb-10 pt-4">
            {/* Error notifications */}
            <AnimatePresence mode="wait">
              {errorMsg && (
                <motion.div
                  initial={{ opacity: 0, y: -4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -4 }}
                  transition={{ duration: 0.2 }}
                  className="mb-6"
                >
                  <Alert variant="error" onClose={() => setErrorMsg(null)}>
                    {errorMsg}
                  </Alert>
                </motion.div>
              )}
            </AnimatePresence>

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
              {/* Email / Username field with floating label and custom modern input tints */}
              <motion.div variants={itemVariants}>
                <Input
                  id="emailOrUsername"
                  label="Username or Email"
                  placeholder=" "
                  disabled={isSubmitting}
                  leftIcon={<UserIcon className="h-4.5 w-4.5 text-slate-400" />}
                  error={errors.emailOrUsername?.message}
                  autoComplete="username"
                  className="bg-slate-55/40 border-slate-200/80 hover:bg-slate-50 focus:bg-white transition-all duration-200"
                  {...register('emailOrUsername')}
                />
              </motion.div>

              {/* Password field with floating label and custom modern input tints */}
              <motion.div variants={itemVariants}>
                <PasswordInput
                  id="password"
                  label="Password"
                  placeholder=" "
                  disabled={isSubmitting}
                  leftIcon={<Lock className="h-4.5 w-4.5 text-slate-400" />}
                  error={errors.password?.message}
                  autoComplete="current-password"
                  className="bg-slate-55/40 border-slate-200/80 hover:bg-slate-50 focus:bg-white transition-all duration-200"
                  {...register('password')}
                />
              </motion.div>

              {/* Remember Me and Forgot Password actions */}
              <motion.div 
                variants={itemVariants} 
                className="flex items-center justify-between pt-1 select-none font-semibold text-xs"
              >
                <Checkbox
                  id="rememberMe"
                  label="Remember this device"
                  disabled={isSubmitting}
                  {...register('rememberMe')}
                />
                
                <button
                  type="button"
                  onClick={() => setIsForgotOpen(true)}
                  className="text-xs font-bold text-brand-primary hover:underline hover:text-brand-primary-hover focus:outline-none focus:ring-2 focus:ring-brand-primary/20 rounded px-1 cursor-pointer transition-colors"
                >
                  Forgot Password?
                </button>
              </motion.div>

              {/* Login submit button - Spring physics lift internally */}
              <motion.div variants={itemVariants} className="pt-2">
                <Button
                  type="submit"
                  className="w-full h-14 rounded-xl text-base shadow-sm hover:shadow-[0_8px_20px_-4px_rgba(15,118,110,0.25)] bg-brand-primary hover:bg-brand-primary-hover active:bg-brand-primary text-white"
                  isLoading={isSubmitting}
                  rightIcon={<ArrowRight className="h-4.5 w-4.5 stroke-[2] transition-transform group-hover:translate-x-1" />}
                >
                  Sign In
                </Button>
              </motion.div>
            </form>
          </CardContent>
        </Card>
      </motion.div>

      {/* Muted Premium Structured Footer */}
      <div className="mt-8 text-center text-xs text-slate-400 font-semibold select-none">
        <div className="max-w-[440px] mx-auto">
          <hr className="border-slate-200 mb-4" />
          <div className="flex justify-between items-center text-[10px] text-slate-400 uppercase tracking-widest">
            <span>Version 2.0</span>
            <span>Powered by Gopal Kiran Nyaas</span>
          </div>
          <div className="flex justify-between items-center text-slate-400 mt-2 text-[11px] font-medium">
            <div className="flex gap-1.5 items-center">
              <a href="#" className="hover:text-brand-primary transition-colors">Privacy Policy</a>
              <span>&bull;</span>
              <a href="#" className="hover:text-brand-primary transition-colors">Support</a>
              <span>&bull;</span>
              <a href="#" className="hover:text-brand-primary transition-colors">Documentation</a>
            </div>
            <span>&copy; {new Date().getFullYear()}</span>
          </div>
        </div>
      </div>

      {/* Forgot Password modal dialog */}
      <AnimatePresence>
        {isForgotOpen && (
          <div className="fixed inset-0 flex items-center justify-center z-50 p-4">
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsForgotOpen(false)}
              className="absolute inset-0 bg-slate-900/35"
            />
            
            {/* Dialog Content */}
            <motion.div
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.96 }}
              transition={{ duration: 0.15 }}
              className="relative w-full max-w-[400px] bg-white rounded-2xl border border-slate-200 p-6 shadow-2xl z-10 text-left"
            >
              <div className="flex justify-between items-start mb-4">
                <div className="w-10 h-10 bg-amber-50 border border-amber-100 rounded-lg flex items-center justify-center text-amber-600">
                  <ShieldAlert className="h-5 w-5" />
                </div>
                <button
                  type="button"
                  onClick={() => setIsForgotOpen(false)}
                  className="p-1 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-50 transition-colors focus:outline-none focus:ring-2 focus:ring-brand-primary/20 cursor-pointer"
                  aria-label="Close dialog"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <h3 className="text-lg font-bold text-slate-900 mb-2">
                Forgot Administrative Password?
              </h3>
              <p className="text-sm text-slate-500 leading-relaxed mb-6 font-medium">
                Password changes and credential resets must be authorized by a camp supervisor. Please contact the technical administrator on site to update your account access credentials.
              </p>

              <Button
                type="button"
                variant="primary"
                onClick={() => setIsForgotOpen(false)}
                className="w-full h-10 text-sm"
              >
                Understood
              </Button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
