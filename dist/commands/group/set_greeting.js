import { generateWAMessageFromContent, delay, getContentType, jidDecode } from "baileys";
import addcmd from '../../utils/cmd_msg.js'

const tips = `
*Tips*:
- \`@users\` - menampilkan tag user.
- \`@subject\` - menampilkan nama grup.
- \`@desc\` - menampilkan deskripsi grup.`

export const command = {
	command: 'setwelcome',
	onlyGroup: true,
	tag: 'Administratif',
    description: 'Ubah kata sambutan untuk anggota baru.',
    help: 'usage: `.setwelcome <default | text...>'+tips,
	handle
}

addcmd(
	'setgoodbye',
	handle,
	{
		onlyGroup: true,
		tag: 'Administratif',
		description: 'Set ucapan selamat tinggal kepada anggota yang pergi.',
		help: 'usage: `.setgoodbye <default | text...>'+tips
	}
)

const alias = {setwelcome:'add',setgoodbye:'remove'}

async function handle (bot, m) {
	//# Validasi admin
	const { participants } = await bot.groupMetadata(m.chat)
	
	const isAdmin = participants.find(
		participant => participant.id === m.sender && participant.admin
	)
	
	if (!isAdmin && !m.fromMe)
		return m.reply(`Perintah ini hanya bisa dijalankan oleh admin group`)
	
	const group = global.database.group[m.chat] ??= {}
		const greeting_word = group.greeting_word ??= {}
		const arg = m.arguments[0]?.toLowerCase()
		if (arg == 'reset' || arg == 'default')
			delete greeting_word[alias[m.command]]
		else if (m.arguments.length)
			greeting_word[alias[m.command]] = m.text.replace(/^\S*\b/g, '').trim()
		else
			return await m.reply(`Ketikan kalimat untuk kata sambutan kepada anggota yang datang dan pergi.`);
			
		global.database.save('group')
		
		await m.reply(`Kata sambutan sudah ditetapkan.`);
}