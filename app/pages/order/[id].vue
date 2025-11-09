<template>
  <div class="max-w-md mx-auto mt-10 bg-white p-6 rounded-lg shadow-lg text-center space-y-4">
    <h2 class="text-2xl font-semibold">Order Confirmation</h2>

    <div v-if="pending">
      <p>Loading your order...</p>
    </div>

    <div v-else-if="error">
      <p class="text-red-600">Order not found or invalid.</p>
    </div>

    <div v-else>
      <p class="text-gray-600">Thank you for your order!</p>
      <p><b>Status:</b> {{ order.status }}</p>
      <p><b>Amount:</b> ${{ (order.amount_money.amount / 100).toFixed(2) }} {{ order.amount_money.currency }}</p>
      <p><b>Payment Method:</b> {{ order.card_details.card.card_brand }} ••••{{ order.card_details.card.last_4 }}</p>
      <p><b>Placed on:</b> {{ new Date(order.created_at).toLocaleString() }}</p>

      <a
        :href="order.receipt_url"
        target="_blank"
        class="inline-block mt-4 bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700"
      >
        View Square Receipt
      </a>
    </div>
  </div>
</template>

<script setup>
const route = useRoute()
const { data: order, pending, error } = await useFetch(`/api/order/${route.params.id}`)
</script>

<style>
body {
  background-color: #f3f4f6;
}
</style>
