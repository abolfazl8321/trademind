import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      // /api/kline?... → https://api.coinex.com/v2/spot/kline?...
      "/api/kline": {
        target:      "https://api.coinex.com/v2/spot",
        changeOrigin: true,
        rewrite:     (path) => path.replace(/^\/api\/kline/, "/kline"),
      },
      // /api/ticker → https://api.coinex.com/v2/spot/ticker
      "/api/ticker": {
        target:      "https://api.coinex.com/v2/spot",
        changeOrigin: true,
        rewrite:     (path) => path.replace(/^\/api\/ticker/, "/ticker"),
      },
    },
  },
});
