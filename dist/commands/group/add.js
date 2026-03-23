import { isLidUser, delay, jidNormalizedUser } from 'baileys';
import logger from '../../utils/logger.js'

const ranNum = (a,b)=>Math.floor(a + Math.random() * (b-a))

export const command = {
	command: 'add',
	onlyOwner: false,
	onlyPremium: false,
	onlyGroup: true,
	tag: 'Administratif',
	description: 'Add member ke group.',
    help: 'usage: `.add <phoneNumber> [phoneNumber ...]`\npastikan disertai dengan kode negara.\ncontoh: .add 628901234567 +12234567890',
	handle: async (bot, m) => {
		try{
			//# Data anggota
			const { participants, restrict } = await bot.groupMetadata(m.chat)
			
			if (restrict)
				logger.warn(m.chat+' [ restrict mode ]')
			
			//# Validasi admin
			const me = jidNormalizedUser(bot.user.id)
			const isAdmin = participants.filter(a => (a.id == m.sender || a.phoneNumber == me) && a.admin)
			
			if (!(isAdmin.length > 1))
				return await m.reply(`Perintah ini hanya bisa dijalankan oleh admin group`)
			
			const kodenegara = 628 // default code negara
			const p = participants.map(a => jidNormalizedUser(a.phoneNumber))
			//# Target add member
			
			const jid = Array.from(new Set(
					m.text.split(/\s|,/)
					 . map(a=>a.replace(/\D/g,'').replace(/^08/, kodenegara) + '@s.whatsapp.net')
					 . filter(target=> target && !p.includes(target))
				 ))
			
			const target = await bot.onWhatsApp(...jid)
			
			if (!target.length)
				return await m.reply("nomot telp tidak valid")
			
			await m.reply({ react: { text: '🏷️', key: m.key } }, false)
			for(const {exists, jid} of target) {
				const res = await bot.groupParticipantsUpdate(m.chat, [jid], "add")
				for (let x of res) {
					if (x.status != '200')
					if (x.status == '403')
						await m.reply({ text: `Gagal menambahkan @${x.jid.split('@')[0]}, kirim undangan...`, mentions: [x.jid] })
					else if (x.status == '408')
						await m.reply({ text: `Tidak bisa menambahkan @${x.jid.split('@')[0]}, karena dia baru saja keluar, coba lagi nanti...`, mentions: [x.jid] })
					else if (x.status == '409')
						await m.reply({ text: `@${x.jid.split('@')[0]} sudah berada dalam grup.`, mentions: [x.jid] })
					else 
						await m.reply({ text: `Gagal menambahkan @${x.jid.split('@')[0]}`, mentions: [x.jid] }),
						logger.warn(x, 'add participant')
				}
				await delay(ranNum(2000,5000))
			}
		} catch(e) {
			logger.error(e, 'Add menber, Failed')
			m.reply(`Terjadi kesalahan, tidak bisa menambahkan member group.`);
		}
		await m.reply({ react: { text: '️', key: m.key } }, false)
	},
}