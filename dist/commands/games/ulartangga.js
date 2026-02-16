export const command = {
	command: 'utartangga',
	tag: 'Game & Fun',
	description: 'Bermain bersama teman, permainan ular tangga yang seru.',
	help: 'usage: `.utartangga`',
	handle: async (bot, m) => {
		var name, text = '',
			thumb = `./assets/toram/texture/toram-${Math.floor(Math.random()*8)}.jpg`,
			media = 'robz.bot/vid?q='+Date.now()
		
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