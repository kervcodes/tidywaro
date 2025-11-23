import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import fetch from 'node-fetch';
import path from 'path';
import fs from 'fs';

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_KEY!;

console.log('Debug: Loaded SUPABASE_URL:', supabaseUrl);

const supabase = createClient(supabaseUrl, supabaseKey);

async function test() {
    console.log('1. Creating NEW temporary user...');
    // Use a unique email to ensure we can sign up successfully
    const email = `testuser${Date.now()}@gmail.com`;
    const password = 'password123';

    // Attempt signup
    const { data: authData, error: authError } = await supabase.auth.signUp({
        email,
        password,
    });

    if (authError) {
        console.error('Signup failed:', authError.message);
        return;
    }

    // In Supabase, if email confirmation is ON, we might not get a session here.
    // But if it's OFF, we will.
    const token = authData.session?.access_token;

    if (!token) {
        console.error('No token received. Email confirmation is likely ON.');
        console.log('Cannot proceed with automated test unless email confirmation is disabled.');
        return;
    }

    console.log('2. User created & logged in.');

    // Write token to file for easy copying
    const tokenPath = path.resolve(__dirname, '../../token.txt');
    fs.writeFileSync(tokenPath, token);
    console.log(`\n>>> TOKEN SAVED TO: ${tokenPath} <<<\n`);

    console.log('3. Calling GET /wardrobe/items...');
    const response = await fetch('http://localhost:3000/wardrobe/items', {
        headers: {
            Authorization: `Bearer ${token}`,
        },
    });

    if (response.ok) {
        const data = await response.json();
        console.log('SUCCESS! Data received:', data);
    } else {
        console.error('FAILED. Status:', response.status);
        const text = await response.text();
        console.log('Response:', text);
    }
}

test();
