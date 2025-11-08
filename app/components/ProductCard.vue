<template>
  <div
    class="bg-white dark:bg-gray-800 rounded-xl shadow-md overflow-hidden hover:shadow-lg transition-shadow"
  >
    <img
      :src="image"
      :alt="title"
      class="w-full h-48 object-cover"
    />

    <div class="p-4">
      <h2 class="text-lg font-semibold text-gray-900 dark:text-gray-100">
        {{ title }}
      </h2>

      <p class="text-gray-600 dark:text-gray-300 text-sm line-clamp-2 mt-1">
        {{ description }}
      </p>

      <div class="flex items-center justify-between mt-4">
        <span class="text-lg font-bold text-gray-900 dark:text-gray-100">
          ${{ price.toFixed(2) }}
        </span>
        <button
          class="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition"
        >
          Adicionar
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
defineProps({
  title: String,
  description: String,
  image: String,
  price: Number,
})
</script>