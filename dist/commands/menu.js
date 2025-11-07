export const command = {
    command: 'menu',
    onlyOwner: false,
    onlyPremium: false,
    onlyGroup: false,
    tag: '',
    description: 'Menampilkan semua perintah.',
    get help() {
        return 'usage: `.menu`'
    },
    handle: async (bot, m) => {
        !menu[1].length && _ ( );
        m.reply(`*ALL MENU*${menu[m.isGroup|0].join('\n')}`);
    },
}

const _ = ⁿ =>
	global.bot.commands
		 .filter(a => a.visible !== false)
		 .sort((a,b) => _.a(a.command, b.command) )
		 .sort((a,b) => _.a(a.tag, b.tag) )
		 .map(a => {
			if (ⁿ != a.tag) {
				if(`\n*${ⁿ}*` == menu[0].slice(-1)[0])
					menu[0].pop()
				
				menu[0].push(`\n*${a.tag}*`)
				menu[1].push(`\n*${a.tag}*`)
				
				ⁿ = a.tag
			}
			
			menu[1].push(`*.${a.command}* ${a.description}`)
			
			if (!a.onlyGroup)
				menu[0].push(`*.${a.command}* ${a.description}`)
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
