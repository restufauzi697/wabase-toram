import {command as bmkg} from './bmkg.js'

export const command = {
	command: 'inf-gempa',
	onlyOwner: false,
	onlyPremium: false,
	onlyGroup: false,
	tag: '_Informasi_',
	description: '`S` info gempa terbaru dari BMKG.',
	get help() {
		return 'usage: .inf-gempa [terkini?]'
	},
	handle: async (bot, m) => {
		m.arguments[0] = 'gempa '+m.arguments[0]
		bmkg.handle(bot, m)
	}
}