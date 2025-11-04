export const command = {
    command: 'bug',
    onlyVip: true,
    onlyOwner: false,
    onlyPremium: false,
    onlyGroup: false,
    handle: async (bot, msg) => {
        if (global.devMode) msg.reply('Ini perintah bug')
    },
}
