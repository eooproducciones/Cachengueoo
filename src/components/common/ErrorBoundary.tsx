import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo);
  }

  private handleReload = () => {
    try {
      window.location.reload();
    } catch {
      window.location.href = '/';
    }
  };

  private handleResetCache = () => {
    try {
      localStorage.removeItem('cachengueoo_events_list');
      localStorage.removeItem('cachengueoo_benefits_list');
      window.location.href = '/';
    } catch {
      window.location.reload();
    }
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-[#09090b] text-[#f4f4f5] flex items-center justify-center p-4">
          <div className="max-w-md w-full bg-[#121217] border border-zinc-800 rounded-3xl p-6 sm:p-8 text-center space-y-5 shadow-2xl">
            <div className="w-16 h-16 rounded-3xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center mx-auto text-[#F39200]">
              <AlertTriangle className="w-8 h-8" />
            </div>

            <div className="space-y-2">
              <h2 className="text-xl font-black uppercase text-white font-display">
                CACHENGUEOO
              </h2>
              <p className="text-xs text-zinc-400 leading-relaxed">
                Ocurrió un problema temporal al cargar la vista. Tocá el botón para recargar la aplicación.
              </p>
            </div>

            <div className="space-y-3 pt-2">
              <button
                type="button"
                onClick={this.handleReload}
                className="w-full h-12 rounded-2xl bg-[#F39200] hover:bg-[#E08400] text-black font-extrabold text-xs uppercase tracking-wider flex items-center justify-center gap-2 cursor-pointer shadow-lg shadow-[#F39200]/20 transition-all"
              >
                <RefreshCw className="w-4 h-4" />
                <span>Reintentar y Recargar</span>
              </button>

              <button
                type="button"
                onClick={this.handleResetCache}
                className="w-full h-10 rounded-2xl bg-zinc-900 border border-zinc-800 hover:border-zinc-700 text-zinc-400 hover:text-white font-bold text-xs flex items-center justify-center gap-2 cursor-pointer transition-all"
              >
                <span>Limpiar caché y reabrir</span>
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
