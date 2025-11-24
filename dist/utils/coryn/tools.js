import axios from "axios";
import * as cheerio from 'cheerio';

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
      let ilfp = $('.item-leveling')
      let reply = `╭─「 *List Leveling* 」
│ • Level: ${lvl}
│ • Rentang: ${lvl - gap} <-> ${lvl + gap} (±${gap})
│ • XP Gain: +${XPG}%
╰────\n`;
      ilfp.each((i,o) => {
        o = $(o)
        reply += `\n*${o.find('h3').text().trim().toUpperCase()}*\n\n`
        o.find('.level-row').each((i,o) => {
          if(i>=5) return; //max yg ditampilkan 5
          o = $(o)
          reply += '> '+
          o.find('.level-col-1').text().trim()+'\n'+
          o.find('.level-col-2 p:first').text().trim()+' ('+
          o.find('.level-col-2 p:last').text().trim()+')\n'+
          o.find('.level-col-3 p:last').text().trim()+'\n\n'
        })
      })
      reply += '\n_sumber: coryn.club_'
      return m.reply(reply)
  } catch({code,status}) {
    if (global.devMode) console.error(`Status: ${status}/${code}`);
    return m.reply(`Status: ${status}/${code}`);
  }
}

export default {
	leveling,
	async search(m) {
		await m.reply('Fitur sedang dalam perbaikan!')
	}
};