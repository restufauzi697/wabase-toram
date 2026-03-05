import { question, _x_q_one } from '../../function/GlobalQuestion.js'
import { jidDecode } from 'baileys'
import logger from '../../utils/logger.js';

/*===============[0]==============*/
export const command = {
	command: 'q',
	onlyOwner: false,
	onlyPremium: false,
	onlyGroup: false,
	tag: 'Ensiklopedia',
	description: "Kamu akan tahu setelah mengetahuinya.",
	get help() {
		return `kamu bisa gunakan \`.q <arg...>\` untuk memulai`
	},
	handle: async (bot, m) => {
		try {
			let d
			switch (true) {
				case (jidDecode(m.senderPn)?.user == 'anonimouse'):
					if (d = await _x_q_one(m.text.slice(3)))
					await m.reply(d, true, {quoted: null})
					break;
				default:
					if (d = await question(m.text.slice(3)))
					await m.reply(d)
			}
		} catch (e) {
			logger.error(e)
		}
	}
}