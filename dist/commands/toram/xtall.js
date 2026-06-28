import main from "../../utils/toram/Crystal-translated.js";  
import { DICT_EQUIP_STAT, Dictionary } from '../../lib/Dictionary.js';
import { CommandParser } from '../../lib/utils/CommandParser.js';
import logger from '../../utils/logger.js';

// Inisialisasi dictionary untuk koreksi stat
const statDict = new Dictionary(DICT_EQUIP_STAT, {
	separator: /[,;|]+/,
	threshold: 0.65,
	autoMatchScore: 0.95,
	maxSuggestions: 5
});

// Parser khusus untuk xtall (command '.xtall')
const xtallParser = new CommandParser(statDict, ['.xtall']);

let _ready = false;
let Crystal = { List: null };

// Load data xtall
main().then(result => {
	Crystal.List = result.List;
	_ready = true;
});

export const command = {
	command: 'xtall',
	tag: 'Toram Online',
	description: 'Mencari xtall dan menampilkan statnya. Mendukung filter stat, sorting, dan pagination.',
	get help() {
		return `usage: .xtall [nama] [sort:<stat>:<asc|desc>] [stats <stat> <operator> <value> ...]

Contoh:
.xtall dragon
.xtall sort:atk:desc stats atk > 10% 
.xtall brutal dragon stats str > 10`;
	},
	handle: async (bot, m) => {
		if (!_ready) return await m.reply('Sebentar ya.. data xtall sedang dimuat.');

		// Parsing full command
		const fullText = m.text || '';
		let parsed;
		try {
			parsed = xtallParser.parse(fullText);
		} catch (err) {
			return await m.reply(err.message);
		}

		// Jika parsing gagal (null) atau tidak ada argumen, tetap proses dengan default
		if (!parsed) {
			parsed = {
				cmd: '.xtall',
				name: null,
				// page: 1,
				// limit: 10,
				sort: null,
				filters: []
			};
		}

		try {
			const results = filterCrystals(parsed);
			const reply = formatXtallResponse(results, parsed);
			await m.reply(reply);
		} catch (e) {
			logger.error(e)
		}
	}
};

// ========== FILTER & SORTING ==========
function filterCrystals(parsed) {
	let crystals = Crystal.List.slice();
	let match

	// Filter nama
	if (parsed.name) {
		const name = parsed.name.toLowerCase();
		crystals = crystals.filter(xtall => {
				let { name:name1, name2 } = xtall
				
				name1 = name1.toLowerCase()
				name2 = name2.toLowerCase()
				
				if(name1 == name || name1 == name)
					match = xtall
				return name1.includes(name) || name2.includes(name)
			}
		);
	}

	// Filter stat
	if (parsed.filters.length) {
		match = null
		crystals = crystals.filter(crystal => {
			const stats = crystal.data?.stats || [];
			
			return parsed.filters.every(filter => {
				const statKey = filter.stat_id;
				const stat = stats.find(s => s.key == statKey)
				const actualValue = parseInt(stat?.value1);
				const filterValue = filter.value;
				
				switch (filter.operator) {
					case '>': return actualValue > filterValue;
					case '<': return actualValue < filterValue;
					case '>=': return actualValue >= filterValue;
					case '<=': return actualValue <= filterValue;
					case '=': return actualValue === filterValue;
					default: return false;
				}
			});
		});
	}

	const total = crystals.length;
	const items = crystals;

	// Sorting
	// Default sort by name
		crystals.sort((a, b) => sort(a.name, b.name));
	// Sort by stat
	if (parsed.sort) {
		const sortField = parsed.sort.field.toLowerCase();
		const sortOrder = parsed.sort.order === 'asc' ? 1 : -1;
		crystals.sort((a, b) => {
			const aStats = a.data?.stats || [];
			const bStats = b.data?.stats || [];
			let aVal = aStats.find(s => s.key.toLowerCase() === sortField);
			let bVal = bStats.find(s => s.key.toLowerCase() === sortField);
			aVal = aVal?.value3 || aVal?.value1;
			bVal = bVal?.value3 || bVal?.value1;
			const aNum = parseFloat(aVal) || 0;
			const bNum = parseFloat(bVal) || 0;
			return (aNum - bNum) * sortOrder;
		});
	} else if(!parsed.name && crystals.length > 1) {
		// Sort by category
		const c = {w:0,b:1,a:2,s:3,n:4}
		crystals
		 . sort(({category:a},{category:b})=>sort(c[a[0]],c[b[0]]))
		 . forEach(({category},i,arr)=>
			(c.c != category)
				&& (c.c = category)
				| arr.splice(i,0,{header:true, name:`-----\n*Xtall ${category}*\n  ---------`, category})
		 )
	}

	return {
		total, match,
		items,
		filters: parsed.filters
	};
}

// ========== FORMAT OUTPUT SESUAI SARAN DEV ==========
const _T_category = {
	weapon: 'XTall untuk Senjata',
	body: 'XTall untuk Armor',
	additional: 'XTall untuk Perkakas Tambahan',
	special: 'XTall untuk Cincin Spesial',
	normal: 'XTall untuk Semua Equip'
}
const _I_category = {
	weapon: '⚔️',
	body: '🛡️',
	additional: '👒',
	special: '💍',
	normal: '🌟'
}
function formatXtallResponse({ total, match, items, filters }, parsed) {
	if (total === 0) return 'Tidak ada xtall yang cocok.';
	let result = ''

	// Jika terdapat hasil match, tampilkan detail lengkap
	if (total === 1 || match) {
		match ? '' : 'Apakah ini yang kamu cari?\n'
		match = match || items[0]
		
		if (match.name.toLowerCase() != parsed.name?.toLowerCase())
		result += 'Apakah ini yang kamu cari?\n'
		result += `${_I_category[match.category]} ${_T_category[match.category]}\n`
		result += crystal_details(match);
	}
	
	// Banyak hasil
	if (total >= 2) {
		if (!filters.length) {
			if (!match) // Pencarian tanpa kecocokan (hanya filter name)
				result += 'hmm.. yang mana nih..\n'
			else
				// Pencarian dengan kecocokan (hanya filter name)
				result += '\n*Related:*\n'
			result += items
			 . map(({name})=>'- '+name)
			 . join('\n')
		} else {
			// Pencarian dengan filter stats
			result += `Ditemukan ${total} xtall dengan filter:\n`;
			// Tampilkan filter yang dicari
			for (const f of filters) {
				result += `- ${f.raw_stat} ${f.operator} ${f.value}${f.isPercent ? '%' : ''}\n`;
			}
			result += `==========\n`;
			filters = filters.map(({stat_id})=>stat_id)
			result += items
			 . map(xtall=>{
				let result = `${xtall.header?'\n':''}${_I_category[xtall.category]} ${xtall.name}\n`;
				// Tampilkan nilai stat yang difilter untuk xtall ini
				const statsList = xtall.data?.stats || [];
				
				result += filters.flatMap(stat_id =>{
					const stat = statsList.find(s => s.key.toLowerCase() === stat_id)
					return stat ? [`- ${stat_id.replace(/_/g,' ')}: ${stat.value3 || stat.value1}`] : []
				}).join('\n')
				return result
			}).join('\n');
		}
	}
	return result
}

// ========== FUNGSI TAMBAHAN (sort, crystal_details, enhancer, related) ==========
const sort = (a,b) => a-b || -(a<b)|(a>b)

function crystal_details(xtall) {
	const route = related(xtall);
	let result = `*Name:* ${xtall.name}\n*Type:* ${
		['','Upgrade '][enhancer(xtall)?.value1|0]
	} ${xtall.category}\n*Drop:* ${xtall.bossCategory.replace(/_/g,' ')}\n*Stats:*${
		xtall.data.stats?.reduce((_, { key, value1:x, value2:z='', value3:y }) => {
			x = y||x||'`No data`';
			y = _[z] ??= _.length;
			_[y] ||= z?`  ${z}:`:'';
			_[y] += `\n${z?'	• ':'- '} ${key.replace(/_/g,' ')} *${x}*`;
			return _;
		}, []).join('\n')
	}`;
	if (xtall.data.recipe)
		result += `\n*Recipe:* \n${
			xtall.data.recipe.map(({key,value1,value2,value3}) => {
				return `- ${key.replace(/_/g,' ')} ${value3||value1||'`No data`'}`;
			}).join('\n')||''
		}`; else
	if (xtall.data.obtain)
		result += `\n*Obtain:* \n${
			xtall.data.obtain.map(({key,value1,value2,value3}) => {
				return `- ${key.replace(/_/g,' ')} ${value3||value1||'`_`'}`;
			}).join('\n')||''
		}`;
	if (route.length > 0)
		result += `\n*Upgrade:* ${
			route.up
			 .map(a=>'\n∧ '+a)
			 .join('')
		}\n∧ ${xtall.name}${
			route.down
			 .map(a=>'\n∧ '+a)
			 .join('')
		} (base)`;
	return result;
}

function related(xtall) {
	const up = [], down = [];
	let name = xtall.name2,
	target = enhancer(xtall)?.value1;

	const enchMap = new Map();
	const nameMap = new Map();

	Crystal.List.forEach(a => {
		const up = enhancer(a);
		if(up) enchMap.set(up.value1, a);
		nameMap.set(a.name2, a);
	});

	let find;
	while(find = enchMap.get(name)) {
		name = find.name2;
		up.unshift(find.name);
	}

	while(find = nameMap.get(target)) {
		down.push(find.name);
		target = enhancer(find)?.value1;
	}

	return {up, down, length: up.length+down.length};
}

function enhancer(xtall) {
	return xtall.data.other?.find(({key}) => key === 'enhancer');
}