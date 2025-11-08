<script setup>
const products = [
  {
    title: 'Crepe de Nutella',
    description: 'Com morango e chantilly. Feito com massa artesanal e ingredientes frescos.',
    price: 11.0,
    image: 'https://images.unsplash.com/photo-1604908177074-6e5a26d0a5b6?w=800&q=80'
  },
  {
    title: 'Crepe Brittany',
    description: 'Egg, ham and cheese com leve toque de manteiga francesa.',
    price: 15.0,
    image: 'https://images.unsplash.com/photo-1565958011702-44e211f046f9?w=800&q=80'
  },
  {
    title: 'Crepe de Frutas Vermelhas',
    description: 'Morangos, mirtilos e framboesas com calda doce e chantilly.',
    price: 13.5,
    image: 'https://png.pngtree.com/png-vector/20241120/ourmid/pngtree-delicious-crepes-with-chocolate-sauce-and-strawberries-png-image_14506412.png'
  }
]
</script>

<template>
  <main class="max-w-7xl mx-auto p-6">
    <h1 class="text-3xl font-bold mb-6 text-gray-900 dark:text-gray-100">
      Cardápio
    </h1>

    <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
      <ProductCard
        v-for="p in products"
        :key="p.title"
        :title="p.title"
        :description="p.description"
        :price="p.price"
        :image="p.image"
      />
    </div>
  </main>
</template>