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
        
        logger.info(msg)
        if (!msg.isGroup)
        	return console.log('=====0=====')
        
        const groupMetadata = await bot.groupMetadata(msg.chat);
        logger.info(groupMetadata)
    },
}
