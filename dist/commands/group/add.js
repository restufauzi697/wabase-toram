import { isLidUser, jidNormalizedUser } from 'baileys';
import logger from '../../utils/logger.js'

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
			const { participants } = await bot.groupMetadata(m.chat)
			
			//# Validasi admin
			const me = jidNormalizedUser(bot.user.id)
			const isAdmin = participants.filter(a => (a.id == m.sender || a.phoneNumber == me) && a.admin)
			
			if (!(isAdmin.length > 1))
				return await m.reply(`Perintah ini hanya bisa dijalankan oleh admin group`)
			
			const kodenegara = 62 // default code negara
			const p = participants.map(a => jidNormalizedUser(a.phoneNumber))
			//# Target add member
			const jid = Array.from(new Set([...m.text.matchAll(/@?[+]?([0-9]{5,16})/g)]))
				 . map(a => jidNormalizedUser(a[1].replace(/^0/, kodenegara) + '@s.whatsapp.net'))
				 . filter(target=> !p.includes(target))
			
			const target = (await bot.onWhatsApp(...jid))
				 . filter( a => a.exists)
				 . map( ({jid}) => jid)
			
			if (!target.length)
				return await m.reply("nomot telp tidak valid")
			
			const res = await bot.groupParticipantsUpdate(m.chat, target, "add");
			logger.info(res, 'add participant')
		} catch(e) {
			logger.error(e, 'Add menber, Filed')
			m.reply(`Terjadi kesalahan, tidak bisa menambahkan member group.`);
		}
	},
}