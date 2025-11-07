import { generateWAMessageFromContent, delay, getContentType } from "baileys";

export const command = {
	command: 'tags',
	onlyOwner: false,
	onlyPremium: false,
	onlyGroup: true,
	tag: 'Administratif',
    description: 'Hide tag.',
    help: 'usage: `.tags <text...>`\natau `.tags` dan kutip pesan yang disorot.',
	handle: async (bot, m) => {
		//# Validasi admin
		const { participants } = await bot.groupMetadata(m.chat)
		
		const isAdmin = participants.find(
			participant => participant.id === m.sender && participant.admin
		)
		
		if (!isAdmin)
			return m.reply(`Perintah ini hanya bisa dijalankan oleh admin group`)
		
		const mentionedJid = participants.map((x) => x.id)
		
		if (! m.isQuote)
		
		if (!m.arguments[0])
			return m.reply("Pesan dibutuhkan");
		else
			return m.reply({
				text: m.arguments[0],
				mentions: mentionedJid,
			})
		
		const jid = m.chat
            
        await bot.presenceSubscribe(jid)
        await delay(500)
    
		const qmType = getContentType(m.quote)
		const msg = qmType === "conversation"
			 ? generateWAMessageFromContent(
				m.chat,
				{
					extendedTextMessage: {
						contextInfo: {
							mentionedJid,
						},
						text: m.quote.conversation,
					},
				},
				{},
			 )
			 : generateWAMessageFromContent(
				m.chatId,
				{
					[qmType]: {
						...m.quote[qmType],
						contextInfo: {
							mentionedJid,
						},
					},
				},
				{
					quoted: m,
				},
			);
		
		await bot.sendPresenceUpdate('composing', jid)
        await delay(2000)
		
		await bot.sendPresenceUpdate('paused', jid)
		
		await bot.relayMessage(m.chat, msg.message, {})
	},
}