import { question, _x_q_one } from '../../function/GlobalQuestion.js'
import { jidDecode } from 'baileys'
import logger from '../../utils/logger.js';
import addcmd from '../../utils/cmd_msg.js'

/*===============[0]==============*/
export const command = {
	command: 'q',
	tag: 'Ensiklopedia',
	description: "Kamu akan tahu setelah mengetahuinya.",
	get help() {
		return `kamu bisa gunakan \`.q <arg...>\` untuk memulai`
	},
	handle: async (bot, m, q) => {
		try {
			let d
			switch (true) {
				case (jidDecode(m.senderPn)?.user == 'anonim'):
					if (d = await _x_q_one(m.text.slice(3)))
					await m.reply(d, true, {quoted: null})
					break;
				default:
					if (d = await question(/quotes?|fakta|info/i.test(q)?q:m.text.slice(3)))
					await m.reply(d)
			}
		} catch (e) {
			logger.error(e)
		}
	}
}

addcmd(
	'quotes',
	async (bot, m)=> await command.handle(bot, m, 'quotes'),
	{
		...command,
		description: "Random quotes penyemngat hari mu.",
		help: 'usage: `.quotes`'
	}
)

addcmd(
	'quote',
	async (bot, m)=> await command.handle(bot, m, 'quotes'),
	{
		...command,
		description: "Random quotes penyemngat hari mu.",
		help: 'usage: `.quotes`'
	}
)

addcmd(
	'fakta',
	async (bot, m)=> await command.handle(bot, m, 'fakta'),
	{
		...command,
		description: "Ragam fakta unik penambah wawasan.",
		help: 'usage: `.fakta`'
	}
)