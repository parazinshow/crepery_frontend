export default defineEventHandler(async () => {
  const res = await $fetch("https://connect.squareupsandbox.com/v2/catalog/list", {
    headers: {
      "Square-Version": "2025-01-23",
      "Authorization": `Bearer ${process.env.SQUARE_ACCESS_TOKEN}`,
    },
  });

  if (!res.objects) {
    return { error: "Nenhum item encontrado no catálogo", fullResponse: res };
  }

  const i = res.objects

  // Pega apenas items do tipo ITEM
  const items = res.objects
    .filter(obj => obj.type === "ITEM")
    .map(item => {
      const variations = item.item_data.variations?.map(v => ({
        id: v.id,
        name: v.item_variation_data.name,
        price: v.item_variation_data.price_money
          ? v.item_variation_data.price_money.amount / 100
          : null,
        currency: v.item_variation_data.price_money?.currency || "USD",
      })) || [];

      return {
        id: item.id,
        name: item.item_data.name,
        description: item.item_data.description,
        variations,
      };
    });

  return { items };
});