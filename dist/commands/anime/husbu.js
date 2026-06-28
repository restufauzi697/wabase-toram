import { delay } from 'baileys'
import path from 'path'
import logger from '../../utils/logger.js'

export const command = {
	command: 'husbu',
	tag: '02Anime',
	description: 'kimi wa kakkoii.. honto!!.',
	get help() {
		return 'usage:'
		+'\n`.husbu` random husbando.'
	},
	handle: async (bot, m) => {
		await m.reply({ react: { text: '⏳', key: m.key } }, false)
		
		var reply
		try {
			const img = await nekos.getRandom()
			if(!img)
				throw new Error('gagal mendapatkan img waifu!')
			reply = {
				image: { url: img.url}
			}
			if (img.artist) img.caption = img.artist
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

class NekosV4Cache {
  constructor({ cacheSize = 100, nsfw = false, tags = 'boy', exclude = 'girl,dick' } = {}) {
    this.cache = [];
    this.cacheSize = cacheSize;
    this.nsfw = nsfw;
    this.isFetching = false;
    this.tags = tags;
    this.exclude = exclude;
  }

  async fillCache() {
    if (this.isFetching) return;
    this.isFetching = true;

    try {
      const rating = this.nsfw? 'suggestive,nsfw' : 'safe';
      const params = new URLSearchParams({
        limit: this.cacheSize,
        rating: rating,
        tags: this.tags,
        without_tags: this.exclude
      });

      const res = await axios.get(`https://api.nekosapi.com/v4/images/random?${params}`);
      // v4 return: { data: [ {...}, {...} ] }
      this.cache = res.data.map(img => ({
        url: img.url,
        tags: img.tags,
        dominant_color: img.color_dominant || null,
        artist: img.artist_name || null,
        rating: img.rating,
        source_url: img.source_url,
        source: 'nekosapi.v4'
      }));

      console.log(`[NekosV4] Cache keisi: ${this.cache.length} gambar`);
    } catch (err) {
      console.error('[NekosV4] Gagal fetch cache:', err.message);
    } finally {
      this.isFetching = false;
    }
  }

  async getRandom() {
    // kalo cache abis / kosong, isi dulu
    if (this.cache.length === 0) {
      await this.fillCache();
      let i = 0
      while (this.isFetching && i++ < 5)
      	await delay(1000)
    }

    // ambil random dari cache, terus hapus biar ga kepake 2x
    const idx = Math.floor(Math.random() * this.cache.length);
    const img = this.cache.splice(idx, 1)[0];

    // kalo sisa 20, prefetch lagi di background biar ga nunggu
    if (this.cache.length <= 10 &&!this.isFetching) {
      this.fillCache();
    }

    return img;
  }

  remaining() {
    return this.cache.length;
  }
}

const nekos = new NekosV4Cache({ cacheSize: 50, nsfw: false });