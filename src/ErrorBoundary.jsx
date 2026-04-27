import { Component } from "react";
import { db } from "./utils/supabase.js";

/**
 * @typedef {{ children: import('react').ReactNode }} ErrorBoundaryProps
 * @typedef {{ hasError: boolean, error: Error|null }} ErrorBoundaryState
 */

/** @extends {Component<ErrorBoundaryProps, ErrorBoundaryState>} */
export class ErrorBoundary extends Component {
  /** @param {ErrorBoundaryProps} props */
  constructor(props) {
    super(props);
    /** @type {ErrorBoundaryState} */
    this.state = { hasError: false, error: null };
    /** @type {boolean} */
    this._reported = false;
  }

  /** @param {Error} error */
  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  /** @param {Error} error @param {import('react').ErrorInfo} info */
  componentDidCatch(error, info) {
    console.error("[ErrorBoundary]", error, info.componentStack);
    // P4-1: 1회만 자동 리포팅 (재진입 방지)
    if (this._reported) return;
    this._reported = true;
    try {
      const hid = (typeof localStorage !== 'undefined' && localStorage.getItem('smtm_household_id')) || 'unknown';
      const data = {
        type: 'runtime_error',
        message: String(error?.message || error),
        stack: String(error?.stack || ''),
        componentStack: String(info?.componentStack || ''),
        userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : '',
        url: typeof window !== 'undefined' ? window.location.href : '',
        timestamp: new Date().toISOString(),
      };
      db.reportBug(hid, data).catch(e => console.warn('[ErrorBoundary] reportBug fail:', e));
    } catch (e) {
      console.warn('[ErrorBoundary] reportBug throw:', e);
    }
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
          height: "100dvh", padding: 24, textAlign: "center", gap: 16,
          background: "var(--bg)", color: "var(--text)"
        }}>
          <div style={{ fontSize: 48 }}>⚠️</div>
          <div style={{ fontSize: 18, fontWeight: 800 }}>예상치 못한 오류가 발생했습니다</div>
          <div style={{ fontSize: 12, color: "var(--text-muted)", lineHeight: 1.6, maxWidth: 320 }}>
            {this.state.error?.message ?? "알 수 없는 오류"}
          </div>
          <button
            onClick={() => window.location.reload()}
            style={{
              marginTop: 8, padding: "12px 28px", borderRadius: 12, border: "none",
              background: "var(--primary)", color: "#fff", fontWeight: 700, fontSize: 14, cursor: "pointer"
            }}
          >
            앱 재시작
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
