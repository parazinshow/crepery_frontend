// utils/getDailyOrderNumber.js
import prisma from './db.js'
import { format } from 'date-fns'

/**
 * Gera um número incremental de pedido que reinicia a cada dia.
 * Exemplo: 1, 2, 3... e no dia seguinte volta pra 1.
 */
export async function getDailyOrderNumber() {
  const today = format(new Date(), 'yyyy-MM-dd')

  // busca o último pedido de hoje
  const lastOrderToday = await prisma.order.findFirst({
    where: { dateKey: today },
    orderBy: { dailyNumber: 'desc' },
  })

  // define o próximo número
  const nextNumber = (lastOrderToday?.dailyNumber || 0) + 1

  return { nextNumber, today }
}
