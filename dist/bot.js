import './global.js'
import {
    makeWASocket,
    useMultiFileAuthState,
    fetchLatestBaileysVersion,
    isJidNewsletter,
    jidDecode,
    getContentType,
    jidNormalizedUser,
    isJidGroup,
    isJidStatusBroadcast,
} from 'baileys'
import pino from 'pino'
import path from 'path'
import fs from 'fs'
import { pathToFileURL } from 'url'
import NodeCache from 'node-cache'

import fetchJSONFromGithubRaw from './utils/fetchJSONFromGithubRaw.js'
import question from './utils/question.js'
import logger from './utils/logger.js'
import consoleClear from 'console-clear'

async function start() {
    const session = await useMultiFileAuthState('session')
    const { version } = await fetchLatestBaileysVersion()

    const bot = makeWASocket({
        version,
        auth: session.state,
        logger: global.devMode ? logger : pino({ level: 'silent' }).child({ level: 'silent' }),
        shouldIgnoreJid: jid => isJidNewsletter(jid),
        msgRetryCounterCache: new NodeCache(),
        cachedGroupMetadata: async jid => await new NodeCache().get(jid),
        defaultQueryTimeoutMs: undefined,
        generateHighQualityLinkPreview: true,
    })

    if (!bot.user && !bot.authState.creds.registered) {
        await new Promise(resolve => resolve(consoleClear()))
        const waNumber = (await question('Masukkan nomor WhatsApp anda: +')).replace(/\/D/g, '')

        /// VALIDASI WA Number
        if (global.bot.number && global.bot.number !== waNumber) {
            logger.error(
                `\x1b[35;1mNomor ini tidak memiliki akses untuk menggunakan script whatsapp bot ini\x1b[0m\n-> SILAHKAN MEMESAN SCRIPT INI KE ${global.owner.name} WA ${global.owner.number}`
            )
            return process.exit()
        }

        if (global.rawJSONNumbersGithubURL) {
            const numbers = await fetchJSONFromGithubRaw(global.rawJSONNumbersGithubURL)
            if (!numbers.some(number => number == waNumber)) {
                logger.error(
                    `\x1b[35;1mNomor ini tidak memiliki akses untuk menggunakan script whatsapp bot ini\x1b[0m\n-> SILAHKAN MEMESAN SCRIPT INI KE ${global.owner.name} WA ${global.owner.number}`
                )
                return process.exit()
            }
        }

        const code = await bot.requestPairingCode(waNumber)
        logger.info(`\x1b[44;1m\x20PAIRING CODE\x20\x1b[0m\x20${code}`)
    }

    bot.ev.on('connection.update', async ({ connection, lastDisconnect }) => {
        if (connection === 'close') {
            logger.error(lastDisconnect.error)
            const { statusCode, error } = lastDisconnect.error.output.payload
            if (statusCode === 401 && error === 'Unauthorized') {
                await fs.promises.rm('session', {
                    recursive: true,
                    force: true,
                })
            }
            return start()
        }
        if (connection === 'open') {
            /// VALIDASI WA Number
            if (global.bot.number && global.bot.number !== jidDecode(bot.user?.id)?.user) {
                logger.error(
                    `\x1b[35;1mNomor ini tidak memiliki akses untuk menggunakan script whatsapp bot ini\x1b[0m\n-> SILAHKAN MEMESAN SCRIPT INI KE ${global.owner.name} WA ${global.owner.number}`
                )
                return process.exit()
            }

            if (global.rawJSONNumbersGithubURL) {
                const numbers = await fetchJSONFromGithubRaw(global.rawJSONNumbersGithubURL)
                const nuser = jidDecode(bot.user?.id)?.user
                if (!numbers.some(number => number == nuser)) {
                    logger.error(
                        `\x1b[35;1mNomor ini tidak memiliki akses untuk menggunakan script whatsapp bot ini\x1b[0m\n-> SILAHKAN MEMESAN SCRIPT INI KE ${global.owner.name} WA ${global.owner.number}`
                    )
                    return process.exit()
                }
            }

            if (global.rawJSONVipsGithubURL) {
                const vips = await fetchJSONFromGithubRaw(global.rawJSONVipsGithubURL)
                global.bot.isVip = vips.some(num => num === jidDecode(bot.user?.id)?.user)
            }

            logger.info('Berhasil terhubung ' + jidDecode(bot.user?.id)?.user)
        }
    })
    bot.ev.on('creds.update', session.saveCreds)
    bot.ev.on('messages.upsert', arg => {
        const msg = arg.messages[0]
        if (!msg?.message) return
        msg.id = msg.key.id
        msg.chat = msg.key.remoteJid
        msg.isGroup = isJidGroup(msg.chat)
        msg.isStory = isJidStatusBroadcast(msg.chat)
        msg.isNewsletter = isJidNewsletter(msg.chat)
        msg.fromMe = msg.key.fromMe
        msg.sender =
            msg.isGroup || msg.isStory
                ? msg.key.participant || jidNormalizedUser(msg.participant)
                : msg.chat
        msg.isOwner = jidDecode(msg.sender)?.user === global.owner.number
        msg.isPremium = !!global.database.premium.find(prem => prem == jidDecode(msg.sender)?.user)
        msg.type = getContentType(msg.message)
        msg.body =
            msg.type == 'conversation'
                ? msg.message.conversation
                : msg.type === 'extendedTextMessage'
                ? msg.message.extendedTextMessage?.text
                : msg.type === 'imageMessage'
                ? msg.message.imageMessage?.caption
                : msg.type === 'videoMessage'
                ? msg.message.videoMessage?.caption
                : msg.type === 'listResponseMessage'
                ? msg.message?.listResponseMessage?.singleSelectReply?.selectedRowId
                : msg.type === 'buttonsResponseMessage'
                ? msg.message?.buttonsResponseMessage?.selectedButtonId
                : msg.type === 'interactiveResponseMessage'
                ? msg.message.interactiveResponseMessage?.nativeFlowResponseMessage?.paramsJson
                    ? JSON.parse(
                          msg.message.interactiveResponseMessage.nativeFlowResponseMessage
                              .paramsJson
                      ).id
                    : ''
                : ''
        msg.text =
            msg.type == 'conversation'
                ? msg.message.conversation
                : msg.type === 'extendedTextMessage'
                ? msg.message.extendedTextMessage?.text
                : msg.type === 'imageMessage'
                ? msg.message.imageMessage?.caption
                : msg.type === 'videoMessage'
                ? msg.message.videoMessage?.caption
                : msg.type === 'listResponseMessage'
                ? msg.message?.listResponseMessage?.description
                : msg.type === 'buttonsResponseMessage'
                ? msg.message?.buttonsResponseMessage?.selectedDisplayText
                : msg.type === 'interactiveResponseMessage'
                ? msg.message.interactiveResponseMessage?.body?.text
                : ''
        msg.isCommand = msg.body.trim().startsWith(global.bot.prefix)
        msg.command = msg.body
            .trim()
            .split(' ')[0]
            .normalize('NFKC')
            .replace(global.bot.prefix, '')
            .toLowerCase()
        msg.arguments = msg.body
            .trim()
            .normalize('NFKC')
            .replace(/^\S*\b/g, '')
            .split(global.bot.splitArgs)
            .map(arg => arg.trim())
            .filter(arg => arg)

        msg.isQuote = !!(
            msg.message?.extendedTextMessage?.contextInfo?.quotedMessage ||
            msg.message?.imageMessage?.contextInfo?.quotedMessage ||
            msg.message?.videoMessage?.contextInfo?.quotedMessage
        )
        msg.quote =
            msg.message?.extendedTextMessage?.contextInfo?.quotedMessage ||
            msg.message?.imageMessage?.contextInfo?.quotedMessage ||
            msg.message?.videoMessage?.contextInfo?.quotedMessage

        msg.reply = text =>
            bot.sendMessage(
                msg.chat,
                {
                    text,
                },
                {
                    quoted: {
                        key: {
                            fromMe: true,
                            id: msg.id,
                            participant: msg.sender,
                            remoteJid: 'status@broadcast',
                        },
                        message: {
                            conversation: `💬 ${msg.text}`,
                        },
                    },
                }
            )

        if (global.devMode) logger.info(msg)

        const command = global.bot.commands.find(c => c.command === msg.command)
        if (command) {
            if (command.onlyVip && !global.bot.isVip)
                return msg.reply('Perintah ini hanya bisa digunakan oleh bot vip!')
            if (command.onlyOwner && !msg.isOwner && !msg.fromMe)
                return msg.reply('Perintah ini hanya bisa digunakan oleh owner!')
            if (command.onlyPremium && !msg.isPremium && !msg.isOwner && !msg.fromMe)
                return msg.reply('Perintah ini hanya bisa digunakan oleh user premium!')
            if (command.onlyGroup && !msg.isGroup)
                return msg.reply('Perintah ini hanya bisa digunakan didalam group!')
            return command.handle(bot, msg)
        }
    })
}

;(async () => {
    const dircommands = path.resolve(process.cwd(), 'dist', 'commands')
    const files = fs
        .readdirSync(dircommands, { recursive: true })
        .filter(file => file.endsWith('.js'))

    for (let file of files) {
        const filePath = path.join(dircommands, file)
        const fileUrl = pathToFileURL(filePath).href
        const commandModule = (await import(fileUrl))?.command
        if (
            commandModule?.command &&
            !global.bot.commands.some(cmd => cmd.command === commandModule.command)
        )
            global.bot.commands.push(commandModule)
    }
})()
    .then(start)
    .catch(console.error)
