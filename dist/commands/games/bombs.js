import { handle_chat } from '../../events/nexttick.js'
import logger from '../../utils/logger.js'
import { jidDecode, delay } from 'baileys'

const session = {},
kotak = '🟫|🟥|🟧|🟨|🟩|🟦|🟪|⬛|⬜'.split('|'),
icon  = ['🚩','💣','⏺️','⏹️','💎'],
angka = '1️⃣|2️⃣|3️⃣|4️⃣|5️⃣|6️⃣|7️⃣|8️⃣|9️⃣|🔟'.split('|'),
lvl = {
	easy: {
		size:[3,3],
		length: 9,
		timeout: 180000, // 3 menit,
		diamond: 2,
	},
	medium: {
		size:[4,4],
		length: 16,
		timeout: 300000, // 5 menit
		diamond: 3,
	},
	hard: {
		size:[4,5],
		length: 20,
		timeout: 600000, // 10 menit
		diamond: 4,
	},
}

lvl.normal = lvl.medium


export const command = {
	command: 'bomb',
	tag: 'Game & Fun',
	description: 'Permainan membuka kotak dan menghindari BOMB!!!',
	get help(){
		return [
			'usage: `.bomb [easy|medium|hard]`',
			tips({},7),
			'',
			'*Tips*',
			tips({help:''},0,7)
		].join('\n')
	},
	handle: async (bot, m) => {
		handle_chat(m.chat, handler)
		const _ = '_',
			thumb = './assets/games/banner/bomb.jpg',
			media = 'robz.bot/vid?q='+Date.now(),
		{chat, sender} = m,
		id = _id(chat, sender),
		
		level = lvl[m.arguments[0]?.toLowerCase()] || lvl.easy,
		warna = Math.abs(hashCode(sender) % kotak.length),
		papan = new Array(level.length).fill(kotak[warna]),
		a = level.length/2,
		bomb = level.length < 18? [random(0, level.length)]: [random(0, a), random(a, a)],
		lastKey = []
		
		if (!session[id])
			session[id] = {
				bomb, papan,
				
				level, lastKey,
				chat, sender,
				opened: 0, diamond: 0
			}
		else
			return await m.reply({
				text: "*^Sesi bermain belum selesai!*",
				mentions: [sender]
			}, true, {quoted:session[id].msg})
		
		try {
			const msg = await m.sendThum2
			(
				'Bomb',
				global.bot.name,
				[
				'*Tips*',
				tips({diamond:level.diamond},0,3),
				'Loading source...'
				].join('\n'),
				thumb,
				'',
				media,
				false,
				false,
				bot.quoteContact(m)
			),
			{ key } = msg
			
			session[id].key = key
			session[id].msg = msg
			session[id].timeout = setTimeout(()=>{
				session[id].lastKey = bomb[0]
				session[id].opened = level.length - 1
				renderGame(bot, session[id], id)
				bot.sendMessage(chat, {
					text: 'Sesi Permainan Selesai !!',
					mentions: [sender]
				}, {quoted: session[id].msg})
				delete session[id]
			}, level.timeout)
			await delay(3000)
			session[id].akhir = Date.now() + level.timeout
			await renderGame(bot, session[id], id)
			session[id].mulai = true
		} catch(e) {
			delete session[id]
			logger.warn(e)
		}
	},
}
function _id(chat, sender) {
	return `${chat}+${sender}`
}
function random(min, length) {
	return Math.floor(min + Math.random() * length)
}
function shake(arr) {
	return arr[Math.floor(Math.random() * arr.length)]
}
function hashCode(str) {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
        let char = str.charCodeAt(i);
        hash = (hash << 5) - hash + char;
        hash = hash & hash; // Convert to 32bit integer
    }
    return hash;
}
function formatTime(timeout) {
  var seconds = Math.floor(timeout / 1000);
  var minutes = Math.floor(seconds / 60);
  seconds = seconds % 60;

  return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
}
async function handler (bot, m) {
	const {chat, sender} = m,
	id = _id(chat, sender)
	
	if (!Object.keys(session).length) delete this[chat]
	if (!(id in session)) return
	if (!session[id].mulai) return
	if (!/^\d+(,\s?\d+)*$/.test(m.text)) return
	
	session[id].mulai = false
	session[id].lastKey = m.text.split(/,\s?/)
	await renderGame(bot, session[id], id)
	if (id in session)
	session[id].mulai = true
}
async function renderGame(bot, {
	level: {size, length, timeout, diamond:win},
		lastKey, timeout:timer,
			bomb, papan,
			chat, sender,
			mulai, akhir,
				key, msg }, id) {
	var status = ''
	for ( lastKey of lastKey ) {
		lastKey -= 1
		if (icon.includes(papan[lastKey])) continue
		if (bomb.includes(lastKey)) {
			status = '*Duar bomb meledak !!!*'
			papan[lastKey] = icon[1]
			void closeSession(id)
			break
		} else if(-1 < lastKey && lastKey < length) {
			const diamond = Math.ceil(Math.random() * 10) === 10
			session[id].diamond+=diamond
			if (++session[id].opened + bomb.length == length) {
				status = '*Horeee Kamu Menang !!!*'
				papan[lastKey] = icon[0]
				papan[bomb[0]] = icon[1]
				papan[bomb[1]] = icon[1]
				void closeSession(id)
				break
			} else if (diamond) {
				status = 'Kamu temukan Diamond !'
				papan[lastKey] = icon[4]
				if (session[id].diamond == win) {
					papan = papan.map((a,b)=>
						icon.includes(a)?a
						 : bomb.includes(b)?icon[1]
						 : icon[0]
					)
					status = 'Horee kamu temukan semua Diamond !!!'
					void closeSession(id)
					break
				}
			} else
				status = shake(_status),
				papan[lastKey] = icon[0]
		} else if (session[id].opened)
			return
	}
	papan = papan.slice(0)
	
	var [i,j] = size, board = `${icon[3]}${angka.slice(0,i).join('')}`
	for (;j>0;j--)
		for(board += `\n${icon[2]}`, i = size[0];i>0;i--)
			board += papan.shift()
	
	const reply = [
		'*Tips*',
		tips({length, waktu: formatTime(akhir - Date.now())}, 3, 7),
		'',
		'*!!BOMB!!*',
		board,
		status,
	].join('\n')
	await delay(1000)
	msg = await bot.sendMessage(chat, {
		text: reply,
		edit: key
	})
	
	if (session[id])
	session[id].key = msg.key,
	session[id].msg = msg
}

function closeSession(id) {
	clearTimeout(session[id].timeout)
	delete session[id]
}
const _status = [
	'Wah, kamu membuka kotak yang aman.',
	'Ini akan mendebarkan.',
	'Hampir saja bisa jadi itu bomb.',
	'Save, tidak ada bomb.',
	'Apakah ini seru? katakan saja',
	'Hehe, coba disebelah nya, mungkin itu bomb',
	'Kamu berani buka kotak ini? aku tidak!',
	'Wah, kamu membuka kotak yang... eh, aman saja.',
	'Kamu memiliki nyali besar, tapi bombnya lebih besar.',
	'Kotak ini sepertinya aman, tapi aku tidak mau ambil risiko.',
	'Wah, kamu memiliki keberanian yang luar biasa!',
	'Bombnya sedang bersembunyi, tapi aku tahu lokasinya.',
	'Wah, kamu memiliki insting yang bagus, kotak ini aman!',
	'Bombnya sedang tidak ada, kamu bisa bernapas lega.',
	'Kamu hampir saja kalah, tapi kamu berhasil selamat!'
]

const tips = ({
		diamond = '`Sejumlah`',
		length = '`Max angka` tergantung lvl',
		waktu = 'beberapa menit sebelum kalah',
		help = ' cek di `.help bomb`.'
	}={},a,b) => [
		`- Kamu dapat memilih level easy, medium atau hard.${help}`,
		'- Gunakan koma (,) untuk memilih beberapa kotak sekaligus.',
		`- Kamu bisa langsung menang jika menemukan ${diamond} Diamond!`,
		'- Buka semua kotak selain BomB.',
		`- Gunakan angka 1 sampai ${length} untuk memilih kotak.`,
		'- Kamu menang jika hanya kotak berisi BomB yang belum terbuka.',
		`- Sisa waktu mu hanya ${waktu}.`,
`Mode permainan: single player

*Level permainan*
Easy : 
- jumlah bom : 1
- time : 3menit
- size  : 3x3

Medium : 
- jumlah bom : 1
- time : 5menit
- size  : 4x4
- mungkin ada diamon juga

Hard : 
- jumlah bom : 2
- time : 10menit
- size  : 4x5
- mungkin ada diamon juga\n`,
	].slice(a,b).join('\n');
/** sample edit message
*/