import fs from 'fs'
import path from 'path'

const pkg = JSON.parse(fs.readFileSync(path.resolve(process.cwd(), 'package.json'), 'utf-8'))
const repoAssets = "https://raw.githubusercontent.com/restufauzi697/wabase-toram/refs/heads/main/assets"
	// "https://raw.githubusercontent.com/restufauzi697/wabase-toram/7ad88cf9b40d8e4bfc900cc3a753699f0dd03775/assets"

global.devMode = process.argv.some(arg => arg.includes('-d') || arg.includes('--dev'))

global.bot = {
    name: 'RobzBot',
    number: '',
    version: pkg['version'],
    prefix: '.',
    splitArgs: ',',
    locale: 'id',
    timezone: 'Asia/Jakarta',
    adsUrl: 'http://robz.bot/',
    get thumb() { return `${repoAssets}/toram/texture/toram-${Math.floor(Math.random()*8)}.jpg`},
    icon: `${repoAssets}/toram/texture/rf_acme.jpg`,
    banner: `${repoAssets}/toram/texture/yuki.jpg`,
    newsletterJid: '',
    commands: [],
    isVip: true,
}

global.owner = {
    name: 'RobzBot',
    number: '',
}

global.database = {
    user: JSON.parse(
        fs.readFileSync(path.resolve(process.cwd(), 'database', 'user.json'), 'utf-8')
    ),
    premium: JSON.parse(
        fs.readFileSync(path.resolve(process.cwd(), 'database', 'premium.json'), 'utf-8')
    ),
    group: JSON.parse(
        fs.readFileSync(path.resolve(process.cwd(), 'database', 'group.json'), 'utf-8')
    ),
    toram: JSON.parse(
        fs.readFileSync(path.resolve(process.cwd(), 'database', 'toram.json'), 'utf-8')
    ),
    save: async function (dbName) {
        fs.writeFileSync(
            `./database/${dbName.toLowerCase()}.json`,
            JSON.stringify(global.database[dbName.toLowerCase()])
        )
        return global.database[dbName.toLowerCase()]
    },
}

global.setting = JSON.parse(fs.readFileSync(path.resolve(process.cwd(), 'setting.json'), 'utf-8'))
global.saveSetting = () => {
    fs.writeFileSync(path.resolve(process.cwd(), 'setting.json'), JSON.stringify(global.setting))
    return global.setting
}
