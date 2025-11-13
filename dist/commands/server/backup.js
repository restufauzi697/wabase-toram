import {command as cmd} from './setting.js'

export const command = {
	command: 'backup',
	onlyOwner: true,
	onlyPremium: false,
	onlyGroup: false,
	visible: false,
	tag: 'server',
	description: 'Backup settings.',
	get help() {
		return 'usage: `.backup`'
	},
	handle: async (bot, m) => {
		m.arguments[0] = 'backup'
		cmd.handle(bot, m)
	}
}