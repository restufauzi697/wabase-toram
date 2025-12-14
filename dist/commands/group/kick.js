import { isLidUser } from "baileys";

export const command = {
	command: 'kick',
	onlyOwner: false,
	onlyPremium: false,
	onlyGroup: true,
	tag: 'Administratif',
	description: 'Kick member group.',
    help: 'usage: `.kick` dan Kutip pesan member yang ingin dikeluarkan dari group.',
	handle: async (bot, m) => {
		//# Data anggota
		const { participants } = await bot.groupMetadata(m.chat)
		
		//# Validasi admin
		const isAdmin = participants.find(a => a.id == m.sender)?.admin
		
		if (!isAdmin && !m.fromMe)
			return m.reply(`Perintah ini hanya bisa dijalankan oleh admin group`)
		
		//# Target kick member
		const target = m.isQuote
			 ? [m.message[m.type].contextInfo?.participant].filter(isLidUser)
			 : [...m.text.matchAll(/@([0-9]{5,16}|0)/g)]
			 . map(a => a[1] + '@lid')
			 . filter(target=> !!participants.find(a => a.id == target))
		
		if (!target.length)
			return m.reply("Kutip pesan member yang ingin dikeluarkan dari group")
		
		await bot.groupParticipantsUpdate(m.chat, target, "remove");
	},
}