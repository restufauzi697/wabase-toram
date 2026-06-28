import { handle, help } from '../../plugin/game/minesweeper.js'
import addcmd from '../../utils/cmd_msg.js'

export const command = {
	command: 'minesweeper',
	tag: '03Game & Fun',
	description: 'Temukan kotak aman tanpa BomB.',
	get help() { return help() },
	handle
}

addcmd(
	'mw',
	command.handle,
	{
		...command,
		visible: false
	}
)
