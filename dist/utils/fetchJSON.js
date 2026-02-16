import fetch from 'node-fetch';

export default async function fetchJSON(url) {
    const res = await fetch(url, {timeout: 30000})

    if (!res.ok) {
        throw new Error(`Failed to fetch JSON: ${res.status} ${res.statusText}`)
    }

    const json = await res.json()

    return json
}
