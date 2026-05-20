/*
import fs from "fs";
import xml2js from "xml2js";
import index from "./index.js";

export const dataSetItems = {Items:[]}
export async function load() {
	const dataset = await index("toram/items", ".xml");
	
	for(const path of Object.values(dataset)) {
		const parser = new xml2js.Parser({ explicitArray: false });
		const xmlString = fs.readFileSync(path);
		const xml = await parser.parseStringPromise(xmlString);
		for(const {Item} of Object.values(xml))
		dataSetItems.Items = dataSetItems.Items.concat( Item )
		
	}
	return dataSetItems
};
*/

// pendekatan baru
import fs from "fs";
import xml2js from "xml2js";
import index from "./index.js";
import { statMapping } from "./statMapping.js";

export const dataSetItems = { Items: [] };

function normalizeStat(stat) {
	const mapping = statMapping[stat.Type];
	if (!mapping) return null;
	
	let value = parseFloat(stat.Value);
	// Jika stat boolean (misal element atau unavailable flags), value 1 berarti true
	if (mapping.valueIsBoolean) {
		value = value === 1;
	}
	return {
		key: mapping.key,
		value: value,
		isPercent: mapping.isPercent || false
	};
}

export async function load() {
	const dataset = await index("toram/items", ".xml");
	
	for (const path of Object.values(dataset)) {
		const parser = new xml2js.Parser({ explicitArray: false });
		const xmlString = fs.readFileSync(path);
		const xml = await parser.parseStringPromise(xmlString);
		for (const { Item } of Object.values(xml)) {
			// Pastikan Item selalu array
			const items = Array.isArray(Item) ? Item : [Item];
			for (const item of items) {
				if (item.Stats && !Array.isArray(item.Stats.Stat)) {
					item.Stats.Stat = [item.Stats.Stat];
				}
				const normalized = [];
				if (item.Stats && item.Stats.Stat) {
					for (const stat of item.Stats.Stat) {
						const norm = normalizeStat(stat);
						if (norm) normalized.push(norm);
					}
				}
				item.NormalizedStats = normalized;
				dataSetItems.Items.push(item);
			}
		}
	}
	return dataSetItems;
}