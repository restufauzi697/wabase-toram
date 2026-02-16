export const command = {
    command: 'menu',
    onlyOwner: false,
    onlyPremium: false,
    onlyGroup: false,
    tag: `Menu ${global.bot.name}`,
    description: 'Menampilkan semua perintah.',
    get help() {
        return 'usage: `.menu`'
    },
    handle: async (bot, m) => {
        //!menu[1].length && _ ( );
        //m.sendThum(global.bot.name, `${menu[m.isGroup|0].join('\n')}\n╚════════════════❍`, global.bot.thumb, global.bot.adsUrl, false, true);
        m.sendThum(global.bot.name, Menu, global.bot.thumb, global.bot.adsUrl, false, true);
    },
}

const _ = ⁿ =>
	global.bot.commands
		 .filter(a => a.visible !== false)
		 .sort((a,b) => _.a(a.command, b.command) )
		 .sort((a,b) => _.a(a.tag, b.tag) )
		 .map(a => {
			if (ⁿ != a.tag) {
				if(`\n╔══ 「 ${ⁿ} 」` == menu[0].slice(-1)[0])
					menu[0].pop()
				
				menu[0].push(`╚════════════════❍\n`)
				menu[1].push(`╚════════════════❍\n`)
				menu[0].push(`\n╔══ 「 ${a.tag} 」`)
				menu[1].push(`\n╔══ 「 ${a.tag} 」`)
				
				ⁿ = a.tag
			}
			
			menu[1].push(`║⧐ .${a.command}`)
			
			if (!a.onlyGroup)
				menu[0].push(`║⧐ .${a.command}`)
		})
	_.a = (a,b) => a-b || -(a<b)|(a>b)
const menu = [[],[]]



template =>
`*ALL MENU*
${m.isGroup ? `
*Administratif*
*.menu* Menampilkan semua perintah
*.kick* Kick member group
*.tags* Hide tag
`:''}
*_Toram Online_*
*.toram* Menu interaktif seputar Toram Online
*.coryn* Tools untuk player Toram Online

*_Tools_*
*.ocr* Membaca gambar menjadi text

*_Informasi_*
*.info*  informasi bot dan lainnya.
*.info-gempa* informasi gempa terbaru dari BMKG
`;


const Menu = `
╔══『 Menu RobzBot 』
║⧐ ⸨ .help ⸩
║⧐ ⸨ .menu ⸩
╚════════════════❍

╔══❨ Administratif ❩
║⧐ .kick
║⧐ .tags
║⧐ .setwelcome
║⧐ .setgoodbye
╚════════════════❍

╔══❨ Anime ❩
║⧐ .husbu
║⧐ .waifu
║⧐ .waifu-ai
║⧐ .waifu-random
╚════════════════❍

╔══❨ Game & Fun ❩
║⧐ .khodam
╚════════════════❍

╔══❨ Informasi ❩
║⧐ .bmkg
║⧐ .inf-gempa
╚════════════════❍

╔══❨ Toram Market ❩
║⧐ .sell
║⧐ .buy
╚════════════════❍

╔══❨ Toram Online ❩
║⧐ .buff
║⧐ .addbuff
║⧐ .deletebuff
║⧐ .coryn
║⧐ .xtall
║⧐ .trait
║⧐ .guide
║⧐ .toram
╚════════════════❍

╔══❨ Utilitas ❩
║⧐ .ytd
║⧐ .ytm
║⧐ .ytv
║⧐ .yts
╚════════════════❍
`.trim()
