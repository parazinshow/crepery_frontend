<script setup>
  import {ref, onMounted, onBeforeUnmount} from 'vue'

  const activeSection = ref(1)

  const handleScroll = () => {
    if (typeof window === 'undefined') return

    const scrollY = window.scrollY || 0
    const vh = window.innerHeight || 1

    const firstBoundary = vh * 0.7

    if (scrollY < firstBoundary) {
      activeSection.value = 1
    } else {
      activeSection.value = 2
    }
  }

  onMounted(() => {
    window.addEventListener('scroll', handleScroll, {passive: true})
    handleScroll()
  })

  onBeforeUnmount(() => {
    if (typeof window !== 'undefined') {
      window.removeEventListener('scroll', handleScroll)
    }
  })
</script>

<template>
  <!-- CONTAINER DA PÁGINA INTEIRA -->
  <div class="relative min-h-screen text-white">
    <!-- VÍDEO FIXO NO FUNDO -->
    <div class="fixed inset-0 -z-20 overflow-hidden">
      <video autoplay loop muted playsinline class="w-full h-full object-cover">
        <source src="/videos/crepeVideo.mp4" type="video/mp4" />
        Your browser does not support HTML5 video.
      </video>
      <div class="absolute inset-0 bg-black/40"></div>
    </div>

    <!-- HEADER FIXO NO TOPO -->
    <div class="fixed top-0 left-0 right-0 z-40">
      <HeaderNav />
    </div>

    <!-- FOOTER FIXO NO BOTTOM -->
    <div class="fixed bottom-0 left-0 right-0 z-40">
      <Footer />
    </div>

    <!-- INDICADOR DE SCROLL (BOTTOM CENTER) -->
    <div
      v-if="activeSection === 1"
      class="fixed bottom-24 left-1/2 -translate-x-1/2 z-30 flex flex-col items-center gap-2 pointer-events-none"
    >
      <span class="text-[10px] tracking-[0.25em] uppercase text-white/70">
        Scroll down to see more
      </span>
      <div class="w-px h-4 bg-white/60 animate-pulse"></div>
    </div>

    <!-- INDICADOR DE ETAPAS (LATERAL DIREITA) -->
    <div
      class="fixed right-6 top-1/2 -translate-y-1/2 z-30 hidden md:flex flex-col items-center gap-3"
    >
      <span
        v-for="dot in 2"
        :key="dot"
        class="w-2 h-2 rounded-full border border-white/50 transition-all duration-200"
        :class="{
          'bg-white scale-125 shadow-[0_0_0_4px_rgba(255,255,255,0.25)]':
            activeSection === dot,
          'bg-white/20': activeSection !== dot,
        }"
      />
    </div>

    <!-- ÁREA DE SCROLL / PARALLAX -->
    <main class="relative z-10 pt-24 pb-24">
      <section class="relative h-[200vh]">
        <!-- CONTEÚDO CENTRAL FIXO (STICKY) -->
        <div
          class="sticky top-1/2 -translate-y-1/2 flex flex-col items-center justify-center px-6 text-center"
        >
          <Transition name="fade" mode="out-in">
            <!-- CENA 1: HERO -->
            <div
              v-if="activeSection === 1"
              key="section-1"
              class="max-w-4xl space-y-4"
            >
              <h1 class="hero-title leading-tight drop-shadow-lg">
                YOUR FRENCH WINDOW DOWN THE SLOPES
              </h1>
              <p class="hero-subtitle max-w-2xl mx-auto drop-shadow">
                Freshly made crepes and coffee, right where the mountains meet
                France.
              </p>
            </div>

            <!-- SEÇÃO 2 — CARDS CENTRALIZADOS -->
            <div v-else key="section-2" class="w-full max-w-md lg:max-w-2xl mx-auto">
              <div
                class="flex flex-col items-center justify-center gap-6 text-center"
              >
                <!-- CARD: WHERE TO FIND US -->
                <div
                  class="w-full bg-black/25 backdrop-blur-md p-6 rounded-3xl shadow-lg space-y-2"
                >
                  <h2 class="card-title mb-4">WHERE TO FIND US</h2>
                  <p class="card-subtitle">
                    We’re located in the heart of Vail Village — just a couple
                    steps from the slopes
                  </p>
                  <div class="flex flex-col p-4 gap-1">
                    <p class="card-body">333 Bridge Street — Vail 81657 CO</p>
                    <div>
                      <a
                        href="https://maps.google.com/?q=The+Crepe+Girl+Vail"
                        target="_blank"
                        rel="noopener"
                        class="inline-flex items-center gap-2 default-button-desktop text-base px-5 py-2"
                      >
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke-width="2"
                          stroke="currentColor"
                          class="w-5 h-5"
                        >
                          <path
                            stroke-linecap="round"
                            stroke-linejoin="round"
                            d="M12 2C8.13 2 5 5.13 5 9c0 4.52 7 13 7 13s7-8.48 7-13c0-3.87-3.13-7-7-7z"
                          />
                          <circle cx="12" cy="9" r="2.5" fill="currentColor" />
                        </svg>
                        View on Google Maps
                      </a>
                    </div>
                    <p class="card-body">Call us at (970) 471 9277</p>
                  </div>
                </div>

                <!-- CARD: OUR SCHEDULE -->
                <div
                  class="w-full bg-black/25 backdrop-blur-md p-6 rounded-3xl shadow-lg space-y-2"
                >
                  <h2 class="card-title mb-4">OUR SCHEDULE</h2>
                  <p class="card-subtitle">
                    Come warm up with us after a long day on the mountain.
                  </p>
                  <div class="card-body flex flex-col p-4 gap-1">
                    <span>WEDNESDAY to SUNDAY</span>
                    <span>8:30am to 4:30pm</span>
                  </div>
                </div>
              </div>
            </div>
          </Transition>
        </div>

        <!-- ZONAS DE SCROLL (APENAS PARA CRIAR AS 3 "TELAS") -->
        <div class="absolute inset-0 pointer-events-none">
          <div class="h-screen"></div>
          <div class="h-screen"></div>
        </div>
      </section>
    </main>
  </div>
</template>

<style scoped>
  .fade-enter-active,
  .fade-leave-active {
    transition: opacity 300ms ease, transform 300ms ease;
  }
  .fade-enter-from,
  .fade-leave-to {
    opacity: 0;
    transform: translateY(8px);
  }
	.hero-title {
		@apply font-garamond font-semibold italic text-primary-50 text-5xl lg:text-8xl drop-shadow-lg
	}
	.hero-subtitle {
		@apply font-garamond text-primary-50 text-2xl lg:text-3xl drop-shadow-md
	}
  .card {
    @apply text-primary-50 font-garamond;
  }
  .card-title {
    @apply card text-3xl lg:text-4xl;
  }
  .card-subtitle {
    @apply card font-semibold text-xl lg:text-2xl;
  }
  .card-body {
    @apply card text-base lg:text-lg;
  }
</style>
