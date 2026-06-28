export class CommandParser {
    /**
     * @param {Dictionary} statDict - Instance Dictionary buat koreksi stat_id
     * @param {string[]} validCommands - List cmd yang valid
     */
    constructor(statDict, validCommands = ['search', 'eq', 'consume', 'xtall']) {
        this.statDict = statDict;
        this.validCommands = validCommands;
    }

    /**
     * Parse text command jadi object
     * @param {string} text - Input user
     * @returns {Object|null} Parsed info atau null kalau format salah
     */
    parse(text) {
        const trimmed = text.trim();
        if (!trimmed) return null;

        const tokens = trimmed.split(/\s+/);
        const cmd = tokens[0].toLowerCase();

        if (!this.validCommands.includes(cmd)) {
            throw new Error(`Command tidak dikenal: "${cmd}". Pakai: ${this.validCommands.join(', ')}`);
        }

        const result = {
            cmd,
            name: null,
            page: 1,
            limit: 10,
            sort: null,
            filters: []
        };

        let statsIndex = tokens.findIndex(t => t.toLowerCase() === 'stats');
        let endNameIndex = statsIndex === -1? tokens.length : statsIndex;

        const preStatsTokens = tokens.slice(1, endNameIndex);
        const nameTokens = preStatsTokens.join(' ')
        .replace(/\b((page)|(show|limit)|(sort))[\s:]((\d+)|([a-zA-Z_+-\s]+)[\s:](asc|desc))\b/gi, 
             (_,_param_, pageMatch, showMatch, sortMatch, _value_, valNum, valStat, valSort) => {
                if (pageMatch) {
                    result.page = parseInt(valNum, 10);
                } else if (showMatch) {
                    result.limit = parseInt(valNum, 10); // show masuk ke limit
                } else if (sortMatch) {
                    const rawSortField = valStat;
                    const sortLookup = this.statDict.search(rawSortField);
                    if (!sortLookup.match) {
                        const suggestion = sortLookup.suggestions[0];
                        const hint = suggestion? ` Mungkin maksudmu "${suggestion.istilah}"?` : '';
                        throw new Error(`Field sort "${rawSortField}" tidak dikenal.${hint}`);
                    }
                    result.sort = {
                        field: sortLookup.match,
                        raw_field: rawSortField,
                        order: valSort.toLowerCase()
                    };
                }
                return ''
            })
/*
        for (const token of preStatsTokens) {
            const [] = 
            const pageMatch = token.match(/^(page)\s*:\s*(\d+)$/i);
            const showMatch = token.match(/^(show|limit)\s*:\s*(\d+)$/i); // show ATAU limit
            const sortMatch = token.match(/^(sort)\s*:\s*([a-zA-Z_+-]+):(asc|desc)$/i);

            if (pageMatch) {
                result.page = parseInt(pageMatch[2], 10);
            } else if (showMatch) {
                result.limit = parseInt(showMatch[2], 10); // show masuk ke limit
            } else if (sortMatch) {
                const rawSortField = sortMatch[2];
                const sortLookup = this.statDict.search(rawSortField);
                if (!sortLookup.match) {
                    const suggestion = sortLookup.suggestions[0];
                    const hint = suggestion? ` Mungkin maksudmu "${suggestion.istilah}"?` : '';
                    throw new Error(`Field sort "${rawSortField}" tidak dikenal.${hint}`);
                }
                result.sort = {
                    field: sortLookup.match,
                    raw_field: rawSortField,
                    order: sortMatch[3].toLowerCase()
                };
            } else {
                nameTokens.push(token);
            }
        }
*/
        if (nameTokens.length > 0) {
            result.name = nameTokens.trim();//.join(' ');
        }

        if (statsIndex!== -1) {
            const statText = tokens.slice(statsIndex + 1).join(' ');
            const statRegex = /([a-zA-Z_+-\s]+)(\s*(>=|<=|>|<|=)\s*([\d.]+%?))?/g;
            let match;

            while ((match = statRegex.exec(statText))!== null) {
                const [, rawStatId,, operator='>', rawValue='-99999'] = match;
                const statLookup = this.statDict.search(rawStatId);
                if (!statLookup.match) {
                    const suggestion = statLookup.suggestions[0];
                    const hint = suggestion? ` Mungkin maksudmu "${suggestion.istilah}"?` : '';
                    throw new Error(`Stat "${rawStatId}" tidak dikenal.${hint}`);
                }

                const isPercent = rawValue.endsWith('%');
                const value = parseFloat(rawValue.replace('%', ''));

                result.filters.push({
                    stat_id: statLookup.match,
                    raw_stat: rawStatId,
                    operator,
                    value,
                    isPercent
                });
            }
        }

        return result;
    }
}