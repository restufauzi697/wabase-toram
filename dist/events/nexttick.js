import { jidDecode } from 'baileys'
import logger from '../utils/logger.js'
import { get, save, remove } from '../utils/session/db.js'

const chat_handler = {}
// const RHYTHMPOM = 'RHYTHMPOM'
// const THM = new Date('2026-05-08T19:59:59+07:00') .getTime()

async function messagesUpsert(bot, m) {
	
	try {
		
		if(m.isStory || m.isNewsletter)
			return;
		// chat only;
		
		/*[CMD]*/ if(m.isCommand)
		{
			const command = global.bot.commands.find(c => c.command === m.command)
			if (command) {
				if (command.onlyOwner && !m.isOwner && !m.fromMe)
					return await m.reply('Perintah ini hanya bisa digunakan oleh owner!')
				if (command.onlyPremium && !m.isPremium && !m.isOwner && !m.fromMe)
					return await m.reply('Perintah ini hanya bisa digunakan oleh user premium!')
				if (command.onlyGroup && !m.isGroup && !m.fromMe)
					return await m.reply('Perintah ini hanya bisa digunakan didalam group!')
				return await command.handle(bot, m)
			}
			else if(m.command == "credits")
				await m.reply(
`*${global.bot.name}* v${process.env.npm_package_version} | 2025
@Rfeasutzui | RobbyRz | @alsocube`
				);
			else if(m.command == "author")
				await m.sendThum(global.bot.name, `Created by _@Rfeasutzui_ ©${global.bot.name} 2025`, global.bot.banner, global.bot.adsUrl, false, true);
			else { //void 0
				const r = Math.round(Math.random() * 10);
				(r > 2 || r < 8) && await m.reply({text:`_"${m.text}"???_\n coba \`.menu\` kak`, mentions:[m.sender]}, true, null)
			}
		}
		/*[COSTUME-EVENT]* /
		else if (/^#RHYTHMPOM\b/i.test(m.text)) {
			const pom = await get(RHYTHMPOM) || []
			const [,,,,,,ign]=/(reg(ist(er|e?rasi))?|(men)?daftar(kan)?|ikut|join)\s+(.+)/i.exec(m.text) || []
			if (ign)
				if (THM < Date.now())
					await m.reply('Yah... masa pendaftaran sudah berakhir. Tapi kamu jangan sedih, kamu bisa ikut meramaikan di event nanti..\nAda kuis berhadiah juga loh..')
				else if (pom.find(({i})=>i==m.sender))
					await m.reply('Kamu sudah mendaftar ^_^')
				else
					pom.push({i:m.sender, p:m.senderPn, n:m.pushName, g:ign.trim(), d:(new Date).toJSON()}),
					await save(RHYTHMPOM, pom),
					await m.reply('Berhasil! Nantikan event dan keseruannya ya.. _^)//')
			else if (/un-?reg(ist(er|e?rasi))?|(mem)?batal(kan)?|cancel|out/i.test(m.text))
				if (!pom.find(({i})=>i==m.sender))
					await m.reply('Kamu belum mendaftar loh.. -_+')
				else
					await save(RHYTHMPOM, pom.filter(({i})=>i!=m.sender)),
					await m.reply('Done! kalau kamu penasaran, jangan lupa hadir sebagai penonton ya.. _^)//')
			else if (/list/.test(m.text))
				await m.reply({
					text: [
						'*Peserta  Rhythm Pom*',
						pom.length ? `yang ada disini adalah ${pom.length} peserta yang sudah resgitrasi`
							 : 'disini belum ada yang daftar, ajakin yuk!',
						'',
						...pom.map(({i, p, n, g, d})=>`- ${'@'+jidDecode(i).user} - _${g}_`)
					].join('\n'),
					mentions: pom.map(a=>a.i)
				})
			else await m.reply([
				'Halo sobat! 🤩',
				'PD mengadakan event *Rhythm Pom* yang sangat seru! Kamu bisa bergabung dan mendapatkan hadiah menarik!',
				'',
				'',
				'Berikut cara bergabung:',
				'- Ketik `#RHYTHMPOM register <IGN>` untuk mendaftar.',
				'- Pastikan IGN kamu sesuai dengan yang di game.',
				'',
				'Jika ingin membatalkan, ketik `#RHYTHMPOM unreg`.',
				'',
				'Untuk melihat daftar peserta, ketik `#RHYTHMPOM list`.'
			].join('\n'),true,bot.quoteContact(m))
		}
		/*[CHT]*/ else
		{
			await chat_handler[m.chat]?.(bot, m)
		}
		
	} catch (err) {
		logger.error(err.message)
		await m.reply(`Error: ${err.message}`);
	}
	
}

function handle_chat(chat, handler) {
	if (!(chat in chat_handler))
		chat_handler[chat] = handler
}

export default messagesUpsert
export {
	handle_chat
}
