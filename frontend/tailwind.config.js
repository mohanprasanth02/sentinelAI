/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        cyber: {
          bg: '#020617', // slate-950
          card: '#0f172a', // slate-900
          border: 'rgba(255, 255, 255, 0.08)',
          blue: '#38bdf8', // sky-400
          purple: '#c084fc', // purple-400
          neonBlue: '#00f0ff',
          neonPurple: '#bd00ff',
          alertHigh: '#ef4444', // red-500
          alertWarn: '#f59e0b', // amber-500
          alertInfo: '#3b82f6', // blue-500
          success: '#10b981', // emerald-500
        }
      },
      fontFamily: {
        sans: ['Inter', 'sans-serif'],
        mono: ['JetBrains Mono', 'Fira Code', 'monospace'],
      },
      boxShadow: {
        'glass': '0 8px 32px 0 rgba(0, 0, 0, 0.37)',
        'neon-blue': '0 0 15px rgba(0, 240, 255, 0.4)',
        'neon-purple': '0 0 15px rgba(189, 0, 255, 0.4)',
      },
      backgroundImage: {
        'cyber-gradient': 'linear-gradient(135deg, #020617 0%, #0f172a 50%, #1e1b4b 100%)',
        'glass-gradient': 'linear-gradient(135deg, rgba(255, 255, 255, 0.05) 0%, rgba(255, 255, 255, 0.01) 100%)',
      }
    },
  },
  plugins: [],
}
