const fs = require('fs');
const path = require('path');

// 1. Load API Key
let apiKey = process.env.GEMINI_API_KEY;

if (!apiKey) {
    try {
        const envPath = path.join(process.cwd(), '.env.local');
        if (fs.existsSync(envPath)) {
            const envContent = fs.readFileSync(envPath, 'utf8');
            const match = envContent.match(/GEMINI_API_KEY=(.*)/);
            if (match && match[1]) {
                let rawKey = match[1].trim();
                // Remove quotes
                if ((rawKey.startsWith('"') && rawKey.endsWith('"')) || 
                    (rawKey.startsWith("'") && rawKey.endsWith("'"))) {
                    rawKey = rawKey.slice(1, -1);
                }
                apiKey = rawKey;
            }
        }
    } catch (e) {
    }
}

if (!apiKey) {
    console.error("No API KEY found");
    process.exit(1);
}

// 2. Fetch Models
async function listModels() {
    const url = `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`;
    console.log(`Fetching: ${url.replace(apiKey, 'HIDDEN_KEY')}`);
    
    try {
        const response = await fetch(url);
        console.log(`Status: ${response.status} ${response.statusText}`);
        const text = await response.text();
        console.log("Body:");
        console.log(text.substring(0, 1000)); // First 1000 chars
    } catch (error) {
        console.error("Fetch Error:", error.message);
    }
}

listModels();
