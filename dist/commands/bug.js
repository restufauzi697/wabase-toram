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
        
        msg.reply('Ini perintah bug')
        
        msg.sendThum2
        (
        	"Toram Online",
        	"Departure of Iruna",
			"I have no idea",
			null,
			`./assets/toram/texture/toram-${Math.floor(Math.random()*8)}.jpg`,
			'',
			'https://www.instagram.com/reel/C5Ju9hCvlQ8/?igsh=czFqeWFqY25sejk5',//'https://youtube.com/watch?v=sWVN8g2RRhY',
			false,
			true
		).then(a=>logger.info)
// (0, page, img, 'https://id.toram.jp/', false, false)
        
        logger.info(msg)
        if (!msg.isGroup)
        	return console.log('=====0=====')
        
        const groupMetadata = await bot.groupMetadata(msg.chat);
        logger.info(groupMetadata)
    },
}
