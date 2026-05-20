import { handle, help } from '../../plugin/game/ular_tangga.js'
import addcmd from '../../utils/cmd_msg.js'

export const command = {
	command: 'ulartangga',
	tag: '03Game & Fun',
	description: 'Bermain bersama teman, permainan ular tangga yang seru.',
	get help() { return help() },
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
	handle,
	visible: false // still under development
}

addcmd(
	'ut',
	command.handle,
	{
		...command,
		visible: false
	}
)
