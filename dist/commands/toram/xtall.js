import main from "../../utils/toram/Crystal-translated.js"

var _ready = false;

export const command = {
	command: 'xtall',
	onlyOwner: false,
	onlyPremium: false,
	onlyGroup: false,
	tag: '_Toram Online_',
	description: 'Mencari xtall dan menampilkan statnya.',
	get help() {
		return `usage: .xtall <name>`
	},
	handle: async (bot, m) => {
		if(!_ready)
			return await m.reply('Sebentar ya.. tunggu saya siap.')
		
		const name = m.arguments[0]?.toLowerCase().trim()||''
		const result = find_crystal(name)
		
		if(result)
			await m.reply(`Hasil dari ${m.arguments[0]||'apa nih?'}\n\n${result}`)
		else
			await m.reply('Tidak ada nama xtall yang cocok')
	}
}

function find_crystal(name) {
	const find = []
	var match
	for(const xtall of Crystal.List) {
		let { name:name1, name2 } = xtall
		let point = -1
		
		name1 = name1.toLowerCase()
		name2 = name2.toLowerCase()
		
		if(name1.includes(name))
			point = Math.abs(name1.length - name.length)
		else if(name2.includes(name))
			point = Math.abs(name2.length - name.length)
			
		if(point == 0) {
			match = xtall
			break
		} else if(point > 0) {
			find.push({
				xtall,
				point
			})
		}
	}
	
	let result = ''
	if (find.length == 1) {
		match = find.pop().xtall
		result = 'Apakah ini yang kamu cari?\n'
	}
	if (match) {
		let category = {
			weapon: 'Senjata',
			body: 'Armor',
			additional: 'Perkakas tambahan',
			special: 'Ring',
			normal: 'Semua'
		}[match.category]
		result += `XTall untuk ${category}\n`
		result += crystal_details(match)
	} else if(find.length) {
		result += 'hmm.. yang mana nih..\n'
		result += find
		 . sort(({point:a},{point:b})=>a-b)
		 . map(({xtall:{name}})=>'- '+name)
		 . join('\n')
	} else {
		result = 'Tidak ketemu..'
	}
	return result
}

/*
async function getData(DataPath) {
	const response = await fetch(DataPath)
	if(!response.ok)
		return []
	const data = (await response.text()).replace(/".*?"/g,a=>a.replace(/,/g,'%2C'))
	const csv = data.split('\n').map(row=>row.split(',').map(cell=>cell.replace(/%2C/g,',').trim()))
	return csv
}

async function main () {
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
					name1: F.trim() || A,
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
	return DataCrystal
}

const DataPath = {
	Crystal: 'https://docs.google.com/spreadsheets/d/e/2PACX-1vRwaGM9CClGkSw-6iUFmdOyIeI-_9i5RvIuHdSCTCUgFCk7GV4v1evt5C79JSG5P66ZGopM2-ZJJaEA/pub?gid=1665548440&single=true&output=csv', // '&range=A:E'
}
*/

const Crystal = {List:null}

!main().then(result => {Crystal.List = result.List, _ready = true})

function crystal_details(xtall) {
	const route = related(xtall)
	let result = `*Name:* ${xtall.name}\n*Type:* ${
		['','Upgrade '][enhancer(xtall)?.value1|0]
	} ${xtall.category}\n*Stats:* \n${
		xtall.data.stats?.map(({key,value1,value2,value3}) => {
			return (value2? '*'+value2+'*\n': '')+ `- ${key.replace(/_/g,' ')} ${value3||value1}`
		}).join('\n')||''
	}`
	if (xtall.data.recipe)
		result += `\n*Recipe:* \n${
			xtall.data.recipe.map(({key,value1,value2,value3}) => {
				return `- ${key.replace(/_/g,' ')} ${value3||value1||'`No data`'}`
			}).join('\n')||''
		}`; else
	if (xtall.data.obtain)
		result += `\n*Obtain:* \n${
			xtall.data.obtain.map(({key,value1,value2,value3}) => {
				return `- ${key.replace(/_/g,' ')} ${value3||value1||'`_`'}`
			}).join('\n')||''
		}`
	if (route.length > 0)
		result += `\n*Related:* ${
			route.up
			 . map(a=>'\n- '+a)
			 . join('')
		}\n- ${xtall.name}${
			route.down
			 . map(a=>'\n- '+a)
			 . join('')
		} (main)`
	return result
}

function related(xtall) {
	const up = [], down = []
	let name = xtall.name2,
	target = enhancer(xtall)?.value1
	
	const enchMap = new Map()
	const nameMap = new Map()
	
	Crystal.List.forEach(a=>{
		const up = enhancer(a)
		if(up)
			enchMap.set( up.value1, a)
			nameMap.set( a.name2, a)
	})
	
	var find
	while(find = enchMap.get(name)) {
		name = find.name2
		up.unshift(find.name)
	}
	
	while(find = nameMap.get(target)) {
		down.push(find.name)
		target = enhancer(find)?.value1
	}
	
	return {up, down, length: up.length+down.length}
}

function enhancer(xtall) {
	return xtall.data.other?.find(({key})=>(key=='enhancer'))
}
