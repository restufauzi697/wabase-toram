import exec from "../../utils/coryn/tools.js";
import logger from '../../utils/logger.js';
import Dictionary from '../../lib/Dictionary.js';
import { DICT_EQUIP_STAT } from '../../lib/Constants.js';
import { CommandParser } from '../../lib/utils/CommandParser.js';

const statDict = new Dictionary(DICT_EQUIP_STAT, {
    threshold: 0.7,
    autoMatchScore: 0.85,
    maxSuggestions: 3
});

const commandParser = new CommandParser(statDict, ['search', 'equip']);

const toolAlias = {
    leveling: ['leveling', 'lvl', 'level', 'lv', 'lvling'],
    crysta: ['crysta', 'xtall', 'crystal'],
    equip: ['equip', 'eq'],
    search: ['search', 'cri', 'fnd', 'cari', 'find', 'temukan']
};

const aliasMap = Object.fromEntries(
    Object.entries(toolAlias).flatMap(([tool, aliases]) =>
        aliases.map(a => [a.toLowerCase(), tool])
    )
);

const getTool = input => aliasMap[input.toLowerCase()] || null;

export const command = {
    command: 'coryn',
    tag: 'Toram Online',
    description: 'Tools untuk player Toram Online.',
    get help() {
        return `usage: .coryn <tool> argument...
tools:
- leveling <level> [gap] [XPGain]
- search [nama] [page <halaman>] [limit <number>] [sort <stat>:<asc|desc>] [stats <stat> <operator> <value> ...]

contoh:
.coryn leveling 76 9
.coryn search sword show 5 page 2 stats atk > 100`;
    },
    handle: async (bot, m) => {
        const raw = String(m.arguments[0] || '').trim();
        if (!raw) return m.reply(command.help);
        
        const parts = raw.split(/\s+/);
        const toolName = parts[0].toLowerCase();
        const tool = getTool(toolName);
        
        if (!tool) return m.reply(`Tool tidak dikenal. Gunakan: ${Object.keys(toolAlias).join(', ')}`);
        
        const args = parts.slice(1);
        
        await m.reply({ react: { text: '⏳', key: m.key } }, false);
        try {
            if (/search|equip/.test(tool)) {
                const parsed = commandParser.parse(`${tool} ${args.join(' ')}`);
                if (!parsed) {
                    return m.reply('Format search salah. Contoh: .coryn search sword stats atk > 100 show 5 page 2');
                }
                await exec.search(m, parsed);
            } else if (tool === 'leveling') {
                await exec.leveling(m, args);
            } else {
                // untuk crysta, equip nanti
                await m.reply(`Tool ${tool} belum diimplementasikan.`);
            }
        } catch(e) {
            logger.error(e);
            await m.reply(`Error: ${e.message}`);
        }
        await m.reply({ react: { text: '', key: m.key } }, false);
    }
};