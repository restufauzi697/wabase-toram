import fs from 'fs'
import path from 'path'

const pkg = JSON.parse(fs.readFileSync(path.resolve(process.cwd(), 'package.json'), 'utf-8'))

global.devMode = process.argv.some(arg => arg.includes('-d') || arg.includes('--dev'))

global.bot = {
    name: 'robzbot',
    number: '',
    version: pkg['version'],
    prefix: '.',
    splitArgs: ',',
    locale: 'id',
    timezone: 'Asia/Jakarta',
    adsUrl: 'https://youtube.com/@bayumahadika',
    newsletterJid: '',
    commands: [],
    isVip: true,
}

global.owner = {
    name: 'robzbot',
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
