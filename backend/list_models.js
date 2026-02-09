import fetch from 'node:fetch';

const API_KEY = process.env.GEMINI_API_KEY;
const URL = `https://generativelanguage.googleapis.com/v1beta/models?key=${API_KEY}`;

async function listModels() {
    if (!API_KEY) {
        console.error("GEMINI_API_KEY is not set");
        return;
    }
    try {
        const response = await fetch(URL);
        const data = await response.json();
        console.log(JSON.stringify(data, null, 2));
    } catch (e) {
        console.error("Failed to list models:", e);
    }
}

listModels();
