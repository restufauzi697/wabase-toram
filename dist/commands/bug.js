import logger from '../utils/logger.js'

export const command = {
    command: 'bug',
    onlyOwner: false,
    onlyPremium: false,
    onlyGroup: false,
    visible: false,
    handle: async (bot, msg) => {
        if (!global.devMode)
        	return
        
        // msg.reply('Ini perintah bug')
        
        // ujicoba: 120363420491866540@g.us
        
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
        
        logger.info(msg)
        if (!msg.isGroup)
        	return console.log('=====0=====')
        
        const groupMetadata = await bot.groupMetadata(msg.chat);
        logger.info(groupMetadata)
    },
}
