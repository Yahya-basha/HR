import React from 'react';
import { RotateCw, LogIn, AlertCircle } from 'lucide-react';

export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('Green Arrow HR Uncaught Error:', error, errorInfo);
  }

  handleReset = () => {
    try {
      this.setState({ hasError: false, error: null });
      window.location.href = '/';
    } catch (e) {
      window.location.reload();
    }
  };

  handleClearCacheAndLogin = () => {
    try {
      localStorage.clear();
      sessionStorage.clear();
      window.location.href = '/login';
    } catch (e) {
      window.location.href = '/login';
    }
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center p-4 font-sans" dir="rtl">
          <div className="max-w-md w-full bg-slate-900 border border-slate-800 rounded-3xl p-6 md:p-8 shadow-2xl space-y-6 text-center">
            
            {/* Branded Logo / Icon */}
            <div className="w-16 h-16 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center mx-auto text-emerald-400">
              <AlertCircle className="w-8 h-8" />
            </div>

            <div className="space-y-2">
              <h1 className="text-xl font-black font-heading tracking-tight text-white">
                Green Arrow HR
              </h1>
              <p className="text-xs text-slate-400 leading-relaxed">
                حدث تحديث في النظام يتطلب إعادة تحميل الصفحة أو إعادة تسجيل الدخول لمزامنة البيانات الحديثة.
              </p>
            </div>

            {/* Action Buttons */}
            <div className="space-y-2.5 pt-2">
              <button
                type="button"
                onClick={this.handleReset}
                className="w-full h-11 rounded-2xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs transition-all flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/20 active:scale-[0.98]"
              >
                <RotateCw className="w-4 h-4" />
                <span>إعادة تحميل الصفحة الآن</span>
              </button>

              <button
                type="button"
                onClick={this.handleClearCacheAndLogin}
                className="w-full h-11 rounded-2xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs transition-all flex items-center justify-center gap-2 border border-slate-700 active:scale-[0.98]"
              >
                <LogIn className="w-4 h-4" />
                <span>تحديث الجلسة والانتقال لتسجيل الدخول</span>
              </button>
            </div>

            <div className="pt-2 text-[10px] text-slate-500 font-mono">
              Green Arrow Enterprise Core • Auto Recovery System
            </div>

          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
