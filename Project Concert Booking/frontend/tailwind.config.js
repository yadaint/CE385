/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        // ─── โทนสีเชิงความหมาย (ดึงค่าจากธีมที่เลือกผ่าน CSS variables) ───
        page: "var(--bg)",
        surface: {
          DEFAULT: "var(--surface)",
          2: "var(--surface-2)",
        },
        line: "var(--border)",
        ink: "var(--text)",
        muted: "var(--text-muted)",
        primary: {
          DEFAULT: "var(--primary)",
          hover: "var(--primary-hover)",
          soft: "var(--primary-soft)",
          "soft-text": "var(--primary-soft-text)",
          contrast: "var(--primary-contrast)",
        },
        header: {
          DEFAULT: "var(--header-bg)",
          text: "var(--header-text)",
          muted: "var(--header-muted)",
          hover: "var(--header-hover)",
          border: "var(--header-border)",
          accent: "var(--header-accent)",
        },
        hero: {
          text: "var(--hero-text)",
          muted: "var(--hero-muted)",
        },
        success: {
          bg: "var(--success-bg)",
          border: "var(--success-border)",
          text: "var(--success-text)",
        },
        warn: {
          bg: "var(--warn-bg)",
          border: "var(--warn-border)",
          text: "var(--warn-text)",
        },
        info: {
          bg: "var(--info-bg)",
          border: "var(--info-border)",
          text: "var(--info-text)",
        },
        danger: {
          bg: "var(--danger-bg)",
          border: "var(--danger-border)",
          text: "var(--danger-text)",
        },
      },
      borderRadius: {
        card: "var(--radius-card)",
        btn: "var(--radius-btn)",
        input: "var(--radius-input)",
      },
      boxShadow: {
        card: "var(--shadow-card)",
      },
      backgroundImage: {
        hero: "var(--hero-bg)",
      },
      fontFamily: {
        display: "var(--font-display)",
      },
    },
  },
  plugins: [],
};
