import { isLidUser } from "baileys";

export const command = {
	command: 'add',
	onlyOwner: false,
	onlyPremium: false,
	onlyGroup: true,
	tag: 'Administratif',
	description: 'Add member ke group.',
    help: 'usage: `.add <@nomorTlp> [@nomorTlp ...]`\ncontoh: .add @628901234567 @62202123456789',
	handle: async (bot, m) => {
		//# Data anggota
		const { participants } = await bot.groupMetadata(m.chat)
		
		//# Validasi admin
		const isAdmin = participants.find(a => a.id == m.sender)?.admin
		
		if (!isAdmin && !m.fromMe)
			return m.reply(`Perintah ini hanya bisa dijalankan oleh admin group`)
		
		const kodenegara = 62 // default code negara
		const p = participants.map(a => a.phoneNumber + '@s.whatsapp.net')
		//# Target add member
		const target = Array.from(new Set([...m.text.matchAll(/@?[+]?([0-9]{5,16}|0)/g)]))
			 . map(a => a[1].replace(/^0/, kodenegara) + '@s.whatsapp.net')
			 . filter(target=> !p.includes(target))
		
		if (!target.length)
			return m.reply("tidak ada yang di add.")
		
		await bot.groupParticipantsUpdate(m.chat, target, "add");
	},
}