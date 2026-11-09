import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5174,
    proxy: {
      // ส่งต่อคำขอ /api ไปยัง Express backend (พอร์ต 3000)
      // หน้าเว็บจึงเรียก API ด้วย path สัมพัทธ์ได้ และไม่เจอปัญหา CORS
      "/api": {
        target: "http://localhost:3000",
        changeOrigin: true,
      },
    },
  },
});
