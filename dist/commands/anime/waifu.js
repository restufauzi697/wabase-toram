import path from 'path';
import { jidDecode } from 'baileys';
import logger from '../../utils/logger.js';

export const command = {
	index: 1,
	command: 'waifu',
	onlyOwner: false,
	onlyPremium: false,
	onlyGroup: false,
	tag: '02Anime',
	description: 'waifu siapa ini?.',
	get help() {
		return 'usage: `.waifu`'
	},
	handle: async (bot, m) => {
		const tag = m.arguments[0]?.toLowerCase()
		
		await m.reply({ react: { text: '⏳', key: m.key } }, false)
		
		var reply
		try {
			const img = await getRandomImage({ gacha: [40, 58, 2], nsfw: false })
			if(!img)
				throw new Error('gagal mendapatkan img waifu!')
			reply = {
				image: { url: img.url}
			}
			//if (img.artist) img.caption = img.artist
		} catch (err) {
			logger.warn(err),
			reply = {
				image: { url: 'https://pic.re/image'},
				caption: 'anime™'
			}
		}
		await m.reply({ react: { text: '🏷️', key: m.key } }, false)
		try {
			await m.reply( reply, true, { quoted: bot.quoteContact(m) })
		} catch(e) {
			await m.reply(_rep[Math.floor(Math.random()*_rep.length)]||'')
		}
		await m.reply({ react: { text: '', key: m.key } }, false)
	},
}

import axios from 'axios';

// Cache biar nggak fetch terus
let nekosiaTags = null;
let waifuTags = null;

async function getAvailableTags(api) {
  try {
    if (api === 'nekosia' &&!nekosiaTags) {
      const res = await axios.get('https://api.nekosia.cat/api/v1/tags');
      nekosiaTags = res.data.tags;
    }
    if (api === 'waifu' &&!waifuTags) {
      const res = await axios.get('https://api.waifu.im/tags');
      waifuTags = res.data.items.map(a=>a.slug);
    }
  } catch (e) {
    console.error('Gagal fetch tags:', e.message);
  }

  if (api === 'nekosia') return nekosiaTags || ['maid', 'school', 'swimsuit'];
  if (api === 'waifu') return waifuTags || ['waifu', 'maid', 'oppai'];
  if (api === 'picre') return ['waifu', 'neko', 'shinobu', 'uniform', 'maid']; // pic.re fix list
}

// Function utama, sekarang auto random tags
async function getRandomImage({ gacha = [40, 50, 10], tags = [], nsfw = false } = {}) {
  // 1. Gacha API
  const rand = Math.random() * 100;
  let api = 'waifu';
  if (rand < gacha[0]) api = 'nekosia';
  else if (rand < gacha[0] + gacha[1]) api = 'waifu';
  else api = 'picre';

  // 2. Kalo tags kosong → ambil random 1-2 tags dari API tsb
  if (!tags.length) {
    const available = await getAvailableTags(api);
    const count = api === 'picre'? 1 : Math.floor(Math.random() * 2) + 1; // pic.re cuma 1
    tags = Array.from({length: count}, () => available[Math.floor(Math.random() * available.length)]);
  }

  // console.log(`[Gacha] API: ${api}, Tags: ${tags.join(', ')}`);

  try {
    if (api === 'nekosia') {
      const session = Date.now();
      const params = new URLSearchParams({
        session,
        id: Math.floor(Math.random() * 10000),
        rating: nsfw? 'suggestive,erotica' : 'safe',
        additionalTags: tags.join(',')
      });
      const res = await axios.get(`https://api.nekosia.cat/api/v1/images/random?${params}`);
      const data = res.data;
      return {
        url: data.image.compressed.url,
        tags: data.tags,
        dominant_color: data.colors?.main || null,
        artist: data.attribution?.copyright || null,
        rating: data.rating,
        source: 'nekosia.cat',
        used_tags: tags
      };
    }

    if (api === 'waifu') {
      const params = new URLSearchParams({
        included_tags: tags.join(','),
        height: '<=2000',
        is_nsfw: nsfw,
        many: false
      });
      const res = await axios.get(`https://api.waifu.im/images?${params}`);
      const data = res.data.items[0];
      return {
        url: data.url,
        tags: data.tags.map(t => t.name),
        dominant_color: data.dominantColor,
        artist: data.artists?.map(a => `Copyright ${data.uploadedAt.split('-')[0]} © by ${a.name}. All Rights Reserved.`).join('\n') || null,
        rating: nsfw? 'nsfw' : 'safe',
        source: 'waifu.im',
        used_tags: tags
      };
    }

    // pic.re
    const params = new URLSearchParams({
        'in': tags.join(',')
    });
    const url = `https://pic.re/image?${params}`;
    return {
      url,
      tags,
      dominant_color: null,
      artist: null,
      rating: 'unknown',
      source: 'pic.re',
      used_tags: tags
    };

  } catch (err) {
    console.error(`Error dari ${api}:`, err.message);
    if (api!== 'waifu') return getRandomImage({ gacha: [0, 100, 0], tags, nsfw });
    throw err;
  }
}