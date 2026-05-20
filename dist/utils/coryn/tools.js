import axios from "axios";
import * as cheerio from 'cheerio';
import search_item from "./search.js";
import logger from '../logger.js'

///////-Tools Coryn-///////

async function leveling(m,cmd) {
  try {
    cmd = cmd.map(a=>parseInt(a)).filter(a=>!isNaN(a))
    const lvl = cmd[0]||150;
    const gap = cmd[1]|| 9 ;
    const XPG = cmd[2]||150;
    const response = await axios.get(`https://coryn.club/leveling.php?lv=${lvl}&gap=${gap}&bonusEXP=${XPG}`)
    if (global.devMode) console.log(`Status Code: ${response.status}`);
    
    const $ = cheerio.load(response.data)
      let ilfp = $('.level-group')
      let reply = `╭─「 *List Leveling* 」
│ • Level: ${lvl}
│ • Rentang: ${lvl - gap} <-> ${lvl + gap} (±${gap})
│ • XP Gain: +${XPG}%
╰────\n`;
      ilfp.each((i,o) => {
        o = $(o)
        reply += `\n*${o.find('h2').text().trim().toUpperCase()}*\n\n`
        o.find('.level-entry').each((i,o) => {
          if(i>=5) return; //max yg ditampilkan 5
          o = $(o)
          reply += '> '+
          o.find('.level-entry-level').text().trim()+'\n'+
          o.find('.level-entry-main p:first').text().trim()+' ('+
          o.find('.level-entry-main p:last').text().trim()+')\n'
          o.find('.level-entry-exp p').each((i,o) => {
              reply += '- '+$(o).text().trim()+'\n'
          })
          reply += '\n'
          
        })
      })
      reply += '\n_sumber: coryn.club_'
      return m.reply(reply)
  } catch({code,status}) {
    if (global.devMode) console.error(`Status: ${status}/${code}`);
    return m.reply(`Status: ${status}/${code}`);
  }
}

async function search(m, parsed) {
    try {
        const time_start = Date.now();
        const name = parsed.name || '';
        // Konversi filter dari CommandParser ke format search_item
        const stats = parsed.filters.map(filter => ({
            type: filter.stat_id,
            operator: filter.operator,
            value: filter.value,
            
            // untuk standar baru
            isPercent: filter.isPercent
        }));
        
        const results = await search_item(name, stats);
        const show = parsed.limit || 20;
        const page = (parsed.page || 1) - 1; // ubah ke 0-index
        
        const replyText = search_item.formatItems(results, { show, page, ...parsed.sort });
        
        const reply = `╔═══ 「 *Search Items* 」
╠════════════❍
║⧐ 📈 Waktu proses : ${Date.now() - time_start} ms
║⧐ ✅ Ditemukan : ${results.length} item
║⧐ 👁️ Ditampilkan : ${Math.min(Math.max(results.length - (show * page), 0), show)} item
║⧐ 📄 Halaman ke : ${page+1} dari ${Math.ceil(results.length / show)}
╚════════════════\n\n${replyText}`;
        return m.reply(reply);
    } catch (err) {
        logger.warn(err);
        return m.reply(err.message);
    }
}

export default {
	leveling,
	search//(m,arg){return m.reply('Fitur ini sedang dalam proses perawatan.')}
};