/**
 * Pic.re API Library - Anime Random Images
 * Base URL: https://pic.re
 * Documentation: https://doc.pic.re/usage-shi-yong/api
 */

const BASE_URL = 'https://pic.re';

/**
 * Helper: menyusun query string dari parameter objek
 * @param {Object} params - parameter seperti { in: 'girl', nin: 'boy', compress: true }
 * @returns {string} query string, misal "?in=girl&nin=boy&compress=true"
 */
function buildQuery(params) {
  const filtered = Object.entries(params)
    .filter(([, v]) => v !== undefined && v !== null && v !== '')
    .map(([k, v]) => [k, String(v)]);
  if (filtered.length === 0) return '';
  return '?' + new URLSearchParams(Object.fromEntries(filtered)).toString();
}

/**
 * Generic fetcher untuk endpoint JSON (GET atau POST)
 */
async function fetchJSON(endpoint, method = 'GET', params = {}, body = null) {
  const url = `${BASE_URL}${endpoint}${buildQuery(params)}`;
  const options = { method, headers: { 'Accept': 'application/json' } };
  if (body && method === 'POST') {
    options.body = body;
    options.headers['Content-Type'] = 'application/json';
  }
  const res = await fetch(url, options);
  if (!res.ok) throw new Error(`HTTP ${res.status} on ${url}`);
  return await res.json();
}

// ======================== PUBLIC FUNCTIONS ========================

/**
 * 1. Mendapatkan URL gambar acak (redirect ke CDN) - REKOMENDED untuk img.src
 * @param {Object} filter - parameter filter { in, nin, compress, mix_size, max_size, id }
 * @returns {Promise<string>} URL gambar langsung dari CDN
 *
 * @example
 * const imgUrl = await getRandomImageUrl({ in: 'long_hair', compress: true });
 * document.getElementById('myImg').src = imgUrl;
 */
export async function getRandomImageUrl(filter = {}) {
  const query = buildQuery(filter);
  const response = await fetch(`${BASE_URL}/images${query}`, { method: 'GET', redirect: 'manual' });
  if (response.status === 301 || response.status === 302) {
    const location = response.headers.get('Location');
    if (location) return location;
  }
  // Fallback jika tidak redirect (misal error) – coba ambil dari header atau throw
  throw new Error('Failed to get redirect URL from /images');
}

/**
 * 2. Mendapatkan file gambar + metadata dari header (menggunakan endpoint /image GET)
 * @param {Object} filter - parameter filter { in, nin, compress, mix_size, max_size, id }
 * @returns {Promise<{ blob: Blob, imageUrl: string, metadata: Object }>}
 *   - blob: Blob gambar, bisa diubah ke objectURL
 *   - imageUrl: URL sementara (blob:...)
 *   - metadata: { id, source, tags } dari response header
 *
 * @example
 * const { blob, imageUrl, metadata } = await getRandomImageFile({ in: 'girl' });
 * img.src = imageUrl;
 * console.log(metadata.tags);
 */
export async function getRandomImageFile(filter = {}) {
  const query = buildQuery(filter);
  const response = await fetch(`${BASE_URL}/image${query}`);
  if (!response.ok) throw new Error(`HTTP ${response.status} on /image`);

  const blob = await response.blob();
  const imageUrl = URL.createObjectURL(blob);

  // Ekstrak metadata dari header
  const metadata = {
    id: response.headers.get('image_id') || undefined,
    source: response.headers.get('image_source') || undefined,
    tags: response.headers.get('image_tags')?.split(',') || []
  };

  return { blob, imageUrl, metadata };
}

/**
 * 3. Mendapatkan metadata gambar (tanpa file gambar) via GET /images.json
 * @param {Object} filter - parameter filter { in, nin, compress, mix_size, max_size, id }
 * @returns {Promise<Object>} metadata lengkap (file_url, tags, width, height, source, author, _id, dll)
 *
 * @example
 * const meta = await getImageMetadata({ in: 'original' });
 * console.log(meta.author, meta.file_url);
 */
export async function getImageMetadata(filter = {}) {
  return await fetchJSON('/images.json', 'GET', filter);
}

/**
 * 4. Alternatif POST untuk metadata (sama seperti getImageMetadata, tapi method POST)
 * @param {Object} filter - parameter filter
 * @returns {Promise<Object>} metadata sama seperti di atas
 */
export async function postImageMetadata(filter = {}) {
  return await fetchJSON('/image', 'POST', filter);
}

/**
 * 5. Mendapatkan daftar tag populer (beserta jumlah gambar)
 * @returns {Promise<Array<{name: string, count: number}>>}
 *
 * @example
 * const tags = await getTags();
 * tags.forEach(t => console.log(`${t.name}: ${t.count}`));
 */
export async function getTags() {
  return await fetchJSON('/tags', 'GET');
}

/**
 * 6. (Bonus) Mendapatkan metadata dan sekaligus URL gambar (tanpa redirect) 
 *    menggunakan endpoint /image POST + file_url di JSON.
 *    Lebih berat dari redirect, tapi serba dalam satu panggilan.
 * @param {Object} filter 
 * @returns {Promise<{ metadata: Object, imageUrl: string }>}
 */
export async function getMetadataAndUrl(filter = {}) {
  const metadata = await getImageMetadata(filter);
  if (!metadata.file_url) throw new Error('Metadata missing file_url');
  return { metadata, imageUrl: metadata.file_url };
}

// ======================== CONVENIENCE ALIAS ========================
export default {
  getRandomImageUrl,
  getRandomImageFile,
  getImageMetadata,
  postImageMetadata,
  getTags,
  getMetadataAndUrl
};