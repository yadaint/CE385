import { Component, type ReactNode } from "react";

interface ErrorBoundaryProps {
  children: ReactNode;
}

interface ErrorBoundaryState {
  error: Error | null;
}

/**
 * ดักจับ error ที่เกิดตอน render ของ React ทั้งแอป
 * เพื่อให้แสดงข้อความ error บนหน้าจอแทนหน้าขาวเปล่า
 * (ช่วยได้เวลา HMR ค้างหรือโค้ดมีปัญหาตอน runtime)
 */
export default class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { error: null };

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { error };
  }

  componentDidCatch(error: Error): void {
    console.error("App crashed:", error);
  }

  render(): ReactNode {
    if (this.state.error) {
      return (
        <div
          style={{
            minHeight: "100vh",
            padding: 40,
            fontFamily: "system-ui, sans-serif",
            color: "#1e293b",
            background: "#f1f5f9",
          }}
        >
          <h1 style={{ color: "#dc2626", fontSize: 24, marginBottom: 8 }}>
            เกิดข้อผิดพลาดในการแสดงผลหน้าเว็บ
          </h1>
          <p style={{ marginBottom: 16 }}>
            กดปุ่มด้านล่างเพื่อรีโหลดหน้าใหม่ หรือคัดลอกข้อความ error ด้านล่างแจ้งผู้พัฒนา
          </p>
          <button
            onClick={() => window.location.assign("/")}
            style={{
              padding: "10px 20px",
              background: "#7c3aed",
              color: "white",
              border: "none",
              borderRadius: 8,
              fontSize: 14,
              cursor: "pointer",
            }}
          >
            รีโหลดหน้าใหม่
          </button>
          <pre
            style={{
              marginTop: 24,
              whiteSpace: "pre-wrap",
              wordBreak: "break-word",
              background: "#0f172a",
              color: "#e2e8f0",
              padding: 16,
              borderRadius: 8,
              fontSize: 12,
              overflow: "auto",
              maxHeight: "50vh",
            }}
          >
            {this.state.error.message}
            {"\n\n"}
            {this.state.error.stack}
          </pre>
        </div>
      );
    }

    return this.props.children;
  }
}
