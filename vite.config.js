import { defineConfig } from 'vite';

// GitHub Pages (https://mihohoi0322.github.io/knit_gauge/) 用の base 設定。
// 開発サーバーではルート (/) で配信する。
export default defineConfig(({ command }) => ({
  base: command === 'build' ? '/knit_gauge/' : '/',
}));
