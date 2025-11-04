export const command = {
    command: 'menu',
    onlyVip: false,
    onlyOwner: false,
    onlyPremium: false,
    onlyGroup: false,
    handle: async (bot, m) => {
    	const A = 
        m.reply(`*ALL MENU*
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
`);
    },
}
