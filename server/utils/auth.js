// ===============================================
// 🔒 Função utilitária: requireAuth(event)
// -----------------------------------------------
// Este módulo é responsável por autenticar rotas
// protegidas no backend. Ele verifica se o request
// contém um token JWT válido antes de permitir o acesso.
// ===============================================

import jwt from 'jsonwebtoken'       // 📦 Biblioteca usada para verificar tokens JWT
import { createError } from 'h3'     // ⚙️ Função auxiliar do Nuxt/Nitro para lançar erros HTTP

// ✅ Função principal de autenticação
export async function requireAuth(event) {
  // 🧩 1️⃣ Garante que o "event" recebido é válido (com acesso ao objeto da requisição HTTP)
  if (!event?.node?.req) {
    throw createError({ statusCode: 500, statusMessage: 'Event inválido' })
  }

  // 🔍 2️⃣ Lê o header "Authorization" enviado na requisição
  const auth = event.node.req.headers.authorization

  // ⚠️ 3️⃣ Se o header não existe ou não começa com "Bearer", bloqueia o acesso
  // Exemplo esperado: "Authorization: Bearer <token>"
  if (!auth?.startsWith('Bearer ')) {
    throw createError({ statusCode: 401, statusMessage: 'Missing token' })
  }

  // 🔑 4️⃣ Extrai apenas o token (removendo a palavra "Bearer")
  const token = auth.split(' ')[1]

  // 🧾 5️⃣ Verifica se o token é válido e assinado com a chave secreta do servidor
  try {
    jwt.verify(token, process.env.JWT_SECRET)
  } catch (e) {
    // ❌ Se o token estiver expirado, corrompido ou inválido, retorna erro 401 (não autorizado)
    throw createError({ statusCode: 401, statusMessage: 'Invalid token' })
  }

  // ✅ Se passar por todas as verificações, a função termina sem erro
  // e a rota protegida pode continuar normalmente.
}
