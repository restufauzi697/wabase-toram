
export default async function messagesUpsert(bot, m) {
	
	try {
		
		if(m.isStory || m.isNewsletter)
			return;
		// chat only;
		
		/*[CMD]*/ if(m.isCommand)
		{
			const command = global.bot.commands.find(c => c.command === m.command)
			if (command) {
				if (command.onlyOwner && !m.isOwner && !m.fromMe)
					return m.reply('Perintah ini hanya bisa digunakan oleh owner!')
				if (command.onlyPremium && !m.isPremium && !m.isOwner && !m.fromMe)
					return m.reply('Perintah ini hanya bisa digunakan oleh user premium!')
				if (command.onlyGroup && !m.isGroup)
					return m.reply('Perintah ini hanya bisa digunakan didalam group!')
				return command.handle(bot, m)
			}
			else if(m.command == "credits")
				m.reply(`*${global.bot.name}* 2025`);
			else void 0
		}
		
	} catch (err) {
		console.error(err.message)
		m.reply(`Error: ${err.message}`);
	}
	
}