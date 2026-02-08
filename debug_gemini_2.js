const { GoogleGenerativeAI } = require("@google/generative-ai");
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

// 2. Test Client
async function testModel(modelName) {
    console.log(`\nTesting model: ${modelName}...`);
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: modelName });

    try {
        const result = await model.generateContent("Hello.");
        const response = await result.response;
        console.log(`SUCCESS [${modelName}]:`, response.text().substring(0, 20));
        return true;
    } catch (error) {
        console.log(`FAILURE [${modelName}]:`);
        console.log(error.message); // Print full message
        return false;
    }
}

async function run() {
    // Try gemini-pro first (older, widely available)
    await testModel("gemini-pro");
    // Try flash
    await testModel("gemini-1.5-flash");
}

run();
