import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// GitHub Pages 배포 시 저장소 이름으로 base를 변경하세요.
// 예: base: '/family-budget-app/'
export default defineConfig({
  plugins: [react()],
  base: './',
})
