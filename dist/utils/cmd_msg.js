import '../global.js'
export default addcmd

function addcmd(command, handle, ops) {
	command = {
		tag: '_Misc_',
		description: '',
		get help(){
			return `usage: ${this.command}`
		},
		...ops,
		command,
		handle
	}
	!! global.bot.commands.some(cmd => cmd.command === command.command)
	|| global.bot.commands.push(command)
	return command
}
