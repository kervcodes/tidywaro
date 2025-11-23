import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";
import path from "path";
import fs from "fs";

dotenv.config({ path: path.resolve(__dirname, "../../.env") });

async function debugToken() {
    console.log("System Time:", new Date().toISOString());

    const tokenPath = path.resolve(__dirname, "../../token.txt");
    if (!fs.existsSync(tokenPath)) {
        console.error("Token file not found");
        return;
    }
    const token = fs.readFileSync(tokenPath, 'utf-8').trim();
    console.log("Token from file:", token);

    // 2. Decode Token (manual decode of payload)
    try {
        const parts = token.split('.');
        if (parts.length !== 3) {
            console.error("Invalid token format (not 3 parts)");
            return;
        }

        const payload = JSON.parse(Buffer.from(parts[1], 'base64').toString());
        console.log("Token Payload:", JSON.stringify(payload, null, 2));

        const expDate = new Date(payload.exp * 1000);
        console.log("Token Expires:", expDate.toISOString());

        // 3. Check validity against system time
        if (expDate < new Date()) {
            console.error("CRITICAL: Token is ALREADY EXPIRED relative to system time!");
            console.error(`Expiry: ${expDate.toISOString()} < Now: ${new Date().toISOString()}`);
        } else {
            console.log("Token is valid relative to system time.");
        }
    } catch (e) {
        console.error("Failed to decode token:", e);
    }
}

debugToken();
