export const command = {
    command: 'restart',
    onlyVip: false,
    onlyOwner: true,
    onlyPremium: false,
    onlyGroup: false,
    handle: async (bot, msg) => {
        return msg.reply('Restarting...').then(() => {
            process.send?.('restart')
        })
    },
}
