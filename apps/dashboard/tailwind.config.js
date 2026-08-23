/** @type {import('tailwindcss').Config} */
export default {
  content: [
    './index.html',
    './src/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        // ── Material Design 3 Light Scheme ──────────────────────────────
        'primary':                    '#004ac6',
        'on-primary':                 '#ffffff',
        'primary-container':          '#2563eb',
        'on-primary-container':       '#eeefff',
        'primary-fixed':              '#dbe1ff',
        'primary-fixed-dim':          '#b4c5ff',
        'on-primary-fixed':           '#00174b',
        'on-primary-fixed-variant':   '#003ea8',
        'inverse-primary':            '#b4c5ff',

        'secondary':                  '#515f74',
        'on-secondary':               '#ffffff',
        'secondary-container':        '#d5e3fc',
        'on-secondary-container':     '#57657a',
        'secondary-fixed':            '#d5e3fc',
        'secondary-fixed-dim':        '#b9c7df',
        'on-secondary-fixed':         '#0d1c2e',
        'on-secondary-fixed-variant': '#3a485b',

        'tertiary':                   '#46566c',
        'on-tertiary':                '#ffffff',
        'tertiary-container':         '#5e6e85',
        'on-tertiary-container':      '#e9f0ff',
        'tertiary-fixed':             '#d3e4fe',
        'tertiary-fixed-dim':         '#b7c8e1',
        'on-tertiary-fixed':          '#0b1c30',
        'on-tertiary-fixed-variant':  '#38485d',

        'surface':                    '#faf8ff',
        'surface-base':               '#FFFFFF',
        'surface-panel':              '#F8FAFC',
        'surface-bright':             '#faf8ff',
        'surface-dim':                '#d2d9f4',
        'surface-tint':               '#0053db',
        'surface-variant':            '#dae2fd',

        'surface-container-lowest':   '#ffffff',
        'surface-container-low':      '#f2f3ff',
        'surface-container':          '#eaedff',
        'surface-container-high':     '#e2e7ff',
        'surface-container-highest':  '#dae2fd',

        'on-surface':                 '#131b2e',
        'on-surface-variant':         '#434655',
        'inverse-surface':            '#283044',
        'inverse-on-surface':         '#eef0ff',

        'outline':                    '#737686',
        'outline-variant':            '#c3c6d7',
        'border-subtle':              '#E2E8F0',

        'error':                      '#ba1a1a',
        'on-error':                   '#ffffff',
        'error-container':            '#ffdad6',
        'on-error-container':         '#93000a',

        // ── Semantic Status Colors ───────────────────────────────────────
        'success-emerald':            '#059669',
        'success-bg':                 '#ECFDF5',
        'warning-amber':              '#D97706',
        'warning-bg':                 '#FFFBEB',
        'critical-ruby':              '#E11D48',
        'critical-bg':                '#FFF1F2',

        // ── Dark remnants (kept for non-overview pages during transition)
        dark: {
          700: '#334155',
          800: '#1e293b',
          850: '#172033',
          900: '#0f172a',
          950: '#0b0f17',
        },
        brand: {
          300: '#a5b4fc',
          400: '#818cf8',
          500: '#6366f1',
          600: '#4f46e5',
        },
      },

      fontFamily: {
        inter:   ['Inter', '-apple-system', 'BlinkMacSystemFont', 'sans-serif'],
        sans:    ['Inter', '-apple-system', 'BlinkMacSystemFont', 'sans-serif'],
        mono:    ['JetBrains Mono', 'Fira Code', 'Consolas', 'ui-monospace', 'monospace'],
      },

      fontSize: {
        'xs':  ['11px', { lineHeight: '14px' }],
        'sm':  ['12px', { lineHeight: '18px' }],
        'md':  ['14px', { lineHeight: '20px' }],
        'base':['14px', { lineHeight: '20px' }],
        'lg':  ['16px', { lineHeight: '24px' }],
        'xl':  ['18px', { lineHeight: '24px', letterSpacing: '-0.01em' }],
        '2xl': ['24px', { lineHeight: '32px', letterSpacing: '-0.02em' }],
        '3xl': ['30px', { lineHeight: '36px', letterSpacing: '-0.02em' }],

        // Design system scale
        'mono-xs':   ['11px', { lineHeight: '14px', fontWeight: '400' }],
        'mono-sm':   ['12px', { lineHeight: '18px', fontWeight: '400' }],
        'mono-md':   ['13px', { lineHeight: '16px', letterSpacing: '-0.01em', fontWeight: '500' }],
        'body-sm':   ['12px', { lineHeight: '18px', fontWeight: '400' }],
        'body-md':   ['14px', { lineHeight: '20px', fontWeight: '400' }],
        'label-sm':  ['11px', { lineHeight: '14px', fontWeight: '500', letterSpacing: '0.04em' }],
        'label-md':  ['12px', { lineHeight: '16px', fontWeight: '500', letterSpacing: '0.02em' }],
        'title-sm':  ['14px', { lineHeight: '20px', fontWeight: '600' }],
        'title-md':  ['16px', { lineHeight: '24px', fontWeight: '600' }],
        'headline-sm': ['14px', { lineHeight: '20px', fontWeight: '600' }],
        'headline-md': ['18px', { lineHeight: '24px', letterSpacing: '-0.01em', fontWeight: '600' }],
        'headline-lg': ['24px', { lineHeight: '32px', letterSpacing: '-0.02em', fontWeight: '600' }],
      },

      spacing: {
        'sidebar-width': '240px',
        'header-h':      '48px',
        '4.5':           '18px',
        '13':            '52px',
        '18':            '72px',
      },

      borderRadius: {
        DEFAULT: '10px',
        sm:      '6px',
        md:      '10px',
        lg:      '14px',
        xl:      '18px',
        '2xl':   '24px',
        '3xl':   '30px',
        full:    '9999px',
      },

      boxShadow: {
        card:    '0 1px 3px 0 rgba(0,0,0,0.06), 0 1px 2px -1px rgba(0,0,0,0.04)',
        panel:   '0 4px 14px 0 rgba(0,0,0,0.06), 0 2px 4px -2px rgba(0,0,0,0.04)',
        modal:   '0 25px 60px -15px rgba(0,0,0,0.2)',
        elevated:'0 10px 25px -5px rgba(0,0,0,0.08)',
      },

      animation: {
        'pulse-dot': 'pulse 2s cubic-bezier(0.4,0,0.6,1) infinite',
        'fade-in':   'fade-in 150ms ease',
        'slide-up':  'slide-up 200ms ease',
      },

      keyframes: {
        'fade-in': {
          '0%':   { opacity: '0' },
          '100%': { opacity: '1' },
        },
        'slide-up': {
          '0%':   { opacity: '0', transform: 'translateY(6px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
      },
    },
  },
  plugins: [],
}
