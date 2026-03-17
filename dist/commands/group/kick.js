import { isLidUser, jidNormalizedUser } from 'baileys';
import logger from '../../utils/logger.js'
import addcmd from '../../utils/cmd_msg.js'

export const command = {
	command: 'kick',
	onlyGroup: true,
	tag: 'Administratif',
	description: 'Kick member group.',
	help: help('kick'),
	handle: async (bot, m) => {
		await action2target(bot, m, 'remove')
	},
}


addcmd(
	'promote',
	async (bot, m) => {
		await action2target(bot, m, 'promote')
	},
	{
		...command,
		description: 'Promote admin group.',
		help: help('promote')
	}
)

addcmd(
	'demote',
	async (bot, m) => {
		await action2target(bot, m, 'demote')
	},
	{
		...command,
		description: 'Demote admin group.',
		help: help('demote')
	}
)

function help(cmd){
	return 'usage: `.'+cmd+' [@tag_member]` atau dengan mengutip pesan member.'
}

async function action2target(bot, m, act) {
	if (/^(remove|promote|demote)$/.test(act))
	try {
		//# Data anggota
		const { participants } = await bot.groupMetadata(m.chat)
		
		//# Validasi admin
		const me = jidNormalizedUser(bot.user.id)
		const isAdmin = participants.filter(a => (a.id == m.sender || a.phoneNumber == me) && a.admin)
		
		if (!(isAdmin.length > 1))
			return await m.reply(`Perintah ini hanya bisa dijalankan oleh admin group`)
		
		//# Target kick member
		const target = m.isQuote
			 ? [m.message[m.type].contextInfo?.participant].filter(isLidUser)
			 : [...m.text.matchAll(/@([0-9]{5,16})/g)]
			 . map(a => a[1] + '@lid')
			 . filter(target=> !!participants.find(a => a.id == target))
		
		if (!target.length)
			return await m.reply("Kutip pesan member yang ingin dikeluarkan dari group")
		
		await bot.groupParticipantsUpdate(m.chat, target, act);
	} catch (e) {
		logger.error(e, `${act} menber, Filed`)
		await m.reply(`Terjadi kesalahan, tidak bisa ${act} member group.`);
	}
}