import { promises as fs } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const DB_PATH = join(process.cwd(), 'database', 'data.json')

let cache = null
let writeQueue = Promise.resolve()

// Load DB ke memory sekali pas awal
async function loadDB() {
    if (cache) return cache
    try {
        const file = await fs.readFile(DB_PATH, 'utf8')
        cache = JSON.parse(file)
    } catch (err) {
        if (err.code === 'ENOENT') {
            cache = {}
            await saveDB()
        } else {
            throw err
        }
    }
    return cache
}

// Save DB ke file. Pake queue biar nggak tabrakan kalo write bareng
function saveDB() {
    writeQueue = writeQueue.then(() =>
        fs.writeFile(DB_PATH, JSON.stringify(cache, null, 2), 'utf8')
    )
    return writeQueue
}

/**
 * Ambil data berdasarkan name/key
 * @param {string} name
 * @returns {Promise<any|null>} data atau null kalau nggak ada
 */
export async function get(name) {
    const db = await loadDB()
    return db[name]?? null
}

/**
 * Simpan/update data
 * @param {string} name
 * @param {any} data
 * @returns {Promise<void>}
 */
export async function save(name, data) {
    const db = await loadDB()
    db[name] = data
    await saveDB()
}

/**
 * Hapus data
 * @param {string} name
 * @returns {Promise<boolean>} true kalau kehapus, false kalau emang nggak ada
 */
export async function remove(name) {
    const db = await loadDB()
    if (name in db) {
        delete db[name]
        await saveDB()
        return true
    }
    return false
}

export default { get, save, remove }