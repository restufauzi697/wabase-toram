export default async function fetchJSONFromGithubRaw(url) {
    const res = await fetch(url)

    if (!res.ok) {
        throw new Error(`Failed to fetch JSON from GitHub raw: ${res.status} ${res.statusText}`)
    }

    const json = await res.json()

    return json
}
