import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import App from "./App";
import "./index.css";

class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { error: Error | null }
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { error: null };
  }
  static getDerivedStateFromError(error: Error) {
    return { error };
  }
  render() {
    if (this.state.error) {
      return (
        <div style={{ padding: 40, fontFamily: "sans-serif", direction: "rtl" }}>
          <h2 style={{ color: "#dc2626" }}>حدث خطأ غير متوقع</h2>
          <pre style={{ background: "#f9fafb", padding: 16, borderRadius: 8, fontSize: 13, overflowX: "auto", color: "#374151" }}>
            {this.state.error.message}
            {"\n"}
            {this.state.error.stack}
          </pre>
          <button
            onClick={() => { this.setState({ error: null }); window.location.href = "/"; }}
            style={{ marginTop: 16, padding: "10px 20px", background: "#1A56DB", color: "#fff", border: "none", borderRadius: 8, cursor: "pointer" }}
          >
            العودة للرئيسية
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <BrowserRouter>
      <ErrorBoundary>
        <App />
      </ErrorBoundary>
    </BrowserRouter>
  </React.StrictMode>
);
