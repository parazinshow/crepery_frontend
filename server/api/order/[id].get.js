import { getSquareConfig } from '../../utils/squareClient.js'

export default defineEventHandler(async (event) => {
  const id = event.context.params.id
  const { baseUrl, token } = getSquareConfig()

  const res = await $fetch(`${baseUrl}/v2/payments/${id}`, {
    headers: {
      'Square-Version': '2025-01-23',
      Authorization: `Bearer ${token}`,
    },
  })

  return res.payment
})
