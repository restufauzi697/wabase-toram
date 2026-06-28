function parse(csvText, options = {}) {
    const { delimiter = 'auto', hasHeader = true } = options;
    const text = csvText.trim();

    // 1. Auto detect delimiter: cek baris pertama
    let sep = delimiter;
    if (sep === 'auto') {
        const firstLine = text.split(/\r?\n/)[0];
        const commaCount = (firstLine.match(/,/g) || []).length;
        const semicolonCount = (firstLine.match(/;/g) || []).length;
        sep = semicolonCount > commaCount? ';' : ',';
    }

    // 2. Parser utama
    const rows = [];
    let currentRow = [];
    let currentField = '';
    let inQuotes = false;

    for (let i = 0; i < text.length; i++) {
        const char = text[i];
        const nextChar = text[i + 1];

        if (char === '"' && inQuotes && nextChar === '"') {
            currentField += '"'; // "" jadi "
            i++;
        } else if (char === '"') {
            inQuotes =!inQuotes;
        } else if (char === sep &&!inQuotes) {
            currentRow.push(currentField.trim());
            currentField = '';
        } else if ((char === '\n' || char === '\r') &&!inQuotes) {
            if (currentField || currentRow.length) {
                currentRow.push(currentField.trim());
                rows.push(currentRow);
                currentRow = [];
                currentField = '';
            }
            if (char === '\r' && nextChar === '\n') i++;
        } else {
            currentField += char;
        }
    }
    if (currentField || currentRow.length) {
        currentRow.push(currentField.trim());
        rows.push(currentRow);
    }

    // 3. Return array biasa kalo ga ada header
    if (!hasHeader || rows.length === 0) return rows;

    // 4. Convert ke array of object pake header
    const headers = rows[0].map(h => h.trim());
    return rows.slice(1).map(row => {
        const obj = {};
        headers.forEach((header, i) => {
            obj[header] = row[i] || '';
        });
        return obj;
    });
}

function stringify(data, options = {}) {
    const { delimiter = ',', header = true, lineBreak = '\r\n' } = options;

    if (!Array.isArray(data) || data.length === 0) return '';

    // 1. Fungsi escape field kalo ada quote, delimiter, atau enter
    const escapeField = (field) => {
        const str = String(field?? '');
        const needsQuote = str.includes('"') || str.includes(delimiter) || str.includes('\n') || str.includes('\r');
        if (!needsQuote) return str;
        return `"${str.replace(/"/g, '""')}"`; // " jadi ""
    };

    // 2. Kalo input array of object
    if (typeof data[0] === 'object' &&!Array.isArray(data[0])) {
        const headers = Object.keys(data[0]);
        const rows = data.map(obj => headers.map(h => escapeField(obj[h])));
        if (header) rows.unshift(headers.map(escapeField));
        return rows.map(row => row.join(delimiter)).join(lineBreak);
    }

    // 3. Kalo input array 2D
    return data.map(row => row.map(escapeField).join(delimiter)).join(lineBreak);
}

export { parse, stringify }
export default { parse, stringify }