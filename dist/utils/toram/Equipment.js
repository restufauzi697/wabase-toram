import axios from "axios"
import fs from "fs";
import { parse as parseCSV } from '../../lib/utils/csv.js';

function parseItems(rows) {
	const items = [];
	let currentItem = null;
	let activeCategory = null; // 'stats', 'obtain', 'recipe', 'extra'

	for (let i = 0; i < rows.length; i++) {
		const row = rows[i];
		if (row.length < 10) continue;

		const col1 = row[0]?.trim() || '';
		const col2 = row[1]?.trim() || '';
		const col3 = row[2]?.trim();
		const col4 = row[3]?.trim();
		const col5 = row[4]?.trim();     // kategori
		const col6 = row[5]?.trim();     // properti
		const col7 = row[6]?.trim();     // nilai
		const col8 = row[7]?.trim();
		const col10 = row[9]?.trim();    // nama Inggris

		// Deteksi awal item baru
		if (col1 !== '' && col2 !== '') {
			if (currentItem) items.push(currentItem);
			currentItem = {
				name: col1,
				name_en: col10,
				type: col2,
				base_atk_def: col3 === '' ? null : parseValue(col3),
				base_stability: col4 === '' ? null : parseValue(col4),
				stats: [],
				obtain: [],
				recipe: null,
				extra: {}
			};
			activeCategory = null;
			// Proses baris pertama jika mengandung data
			if (col5 !== '' || col6 !== '') {
				processRow(currentItem, col5, col6, col7, col8);
				if (col5 !== '') activeCategory = col5;
			}
		}
		else if (col1 === '' && currentItem) {
			// Baris lanjutan
			let category = col5;
			if (category === '') category = activeCategory;
			processRow(currentItem, category, col6, col7, col8);
			if (col5 !== '') activeCategory = col5;
		}
	}
	if (currentItem) items.push(currentItem);
	return items;
}

function processRow(item, category, prop, val1, val2) {
	if (category === 'stats' && prop) {
		const stat = { stat: prop, value: parseValue(val1) };
		if (val2 && val2.trim() !== '') stat.value2 = parseValue(val2);
		if (String(val1).trim().endsWith('%')) stat.percent = true;
		item.stats.push(stat);
	}
	else if (category === 'obtain') {
		if (prop === 'type') {
			item.obtain.push({ type: val1, name: '', map: '', dye: '' });
		} else if (item.obtain.length > 0) {
			const last = item.obtain[item.obtain.length - 1];
			if (prop === 'name') last.name = val1;
			else if (prop === 'map') last.map = val1;
			else if (prop === 'dye') last.dye = val1;
		}
	}
	else if (category === 'recipe') {
		if (!item.recipe) item.recipe = {};
		const key = prop;
		if (key === 'cost') item.recipe.cost = parseValue(val1);
		else if (key === 'materials') item.recipe.materials = val1;
		else if (key === 'item_level') item.recipe.item_level = parseValue(val1);
		else if (key === 'item_difficulty') item.recipe.item_difficulty = parseValue(val1);
		else if (key === 'potential') item.recipe.potential = parseValue(val1);
		else if (key && val1) item.recipe[key] = parseValueOrString(val1);
	}
	else if (category === 'extra' && prop === 'caption') {
		item.extra.caption = val1;
	}
}

function parseValue(val) {
	if (val === undefined || val === null || val === '') return null;
	const s = String(val).trim();
	if (s.endsWith('%')) {
		const num = parseFloat(s.slice(0, -1));
		return isNaN(num) ? s : num;
	}
	const num = Number(s);
	return isNaN(num) ? s : num;
}

function parseValueOrString(val) {
	const v = parseValue(val);
	return v !== null ? v : val;
}

// -------- URL ke Equipment --------
const DataPath = {
	Equipment: 'https://docs.google.com/spreadsheets/d/e/2PACX-1vRwaGM9CClGkSw-6iUFmdOyIeI-_9i5RvIuHdSCTCUgFCk7GV4v1evt5C79JSG5P66ZGopM2-ZJJaEA/pub?gid=0&single=true&output=csv&range=A:J',
	_Equipment: './assets/toram/items/Equipment List.csv'
}

const Equipment = {List:null}

// ---------- Main Function ----------
async function load(update) {
	if (update) {
		const csvText = (await axios.get(DataPath.Equipment)).data||'';
		fs.writeFileSync(DataPath._Equipment, csvText)
	}
	const csvText = fs.readFileSync(DataPath._Equipment, 'utf-8');
	const csvRows = parseCSV(csvText, {hasHeader: false});
	const items = parseItems(csvRows.slice(1));
	// console.log(JSON.stringify(items.slice(75, 82), null, 2))
	return Equipment.List = items;
}

export { load, Equipment }