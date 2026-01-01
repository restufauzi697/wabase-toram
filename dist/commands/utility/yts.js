import yts from 'yt-search'

export const command = {
	command: 'yts',
	onlyOwner: false,
	onlyGroup: false,
	tag: 'Utilitas',
	description: 'Pencarian Youtube',
	help: 'usage: .yts <query>',
	handle: async (bot, m) => {
		const q = m.text.replace(/^\S*\b/g, '')
		if( !q )
			return m.reply(this.help.replace('usage:','gunakan:'))
		
		await m.reply({ react: { text: '🔍', key: m.key } }, false)
		try {
			const r = await yts( q )
			
			if (!r.videos?.length)
				await m.reply('Hasil tidak ditemukan.')
			else {
				const thumb = r.videos[0].thumbnail || global.bot.thumb
				const adsUrl = r.videos[0].url || global.bot.adsUrl
				const videos = r.videos.slice( 0, 5 )
				const result = videos.map( ( { views, title, timestamp, author, url } ) => {
					views = String( views ).padStart( 10, ' ' )
					return `${ views } views | ${ title } (${ timestamp }) | by ${ author.name } 🎵`
					+'\nLink: '+url
				}).join('\n───────❍\n')
				
				await m.sendThum(global.bot.name, `Hasil pencarian Youtube: \n\n${result}`, thumb, adsUrl, false, false);
			}
		} catch ({code,status}) {
			if (global.devMode) console.error(`Status: ${status}/${code}`);
			await m.reply(`Status: ${status}/${code}`);
		}
		await m.reply({ react: { text: '', key: m.key } }, false)
	},
}
