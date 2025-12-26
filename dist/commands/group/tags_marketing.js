import { generateWAMessageFromContent, delay, getContentType, jidDecode } from "baileys";
import addcmd from '../../utils/cmd_msg.js'

export const command = {
	command: 'mark_market',
	onlyOwner: true,
	onlyGroup: true,
	visible: false,
	tag: '_Toram Market_',
    description: 'Tandai grup sebagai grup pasar.',
    help: 'usage: `.mark_market [Yes/No]` default: `Yes`\ngrup akan dibolehkan menggunakan cmd dari *_Toram Market._*',
	handle: async (bot, m) => {
		const group = global.database.group[m.chat] ??= {}
		const mark = group.mark_as_marketing_group
		 = !m.arguments[0] || m.arguments[0]?.toLowerCase() == 'yes'
		 ? true
		 : m.arguments[0]?.toLowerCase() == 'no'
		 ? false
		 : group.mark_as_marketing_group
		
		global.database.save('group')
		
		await m.reply(`grup ${mark? '': 'tidak '}ditandai sebagai grup market.`);
	},
}

addcmd(
	'sell',
	handle,
	{
		tag: '_Toram Online_',
		description: 'Tags @all untuk promosi marketing.',
		help: 'usage: `.sell <text...>`\natau `.sell` dan kutip pesan yang disorot.'
	}
)

addcmd(
	'buy',
	handle,
	{
		tag: '_Toram Online_',
		description: 'Tags @all untuk promosi marketing.',
		help: 'usage: `.buy <text...>`\natau `.buy` dan kutip pesan yang disorot.'
	}
)

async function handle (bot, m) {
	const { participants } = await bot.groupMetadata(m.chat)
	
	const isMarketingGroup = global.database.group[m.chat]?.mark_as_marketing_group
	
	if (!isMarketingGroup)
		return m.reply(`Perintah ini hanya bisa dijalankan di grup tertentu`)
	
	const mentionedJid = participants.map((x) => x.id)
	
	if (! m.isQuote)
	
	if (!m.text)
		return m.reply("Pesan dibutuhkan");
	else
		return m.reply({
			text: `@${jidDecode(m.sender)?.user} ${m.command}: `+m.text.replace(/^\S*\b/g, ''),
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
						mentionedJid
					},
					text: `@${jidDecode(m.sender)?.user} ${m.command}: ` + m.quote.conversation,
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
					},
				},
			},
			{},
		);
	
	if (qmType !== "conversation") {
		await m.reply({
				text: `@${jidDecode(m.sender)?.user} ${m.command}`,
				mentions: mentionedJid,
			})
		await delay(500)
	}
	await bot.relayMessage(m.chat, msg.message, {})
}