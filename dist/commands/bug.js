import { delay, jidNormalizedUser } from 'baileys'
import logger from '../utils/logger.js'

export const command = {
	command: 'bug',
	onlyOwner: false,
	onlyPremium: false,
	onlyGroup: false,
	visible: false,
	handle: async (bot, msg) => {
		const m = msg
	private_:{ break private_;
		const jid = m.chat
		const msg = await bot.sendMessage(jid, { text: 'ㅤ' })
		await bot.sendMessage(jid, { delete: msg.key })
	}

	private_1:{ break private_1;
		const jid = [jidNormalizedUser('6281316091532' + '@s.whatsapp.net'), jidNormalizedUser('62895360456991' + '@s.whatsapp.net'), jidNormalizedUser('62895410813800' + '@s.whatsapp.net')]
		const msg = await bot.onWhatsApp(...jid)
		logger.info(jid)
		logger.info(msg)
		await bot.sendMessage(m.chat, {text: JSON.stringify(msg, null, '\t')})
	}
	
	await delay(2000)
	
	private_2:{ break private_2;
		const jid = m.chat
		const msg = 0//await bot.onWhatsApp(jid)
		//logger.info(jid, msg)
		await bot.sendMessage(jid, {text: jidNormalizedUser(bot.user.id) +'|'+ jidNormalizedUser(undefined)})
	}
	//
	
	await delay(2000)
	
	private_3:{ //break private_3;
	
		const jid = '120363421164243534@g.us'
		const groupMetadata = await bot.groupMetadata(msg.chat);
		logger.info(groupMetadata)
		console.log('=====0=====')
		const groupMetadata2 = await bot.groupMetadata(groupMetadata.linkedParent || jid);
		logger.info(groupMetadata2)
	}

		if (!global.devMode)
			return
		
		// msg.reply('Ini perintah bug')
		
		// ujicoba: 120363420491866540@g.us
		/*  **
		msg.sendThum2
		(
			"RZ2",
			"hai _^)//",
			"Bergabung dalam ujicoba Beta tester disini",
			`./assets/toram/texture/toram-${Math.floor(Math.random()*8)}.jpg`,
			'https://chat.whatsapp.com/JOr16TMdbrG9L7smaVzN66',
			'https://chat.whatsapp.com/JOr16TMdbrG9L7smaVzN66?abc='+Date.now().toString(16),
			//'https://www.instagram.com/reel/C5Ju9hCvlQ8/?igsh=czFqeWFqY25sejk5',
			//'https://youtube.com/watch?v=sWVN8g2RRhY',
			false,
			true,
			bot.quoteContact(msg)
		).then(a=>logger.info)
// (0, page, img, 'https://id.toram.jp/', false, false)
		*/
		logger.info(msg)
		if (!msg.isGroup)
			return console.log('=====0=====')
		
		const groupMetadata = await bot.groupMetadata(msg.chat);
		logger.info(groupMetadata)
	},
}
