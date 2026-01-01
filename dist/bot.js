import './global.js'
import {
    makeWASocket,
    delay,
    useMultiFileAuthState,
    fetchLatestBaileysVersion,
    isJidNewsletter,
    jidDecode,
    isPnUser,
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

import fetchJSON from './utils/fetchJSON.js'
import question from './utils/question.js'
import logger from './utils/logger.js'
import consoleClear from 'console-clear'

import nexttick from "./events/nexttick.js";

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
                `\x1b[35;1mNomor ini tidak memiliki akses untuk menggunakan script whatsapp bot ini\x1b[0m`
            )
            return process.exit()
        }

        const code = await bot.requestPairingCode(waNumber)
        logger.info(`\x1b[44;1m\x20PAIRING CODE\x20\x1b[0m\x20${code}`)
    }

    bot.ev.on('connection.update', async ({ connection, lastDisconnect }) => {
        if (connection === 'close') {
            logger.error(lastDisconnect.error)
            const { statusCode, error } = lastDisconnect.error.output.payload
            if (statusCode === 401 && error === 'Unauthorized' || statusCode === 403) {
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
                    `\x1b[35;1mNomor ini tidak memiliki akses untuk menggunakan script whatsapp bot ini\x1b[0m`
                )
                return process.exit()
            }

            logger.info('Berhasil terhubung ' + jidDecode(bot.user?.id)?.user)
        }
    })
    bot.ev.on('creds.update', session.saveCreds)
    bot.ev.on('messages.upsert', async (arg) => {
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
        msg.senderPn = isPnUser( msg.sender )
            ? msg.sender
            : msg.isGroup
            ? msg.key.participantAlt || (
                await bot.findParticipantFromGrup(msg.chat, msg.sender)
            )
            ?.phoneNumber || ''
            : '' // aku menyerah...
            
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
                : msg.type === 'documentMessage'
                ? msg.message.documentMessage?.caption
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
        msg.body ||= ''
        msg.text =
            msg.type == 'conversation'
                ? msg.message.conversation
                : msg.type === 'extendedTextMessage'
                ? msg.message.extendedTextMessage?.text
                : msg.type === 'imageMessage'
                ? msg.message.imageMessage?.caption
                : msg.type === 'videoMessage'
                ? msg.message.videoMessage?.caption
                : msg.type === 'documentMessage'
                ? msg.message.documentMessage?.caption
                : msg.type === 'listResponseMessage'
                ? msg.message?.listResponseMessage?.description
                : msg.type === 'buttonsResponseMessage'
                ? msg.message?.buttonsResponseMessage?.selectedDisplayText
                : msg.type === 'interactiveResponseMessage'
                ? msg.message.interactiveResponseMessage?.body?.text
                : ''
        msg.text ||= ''
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

        msg.reply = async (text, typing = true, ops) => {
            const jid = msg.chat
            
            await bot.presenceSubscribe(jid)
            await delay(500)
            
            if(typing) {
                await bot.sendPresenceUpdate('composing', jid)
                await delay(1000)
            
                await bot.sendPresenceUpdate('paused', jid)
            }
            
            const ret = !text ? null
             : await bot.sendMessage(
                jid,
                typeof text == 'string'?
                {
                    text,
                } : text,
                {
                	...ops,
                    quoted: msg,/*{
                        key: {
                            fromMe: true,
                            id: msg.id,
                            participant: msg.sender,
                            remoteJid: 'status@broadcast',
                        },
                        message: {
                            contactMessage: {
                                displayName: msg.pushName,
                                vcard: `BEGIN:VCARD\nVERSION:3.0\nFN:${msg.pushName}\nTEL;type=CELL;waid=${msg.senderPn.split('@')[0]}:${msg.senderPn.split('@')[0]}\nEND:VCARD`
                            },
                            //conversation: `💬 ${msg.text}`,
                        },
                    },*/
                    ...ops
                }
            )
            return ret
        }
        msg.sendThum = async (title, text, thumbnailUrl, sourceUrl, AdAttribution=true, LargerThumbnail=true) => {
            return await msg.reply ({
	            contextInfo: {
					externalAdReply: {
						title: title,
						body: null,
						mediaType: 1,
						previewType: 0,
						showAdAttribution: AdAttribution,
						renderLargerThumbnail: LargerThumbnail,
						thumbnailUrl: thumbnailUrl,
						sourceUrl: sourceUrl
					},
				},
				text
            }, true, { backgroundColor: '', ephemeralExpiration: 86400 })
        }

        if (global.devMode) logger.info(msg)

        return nexttick(bot, msg)
    })
   // if (global.devMode)
   const say_gp_udt = {
   	add: "Selamat Datang! @users\nPatuhi peraturan ya",
   	remove: "Selamat Tinggal @users\nKami akan merindukanmu"
   }
	bot.ev.on('group-participants.update', async ({ id, author, participants, action }) => {
		if (!say_gp_udt[action])
			return
		try {
			const group = await bot.groupMetadata(id)
			const pp = await bot.profilePictureUrl(id, 'image')
			
			let users = participants.length > 1? ' ':''
			for (const {id, phoneNumber, admin} of participants) {
				users += users? '\n- ':''
				users += ' @'+jidDecode(id)?.user
			}
			await bot.sendPresenceUpdate('composing', id)
			await delay(1000)
			await bot.sendPresenceUpdate('paused', id)
			bot.sendMessage(id, {
				contextInfo: {
					externalAdReply: {
						title: group.subject,
						body: null,
						mediaType: 1,
						previewType: 0,
						showAdAttribution: false,
						renderLargerThumbnail: true,
						thumbnailUrl: pp || global.bot.thumb,
						sourceUrl: global.bot.adsUrl
					},
				},
				text: say_gp_udt[action].replace('@users', users),
				mentions: participants.map((x) => x.id)
			})
		} catch(e) {
			logger.warn(e)
			bot.sendMessage(id, say_gp_udt[action].replace('@users', participants.map((x) => '@'+x.phoneNumber.replace(/@.+/,'')).join() ))
		}
	})
    
    bot.findParticipantFromGrup = async (grup, lid) => (await bot.groupMetadata(grup))
        .participants.find(
            participant => participant.id === lid
        )
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
