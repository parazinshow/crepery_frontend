import { promises as fs } from 'fs'
import path from 'path'
const CACHE_PATH = path.resolve('./server/cache/catalog.json')

export default defineEventHandler(async () => {
  try {
    const file = await fs.readFile(CACHE_PATH, 'utf8')
    return JSON.parse(file)
  } catch (e) {
    console.warn('⚠️ Falha ao ler cache de toppings:', e)
    return { data: null }
  }
})
