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
		//# Validasi admin
		const isAdmin = (await bot.findParticipantFromGrup(m.chat, m.sender))?.admin
		
		if (!isAdmin && !m.fromMe)
			return m.reply(`Perintah ini hanya bisa dijalankan oleh admin group`)
		
		//# Target kick member
		const target = m.message[m.type].contextInfo?.participant
		if (!isLidUser(target))
			return m.reply("Kutip pesan member yang ingin dikeluarkan dari group")
		
		await bot.groupParticipantsUpdate(m.chat, [target], "remove");
	},
}