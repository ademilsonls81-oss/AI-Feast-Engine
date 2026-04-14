import React, { Component, ErrorInfo, ReactNode } from "react";
import { AlertTriangle, RefreshCw } from "lucide-react";

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  context?: string;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

/**
 * ErrorBoundary genérico — captura erros de render e previne
 * tela branca/cinza. Envolve componentes críticos da árvore.
 */
export default class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error, errorInfo: null };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // Log no console para debugging
    console.error(`[ErrorBoundary:${this.props.context || "root"}]`, error);
    console.error("[ErrorBoundary] Component stack:", errorInfo.componentStack);

    // Também envia para Sentry se configurado
    if (typeof window !== "undefined" && (window as any).Sentry) {
      (window as any).Sentry.captureException(error, {
        contexts: { componentStack: errorInfo.componentStack }
      });
    }

    this.setState({ error, errorInfo });
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="min-h-[300px] flex items-center justify-center p-8">
          <div className="bg-dark-card border border-red-500/20 rounded-2xl p-6 max-w-lg w-full text-center">
            <AlertTriangle className="w-12 h-12 text-red-400 mx-auto mb-4" />
            <h3 className="text-lg font-bold text-red-400 mb-2">
              Algo deu errado
            </h3>
            <p className="text-sm text-gray-400 mb-4">
              Ocorreu um erro inesperado nesta seção. Tente recarregar ou volte para a página anterior.
            </p>
            {this.state.error && (
              <details className="text-left text-xs text-gray-500 bg-black/40 p-3 rounded-lg mb-4 max-h-32 overflow-y-auto font-mono">
                <summary className="cursor-pointer text-gray-400 mb-1">Ver detalhes técnicos</summary>
                {this.state.error.message}
                {this.state.errorInfo && (
                  <>
                    {"\n\n"}Component stack:
                    {"\n"}{this.state.errorInfo.componentStack.split("\n").slice(0, 5).join("\n")}...
                  </>
                )}
              </details>
            )}
            <div className="flex items-center justify-center gap-3">
              <button
                onClick={this.handleReset}
                className="inline-flex items-center gap-2 px-4 py-2 bg-neon-cyan/20 border border-neon-cyan/30 text-neon-cyan rounded-lg text-sm font-bold hover:bg-neon-cyan/30 transition-colors"
              >
                <RefreshCw className="w-4 h-4" /> Tentar novamente
              </button>
              <a
                href="/"
                className="inline-flex items-center gap-2 px-4 py-2 bg-white/5 border border-white/10 text-gray-400 rounded-lg text-sm font-bold hover:bg-white/10 transition-colors"
              >
                Voltar ao início
              </a>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
