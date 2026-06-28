import { load, Equipment } from "../../utils/toram/Equipment.js";
import parseMiniQuery from '../../lib/utils/parseMiniQuery.js';
import { DICT_EQUIP_STAT, Dictionary } from '../../lib/Dictionary.js';
import logger from '../../utils/logger.js';
import fs from "fs";

// Inisialisasi dictionary untuk koreksi stat
const statDict = new Dictionary(DICT_EQUIP_STAT, {
	separator: /[,;|]+/,
	threshold: 0.65,
	autoMatchScore: 0.95,
	maxSuggestions: 3
});

const stat_definition = JSON.parse(fs.readFileSync('./assets/toram/items/stat_definition.json', 'utf-8'));

const cache = new Map()
const sort = (a,b) => a-b || -(a<b)|(a>b)
let _ready = false;

// Load data equip
load().then(result => {
	Equipment.List = result;
	_ready = true;
}).catch(e=>logger.error(e, '[EQ]'));

export const command = {
	command: 'eq',
	tag: 'Toram Online',
	description: 'Mencari eq dan menampilkan statnya.',
	get help() {
		return `usage: .eq [nama] [type:<tipe>] [drop:<name>] [page:<num>] [stats <stat> <operator> <value> ...]

Tipe didukung:
\`ohs\`, \`ths\`, \`bow\`, \`bwg\`, \`dagger\`, \`knuck\`, \`md\`, \`hb\`, \`katana\`, \`staff\`, \`arrow\`, \`scroll\`, \`arm\`, \`add\`, \`shield\`, \`ring\`.

Contoh:
.eq dirga 10
.eq type:add stats mtk >= 7% int >= 7%
.eq rapier stats str > 10`;
	},
	handle: async (bot, m) => {
		if (!_ready) return await m.reply('Sebentar ya.. data perlengkapan sedang dimuat.');

		const userId = m.sender
		let limit = 20, page = 0

		await m.reply({ react: { text: '🔍', key: m.key } }, false);
		try {
			if (/\bre(load|set|fresh)\b/.test(m.text))
				return await m.reply({ react: { text: '⏳', key: m.key } }, false), await load(true),
				void await m.reply({ react: { text: '', key: m.key } }, false);
			
			const text = m.text.replace(/^\S*\b/, '').trim()
			const result = handleUserInput(userId, text, stat_definition)
			if (result)
				return await m.reply('> *🔍 Pencarian Perlengkapan [Beta]*\n'+result),
				void await m.reply({ react: { text: '', key: m.key } }, false);
				
			const parsed = parseMiniQuery(text)
			page = Math.max(0, query.is.page - 1) | 0
			
			const query = parseQuery(parsed, statDict, {strictMode:true})
			const results = search(Equipment.List, query);
			const total = results.length
			const part = results.slice(limit*page, limit+page*limit).sort(({name:a1, name_en:a2},{name:b1, name_en:b2})=>sort(a2||a1, b2||b1))
			const reply = formatResult(part, stat_definition);
			const multiItem = total > 1? ` • Total ${total} perlengkapan.`: ''
			const multiPages = total > limit? `> Halaman ${page+1}/${Math.ceil(total/limit)}` : ''
			await m.reply([
				'> *🔍 Pencarian Perlengkapan [Beta]*',
				multiItem? '> *📋 Hasil Pencarian*' : '',
				`${multiPages}${multiItem}`,
				multiItem? '*Tips*' : '',
				multiPages?'- Gunakan `.eq page:<nomor> <query...>` untuk lihat page selanjutnya.':'',
				multiItem? '- Gunakan `.eq <nomor>` untuk detail lengkap.\n':'',
				reply,
			].filter(Boolean).join`\n`.trim(), true, {quoted: multiItem? bot.quoteContact(m) : m});
			
			const cached = cache.get(userId);
			
			// jika sudah ada, hapus dulu
			if (cached)
				clearTimeout(cached.cd),
				cache.delete(userId)
			
			if (part.length > 1)
				part.cd = setTimeout(()=>cache.delete(userId), 30*60000), // hapus setelah 30 menit
				cache.set(userId, part)
		} catch (e) {
			logger.error(e)
		}
		await m.reply({ react: { text: '', key: m.key } }, false);
	}
};

function handleUserInput(userId, input, statDefMap) {
	// Kalau input angka, anggap pilih dari list terakhir
	if (/^\d+$/.test(input)) {
		const cached = cache.get(userId);
		const idx = parseInt(input) - 1;

		if (cached && cached[idx]) {
			return formatSingleItem(cached[idx], statDefMap);
		}
		
		return 'emm.. coba cari lagi..'
	}
}

/**
 * Mencari item berdasarkan kriteria tertentu.
 * @param {Array} itemList - Array item hasil dari csvToJson()
 * @param {Object} query - Kriteria pencarian. Support format lama & baru
 * @param {string} [query.name] - Nama item (partial match, case-insensitive, China/Inggris)
 * @param {string} [query.type] - Tipe item. Format lama
 * @param {string} [query.monster] - Nama boss/monster. Format lama
 * @param {Object} [query.is] - Property harus sama dengan. Key: type, drop
 * @param {Object} [query.not] - Property harus tidak sama dengan. Key: type, drop
 * @param {Array} [query.stats] - Array kondisi stat [{ name, operator, value, percent? }]
 * @returns {Array} Item yang memenuhi semua kriteria
 */
function search(itemList, query = {}) {
	// Normalisasi query: gabung format lama + baru
	const {
		name,
		type: typeOld,
	monster: monsterOld,
		is = {},
		not = {},
	stats = []
	} = query;

	// Map property baru: monster -> drop
	const typeIs = is.type?? typeOld?? null;
	const dropIs = is.drop?? monsterOld?? null; // 'monster' lama = 'drop' baru
	const typeNot = not.type?? null;
	const dropNot = not.drop?? null;

	// Helper: cek operator
	const compare = (a, op, b) => {
		switch (op) {
			case '>': return a > b;
			case '<': return a < b;
			case '>=': return a >= b;
			case '<=': return a <= b;
			case '=': case '==': return a === b;
			case '!=': return a!== b;
			default: return false;
	}
	};

	// Helper: ambil value stat sesuai multiplier
	const getStatValue = (item, statName) => {
		const def = stat_definition[statName];
		if (!def) return null;

		const statEntry = item.stats?.find(s => s.stat === statName);
		if (!statEntry) return null;

	// multiplier=true → bisa flat atau percent. Anggap beda, jadi return object
		if (def?.type === 'multi') {
			return { value: statEntry.value, isPercent:!!statEntry.percent };
	}
	// multiplier=false → ambil value angka aja, abaikan percent
		return { value: statEntry.value, isPercent: false };
	};

	// Helper: cek partial match monster/drop di obtain.name
	const matchDrop = (item, keyword, shouldMatch = true) => {
		if (!keyword) return true;
		const hasMatch = item.obtain?.some(o =>
			o.name?.toLowerCase().includes(keyword.toLowerCase())
	);
		return shouldMatch? hasMatch :!hasMatch;
	};

	return itemList.filter(item => {
	// 1. Filter name, partial match case-insensitive
		if (name &&!item.name?.toLowerCase().includes(name.toLowerCase()) &&
			!item.name_en?.toLowerCase().includes(name.toLowerCase())) {
			return false;
	}

	// 2. Filter type = is.type
		if (typeIs && item.type!== typeIs) return false;

	// 3. Filter type!= not.type
		if (typeNot && item.type === typeNot) return false;

	// 4. Filter drop = is.drop / monster lama
		if (!matchDrop(item, dropIs, true)) return false;

	// 5. Filter drop!= not.drop
		if (!matchDrop(item, dropNot, false)) return false;

	// 6. Filter stats array
		for (const cond of stats) {
			const { name: statName, operator = '>', value = -9999, percent } = cond;
			const itemStat = getStatValue(item, statName);
			if (!itemStat) return false; // item nggak punya stat itu

			const def = stat_definition[statName];

			if (def?.type === 'multi') {
				// multiplier=true: harus match tipe percent/flat juga kalau user kasih `percent`
				if (percent!== undefined && itemStat.isPercent!== percent) return false;
				if (!compare(itemStat.value, operator, value)) return false;
			} else {
				// multiplier=false: bandingin value aja, abaikan percent
				if (!compare(itemStat.value, operator, value)) return false;
			}
	}

		return true;
	});
}

/**
 * Parsing query string menggunakan Dictionary untuk stat names.
 * @param {Object} queryMini - object query
 * @param {Dictionary} statDict - Instance Dictionary untuk stat (dari DICT_EQUIP_STAT)
 * @param {Object} options - Opsi tambahan
 * @param {boolean} options.strictMode - Jika true, lempar error saat stat tidak dikenal. Default false.
 * @returns {Object} Criteria object dengan properti: name, type, boss, stats
 */
function parseQuery(q, statDict, options = {}) {
	const strictMode = options.strictMode || false;
	return {
		 ...q,
		stats: q.stats.flatMap(a=>{
			const searchResult = statDict.search(a.key);
			let statKey = null;
			if (searchResult.match)
				statKey = searchResult.match;
			  else if (strictMode) {
				const suggestions = searchResult.suggestions.map(s => s.istilah).join(', ');
				throw new Error(`Stat name "${rawStatName}" tidak dikenal. Mungkin maksud: ${suggestions}`);
			} else
				return []
			
			a.name = statKey
			if(!a.operator)
				a.operator = '>',
				a.value = -9999
			
			return [a]
		})
	};
}

/**
 * Memformat hasil pencarian item menjadi string output.
 * @param {Array} items - Array item hasil dari searchItems()
 * @param {Object} statDefMap - Peta definisi stat (dari file stats.json) untuk menentukan persen
 * @returns {string} Output terformat
 */
function formatResult(items, statDefMap = {}) {
	if (!items || items.length === 0) {
		return "Tidak ada item yang ditemukan.";
	}
	
	if (items.length === 1) {
		return formatSingleItem(items[0], statDefMap);
	} else {
		return formatMultipleItems(items, statDefMap);
	}
}

// Icon mapping per type
const icons = {
	'ohs': '🗡️', 'ths': '⚔️', 'bow': '🏹', 'bwg': '🔫',
	'dagger': '🗡️', 'knuck': '🥊', 'md': '🔮', 'hb': '🔱',
	'katana': '⚔️', 'staff': '🪄', 'arrow': '🎯', 'scroll': '📜',
	'arm': '🛡️', 'add': '🎩', 'shield': '🛡️', 'ring': '💍'
};

const TYPE_MAP = {
	// Weapons
	'單手劍': { sh: 'ohs', name: '1H Sword', cat: 'weapon' },
	'雙手劍': { sh: 'ths', name: '2H Sword', cat: 'weapon' },
	'弓': { sh: 'bow', name: 'Bow', cat: 'weapon' },
	'弩': { sh: 'bwg', name: 'Bowgun', cat: 'weapon' },
	'拳套': { sh: 'knuck', name: 'Knuckles', cat: 'weapon' },
	'魔導具': { sh: 'md', name: 'Magic Device', cat: 'weapon' },
	'旋風槍': { sh: 'hb', name: 'Halberd', cat: 'weapon' },
	'拔刀劍': { sh: 'Katana', name: 'Katana', cat: 'weapon' },
	'法杖': { sh: 'staff', name: 'Magic Staff', cat: 'weapon' },

	// Sub
	'箭矢': { sh: 'arrow', name: 'Arrows', cat: 'sub' },
	'小刀': { sh: 'dagger', name: 'Dagger', cat: 'sub' },
	'忍術卷軸': { sh: 'scroll', name: 'Ninjutsu Scroll', cat: 'sub' },
	'盾牌': { sh: 'shield', name: 'Shield', cat: 'sub' },

	// Additional
	'追加裝備': { sh: 'add', name: 'Additional Gear', cat: 'additional' },

	// Armor
	'身體裝備': { sh: 'arm', name: 'Armor', cat: 'armor' },

	// Special
	'特殊裝備': { sh: 'ring', name: 'Special', cat: 'special' }
};

// Helper: ambil shorthand
const getTypeShorthand = (chnType) => TYPE_MAP[chnType]?.sh || chnType;

// Helper: ambil kategori buat cek weapon/armor
const getTypeCategory = (chnType) => TYPE_MAP[chnType]?.cat || 'other';

// Helper: ambil nama EN
const getTypeName = (chnType) => TYPE_MAP[chnType]?.name || chnType;

// Mapping: shorthand ke tipe CN 
const shorthand = new Map(Object.entries(TYPE_MAP).map(([name,{sh}])=>[sh,name]))

function formatSingleItem(item, statDefMap) {
	const lines = [];

	// Helper dari TYPE_MAP
	const sh = getTypeShorthand(item.type);
	const cat = getTypeCategory(item.type);
	const typeName = getTypeName(item.type);

	// Header - English name + icon + type EN
	lines.push(`*${item.name_en || item.name}* ${icons[sh] || '📦'} ${typeName}`);
	lines.push('');

	// Base stats pake cat dari TYPE_MAP
	if ((cat === 'weapon' || cat === 'sub' && sh !== 'shield') && item.base_atk_def !== null) {
		lines.push(`*ATK:* ${item.base_atk_def}`);
		if (item.base_stability !== null) {
			lines.push(`*Stability:* ${item.base_stability}%`);
		}
	} else if ((cat === 'armor' || cat === 'additional' || cat === 'special' || sh === 'shield') && item.base_atk_def !== null) {
		lines.push(`*DEF:* ${item.base_atk_def}`);
	}

	// Stats - sorted by statDefMap.sort
	if (item.stats && item.stats.length) {
		lines.push('');
		lines.push(`*Stats:*`);
		
		let stats = [...item.stats];
		if (statDefMap) {
			stats.sort((a, b) => 
				(statDefMap[a.stat]?.sort || 999) - (statDefMap[b.stat]?.sort || 999)
			);
		}
		
		// Stats - sorted for grouping
		let restrict
		stats.sort((a, b) => sort(a.value2, b.value2));
		
		for (const stat of stats) {
			const def = statDefMap[stat.stat];
			const statName = STAT_DISPLAY_MAP[stat.stat] || toDisplayName(stat.stat);
			const statType = def?.type !== 'multi'? def?.type : stat.percent ? '%' : '';
			let valStr = stat.value !== null && stat.value !== undefined 
				? stat.value + (statType || '') 
				: '';
			let strip = '-'
			if (stat.value2) {
				if (restrict != stat.value2)
					restrict = STAT_DISPLAY_MAP[stat.value2] || toDisplayName(stat.value2),
					lines.push(`  _*${restrict}:*_`)
				strip = '    •'
			}
			lines.push(`${strip} ${statName}: *${valStr}*`);
		}
	}

	// Obtain - EN only
	if (item.obtain && item.obtain.length) {
		lines.push('');
		lines.push(`*Obtain:*`);
		for (const ob of item.obtain) {
			let str = '';
			switch(ob.type) {
				case 'boss': str = `👑 Boss ${ob.name || ''}`; break;
				case 'mini_boss': str = `⚜️ Mini Boss ${ob.name || ''}`; break;
				case 'mobs': str = `👾 Mobs ${ob.name || ''}`; break;
				case 'smith': str = '🔨 Craft'; break;
				case 'quest': str = `📜 Quest ${ob.name || ''}`; break;
				case 'exchange': str = '🔄 Exchange'; break;
				case 'box': str = '🎁 Box/Gacha'; break;
				default: str = ob.type;
			}
			if (ob.map) str += ` - ${ob.map}`;
			lines.push(`- ${str}`);
		}
	}

	// Dye
	const dyeObtain = item.obtain?.find(ob => ob.dye);
	if (dyeObtain?.dye) {
		lines.push('');
		lines.push(`*Dye:* ${dyeObtain.dye}`);
	}

	// Recipe
	if (item.recipe && Object.keys(item.recipe).length) {
		lines.push('');
		lines.push(`*Recipe:*`);
		if (item.recipe.item_level) lines.push(`- Item Level: ${item.recipe.item_level}`);
		if (item.recipe.item_difficulty) lines.push(`- Difficulty: ${item.recipe.item_difficulty}`);
		if (item.recipe.potential) lines.push(`- Potential: ${item.recipe.potential}`);
		if (item.recipe.cost) lines.push(`- Cost: ${item.recipe.cost} Spina`);
		if (item.recipe.materials) {
			const materials = parseMaterials(item.recipe.materials);
			if (materials.length) {
				lines.push(`- Materials:`);
				for (const mat of materials) {
					lines.push(`  * ${mat.material} x${mat.count}`);
				}
			} else {
				lines.push(`- Materials: ${item.recipe.materials}`);
			}
		}
	}

	// Extra info
	if (item.extra && Object.keys(item.extra).length) {
		lines.push('');
		for (const [key, val] of Object.entries(item.extra)) {
			lines.push(`*${key}:* ${val}`);
		}
	}

	return lines.join('\n');
}

function formatMultipleItems(items) {
	const lines = [];//[`Found ${items.length} item${items.length !== 1 ? 's' : ''}:`];

	items.forEach((item,idx) => {
		const sh = getTypeShorthand(item.type);
		const cat = getTypeCategory(item.type);
		const typeName = getTypeName(item.type);
		const nLine = '\n   │ •  '

		let line = `${idx+1}. ${icons[sh] || '📦'}*${item.name_en || item.name}*`;

		if (item.base_atk_def!== null)
			if (cat === 'weapon' || cat === 'sub' && sh !== 'shield') {
				line += `${nLine}ATK ${item.base_atk_def}`;
				if (item.base_stability!== null) line += ` | Stab ${item.base_stability}%`;
			} else if (cat === 'armor' || cat === 'additional' || cat === 'special' || sh === 'shield') {
				line += `${nLine}DEF ${item.base_atk_def}`;
			}
		
		// Add top 3 stats if any
		if (item.stats?.length) {
			const topStats = item.stats.slice(0, 3).map(s => {
				const val = s.percent ? `${s.value}%` : s.value;
				return `${s.stat.toUpperCase()} ${val}`;
			}).join(' • ');
			line += `${nLine}${topStats}`;
		}
		
		lines.push(line);
	});
	
	return lines.join('\n\n');
}

function parseMaterials(materialsStr) {
	if (!materialsStr || typeof materialsStr !== 'string') return [];
	return materialsStr.split(',').map(part => {
		const trimmed = part.trim();
		const [material, countStr] = trimmed.split('#');
		const count = parseInt(countStr, 10);
		return { material: material.trim(), count: isNaN(count) ? 0 : count };
	}).filter(m => m.material);
}

// ---- Constant ----
const STAT_DISPLAY_MAP = {
    'str': 'STR',
    'dex': 'DEX', 
    'int': 'INT',
    'agi': 'AGI',
    'vit': 'VIT',
    'max_hp': 'Max HP',
    'max_mp': 'Max MP',
    'natural_hp_regen': 'Natural HP Regen',
    'natural_mp_regen': 'Natural MP Regen',
    'attack_mp_recovery': 'Attack MP Recovery',
    'atk': 'ATK',
    'matk': 'MATK',
    'weapon_atk': 'Weapon ATK',
    'weapon_range': 'Weapon Range',
    'physical_pierce': 'Physical Pierce',
    'magic_pierce': 'Magic Pierce',
    'def': 'DEF',
    'mdef': 'MDEF',
    'stability': 'Stability',
    'physical_resistance': 'Physical Resistance',
    'magic_resistance': 'Magic Resistance',
    'accuracy': 'Accuracy',
    'dodge': 'Dodge',
    'aspd': 'ASPD',
    'cspd': 'CSPD',
    'critical_rate': 'Critical Rate',
    'critical_damage': 'Critical Damage',
    'motion_speed': 'Motion Speed',
    'unsheathe_attack': 'Unsheathe Attack',
    'unsheathe_attack_multiplier': 'Unsheathe Attack %',
    'short_range_damage': 'Short Range Damage',
    'long_range_damage': 'Long Range Damage',
    'ailment_resistance': 'Ailment Resistance',
    'guard_regenerate': 'Guard Regenerate',
    'guard_power': 'Guard Power',
    'evasion_regenerate': 'Evasion Regenerate',
    'aggro': 'Aggro',
    'revive_time': 'Revive Time',
    'drop_rate': 'Drop Rate',
    'stronger_against_neutral': 'Stronger vs Neutral',
    'stronger_against_fire': 'Stronger vs Fire',
    'stronger_against_water': 'Stronger vs Water',
    'stronger_against_earth': 'Stronger vs Earth',
    'stronger_against_wind': 'Stronger vs Wind',
    'stronger_against_light': 'Stronger vs Light',
    'stronger_against_dark': 'Stronger vs Dark',
    'neutral_resistance': 'Neutral Resistance',
    'fire_resistance': 'Fire Resistance',
    'water_resistance': 'Water Resistance',
    'earth_resistance': 'Earth Resistance',
    'wind_resistance': 'Wind Resistance',
    'light_resistance': 'Light Resistance',
    'dark_resistance': 'Dark Resistance',
    'physical_barrier': 'Physical Barrier',
    'magical_barrier': 'Magical Barrier',
    'fractional_barrier': 'Fractional Barrier',
    'barrier_cooldown': 'Barrier Cooldown',
    'reflect': 'Reflect',
    'additional_meele': 'Additional Melee',
    'additional_magic': 'Additional Magic',
    'anticipate': 'Anticipate',
    'guard_break': 'Guard Break',
    'flinch_unavailable': 'Flinch Unavailable',
    'tumble_unavailable': 'Tumble Unavailable',
    'stun_unavailable': 'Stun Unavailable',
    'recoil_damage': 'Recoil Damage',
    'exp_rate': 'EXP Rate',
    'element_fire': 'Fire Element',
    'element_water': 'Water Element',
    'element_earth': 'Earth Element',
    'element_wind': 'Wind Element',
    'element_light': 'Light Element',
    'element_dark': 'Dark Element',
    'element_mana': 'Mana Element',
    'absolute_dodge': 'Absolute Dodge',
    'absolute_accuracy': 'Absolute Accuracy',
    'reduce_dmg_floor': 'Reduce DMG Floor',
    'reduce_dmg_meteor': 'Reduce DMG Meteor',
    'reduce_player_epicenter': 'Reduce Player Epicenter DMG',
    'reduce_dmg_foe_epicenter': 'Reduce Foe Epicenter DMG',
    'reduce_dmg_bowling': 'Reduce DMG Bowling',
    'reduce_dmg_bullet': 'Reduce DMG Bullet',
    'reduce_dmg_straight_line': 'Reduce DMG Straight Line',
    'reduce_dmg_charge': 'Reduce DMG Charge',
    'reduce_explosion': 'Reduce Explosion DMG',
    'reduce_gravity': 'Reduce Gravity DMG',
    'reduce_emission': 'Reduce Emission DMG',
    'atk_up_str': 'ATK +STR',
    'atk_up_dex': 'ATK +DEX',
    'atk_up_int': 'ATK +INT',
    'atk_up_agi': 'ATK +AGI',
    'atk_up_vit': 'ATK +VIT',
    'matk_up_str': 'MATK +STR',
    'matk_up_dex': 'MATK +DEX',
    'matk_up_int': 'MATK +INT',
    'matk_up_agi': 'MATK +AGI',
    'matk_up_vit': 'MATK +VIT',
    'atk_down_str': 'ATK -STR',
    'atk_down_dex': 'ATK -DEX',
    'atk_down_int': 'ATK -INT',
    'atk_down_agi': 'ATK -AGI',
    'atk_down_vit': 'ATK -VIT',
    'matk_down_str': 'MATK -STR',
    'matk_down_dex': 'MATK -DEX',
    'matk_down_int': 'MATK -INT',
    'matk_down_agi': 'MATK -AGI',
    'matk_down_vit': 'MATK -VIT',
    'invincible_aid_sec': 'Invincible Aid Sec',
    'pet_exp': 'Pet EXP',
    'item_cooldown': 'Item Cooldown',
    'magic_crt_percentage': 'Magic Crit %',
    'magic_cd_percentage': 'Magic CD %',
    
    
	"body.dodge": "Light Armor",
	"body.defense": "Heavy Armor",
	"sub.shield": "Shield",
	"knuckle": "Knuckle",
	"staff": "Staff",
	"sub.dagger": "Dagger",
	"sub.1h_sword": "One-Hand Sword (Dual Sword Sub)",
	"magic_device": "Magic Device",
	"sub.ninjutsu_scroll": "Ninjutsu Scroll",
	"bowgun": "Bowgun",
	"halberd": "Halberd",
	"1h_sword": "One-Hand Sword",
	"2h_sword": "Two-Handed Sword",
	"sub.arrow": "Arrow",
	"katana": "Katana"
};

const toDisplayName = (key) => {
    const special = {
        'hp': 'HP', 'mp': 'MP', 'atk': 'ATK', 'matk': 'MATK',
        'aspd': 'ASPD', 'cspd': 'CSPD', 'dex': 'DEX', 'agi': 'AGI',
        'str': 'STR', 'int': 'INT', 'vit': 'VIT', 'def': 'DEF', 'mdef': 'MDEF',
        'exp': 'EXP', 'dmg': 'DMG', 'crt': 'Crit'
    };
    
    return key
        .split('_')
        .map(word => special[word.toLowerCase()] || word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ');
};
