import exec from "../../utils/coryn/tools.js";
import logger from '../../utils/logger.js'

export const command = {
	command: 'coryn',
	onlyOwner: false,
	onlyPremium: false,
	onlyGroup: false,
	tag: '_Toram Online_',
	description: 'Tools untuk player Toram Online.',
	get help() {
		return `coryn: gunakan .coryn <tool> argument...
tools:
- leveling [level] [gap] [XPGain]

contoh:
.coryn leveling 76 9`
	},
	handle: async (bot, m) => {
		const cmd = simulateCommandLineArgs(String(m.arguments[0]).toLowerCase())
		const tool = alias[cmd[0]]
		
		await m.reply({ react: { text: '⏳', key: m.key } }, false)
		try {
			if(exec[tool])
				await exec[tool](m, cmd.slice(1), bot)
			else
				await m.reply()
		} catch(e) {
			
		}
		await m.reply({ react: { text: '', key: m.key } }, false)
	},
}

const alias = {}

{
	[
	  ["leveling", "lvl,level,lv"],
	  ["crysta", "xtall", "crystal"],
	  ["equip", "eq"],
	  ["search", "cri,fnd,cari,find,temukan"],
	].map(([A, B]) => {
		alias [A] = A
		B.split(',').map(B=>(
			alias [B] = A
		))
	})
};

function simulateCommandLineArgs(commandLineString) {
	commandLineString = commandLineString.trim();

	const regex = /"([^"]*)"|'([^']*)'|(\S+)/g;
	const args = [];
	let match;

	while ((match = regex.exec(commandLineString)) !== null) {
		if (match[1]) {
			args.push(match[1]); // Tanda kutip ganda
		} else if (match[2]) {
			args.push(match[2]); // Tanda kutip tunggal
		} else {
			args.push(match[3]); // Argumen tanpa tanda kutip
		}
	}

	return args;
}