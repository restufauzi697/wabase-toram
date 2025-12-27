var _ready = false;

async function getData(DataPath) {
	const response = await fetch(DataPath)
	if(!response.ok)
		return []
	const data = (await response.text()).replace(/".*?"/g,a=>a.replace(/,/g,'%2C'))
	const csv = data.split('\n').map(row=>row.split(',').map(cell=>cell.replace(/%2C/g,',').trim()))
	return csv
}

export async function load () {
	const RawCrystal = (await getData(DataPath.Crystal)).slice(1)
	const DataCrystal = []
	var a,b,c,d,e,f,g,
	    A,B,C,D,E,F,G;
	const type = [
		["boss","定點王"],
		["mini_boss","區域王"],
		["mobs","小怪"],
		["quest","任務"],
		["smith","鐵匠鋪製作"],
		["other","其他"],
		["box","箱子道具"],
		["exchange","交換所"],
		["unknow","未知"],
	]
	
	var fokus_key, part_value;
	var crystal, category, bossCategory;
	
	for([A,B, C,D, E, F,G] of RawCrystal) {
		if(A) {
			if(crystal)
				DataCrystal.push(crystal)
				
			
			crystal = null
			a = parseInt(A)
			
			if (a === 0) {
				category = ['weapon', 'body', 'additional', 'special', 'normal'][B]
				continue
			} else if (a === 1) {
				bossCategory = type.find(([a,b]) => b == C)?.[0] || C
				continue
			} else {
				crystal = {
					name : F.trim() || A,
					name1: F,
					name2: A,
					category,
					bossCategory,
					data: {}
				}
			}
		}
		
		if (B) {
			fokus_key = B
			crystal.data[fokus_key] = []
		}
		
		if (C) {
			if (C == 'name' && fokus_key == 'stats')
				fokus_key = 'obtain',
				crystal.data[fokus_key] ||= []
			crystal.data[fokus_key].push({
				key: C,
				value1: D,
				value2: E,
				value3: G,
			})
		}
	}
	
	if(crystal)
		DataCrystal.push(crystal)
	crystal = null
	
	_ready = true
	return Crystal.List = DataCrystal
}

const DataPath = {
	Crystal: 'https://docs.google.com/spreadsheets/d/e/2PACX-1vRwaGM9CClGkSw-6iUFmdOyIeI-_9i5RvIuHdSCTCUgFCk7GV4v1evt5C79JSG5P66ZGopM2-ZJJaEA/pub?gid=1665548440&single=true&output=csv', // '&range=A:E'
}

export const Crystal = {List:null};
