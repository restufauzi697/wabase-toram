export const command = {
	command: 'help',
	onlyOwner: false,
	onlyPremium: false,
	onlyGroup: false,
	tag: '',
	description: 'gunakan: `.help <command>`',
	get help() {
		return 'usage: `.help <command>`'
	},
	handle: async (bot, m) => {
		const command = global.bot.commands.find(c => c.command === m.arguments[0])
		if (command && command.help)
			m.reply(`*Help for ._${command.command}_*\n\n${command.help}`)
		else
			m.reply({ react: { text: '❌', key: m.key } }, false)
	},
}