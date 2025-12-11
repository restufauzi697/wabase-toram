import fs from 'fs'
import path from 'path'
import logger from '../../utils/logger.js'
import addcmd from '../../utils/cmd_msg.js'

const sortcut = [
	{
		command: "addbuff",
		param: "<stat> <kode> <lvl>",
		description: 'Menambah kode buff.',
	},
	{
		command: "buff",
		param: "[stat]",
		description: 'List kode buff.',
	},
	{
		command: "deletebuff",
		param: "<kode> [stat]",
		description: 'Hapus kode buff.',
	},
	{
		command: "guide",
		param: "<nama|nomor>",
		description: 'Panduan Toram Online.',
	}
]

const commandModule = {
	command: 'toram',
	onlyOwner: false,
	onlyPremium: false,
	onlyGroup: false,
	tag: '_Toram Online_',
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

sortcut.map(({command,param, description}) => {
	addcmd(
		command,
		async (bot, m) => {
			const arg = m.arguments[0]?.toLowerCase().split(' ')||[]
			await action[command]?.(bot, m, arg)
		},
		{
			tag: '_Toram Online_',
			description,
			help: `usage: ${command} ${param}`
		}
	)
});

export const command = commandModule

const action = {
	async addbuff(bot, m, [stat,code,lvl]) {
		
		const axist = toram.Buff.filter(([stat,_code])=> _code == code)
		
		if (axist.length > 1) {
			await m.reply(`Kode ${code} terdaftar memasak buff _${axist.map(([stat, lvl])=>stat+'_ lvl '+lvl).join(' dan _')}. Hapus salah satu untuk mengubah.`)
		
		} else if (/^\d{7}$/.test(code) && (lvl<11&&0<lvl) && lang_stat_buff[stat]) {
			if(axist[0]?.[0] == stat)
				axist[0][2] = lvl
			else
				toram.Buff.push([stat,code,lvl])
				toram.Buff.sort(([,,a],[,,b])=>-sort(a,b))
				toram.Buff.sort(([a],[b])=>sort(_.buff[a],_.buff[b]))
			save()
			
			await m.reply('Buff ditambahkan!')
		} else await m.reply('Gagal menambahkan buff')
	},
	async buff(bot, m, [buff]) {
		let list = toram.Buff, title
		var text = '*ᴋᴏᴅᴇ ʙᴜꜰꜰ ᴛᴏʀᴀᴍ ᴏɴʟɪɴᴇ*\n'
		
		if(buff)
			if(buff=='list')
				return await action.list(bot, m, ['buff'])
			else
				list = list.filter(([a])=>a==buff)
		
		if(list.length)
			list.forEach ( ([stat,code,lvl])=> {
				if (title != stat) {
					text += `\n*${T(stat)}*\n`
					title = stat
				}
				text += `${code} ${stat.replace(/_/g,' ')} Lv ${lvl}\n`
			})
		else
			text += '\n--empty--'
		if(buff)
			await m.reply(text)
		else
			await m.sendThum("Toram Online", text, global.bot.banner, 'https://id.toram.jp/', false, false)
	},
	async deletebuff(bot, m, [_a, _b]) {
		var fn = ([b,a])=> a == _a
		if (_b)
			fn = ([b,a])=> a == _a && b == _b
		var index = toram.Buff.findIndex(fn)
		if (index < 0)
			await m.reply('Gagal menghapus buff')
		else while (index >= 0) {
			toram.Buff.splice(index, 1)
			await m.reply(`Buffland ${_a} ${_b||''} telah dihapus`)
			
			index = toram.Buff.findIndex(fn)
		}
		save()
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
	leveling(bot, m, [page]) {
		m.text = 'list leveling'
		action.guide(bot, m)
	},
	async guide(bot, m, page) {
		page = m.text.replace('.toram guide','').toLowerCase().trim()
		page = _.list[page] ||_.list.find(([name])=>name==page)
		if(!page)
			return await m.reply('Panduan tidak ditemukan')
		try {
			var img, id = _.random()
			page = fs.readFileSync(page[1], 'utf8')
			page = page.replace(/@img\[([^\]]+)\]/,($0,$1)=>(img = $1,''))
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
					await m.sendThum("Toram Online", page, img, 'https://id.toram.jp/', false, false)
				}
			else
				await m.reply(page)
		} catch(e) {
			logger.error(e)
		}
		
	},
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
	await m.sendThum("Toram Online", text, _.thumb[id]||global.bot.banner, 'https://id.toram.jp/', false, true)
}

function save() {
	global.database.save('toram')
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

_.buff.forEach((a,i)=>(_.buff[a]=i))
