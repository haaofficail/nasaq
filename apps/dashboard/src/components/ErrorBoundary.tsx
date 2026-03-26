import { Component, ReactNode } from "react";
import { AlertTriangle, RefreshCw } from "lucide-react";

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  message: string;
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, message: "" };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, message: error.message };
  }

  componentDidCatch(error: Error, info: { componentStack: string }) {
    console.error("[ErrorBoundary]", error, info.componentStack);
  }

  reset = () => this.setState({ hasError: false, message: "" });

  render() {
    if (!this.state.hasError) return this.props.children;

    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6" dir="rtl">
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-8 max-w-md w-full text-center space-y-5">
          <div className="w-14 h-14 bg-red-50 rounded-2xl flex items-center justify-center mx-auto">
            <AlertTriangle className="w-7 h-7 text-red-500" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-gray-900">حدث خطأ غير متوقع</h2>
            <p className="text-sm text-gray-500 mt-1">يرجى تحديث الصفحة أو المحاولة لاحقاً</p>
            {this.state.message && (
              <p className="mt-3 text-xs text-gray-400 bg-gray-50 rounded-lg p-3 text-start font-mono break-all">
                {this.state.message}
              </p>
            )}
          </div>
          <button
            onClick={this.reset}
            className="inline-flex items-center gap-2 px-4 py-2 bg-[#5b9bd5] text-white text-sm rounded-xl hover:bg-[#4a8bc4] transition-colors"
          >
            <RefreshCw className="w-4 h-4" />
            إعادة المحاولة
          </button>
        </div>
      </div>
    );
  }
}
