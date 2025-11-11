import fs from 'fs'
import path from 'path'

export const command = {
	command: 'toram',
	onlyOwner: false,
	onlyPremium: false,
	onlyGroup: false,
	visible: false,
	tag: '_Toram Online_',
	description: 'Guide dan info Toram Online.',
	get help() {
		return `usage: .toram <info> [arg...]
<info>:
- addbuff <stat> <kode> <lvl>
- buff
- guide <nama|nomor>
- leveling_list
- list [page]

contoh:
.toram guide cara mancing
.toram guide 5`
	},
	handle: async (bot, m) => {
		const info = m.arguments[0]
		return
		if (!info)
			return await welcome(m)
	},
}

const assets = path.resolve(process.cwd(), 'assets', 'toram')
const _ = {
	random: () => Math.floor(Math.random()*_.tips.length),
	tips: JSON.parse(fs.readFileSync(path.join(assets,"guide/tips.list"))),
	thumb: JSON.parse(fs.readFileSync(path.join(assets,"guide/tips.img.list"))),
}

async function welcome(m) {
	const id = _.random()
	const text = 
`
${_.tips[id]}

Panduan untuk player toram online.
Gunakan: ${command.help.replace('usage:','')}
`.trim()
	await m.sendThum("Toram Online", text, _.thumb[id], 'https://id.toram.jp/', false, true)
}
