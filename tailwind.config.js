/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{js,jsx,ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'table-green': '#004d00',
        'felt-green': '#35654d',
        'chip-red': '#e31836',
        'chip-blue': '#1e3f66',
        'chip-green': '#2d5a27',
        'chip-black': '#2b2b2b',
        'gold': '#ffd700',
        'brown': {
          700: '#5D4037',
          800: '#4E342E',
          900: '#75452d'
        }
      },
      boxShadow: {
        'chip': '0 0 10px rgba(0, 0, 0, 0.5)',
        'table': 'inset 0 0 50px rgba(0, 0, 0, 0.5)',
      },
      animation: {
        'pulse-soft': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'slideIn': 'slideIn 0.3s ease-out'
      },
      height: {
        'screen': '100vh',
      },
      width: {
        'screen': '100vw',
      },
      aspectRatio: {
        'craps': '2.5 / 1',
      },
      keyframes: {
        slideIn: {
          '0%': { transform: 'translateY(100%)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' }
        }
      },
    },
  },
  plugins: [],
}

