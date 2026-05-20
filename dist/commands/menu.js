export const command = {
    command: 'menu',
    onlyOwner: false,
    onlyPremium: false,
    onlyGroup: false,
    visible: true,
    index: 0,
    tag: `Menu ${global.bot.name}`,
    description: 'Menampilkan semua perintah.',
    get help() {
        return 'usage: `.menu`'
    },
    handle: async (bot, m) => {
        !menu.length && menu.splice(0,0,..._ ( ));
        //m.sendThum(global.bot.name, `${menu[m.isGroup|0].join('\n')}\n╚════════════════❍`, global.bot.thumb, global.bot.adsUrl, false, true);
        //m.sendThum(global.bot.name, Menu, global.bot.thumb, global.bot.adsUrl, false, true);
        // await m.sendThum2(global.bot.name, 'Menu', Menu, global.bot.thumb, '', 'robz.bot/vid?q='+Date.now(), false, true, null)
        await m.sendThum2(global.bot.name, 'Menu', menu[m.isGroup|0], global.bot.thumb, '', 'robz.bot/vid?q='+Date.now(), false, true, null)
    },
}

const _=ⁿ=>
	global.bot.commands
		 .filter(a=>a.visible!==!1)
		 .sort((a,b)=>_.a(a.command,b.command))
		 .sort((a,b)=>_.a(a.index||0,b.index||0))
		 .sort((a,b)=>_.a(a.tag,b.tag))
		 .reduce((menu,a)=>(
			(menu[1][_]!=a.tag) && (
				menu[1].at(-1)==_.b||menu[1][_]&&menu[1].push(_.b),
				menu[1].push(`╔══${a.tag[0]==''?'『':'❨'} ${a.tag.replace(/?\d{2}?/,'')} ${a.tag[0]==''?'』':'❩'}`),
				menu[1][_]=a.tag
			),
			
			a.onlyGroup || (menu[0][_]!=a.tag) && (
				menu[0].at(-1)==_.b||menu[0][_]&&menu[0].push(_.b),
				menu[0].push(`╔══${a.tag[0]==''?'『':'❨'} ${a.tag.replace(/?\d{2}?/,'')} ${a.tag[0]==''?'』':'❩'}`),
				menu[0][_]=a.tag
			),

			menu[1].push(`║⧐ ${'.'+a.command}`),
			a.onlyGroup || menu[0].push(`║⧐.${a.command}`),
			menu
		 ), [[],[]])
		 .map(a=>a.push(_.b)&&a.join`\n`.trim())
	_.a=(a,b)=>a<b?-1:a>b?1:0
	_.b=`╚════════════════❍\n`
const menu = []


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
║⧐ .add
║⧐ .kick
║⧐ .promote
║⧐ .demote
║⧐ .tags
║⧐ .setwelcome
║⧐ .setgoodbye
╚════════════════❍

╔══❨ Ensiklopedia ❩
║⧐ .fakta
║⧐ .quotes
╚════════════════❍

╔══❨ Anime ❩
║⧐ .husbu
║⧐ .waifu
║⧐ .waifu-ai
║⧐ .waifu-random
╚════════════════❍

╔══❨ Game & Fun ❩
║⧐ .khodam
║⧐ .bomb
║⧐ .minesweeper
║⧐ .tebakgambar
║⧐ .tictactoe
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
║⧐ .dye
║⧐ .mq
║⧐ .trait
║⧐ .uptas
║⧐ .xtall
║⧐ .guide
║⧐ .toram
╚════════════════❍

╔══❨ Utilitas ❩
║⧐ .stiker 
║⧐ .yts
╚════════════════❍
`.trim()
