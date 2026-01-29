// unocss.config.ts
import { defineConfig, presetUno, presetAttributify, presetIcons } from 'unocss'

export default defineConfig({
  presets: [
    presetUno(),
    presetAttributify(),
    presetIcons(),
  ],
  theme: {
    fontFamily: {
      logo: 'var(--font-logo-dynamic)',
    },
    colors: {
      lavender: {
        DEFAULT: '#A5A6F6',
        hover: '#8D8EE0', // Darker for hover
        active: '#7677CC', // Even darker for active
        light: '#EBEBFC', // For focus rings
      }
    }
  }
})
