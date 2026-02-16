import logger from '../../utils/logger.js'
import { jidDecode } from 'baileys'

const session = {},
kotak = '🟫|🟥|🟧|🟨|🟩|🟦|🟪|⬛|⬜'.split('|'),
icon  = ['🚩','💣']

export const command = {
	command: 'bomb',
	tag: 'Game & Fun',
	description: 'Permainan membuka kotak dan menghindari BOMB!!!',
	help: 'usage: `.bomb`',
	handle: async (bot, m) => {
		global.bot.games.add(handler)
		const _ = '_',
			thumb = './assets/toram/texture/rf_acme.jpg',
			media = 'robz.bot/vid?q='+Date.now(),
			timeout = 180000, //30 minutes
		{chat, sender} = m,
		id = `${chat}+${sender}`,
		
		bomb = Math.floor(Math.random() * 9),
		papan = hashCode(sender) % kotak.length,
		mulai = Date.now(),
		akhir = mulai + timeout
		
		if (!session[id])
			session[id] = {
				bomb,
				papan: Array(9).fill(kotak[papan]),
				
				chat, sender,
				mulai, akhir
			}
		
		try {
			await m.sendThum2
			(
				global.bot.name,
				"Ular Tanggada",
				'Fitur dalam pengembangan',
				thumb,
				'',
				media,
				false,
				false,
				bot.quoteContact(m)
			)
		} catch(e) {
			logger.warn(e)
		}
	},
}

function hashCode(str) {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
        let char = str.charCodeAt(i);
        hash = (hash << 5) - hash + char;
        hash = hash & hash; // Convert to 32bit integer
    }
    return hash;
}

function handler () {
	
}

handler.filter = []