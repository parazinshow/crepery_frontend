<template>
  <div>
    <h1>Orders</h1>
    <p>Menu:</p>
    <ul>
      <li v-for="item in itemsMenu.items" :key="item.id">
        {{ item.name }} - {{ item.description }} - ${{ item.variations[0].price }}
      </li>
    </ul>
  </div>
</template>

<script setup>
const itemsMenu = await $fetch('/api/menu');
console.log('Menu items:', itemsMenu);

</script>