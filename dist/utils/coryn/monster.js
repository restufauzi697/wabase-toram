import fs from 'fs/promises';
import path from 'path';
import logger from '../logger.js'

export var ElementType = ((ElementType2) => {
  ElementType2[ElementType2["netral"] = ElementType2["neutral"] = 0] = "Netral";
  ElementType2[ElementType2["angin"] = ElementType2["wind"] = 1] = "Angin";
  ElementType2[ElementType2["bumi"] = ElementType2["earth"] = 2] = "Bumi";
  ElementType2[ElementType2["air"] = ElementType2["water"] = 3] = "Air";
  ElementType2[ElementType2["api"] = ElementType2["fire"] = 4] = "Api";
  ElementType2[ElementType2["cahaya"] = ElementType2["light"] = 5] = "Cahaya";
  ElementType2[ElementType2["gelap"] = ElementType2["dark"] = 6] = "Gelap";
  return ElementType2;
})(ElementType || {});

// N: Normal
// M: Mini boss
// B: Boss
const VALID_TYPE = ['N', 'M', 'B']
const BASE_API = 'https://coryn.club/api/v1/monsters.php';
const LIMIT = 100;
const DELAY_MS = 3000;

async function fetchAllDB(type='') {
	let offset = 0;
	let total = Infinity;
	let result = {};
	const allData = [];
	let batchCount = 0;

	while (offset < total) {
		const url = `${BASE_API}?type=${type}&limit=${LIMIT}&offset=${offset}`;
		
		try {
			const res = await fetch(url);
			const response = await res.json();

			if (!response.success) {
				throw new Error(`Request failed: ${JSON.stringify(response)}`);
			}

			// ambil total cuma di request pertama
			if (total === Infinity) {
				total = response.meta.total;
				result = response
			}

			// sepertinya data sudah sabis
			if (!response.data?.length)
				break

			allData.push(...response.data);
			offset += response.data?.length;
			batchCount++;

			logger.info(`Fetched ${offset}/${total} data`);

			// kasih delay 3 detik tiap 100 data, kecuali batch terakhir
			if (offset < total) {
				await new Promise(r => setTimeout(r, DELAY_MS));
			}

		} catch (err) {
			logger.error(err, 'Error fetching');
			throw err;
		}
	}

	//validasi data akhir
	result.data = allData
	result.meta.total = allData.length

	return result;
}

const monster_update = (async(monster) => {
	try {
		const url = 'https://cdn.jsdelivr.net/npm/koishi-plugin-toram@latest/lib/json/monsters.json'
		const res = await fetch(url);
		const response = await res.json();

		if (!res.ok) {
			const err = new Error(`Request update failed: ${JSON.stringify(response)}`);
			logger.warn(err)
		}
		
		monster = response
	} catch (err) {
		logger.error(err, 'Error fetching');
	}
	return monster
})([]);

const DB_FILE = './database/monster.json';

// Mapping element beda urutan A vs B
const ELEMENT_MAP_B_TO_A = {
	0: 0, // Netral
	1: 4, // Api → 4
	2: 3, // Air → 3
	3: 1, // Angin → 1
	4: 2, // Bumi → 2
	5: 6, // Gelap → 6
	6: 5 // Cahaya → 5
};

// Mapping type_code B → type A
const TYPE_MAP = {
	'B': 2, // boss
	'M': 1, // mini_boss
	'N': 0 // mobs, kalau mau disimpen juga
};

let cache = null;

/**
 * Fetch data dari API
 * Ganti ini sesuai cara kamu fetch A & B
 */
async function fetchA() {
	// TODO: implement fetch ke API CN
	return await monster_update || [];
}

async function fetchB() {
	// TODO: implement fetch ke API EN batch
	return (await fetchAllDB(''))?.data || [];
}

/**
 * Merge Fetch-B ke format Fetch-A
 * - id = id dari B
 * - name = name EN dari B
 * - type = 1 mini, 2 boss
 * - element = convert B→A
 * - baseLevel = level Normal, kalau nggak ada ambil level terendah
 * - baseExp = exp mode Normal
 * - map = map_name B
 * - recommend = 3 default
 */
function mergeToFormatA(dataB) {
	// Group by name + map biar boss multi-mode jadi 1 entry
	const grouped = {};

	for (const m of dataB) {
		const key = `${m.name}|${m.map_id}`;
		if (!grouped[key]) grouped[key] = [];
		grouped[key].push(m);
	}

	const result = [];
	let idCounter = 1; // id urut A, tapi kamu minta id B, jadi pake B.id

	for (const [key, variants] of Object.entries(grouped)) {
		// Ambil base = mode Normal, kalau nggak ada ambil level terendah
		const base = variants.find(v => v.mode === 'Normal')
				  || variants.sort((a, b) => a.level - b.level)[0];

		// Boss doang yang punya mode, minibos/mobs 1 data aja
		const isBoss = base.type_code === 'B';

		result.push({
			_mode: base.mode,
			id: base.id, // id DB Fetch-B
			type: TYPE_MAP[base.type_code]?? 0,
			name: base.name,
			baseLevel: base.level,
			element: ELEMENT_MAP_B_TO_A[base.element_id]?? 0,
			baseExp: base.exp,
			map: base.map_name,
			recommend: null
		});
	}

	// Sort by id biar rapi
	return result.sort((a, b) => a.id - b.id);
}

/**
 * Reset: fetch ulang + merge + save ke file
 */
export async function reset() {
	if (global.devMode) logger.info('[DB] Fetching data...');
	const [dataA, dataB] = await Promise.all([fetchA(), fetchB()]);

	if (global.devMode) logger.info('[DB] Merging...');
	const merged = mergeToFormatA(dataB); // lang EN, format A

	merged.push(...dataA.filter(a => {
		const b = merged.find(b=>b.baseLevel === a.baseLevel && b.baseExp === a.baseExp && b.element === a.element)
		if (b)
			b.recommend = a.recommend
		else
			a.id = null
		return !b
	}))

	if (global.devMode) logger.info(`[DB] Saving ${merged.length} monsters...`);
	await fs.writeFile(DB_FILE, JSON.stringify(merged, null, 2), 'utf-8');

	cache = merged;
	if (global.devMode) logger.info('[DB] Reset selesai');
	return merged;
}

/**
 * Load: baca dari file, kalau nggak ada auto reset
 * @param {boolean} forceReset - true = reset ulang
 */
export async function load(forceReset = false) {
	if (cache &&!forceReset) return cache;

	if (forceReset) return await reset();

	try {
		const raw = await fs.readFile(DB_FILE, 'utf-8');
		cache = JSON.parse(raw);
		if (global.devMode) logger.info(`[DB] Loaded ${cache.length} monsters from cache`);
		return cache;
	} catch {
		if (global.devMode) logger.info('[DB] Cache not found, running reset...');
		return await reset();
	}
}

// Helper: cari monster by id/name/element/{name,type,element0}
export function findMonster(query) {
	if (!cache) throw new Error('DB not loaded. Call load() first');

	if (typeof query === 'number') {
		return cache.find(m => m.id === query);
	}
	
	let name, element, type
	if (typeof query === 'string')
		query = query.toLowerCase(),
		name = query,
		element = query

	if (typeof query === 'object' && query !== null)
		name = query.name?.toLowerCase(),
		element = query.element?.toLowerCase(),
		type = query.type
	
	return cache.filter(m =>
		(!name || m.name.toLowerCase().includes(name)) &&
		(element == null || m.element === ElementType[element]) &&
		(type == null || m.type === Number(type))
	);
}