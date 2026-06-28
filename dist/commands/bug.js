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
		const m = msg
	private_:{ break private_;
		const jid = m.chat
		const msg = await bot.sendMessage(jid, { text: 'ㅤ' })
		await bot.sendMessage(jid, { delete: msg.key })
	}

		const monster = /@fetch.monster:(N|M|B)/.exec(m.text)
		if (monster) {
			await m.reply({ react: { text: '⏳', key: m.key } }, false)
			try {
				const result = await fetchAllDB(monster[1])
				fs.writeFileSync(
					`./database/monster-${monster[1]}.json`,
					JSON.stringify(result, null, 2)
				)
			} catch (e) {
				await m.reply(`Error: ${'0/:0'}`)
			}
			await m.reply({ react: { text: '', key: m.key } }, false)
		}

		if (/@test.thumb/.exec(m.text))
		try {
			const pesan = await m.sendThum2(global.bot.name, '^_^)//', 'TEST 🌱', global.bot.thumb)
			logger.info( pesan, 'sendThumb' )
		} catch(err) {
			logger.error(err, 'sendThumb')
		}

		if (!!global.devMode)
			return
		
		logger.info(msg)
		if (!msg.isGroup)
			return console.log('=====0=====')
		
		const groupMetadata = await bot.groupMetadata(msg.chat);
		logger.info(groupMetadata)
		
		if (groupMetadata.linkedParent) {
			const parentGroupMetadata = await bot.groupMetadata(msg.chat);
			logger.info(parentGroupMetadata)
		}
	},
}

// N: Normal
// M: Mini boss
// B: Boss
const VALID_TYPE = ['N', 'M', 'B']
const BASE_API = 'https://coryn.club/api/v1/monsters.php';
const LIMIT = 100;
const DELAY_MS = 3000;

async function fetchAllDB(type) {
	let offset = 0;
	let total = Infinity;
	const allData = [];
	let batchCount = 0;

	while (offset < total) {
		const url = `${BASE_API}?type=${type}&limit=${LIMIT}&offset=${offset}`;
		
		try {
			const res = await fetch(url);
			const response = await res.json();

			if (!response.success) {
				throw new Error(`Request failed: ${JSON.stringify(response)}`);
			}

			// ambil total cuma di request pertama
			if (total === Infinity) {
				total = response.meta.total;
			}

			// sepertinya data sudah sabis
			if (!response.data?.length)
				break

			allData.push(...response.data);
			offset += response.data?.length;
			batchCount++;

			console.log(`Fetched ${allData.length}/${total} data`);

			// kasih delay 3 detik tiap 100 data, kecuali batch terakhir
			if (allData.length < total) {
				await new Promise(r => setTimeout(r, DELAY_MS));
			}

		} catch (err) {
			console.error('Error fetching:', err);
			throw err;
		}
	}

	return {
		success: true,
		data: allData,
		meta: { total: allData.length }
	};
}

// Cara pakai:
// const result = await fetchAllDB('N'); // N, M, atau B
// console.log(result.data);