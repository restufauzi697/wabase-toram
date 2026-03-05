import logger from '../utils/logger.js'

const chat_handler = {}

async function messagesUpsert(bot, m) {
	
	try {
		
		if(m.isStory || m.isNewsletter)
			return;
		// chat only;
		
		/*[CMD]*/ if(m.isCommand)
		{
			const command = global.bot.commands.find(c => c.command === m.command)
			if (command) {
				if (command.onlyOwner && !m.isOwner && !m.fromMe)
					return await m.reply('Perintah ini hanya bisa digunakan oleh owner!')
				if (command.onlyPremium && !m.isPremium && !m.isOwner && !m.fromMe)
					return await m.reply('Perintah ini hanya bisa digunakan oleh user premium!')
				if (command.onlyGroup && !m.isGroup && !m.fromMe)
					return await m.reply('Perintah ini hanya bisa digunakan didalam group!')
				return await command.handle(bot, m)
			}
			else if(m.command == "credits")
				await m.reply(
`*${global.bot.name}* v${process.env.npm_package_version} | 2025
@Rfeasutzui | RobbyRz | @alsocube`
				);
			else if(m.command == "author")
				await m.sendThum(global.bot.name, `Created by _@Rfeasutzui_ ©${global.bot.name} 2025`, global.bot.banner, global.bot.adsUrl, false, true);
			else void 0
		}
		/*[CHT]*/ else
		{
			await chat_handler[m.chat]?.(bot, m)
		}
		
	} catch (err) {
		logger.error(err.message)
		await m.reply(`Error: ${err.message}`);
	}
	
}

function handle_chat(chat, handler) {
	if (!(chat in chat_handler))
		chat_handler[chat] = handler
}

export default messagesUpsert
export {
	handle_chat
} 