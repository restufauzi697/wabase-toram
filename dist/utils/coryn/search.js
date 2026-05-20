import { dataSetItems, load as loadItems } from "./items.js";
/**
 * Mencari item berdasarkan nama, stat yang dimiliki, dan opsi tampilan.
 * @param {string} name Kata kunci nama item (case-insensitive, pencarian substring).
 * @param {object[]} stats Array stat yang harus dimiliki item.
 *                          Setiap stat adalah objek dengan properti:
 *                          - type: Nama stat (string).
 *                          - operator: Operator perbandingan ('>', '<', atau '=').
 *                          - value: Nilai yang dibandingkan (number).
 * @returns {object[]} Array item yang cocok.
 */
/*
export default async function search(name, stats) {

    if (!dataSetItems.Items.length) {
    	throw new Error('Pencarian item belum siap!')
    }

    return new Promise((resolve, reject) => {
        
        var result = []

        const items = dataSetItems.Items;

        const filteredItems = items.filter(item => {
            // Filter berdasarkan nama
            const nameMatch = name ? item.Name.toLowerCase().includes(name.toLowerCase()) : true;

            // Filter berdasarkan stat
            let statsMatch = true;
            if (stats && stats.length > 0) {
                statsMatch = stats.every(stat => {
                    if (!item.Stats || !item.Stats.Stat) return false;

                    const itemStats = Array.isArray(item.Stats.Stat) ? item.Stats.Stat : [item.Stats.Stat];

                    return itemStats.some(s => {
                        if (s.Type.toLowerCase() === stat.type) {
                            const itemValue = Number(s.Value); // Convert Value to a number
                            const statValue = Number(stat.value); // Convert stat.value to a number

                            switch (stat.operator) {
                                case '>':
                                    return itemValue > statValue;
                                case '<':
                                    return itemValue < statValue;
                                case '>=':
                                case '≥':
                                    return itemValue >= statValue;
                                case '<=':
                                case '≤':
                                    return itemValue <= statValue;
                                case '=':
                                    return itemValue === statValue;
                                default:
                                    return false; // Invalid operator
                            }
                        }
                        return false; // Stat type doesn't match
                    });
                });
            }

            return nameMatch && statsMatch;
        });
        result = result.concat(filteredItems);

        resolve(result);
    });
}
*/

// pendekatan baru
export default async function search(name = "", conditions = []) {

    if (!dataSetItems.Items.length) {
    	throw new Error('Pencarian item belum siap!')
    	await loadItems()
    }

  return dataSetItems.Items.filter(item => {
    if (name && !item.Name.toLowerCase().includes(name.toLowerCase())) return false;
    if (!conditions.length) return true;

    return conditions.every(cond => {
      const found = item.NormalizedStats?.find(s => s.key === cond.type && !(cond.isPercent ^ s.isPercent));
      if (!found) return false;

      let actual = found.value;
      let target = cond.value;

      // Jika stat bukan persen tapi kondisinya membandingkan dengan persepsi lain? Tidak perlu.
      // Langsung bandingkan numeric
      switch (cond.operator) {
        case ">":  return actual > target;
        case ">=": return actual >= target;
        case "<":  return actual < target;
        case "<=": return actual <= target;
        case "=":  return actual === target;
        default: return false;
      }
    });
  });
}

/**
 * Mengubah format array item menjadi string yang diformat.
 * @param {object[]} items Array item yang akan diformat.
 * @param {object} options Opsi tampilan:
 *                         - show: Jumlah item per halaman (number, default: 20).
 *                         - page: Nomor halaman (number, default: 1).
 * @returns {string} String yang diformat yang mewakili item.
 */
 /*
function formatItems(items, {page = 0 ,show = 20}) {
  let resultString = '';
  const start = show * page,
  	end = start + show + 1;
  items = items.slice(start, end);

  for (const item of items) {
    const name = item.Name;
    const stats = item.Stats?.Stat;

    resultString += `╭─「 ${name.toUpperCase()} 」\n`;

    if (Array.isArray(stats)) {
      for (const stat of stats) {
        resultString += `│ • ${stat.Type}: ${stat.Value}\n`;
      }
    } else if (stats) {
      // Handle kasus ketika hanya ada satu stat (bukan array)
      resultString += `│ • ${stats.Type}: ${stats.Value}\n`;
    }

    resultString += '╰────\n';
  }

  return resultString;
}
*/

/**
 * Mengubah format array item menjadi string yang diformat.
 * @param {object[]} items Array item yang akan diformat.
 * @param {object} options Opsi tampilan:
 *                         - show: Jumlah item per halaman (number, default: 20).
 *                         - page: Nomor halaman (number, default: 0).
 *                         - field: Field untuk sorting (string, default: null).
 *                         - order: Urutan sorting 'asc' atau 'desc' (string, default: 'asc').
 * @returns {string} String yang diformat yang mewakili item.
 */
 // mendukung sorting
function formatItems(items, { page = 0, show = 20, field = null, order = "asc" }) {
  let resultString = "";
  let processedItems = [...items];

  // Sorting berdasarkan field (stat key)
  if (field) {
    processedItems.sort((a, b) => {
      let aValue = null;
      let bValue = null;

      // Cari nilai dari NormalizedStats
      if (a.NormalizedStats && b.NormalizedStats) {
        const aStat = a.NormalizedStats.find((s) => s.key === field);
        const bStat = b.NormalizedStats.find((s) => s.key === field);
        aValue = aStat ? aStat.value : null;
        bValue = bStat ? bStat.value : null;
      }

      // Handle null values (item tanpa stat yang dicari)
      if (aValue === null && bValue === null) return 0;
      if (aValue === null) return 1;
      if (bValue === null) return -1;

      // Bandingkan nilai numerik
      const comparison = aValue - bValue;
      return order === "asc" ? comparison : -comparison;
    });
  }

  // Pagination
  const start = show * page;
  const end = start + show;
  const paginatedItems = processedItems.slice(start, end);

  for (const item of paginatedItems) {
    const name = item.Name;
    const stats = item.Stats?.Stat;

    resultString += `╭─「 ${name.toUpperCase()} 」\n`;

    if (Array.isArray(stats)) {
      for (const stat of stats) {
        resultString += `│ • ${stat.Type}: ${stat.Value}\n`;
      }
    } else if (stats) {
      resultString += `│ • ${stats.Type}: ${stats.Value}\n`;
    }

    resultString += "╰────\n";
  }

  return resultString;
}
search.formatItems = formatItems
