import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      // ส่งต่อคำขอไฟล์ที่อัปโหลด (รูปปก/สลิป) ไปยัง backend เพื่อให้ path สัมพัทธ์ /uploads/... ใช้ได้ในโหมดพัฒนา
      "/uploads": {
        target: "http://localhost:4000",
        changeOrigin: true,
      },
    },
  },
});
