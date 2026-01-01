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
