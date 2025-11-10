import jwt from 'jsonwebtoken'

export default defineEventHandler(async (event) => {
  const body = await readBody(event)
  const { email, password } = body

  // 🔒 credenciais definidas no .env
  if (
    email !== process.env.ADMIN_EMAIL ||
    password !== process.env.ADMIN_PASSWORD
  ) {
    throw createError({ statusCode: 401, statusMessage: 'Invalid credentials' })
  }

  // 🔑 cria token JWT com validade de 1 dia
  const token = jwt.sign({ email }, process.env.JWT_SECRET, { expiresIn: '1d' })
  return { token }
})
