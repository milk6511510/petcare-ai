/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        oatmeal: '#FAF7F2',
        coral: '#FF7E47',
        sage: '#4E878C',
        ink: '#2B2623'
      },
      fontFamily: {
        sans: ['-apple-system', 'BlinkMacSystemFont', '"SF Pro Text"', '"PingFang TC"', '"Noto Sans TC"', 'sans-serif']
      }
    }
  },
  plugins: []
};
