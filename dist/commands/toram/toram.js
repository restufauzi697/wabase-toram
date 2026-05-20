import fs from 'fs'
import path from 'path'
import logger from '../../utils/logger.js'
import addcmd from '../../utils/cmd_msg.js'
import { DICT_STAT_TORAM, Dictionary } from '../../lib/Dictionary.js'

const sortcut = [
	{
		command: "addbuff",
		param: "<stat> <kode> <lvl>",
		description: 'Menambah kode buff.',
		options: {
			index: -1
		},
	},
	{
		command: "buff",
		param: "[stat]",
		description: 'List kode buff.',
		options: {
			index: -2
		},
	},
	{
		command: "deletebuff",
		param: "<kode> [stat]",
		description: 'Hapus kode buff.',
		options: {
			index: -1
		},
	},
	{
		command: "guide",
		param: "<nama|nomor>",
		description: 'Panduan Toram Online.',
		options: {
			index: 1
		},
	},
	{
		command: "uptas",
		param: "[slot|all]",
		description: 'Cek bahan dan lokasi expansi tas koleksi.',
	}
]

const commandModule = {
	index: 1,
	command: 'toram',
	tag: 'Toram Online',
	description: 'Guide dan info Toram Online.',
	get help() {
		return `usage: .toram <action> [arg...]
\`<action>\`:
- ${this.sortcut.map(({command,param})=>command+' '+param).join('\n- ')}
- leveling
- list [page]

contoh:
.toram guide cara mancing
.toram guide 5`
	},
	handle: async (bot, m) => {
		const [act,...arg] = m.arguments[0]?.toLowerCase().split(' ')||[]
		
		m.arguments[0] = arg.join(' ')
		
		if (!act)
			return await welcome(m)
		
		await action[act]?.(bot, m, arg)
	},
	sortcut
}

sortcut.map(({command,param, description, options}) => {
	addcmd(
		command,
		async (bot, m) => {
			const arg = m.arguments[0]?.toLowerCase().split(' ')||[]
			await action[command]?.(bot, m, arg)
		},
		{
			tag: 'Toram Online',
			description,
			help: `usage: ${command} ${param}`,
			...options
		}
	)
});

export const command = commandModule

const action = {
	async addbuff(bot, m, [stat, code, lvl]) {
		// Koreksi stat input
		const statId = getStatId(stat);
		if (!statId) {
			const suggestions = statDictionary.search(stat).suggestions;
			const hint = suggestions.length ? ` Mungkin maksudmu: ${suggestions.map(s => s.istilah).join(', ')}` : '';
			return await m.reply(`Stat "${stat}" tidak dikenali.${hint}`);
		}

		const exists = toram.Buff.filter(([s, c]) => c == code);
		if (exists.length > 1) {
			await m.reply(`Kode ${code} terdaftar untuk buff ${exists.map(([s, , l]) => `${s} Lv ${l}`).join(' dan ')}. Hapus salah satu untuk mengubah.`);
		} else if (/^\d{7}$/.test(code) && (lvl < 11 && lvl > 0)) {
			const existingSameStat = toram.Buff.find(([s, c]) => s === statId && c === code);
			if (existingSameStat) {
				existingSameStat[2] = lvl;
			} else {
				toram.Buff.push([statId, code, lvl]);
				toram.Buff.sort(([, , a], [, , b]) => b - a);
				toram.Buff.sort(([a], [b]) => _.buff[a] - _.buff[b]);
			}
			save();
			await m.reply(`Buff ${statId} (${lang_stat_buff[statId]}) kode ${code} level ${lvl} ditambahkan!`);
		} else {
			await m.reply('Gagal menambahkan buff. Pastikan kode 7 digit dan level 1-10.');
		}
	},

	async buff(bot, m, [buffInput]) {
		let list = toram.Buff;
		let title;
		let text = '*ᴋᴏᴅᴇ ʙᴜꜰꜰ ᴛᴏʀᴀᴍ ᴏɴʟɪɴᴇ*\n';

		if (buffInput) {
			if (buffInput === 'list') {
				return await action.list(bot, m, ['buff']);
			}
			const statId = getStatId(buffInput);
			if (!statId) {
				const suggestions = statDictionary.search(buffInput).suggestions;
				const hint = suggestions.length ? ` Mungkin maksudmu: ${suggestions.map(s => s.istilah).join(', ')}` : '';
				return await m.reply(`Stat "${buffInput}" tidak dikenali.${hint}`);
			}
			list = list.filter(([s]) => s === statId);
		}

		if (list.length) {
			list.forEach(([stat, code, lvl]) => {
				if (title !== stat) {
					text += `\n*${lang_stat_buff[stat] || stat}*\n`;
					title = stat;
				}
				text += `${code} ${stat} Lv ${lvl}\n`;
			});
		} else {
			text += '\n--empty--';
		}

		if (buffInput) {
			await m.reply(text);
		} else {
			await m.sendThum2("Toram Online", global.bot.name, text, global.bot.banner, '', _.media, false, false, null);
		}
	},

	async deletebuff(bot, m, [code, statInput]) {
		let filterFn = ([, c]) => c === code;
		if (statInput) {
			const statId = getStatId(statInput);
			if (!statId) {
				const suggestions = statDictionary.search(statInput).suggestions;
				const hint = suggestions.length ? ` Mungkin maksudmu: ${suggestions.map(s => s.istilah).join(', ')}` : '';
				return await m.reply(`Stat "${statInput}" tidak dikenali.${hint}`);
			}
			filterFn = ([s, c]) => s === statId && c === code;
		}

		let index = toram.Buff.findIndex(filterFn);
		if (index < 0) {
			await m.reply(`Buff dengan kode ${code}${statInput ? ` dan stat ${statInput}` : ''} tidak ditemukan.`);
		} else {
			while (index >= 0) {
				const [stat, , lvl] = toram.Buff[index];
				toram.Buff.splice(index, 1);
				await m.reply(`Buff ${stat} (${lang_stat_buff[stat]}) kode ${code} level ${lvl} telah dihapus.`);
				index = toram.Buff.findIndex(filterFn);
			}
			save();
		}
	},
	async list(bot, m, [page]) {
		switch(true) {
			case page == 'buff':
			case page == 'stat':
				await m.reply('*ᴋᴏᴅᴇ ʙᴜꜰꜰ ᴛᴏʀᴀᴍ ᴏɴʟɪɴᴇ*\n\n'+
					'Gunakan pada 3 cmd ini:\n'+
					'- .toram addbuff *<stat>* <code> <lvl>\n'+
					'- .toram buff *[stat]*\n'+
					'- .toram deleteBuff <code> *[stat]*\n\n'+
					'List stat buff:\n- '+
					Object.entries(lang_stat_buff)
					 .sort(([a],[b])=>_.buff[a]-_.buff[b])
					 .map(([a,b])=>`*${a}* → ${b}`)
					 .join('\n- ')
				)
				break;
			case page == '':
			case page == undefined:
				page = 1
			case /\d+/.test(page = parseInt(page)):
				page = Math.max(0,page-1)
				
				const start = page*20
				if(start < _.list.length) {
					await m.reply(
						'*Panduan Toram Online*\n'+
						(!page?'\nGunakan: .toram list <page>\n':'')+
						(!page?'- _buff_ / _stat_\n':'')+
						'\nGunakan: .toram guide <nama|nomor>\n'+
						_.list
						 .slice(start, start+21)
						 .map(([name], i)=>i- - start +'. '+name[0].toUpperCase()+name.slice(1))
						 .join('\n')+
						`\n\nPage ${page+1} dari ${Math.ceil(_.list.length / 20)}.`)
					break;
				}
			default:
				await m.reply('Halaman tidak ditemukan')
		}
	},
	async leveling(bot, m, [page]) {
		m.text = 'list leveling'
		await action.guide(bot, m)
	},
	async guide(bot, m, page=[]) {
		if(page[0] == 'list')
			return await action.list(bot, m, [page[1]])
		page = m.text.replace(/^.(toram )?guide/,'').toLowerCase().trim()
		page = _.list[page] ||_.list.find(([name])=>name==page)
		if(!page)
			return await m.reply('Panduan tidak ditemukan')
		try {
			var img, id = _.random(), title = global.bot.name, largImg = false
			page = fs.readFileSync(page[1], 'utf8')
			page = page.replace(/@img\[(big:)?([^\]]+)\]/,($0,$1,$2)=>(img = $2, largImg = !!$1,''))
			page = page.replace(/@title\[(.+?)\]/,($0,$1)=>(title = $1,''))
			page = page.replace(/@splash(\[(\d+)\]){0,1}/g,($0,$1,$2)=>(_.tips[$2||id]))
			page = page.trim()
			
			if(img)
				if(fs.existsSync(img))
					await m.reply({
						image: { url: img },
						caption: page
					})
				else {
					if(img == '!splash')
						img = _.thumb[id]
					if(img == '!art' || !img)
						img = global.bot.thumb
					await m.sendThum2('Toram Online', title, page, img, '', _.media, false, largImg, null)
				}
			else
				await m.reply(page)
		} catch(e) {
			logger.error(e)
		}
		
	},
	async uptas(bot, m, [slot]) {
		const name = 'bahan perluasan tas'
		if (slot == 'all')
			m.text = name,
			await action.guide(bot, m)
		else if (slot = parseInt(slot), slot > 50 && 101 > slot) {
			const page = _.list.find(([page])=>name==page)
			const content = fs.readFileSync(page[1], 'utf8')
			const recipe = content.match(new RegExp(`(?<=▪️ \\*\\d+-${slot})\\*((\\n-.+)+)`))
			await m.sendThum2('Toram Online', `Bahan Perluasan Tas: slot ${slot-1}-${slot}`, recipe?.[1], global.bot.thumb, '', _.media, false, false, null)
		} else {
			await m.reply('emm.. slot keberapa? 51 sampai 100 atau `all` saja biar aku list semua.')
		}
			
	}
}
const sort = (a,b) => a-b || -(a<b)|(a>b)
const T = (T) => lang[T] || T

async function welcome(m) {
	const id = _.random()
	const text = 
`
${_.tips[id]}

Panduan untuk player toram online.
Gunakan: ${command.help.replace('usage:','')}
`.trim()
	await m.sendThum2('Toram Online', `guide for toram online`, text, _.thumb[id]||global.bot.banner, '', _.media, false, true, null)
	//await m.sendThum("Toram Online", text, _.thumb[id]||global.bot.banner, 'https://id.toram.jp/', false, true)
}

function save() {
	global.database.save('toram')
}

// Helper untuk mendapatkan stat_id dari input user
function getStatId(input) {
    if (!input) return null;
    const result = statDictionary.search(input);
    return result.match || null;
}

const lang_stat_buff = {
	"acc": "Accuracy",
	"aggro+": "Aggro+",
	"aggro-": "Aggro-",
	"agi": "AGI",
	"ampr": "Attack MP Recovery",
	"atk": "ATK",
	"cr": "Critical Rate",
	"def": "DEF",
	"dex": "DEX",
	"dodge": "Dodge",
	"drop_rate": "Drop Rate",
	"dte_dark": "Stronger Against Dark",
	"dte_earth": "Stronger Against Earth",
	"dte_fire": "Stronger Against Fire",
	"dte_light": "Stronger Against Light",
	"dte_neutral": "Stronger Against Neutral",
	"dte_water": "Stronger Against Water",
	"dte_wind": "Stronger Against Wind",
	"frac_barier": "Fractional Barrier",
	"int": "INT",
	"matk": "MATK",
	"maxhp": "MaxHP",
	"maxmp": "MaxMP",
	"mbarier": "Magical Barrier",
	"mdef": "MDEF",
	"mresist": "Magic Resistance",
	"pbarier": "Physical Barrier",
	"presist": "Physical Resistance",
	"rte_dark": "Dark Resistance",
	"rte_earth": "Earth Resistance",
	"rte_fire": "Fire Resistance",
	"rte_light": "Light Resistance",
	"rte_neutral": "Neutral Resistance",
	"rte_water": "Water Resistance",
	"rte_wind": "Wind Resistance",
	"str": "STR",
	"vit": "VIT",
	"watk": "Weapon ATK"
}

const lang = {
	...lang_stat_buff,
}

const toram = global.database.toram
const assets = path.resolve(process.cwd(), 'assets', 'toram')
const _ = {
	random: () => Math.floor(Math.random()*_.tips.length),
	tips: JSON.parse(fs.readFileSync(path.join(assets,"guide/tips.list"))),
	thumb: JSON.parse(fs.readFileSync(path.join(assets,"guide/tips.img.list"))),
	buff: ["maxhp", "maxmp", "str", "dex", "int", "agi", "vit", "atk", "matk", "watk", "presist", "mresist", "aggro+", "aggro-", "ampr", "cr", "acc", "dodge", "def", "mdef", "drop_rate", "pbarier", "mbarier", "frac_barier", "dte_neutral", "dte_fire", "dte_water", "dte_earth", "dte_wind", "dte_light", "dte_dark", "rte_neutral", "rte_fire", "rte_water", "rte_earth", "rte_wind", "rte_light", "rte_dark"],
	get media() {
		return 'robz.bot/vid?q='+Date.now()
	},
	get list() {
		const folderPath = path.join(assets,'guide'), files = fs
		  .readdirSync(folderPath, { recursive: true })
		  .filter(a=>a.endsWith`.txt`)
		  .map(a=>[path.basename(a, '.txt'), path.join(folderPath,a)])
		  .sort(([a],[b])=>sort(a,b))
		return Object.defineProperty(_, 'list', {
			value: files,
			enumerable: true,
			configurable: true,
			writable: true
		}).list
	},
}

// Instance dictionary untuk koreksi stat
const statDictionary = new Dictionary(DICT_STAT_TORAM, {
    threshold: 0.7,
    autoMatchScore: 0.85,
    maxSuggestions: 3,
    separator: /[,;]+/,
    strictMode: false
});

_.buff.forEach((a,i)=>(_.buff[a]=i))
