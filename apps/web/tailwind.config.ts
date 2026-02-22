import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './src/app/**/*.{ts,tsx}',
    './src/components/**/*.{ts,tsx}',
    './src/lib/**/*.{ts,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        node: {
          source: {
            DEFAULT: '#3b82f6',
            light: '#dbeafe',
            dark: '#1d4ed8',
          },
          queue: {
            DEFAULT: '#f59e0b',
            light: '#fef3c7',
            dark: '#b45309',
          },
          process: {
            DEFAULT: '#22c55e',
            light: '#dcfce7',
            dark: '#15803d',
          },
          sink: {
            DEFAULT: '#6b7280',
            light: '#f3f4f6',
            dark: '#374151',
          },
        },
      },
    },
  },
  plugins: [],
};

export default config;
