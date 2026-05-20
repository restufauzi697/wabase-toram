import { delay, jidNormalizedUser, prepareWAMessageMedia, generateWAMessageFromContent, proto } from 'baileys'
import logger from '../utils/logger.js'
import sharp from 'sharp'
import fs from 'fs'

export const command = {
	command: 'bug',
	onlyOwner: false,
	onlyPremium: false,
	onlyGroup: false,
	visible: false,
	handle: async (bot, msg) => {
		
	},
}