import {command as cmd} from './setting.js'

export const command = {
	command: 'restore',
	onlyOwner: true,
	onlyPremium: false,
	onlyGroup: false,
	visible: false,
	tag: 'server',
	description: 'Restore settings.',
	get help() {
		return 'usage: `.restore` with file'
	},
	handle: async (bot, m) => {
		m.arguments[0] = 'restore'
		cmd.handle(bot, m)
	}
}