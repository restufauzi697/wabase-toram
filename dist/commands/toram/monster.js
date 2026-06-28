import { ElementType, load, findMonster } from "../../utils/coryn/monster.js";
import logger from '../../utils/logger.js';
import addcmd from '../../utils/cmd_msg.js'

const sort = (a,b) => a-b || -(a<b)|(a>b)
var _ready = false;

// Load data monster
load().then(result => {
	_ready = true;
}).catch(e=>logger.error(e, '[MONSTR]'));

export const command = {
	command: 'monster',
	tag: 'Toram Online',
	description: 'Temukan monster dengan query.',
	get help() {
		return `usage: .monster [name/element] [ele:<element>] [type:<boss|minibos|mobs>] [page:<num>]

Contoh:
- monster api
- monster Coryn type:minibos`
	},
	handle: async (bot, m) => {
		if (!_ready) return await m.reply('Sebentar ya.. data monster sedang dimuat.');
		
		let limit = 20, page = 0
		const xtractVal = (_,a)=>{
			if (a) page = Math.max(0, parseInt(a)-1) | 0
			return ''
		}
		
		await m.reply({ react: { text: '🔎', key: m.key } }, false)
		try {
			if (/\bre(load|set|fresh)\b/.test(m.text))
				return await m.reply({ react: { text: '⏳', key: m.key } }, false), void await load(true),
				void await m.reply({ react: { text: '', key: m.key } }, false);

			const query = m.text.replace(/\bpage[\s:](\d+)|^\S*\b/g, xtractVal).trim()
			const criteria = parseQuery(query)
			const results = findMonster(criteria);
			const total = results.length
			const reply = formatResult(results, page, limit, total);
			
			await m.reply(reply)
		} catch(e) {
			logger.error(e, 'monster')
			await m.reply('maaf, terjadi kesalahan..')
		}
		await m.reply({ react: { text: '', key: m.key } }, false)
	},
}

/**
 * Parsing query string.
 * @param {string} queryString - Input pengguna, contoh: "Coryn type:minibos"
 * @returns {Object} Criteria object dengan properti: name, type, element
 */
function parseQuery(queryString) {
	const query = {
		name: null,
		type: null,
		element: null
	};

	let part = 'name';

	const regex = /(name|type|ele)[:\s]+/gi;
	const parts = queryString.split(regex).filter(Boolean);

	for (let i = 0; i < parts.length; i++) {
		const key = parts[i].toLowerCase()

		if (!isNaN(ElementType[key])) part = 'element'
		if (key === 'ele') part = 'element'
		else if (['name', 'type'].includes(key)) part = key
		else if (part === 'type') query[part] = parseInt(key)
		else

		query[part] = parts[i].trim();
	}

	return query;
}


function formatResult(list, page = 0, limit = 20, total = 0) {
	const typeIcon = {
		2: '👑', // boss
		1: '⚜️', // miniboss
		0: '👾' // mobs
	};

	const typeName = {
		2: 'Boss',
		1: 'Mini Boss',
		0: 'Mobs'
	};

	const ElementIcon = {
		0: "⚪",
		1: "💨", 
		2: "🌍",
		3: "💧",
		4: "🔥",
		5: "✨",
		6: "🌑"
	};

	if (!list.length) return 'Tidak ada hasil..';

	let type
	let output = `> *📋 Hasil Pencarian*\n> Halaman ${page+1}/${Math.ceil(total/limit)} • Total ${total} monster.\n\n`;

	// Sort by type: boss > miniboss > mobs
	list.sort((a,b) => b.type - a.type || b.baseLevel - a.baseLevel)
	list.slice(limit*page, limit+page*limit).forEach(data => {		
		const element = ` ${ElementType[data.element]}`;
		const exp = data.baseExp > 0? ` Exp ${data.baseExp.toLocaleString()}` : '';

		if (type !== data.type)
			type = data.type,
			output += `*━ ${typeName[type]} ━*\n\n`;

		output += `${typeIcon[type]} *${data.name}*${element}\n`;
		output += ` │ • Lv ${data.baseLevel} | ${exp}\n`;
		output += ` │ • Map: ${data.map}\n\n`;
		
	});

	return output.trim();
}