import path from "path";
import fs from "fs";
import logger from '../../utils/logger.js'

const allData = readData().map(
	(item, index) => {
		item.index = index
		return item
	}
);

export const command = {
	command: 'trait',
	onlyOwner: false,
	onlyPremium: false,
	onlyGroup: false,
	tag: '_Toram Online_',
	description: 'Informasi ability',
	get help() {
		return `usage: .trait <query> [page:N]`
	},
	handle: async (bot, m) => {
		try {
			if(!allData)
				return await m.reply('Sebentar ya.. tunggu saya siap.')
			
			const query = m.text.replace(/^\S*\b/g, '').toLowerCase().trim()||''
			const result = search(query)
			
			if(!query&&result)
				result.text = _tips
			if(result)
				await m.reply(result)
			else
				await m.reply('Tidak ada hasil, coba query lain.')
		} catch (e) {
			logger.error(e)
		}
	}
}

function search(query) {
	var index, page = 0
	
	query = query.replace(/page:(\d+)/i,(a,b)=>(page = Math.max(0, b-1)|0, '')).trim()
	if (/(tier)[\s:-]([1-5])/i.test(query))
		query = `${RegExp.$1}-${RegExp.$2}`
	
	if (!/trait-(\d+)/.test(query)) {
		const filtered = allData.filter(
			(item) =>
				item.name.toLowerCase().includes(query) ||
				item.effect.toLowerCase().includes(query) ||
				'tier-'+Number(item.tier) == query
		)
		if (filtered.length>1)
			return renderTraits(filtered, page);
		if (filtered.length>=1)
			index = filtered[0].index
	} else
		index = Number(RegExp.$1)
	if (index>0) {
		const item = allData[index] || {}
		return `*${_tier[item.tier-1]} ${item.name} (Tier ${item.tier})*
Efek: ${item.effect}`
	}
}

function readData() {
	try {
		const data = fs.readFileSync(path.resolve(process.cwd(), 'assets','toram/items', 'trait.json'), 'utf-8')
		return JSON.parse(data)
	} catch (e) {
		return []
	}
}

const _tips = `*Tips*
* Gunakan ${`.trait <query> [page:N]`}
* Contoh ${`.trait vengeful mana page:1`}
* Perhatian, jangan ada spasi diantara titik dua (:) pada ${`page:N`}

*Catatan tentang Abiliti (Trait)*

- Aktivasi Power X: % (perecent) daya yang dihasilkan hingga proc (proccess) pada 100%. Kemudian direset ke 0 lagi setelah proc.
- Boss Lv 200+ dengan kesulitan Ultimate dapat menjatuhkan Trait Tier 5, tidak tergantung pada kondisi emblem mingguan.
- Senjata dan Peralatan berbagi pool Abiliti yang sama.
- Slot Senjata Sub tidak memicu efek Abiliti.
- Menempatkan Abiliti yang sama pada senjata dan peralatan akan menumpuk efeknya dalam pertempuran.
- Hanya dapat mentransfer Abiliti melalui jenis senjata yang sama (MD -> MD, HB -> HB, dll).
- Peluang transfer dasar adalah 10% + Kilau Peluang, langsung menjadi 100% jika melalui nama senjata yang sama.

*Tips dan Trik*

- Kamu dapat memicu efek Abiliti "damage taken" seperti Vengeful series dengan cara menginjak perangkap yang kamu buat sendiri melalui Registle Perangkap Genting.
- Abiliti dengan "Max X stack" dan timer akan menambahkan 1 stack setiap kali aktivasi, hingga maksimum, dan mereset timer ke durasi maksimum.
- Hanya serangan "aktif" yang dapat meningkatkan stack, serangan "pasif" tidak dihitung.
- Serangan MISS hanya dapat memicu trait jika secara aktif mendaftarkan hit MISS.

*Peringatan*

- Transfer Abiliti tidak menghapus peralatan dengan Abiliti yang ditransfer.
- Jika transfer gagal, Abiliti akan digantikan dengan Kilau Peluang.
- Menggunakan Palu Ajaib akan mengurangi peluang sukses, dan dapat menumpuk efeknya.
- Menggunakan Palu Ajaib akan meningkatkan level Kilau Peluang, tetapi tidak menggabungkan level Kilau Peluang dari dua peralatan.`

const _tips2 = _tips.split('\n').filter(a=>a.startsWith('-'))
const _tier = '⚪|🟢|🔵|🟣|🟠'.split('|')
let _ran = 0

function renderTraits(data, page) {
	if (!data.length)
		return
	
	const perPage = 10
	const start = page * perPage | 0
	const dataMap = data
		 . sort(({tier:a},{tier:b})=>sort(a,b))
		 . slice(start, start + perPage)
	let result = ''
	let t = null
	
	for (const {tier, name, effect} of dataMap) {
		
		// #Section
		if (t != tier)
		if (t = tier, tier != 5)
			result += `\n\n*${_tier[tier-1]}Tier ${tier}*`
		else
			result += `\n\n*${_tier[tier-1]}Tier ${tier}(Speculation)*`
		
		// #List
		result += 
				`\n${_tier[tier-1]}${name}`+
				`\n- *Efek:* ${effect}`
		
	}
	
	const footer = ["#toram_online", "semangat gais!!", "preciousdelta__", "2 + 2 = 4", "#toram_online #asobimo"]
	
	const text = [
		`*Tips: ${_tips2[++_ran % _tips2.length].slice(2)}*`,
		``,
		`*Ditemukan (${data.length}) hasil*`,
		result.trim(),
		``,
		`Page ${page+1} dari ${Math.ceil(data.length / perPage)} > `+footer[Math.floor(Math.random()*footer.length)]
	].join('\n')
	
	const reply = {
		//image: { url: './assets/toram/texture/rf_acme.jpg'  },
		contextInfo: {
			externalAdReply: {
				title: 'Trait / Ability System',
				body: global.bot.name,
				mediaType: 1,
				previewType: 0,
				showAdAttribution: false,
				renderLargerThumbnail: false,
				thumbnailUrl: global.bot.thumb
			},
		},
		text
	}
	return reply
}

const sort = (a,b) => a-b || -(a<b)|(a>b)