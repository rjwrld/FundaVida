import type { Config } from 'tailwindcss'

export default {
  darkMode: ['class'],
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    container: {
      center: true,
      padding: '2rem',
      screens: { '2xl': '1440px' },
    },
    extend: {
      colors: {
        border: 'oklch(var(--border))',
        input: 'oklch(var(--input))',
        ring: 'oklch(var(--ring))',
        background: 'oklch(var(--background))',
        foreground: 'oklch(var(--foreground))',
        primary: {
          DEFAULT: 'oklch(var(--primary))',
          foreground: 'oklch(var(--primary-foreground))',
        },
        secondary: {
          DEFAULT: 'oklch(var(--secondary))',
          foreground: 'oklch(var(--secondary-foreground))',
        },
        destructive: {
          DEFAULT: 'oklch(var(--destructive))',
          foreground: 'oklch(var(--destructive-foreground))',
        },
        muted: {
          DEFAULT: 'oklch(var(--muted))',
          foreground: 'oklch(var(--muted-foreground))',
        },
        accent: {
          DEFAULT: 'oklch(var(--accent))',
          foreground: 'oklch(var(--accent-foreground))',
        },
        card: {
          DEFAULT: 'oklch(var(--card))',
          foreground: 'oklch(var(--card-foreground))',
        },
        popover: {
          DEFAULT: 'oklch(var(--popover))',
          foreground: 'oklch(var(--popover-foreground))',
        },
        success: 'oklch(var(--success))',
        warning: 'oklch(var(--warning))',
        info: 'oklch(var(--info))',
        'brand-green': {
          50: 'oklch(var(--brand-green-50))',
          100: 'oklch(var(--brand-green-100))',
          200: 'oklch(var(--brand-green-200))',
          300: 'oklch(var(--brand-green-300))',
          400: 'oklch(var(--brand-green-400))',
          500: 'oklch(var(--brand-green-500))',
          600: 'oklch(var(--brand-green-600))',
          700: 'oklch(var(--brand-green-700))',
          800: 'oklch(var(--brand-green-800))',
          900: 'oklch(var(--brand-green-900))',
          950: 'oklch(var(--brand-green-950))',
        },
        'brand-blue': {
          50: 'oklch(var(--brand-blue-50))',
          100: 'oklch(var(--brand-blue-100))',
          200: 'oklch(var(--brand-blue-200))',
          300: 'oklch(var(--brand-blue-300))',
          400: 'oklch(var(--brand-blue-400))',
          500: 'oklch(var(--brand-blue-500))',
          600: 'oklch(var(--brand-blue-600))',
          700: 'oklch(var(--brand-blue-700))',
          800: 'oklch(var(--brand-blue-800))',
          900: 'oklch(var(--brand-blue-900))',
          950: 'oklch(var(--brand-blue-950))',
        },
        'flame-red': {
          50: 'oklch(var(--flame-red-50))',
          500: 'oklch(var(--flame-red-500))',
          600: 'oklch(var(--flame-red-600))',
          700: 'oklch(var(--flame-red-700))',
        },
        'flame-yellow': {
          50: 'oklch(var(--flame-yellow-50))',
          100: 'oklch(var(--flame-yellow-100))',
          200: 'oklch(var(--flame-yellow-200))',
          300: 'oklch(var(--flame-yellow-300))',
          400: 'oklch(var(--flame-yellow-400))',
          500: 'oklch(var(--flame-yellow-500))',
          600: 'oklch(var(--flame-yellow-600))',
          700: 'oklch(var(--flame-yellow-700))',
          800: 'oklch(var(--flame-yellow-800))',
          900: 'oklch(var(--flame-yellow-900))',
          950: 'oklch(var(--flame-yellow-950))',
        },
        chart: {
          1: 'oklch(var(--chart-1))',
          2: 'oklch(var(--chart-2))',
          3: 'oklch(var(--chart-3))',
          4: 'oklch(var(--chart-4))',
          5: 'oklch(var(--chart-5))',
        },
      },
      borderRadius: {
        lg: 'var(--radius)',
        md: 'calc(var(--radius) - 2px)',
        sm: 'calc(var(--radius) - 4px)',
        xl: 'calc(var(--radius) + 4px)',
        '2xl': 'calc(var(--radius) + 12px)',
      },
      boxShadow: {
        soft: '0 2px 15px -3px rgba(0,0,0,0.07), 0 10px 20px -2px rgba(0,0,0,0.04)',
        card: '0 4px 6px -1px rgba(0,0,0,0.05), 0 2px 4px -1px rgba(0,0,0,0.03)',
        elevated: '0 10px 40px -10px rgba(0,0,0,0.10), 0 2px 10px -2px rgba(0,0,0,0.04)',
        'glow-primary': '0 8px 24px -8px oklch(0.57 0.17 138 / 0.35)',
        'glow-flame': '0 8px 24px -8px oklch(0.85 0.17 90 / 0.40)',
      },
      keyframes: {
        'fade-in': {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        'fade-up': {
          '0%': { opacity: '0', transform: 'translateY(8px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        'pulse-soft': {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.6' },
        },
        'aurora-drift': {
          '0%, 100%': { transform: 'translate(0, 0) rotate(0deg)' },
          '50%': { transform: 'translate(-10%, -10%) rotate(2deg)' },
        },
        float: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-6px)' },
        },
      },
      animation: {
        'fade-in': 'fade-in 0.2s ease-out',
        'fade-up': 'fade-up 0.3s ease-out',
        'pulse-soft': 'pulse-soft 2s infinite',
        'aurora-drift': 'aurora-drift 20s ease-in-out infinite',
        float: 'float 4s ease-in-out infinite',
      },
    },
  },
  plugins: [],
} satisfies Config
