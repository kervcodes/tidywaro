import { GoogleGenerativeAI } from "@google/generative-ai";
import dotenv from "dotenv";
import path from "path";

// Load env from apps/bff/.env
dotenv.config({ path: path.resolve(__dirname, "../../.env") });

async function listModels() {
    const key = process.env.GEMINI_API_KEY;
    if (!key) {
        console.error("GEMINI_API_KEY not found in .env");
        return;
    }

    console.log("Using key:", key.substring(0, 5) + "...");

    const genAI = new GoogleGenerativeAI(key);

    // Test gemini-1.5-flash
    try {
        console.log("Testing gemini-1.5-flash...");
        const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
        const result = await model.generateContent("Hello");
        console.log("Success with gemini-1.5-flash:", result.response.text());
    } catch (error: any) {
        console.error("Error with gemini-1.5-flash:", error.message);
        if (error.response) {
            // Log response if available (axios style)
            console.error("Response data:", JSON.stringify(error.response.data, null, 2));
        }
        // Log full error object for inspection
        console.error("Full Error:", JSON.stringify(error, Object.getOwnPropertyNames(error), 2));
    }

    // Test gemini-pro
    try {
        console.log("\nTesting gemini-pro...");
        const model = genAI.getGenerativeModel({ model: "gemini-pro" });
        const result = await model.generateContent("Hello");
        console.log("Success with gemini-pro:", result.response.text());
    } catch (error: any) {
        console.error("Error with gemini-pro:", error.message);
    }
}

listModels();
