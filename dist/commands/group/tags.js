export const command = {
	command: 'tags',
	onlyOwner: false,
	onlyPremium: false,
	onlyGroup: true,
	handle: async (bot, m) => {
		//# Validasi admin
		const { participants } = await bot.groupMetadata(m.chat)
		
		const isAdmin = participants.find(
			participant => participant.id === m.sender && participant.admin
		)
		
		if (!isAdmin)
			return m.reply(`Perintah ini hanya bisa dijalankan oleh admin group`)
		
		if (!m.arguments[0])
			return m.reply("Pesan dibutuhkan");
		
		m.reply({
			text: m.arguments[0],
			mentions: participants.map((x) => x.id),
		})
	},
}