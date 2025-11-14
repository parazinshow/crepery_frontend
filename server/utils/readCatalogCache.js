// server/utils/readCatalogCache.js
// ---------------------------------------------------------
// Função utilitária para ler o catálogo salvo em:
//   server/cache/catalog.json
//
// Isso permite que qualquer arquivo do backend consiga
// acessar o cache sem depender do endpoint API.
// ---------------------------------------------------------

import { promises as fs } from 'fs'
import path from 'path'

const CACHE_PATH = path.resolve('./server/cache/catalog.json')

export async function readCatalogCache() {
  try {
    const file = await fs.readFile(CACHE_PATH, 'utf8')
    return JSON.parse(file)
  } catch (err) {
    console.warn('⚠️ Falha ao ler catalog.json:', err)
    return null
  }
}
