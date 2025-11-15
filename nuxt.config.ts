// https://nuxt.com/docs/api/configuration/nuxt-config
// @ts-nocheck
export default defineNuxtConfig({
  compatibilityDate: '2025-07-15',
  devtools: {
    enabled: true,

    timeline: {
      enabled: true,
    },
  },
  modules: ['@nuxtjs/tailwindcss', '@nuxt/image'],
  postcss: {
    plugins: {
      tailwindcss: {},
      autoprefixer: {},
    },
  },
  runtimeConfig: {
    public: {
      SQUARE_ENV: process.env.NUXT_PUBLIC_SQUARE_ENV,

      SQUARE_SANDBOX_APP_ID: process.env.NUXT_PUBLIC_SQUARE_SANDBOX_APP_ID,
      SQUARE_SANDBOX_LOCATION_ID: process.env.NUXT_PUBLIC_SQUARE_SANDBOX_LOCATION_ID,

      SQUARE_PRODUCTION_APP_ID: process.env.NUXT_PUBLIC_SQUARE_PRODUCTION_APP_ID,
      SQUARE_PRODUCTION_LOCATION_ID: process.env.NUXT_PUBLIC_SQUARE_PRODUCTION_LOCATION_ID,
    },
  },
  ssr: true,
  nitro: {
    preset: 'node-server'
  }
})