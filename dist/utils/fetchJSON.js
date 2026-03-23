import fetch from 'node-fetch';
import axios from "axios";

async function fetchJSON(url) {
    const res = await fetch(url, {timeout: 30000})

    if (!res.ok) {
        throw new Error(`Failed to fetch JSON: ${res.status} ${res.statusText}`)
    }

    const json = await res.json()

    return json
}

async function fetchData(url) {
  try {
    const response = await axios.get(url, { responseType: 'arraybuffer' });
    return Buffer.from(response.data, 'binary');
  } catch (error) {
    console.error(`Error fetching image: ${error}`);
    return null;
  }
}

export default fetchJSON
export {
	fetchJSON,
	fetchData
}