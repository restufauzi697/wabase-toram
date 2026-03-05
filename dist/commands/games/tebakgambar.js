import fs from 'fs'
import { jidDecode } from 'baileys'
import { handle_chat } from '../../events/nexttick.js'
import logger from '../../utils/logger.js'
import addcmd from '../../utils/cmd_msg.js'

const session = {},
data = JSON.parse(fs.readFileSync('./assets/games/source/tebak-gambar.json')),
HOST = 'https://jawabantebakgambar.net',
STORE = 'Tebak-Gambar',
TIME_OUT_DEFAULT = 180000,
TIME_OUT_MESSAGE = 300

class LCG {
	constructor(seed, a, c, m) {
		this.seed = seed;
		this.a = a;
		this.c = c;
		this.m = m;
		this.x = seed;
	}

	next() {
		this.x = (this.a * this.x + this.c) % this.m;
		return this.x;
	}
}

const lcg = new LCG(Date.now(), 1661, 1013, 2137)
const unreach = [1942, 2137, 2138, 2139, 2140]

export const command = {
	command: 'tebakgambar',
	tag: 'Game & Fun',
	description: 'Aku punya tebak-tebakan untuk kamu, bisakah kamu menjawabnya?.',
	help: 'usage: `.tebakgambar [@tag ...]`',
	handle: async (bot, m) => {
		handle_chat(m.chat, handler)
		const _ = '_',
		media = 'robz.bot/vid?q='+Date.now(),
		{chat, sender} = m,
		id = _id(chat, sender),
		
		game = data[STORE],
		next = lcg.next() % 2140,
		quest = game.reduce((a,b)=>{
			a.i += b.Kuis.length
			if (a.i>next) {
				a.i -= next
				a.level = b.Level
				b = b.Kuis[a.i]
				if (!b) throw `can't find quest no.${next} in lvl ${a.level} item no.${a.i}`
				a.img = b.Gambar
				a.answer = b.Jawaban
				a.i = NaN
			}
			return a
		}, {i:0,no:next,level:0,img:'',answer:''})
		
		delete quest.i
		if (!session[id])
			session[id] = {
				quest,
				chat, sender,
				participant: [id]
			}
		else
			return await m.reply({
				text: "*^Sesi bermain belum selesai!*",
				mentions: [sender]
			}, true, {quoted:session[id].msg})
		if (m.isGroup) {
			bot.getMentions(m.text).map(sender=> {
				const nextid = _id(chat, sender)
				session[nextid] = session[id]
				session[id].participant.push(nextid)
			})
		}
		
		const size = quest.answer.split(/\s+/).length,
		first = quest.answer[0].toUpperCase(),
		last = quest.answer.slice(-1).toUpperCase()
		
		try {
			
			const msg = await (setting.ttg_use_thumb? m.sendThum2
			(
				'Tebak Gambar',
				global.bot.name,
				[
					//`*Level ${quest.level}*`,
					//`Kuis ke-${next}, perhatikan baik-baik..`,
					'Siap? Perhatikan baik-baik..',
					`- Terdiri dari ${size} kata, diawali huruf '${first}', diakhiri huruf '${last}'. Gambar apakah ini?`,
					'- Waktu kamu 03:00 lagi.',
					'','*_#kuistebakgambar_*'
				].join('\n'),
				HOST+quest.img,
				'',
				media,
				false,
				false,
				bot.quoteContact(m)
			): m.reply({
				contextInfo: {
					mentionedJid: [sender]
				},
				image: { url: HOST+quest.img},
				caption: [
					'*Tebak Gambar*','',
					'Siap? Perhatikan baik-baik..',
					`- Terdiri dari ${size} kata, diawali huruf '${first}', diakhiri huruf '${last}'. Gambar apakah ini?`,
					'- Waktu kamu 03:00 lagi.',
					'','*_#kuistebakgambar_*'
				].join('\n')
			}, true, {
				ephemeralExpiration: 86400,
				quoted: bot.quoteContact(m)
			})),
			{ key } = msg
			session[id].key = key
			session[id].msg = msg
			session[id].mulai = true
			session[id].timeout = setTimeout(()=>{
				bot.sendMessage(chat, {
					text: 'Sesi Permainan Selesai !!\Pesan akan hilang setelah 24 jam.',
					//edit: session[id].key
				}, {quoted: session[id].msg})
				delete session[id]
				// logger.info('sesi selesai')
			}, TIME_OUT_DEFAULT)
		} catch(e) {
			logger.warn(e)
		}
	},
}

addcmd(
	'tg',
	command.handle,
	{
		...command
	}
)

function _id(chat, sender) {
	return `${chat}+${sender}`
}
function shake(arr) {
	return arr[Math.floor(Math.random() * arr.length)]
}
async function handler (bot, m) {
	const {chat, sender} = m,
	id = _id(chat, sender)
	
	if (!Object.keys(session).length) delete this[chat]
	if (!(id in session)) return
	if (!session[id].mulai) return
	if (!m.text) return
	
	var {quest:{answer}, msg, key} = session[id], reply,
	text = m.text.trim().toLowerCase()
	answer = answer.toLowerCase()
	
	if (text == answer) {
		reply = [
			'✨Yups benar sekali..🥳',
			`✨Jawabannya *${session[id].quest.answer}*`,
			//'+5 point untuk kamu _^',
			m.isGroup?`${'@'+jidDecode(sender).user} menjawab dengan benar 🎉\n`:'',
			'gunakan `.tg` untuk lanjut.'
		].join('\n')
		
		msg = await bot.sendMessage(chat, {
			text: reply,
			mentions: [m.sender]
			//edit: key
		}, {quoted: session[id].msg})
		clearTimeout(session[id].timeout)
		for(const _id of session[id].participant)
			delete session[_id]
		// logger.info('Quest dimenangkan!!')
		return
	}
	text = text.split(/\s+/)
	answer = answer.split(/\s+/)
	if (text = text.filter((a,i)=>a == answer[i]).length)
		await m.reply(shake([
			`Kurang tepat, tapi ${text} kata udah betul tuh..`,
			...try_again.slice(0,3),
			answer.length - text < 2&& `Gereget banget!!, padahal ${answer.length - text} kata lagi..`,
			answer.length - text < 3&& `Gereget deh, ${answer.length - text} kata lagi..`
		].filter(String)))
	else if (Math.random() * 10 > 5)
		await m.reply(shake(try_again))
}

const try_again = [
	'hihi.. coba lagi..',
	'kurang tepat.',
	'Tidak tepat, tapi hampir!',
	'Salah! Coba lagi, kamu bisa!',
	'Ups, salah! Jangan menyerah!',
	'Tidak benar, apa ya kira-kira',
	'Salah, tapi masih ada kesempatan!',
	'Kamu tidak tepat, ayo coba lagi yang lain!',
	'Ups, salah! Coba lagi lebih fokus!'
]