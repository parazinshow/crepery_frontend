import jwt from 'jsonwebtoken'

export default defineEventHandler(async (event) => {
  const body = await readBody(event)
  const { pin } = body

  if (!pin) {
    throw createError({ statusCode: 400, statusMessage: 'PIN is required' })
  }

  // 🔒 PIN definido em .env
  if (pin !== process.env.ADMIN_PIN) {
    throw createError({ statusCode: 401, statusMessage: 'Invalid PIN' })
  }

  // 🔑 cria token JWT com validade maior (30 dias para iPad)
  const token = jwt.sign(
    { role: 'admin' },
    process.env.JWT_SECRET,
    { expiresIn: '30d' }
  )

  return { token }
})
