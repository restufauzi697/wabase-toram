export {DICT_STAT_TORAM, DICT_EQUIP_STAT} from './Constants.js'
export class Dictionary {
    /**
     * @param {Object} dictionary - Map key_id -> [list istilah]
     * @param {Object} options
     * @param {number} options.threshold - Skor kemiripan 0-1. Default 0.6
     * @param {number} options.autoMatchScore - Skor minimal buat auto match. Default 0.9
     * @param {number} options.maxSuggestions - Jumlah saran maksimal. Default 5
     * @param {RegExp|string} options.separator - Pemisah untuk multi search. Default /[\s,;]+/
     * @param {boolean} options.strictMode - Throw error kalau ada token ga match. Default false
     */
    constructor(dictionary, options = {}) {
        this.dictionary = dictionary;
        this.threshold = options.threshold ?? 0.6;
        this.autoMatchScore = options.autoMatchScore ?? 0.9;
        this.maxSuggestions = options.maxSuggestions ?? 5;
        this.separator = options.separator ?? /[\s,;]+/;
        this.strictMode = options.strictMode ?? false;

        const { exactIndex, fuzzyList } = this.#buildIndex();
        this.exactIndex = exactIndex;   // Map normalizedExact -> key_id
        this.fuzzyList = fuzzyList;     // Array of { fuzzyNorm, key_id }
    }

    #buildIndex() {
        const exactIndex = {};
        const fuzzyList = [];

        for (const [key_id, daftarIstilah] of Object.entries(this.dictionary)) {
            for (const istilah of daftarIstilah) {
                const exactNorm = this.#normalizeExact(istilah);
                if (!exactIndex[exactNorm]) {
                    exactIndex[exactNorm] = key_id;
                }

                const fuzzyNorm = this.#normalizeFuzzy(istilah);
                fuzzyList.push({ fuzzyNorm, key_id });
            }
        }

        return { exactIndex, fuzzyList };
    }

    /**
     * Normalisasi untuk exact match: lower case, trim, hapus karakter ilegal
     * (spasi dan minus dipertahankan karena membedakan alias)
     */
    #normalizeExact(str) {
        return str.toLowerCase().trim().replace(/[^a-z0-9+\s-_]/g, '');
    }

    /**
     * Normalisasi untuk fuzzy matching: hapus spasi & tanda baca, jadi "max hp" -> "maxhp"
     */
    #normalizeFuzzy(str) {
        return str.toLowerCase().trim().replace(/[^a-z0-9+]/g, '');
    }

    /**
     * Jaro-Winkler similarity (nilai 0..1)
     * Lebih tinggi untuk string yang mirip dan memiliki awalan sama
     */
    #jaroWinkler(s, t) {
        if (s === t) return 1.0;
        const lenS = s.length, lenT = t.length;
        if (lenS === 0 || lenT === 0) return 0.0;

        // Jaro distance
        const matchDistance = Math.floor(Math.max(lenS, lenT) / 2) - 1;
        const sMatches = new Array(lenS).fill(false);
        const tMatches = new Array(lenT).fill(false);

        let matches = 0;
        for (let i = 0; i < lenS; i++) {
            const start = Math.max(0, i - matchDistance);
            const end = Math.min(i + matchDistance + 1, lenT);
            for (let j = start; j < end; j++) {
                if (!tMatches[j] && s[i] === t[j]) {
                    sMatches[i] = tMatches[j] = true;
                    matches++;
                    break;
                }
            }
        }
        if (matches === 0) return 0.0;

        let transpositions = 0;
        let k = 0;
        for (let i = 0; i < lenS; i++) {
            if (sMatches[i]) {
                while (!tMatches[k]) k++;
                if (s[i] !== t[k]) transpositions++;
                k++;
            }
        }
        const jaro = (matches / lenS + matches / lenT + (matches - transpositions / 2) / matches) / 3;

        // Winkler bonus (awalan sama, maks 4 karakter)
        let prefix = 0;
        const maxPrefix = Math.min(4, lenS, lenT);
        for (let i = 0; i < maxPrefix; i++) {
            if (s[i] === t[i]) prefix++;
            else break;
        }
        return jaro + prefix * 0.1 * (1 - jaro);
    }

    /**
     * Hitung skor kemiripan antara dua string (sudah dinormalisasi fuzzy)
     */
    #similarity(a, b) {
        return this.#jaroWinkler(a, b);
    }

    search(input) {
        const exactInput = this.#normalizeExact(input);
        if (exactInput && this.exactIndex[exactInput]) {
            return {
                match: this.exactIndex[exactInput],
                suggestions: []
            };
        }

        const fuzzyInput = this.#normalizeFuzzy(input);
        if (!fuzzyInput) return { match: null, suggestions: [] };

        const suggestions = [];
        for (const { fuzzyNorm, key_id } of this.fuzzyList) {
            const score = this.#similarity(fuzzyInput, fuzzyNorm);
            if (score >= this.threshold) {
                suggestions.push({ key_id, istilah: fuzzyNorm, score });
            }
        }

        // Hapus duplikat key_id (ambil skor tertinggi untuk key yang sama)
        const unique = new Map();
        for (const s of suggestions) {
            const existing = unique.get(s.key_id);
            if (!existing || existing.score < s.score) {
                unique.set(s.key_id, s);
            }
        }
        const uniqueSuggestions = Array.from(unique.values());
        uniqueSuggestions.sort((a, b) => b.score - a.score);

        const top = uniqueSuggestions[0];
        const autoMatch = (top && top.score > this.autoMatchScore) ? top.key_id : null;

        return {
            match: autoMatch,
            suggestions: uniqueSuggestions.slice(0, this.maxSuggestions)
        };
    }

    searchMulti(input) {
        const tokens = input.split(this.separator).filter(Boolean);
        const results = [];
        const seen = new Set();

        for (const token of tokens) {
            const res = this.search(token);
            if (res.match && !seen.has(res.match)) {
                seen.add(res.match);
                results.push({ raw: token, ...res });
            } else if (!res.match) {
                results.push({ raw: token, ...res });
            }
        }
        return results;
    }

    /**
     * Ambil langsung list key_id yang yakin match
     * @param {string} input
     * @returns {string[]}
     * @throws {Error} Jika strictMode aktif dan ada token yang ga ketemu
     */
    parseKeys(input) {
        const results = this.searchMulti(input);
        const failed = results.filter(r => !r.match);

        if (this.strictMode && failed.length > 0) {
            const failedTokens = failed.map(f => `"${f.raw}"`).join(", ");
            const saran = failed[0]?.suggestions[0];
            const hint = saran ? ` Mungkin maksudmu "${saran.istilah}"?` : "";
            throw new Error(`Token tidak dikenali: ${failedTokens}.${hint}`);
        }

        return results.filter(r => r.match).map(r => r.match);
    }

    addAlias(key_id, aliasList) {
        if (!this.dictionary[key_id]) this.dictionary[key_id] = [];
        this.dictionary[key_id].push(...aliasList);

        for (const alias of aliasList) {
            const exactNorm = this.#normalizeExact(alias);
            if (!this.exactIndex[exactNorm]) {
                this.exactIndex[exactNorm] = key_id;
            }
            const fuzzyNorm = this.#normalizeFuzzy(alias);
            this.fuzzyList.push({ fuzzyNorm, key_id });
        }
    }
}

export default Dictionary