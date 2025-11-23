import fetch from 'node-fetch';
import fs from 'fs';
import path from 'path';

async function testPlanner() {
    console.log('1. Reading token...');
    const tokenPath = path.resolve(__dirname, '../../token.txt');
    if (!fs.existsSync(tokenPath)) {
        console.error('Token file not found! Run test-integration.ts first.');
        return;
    }
    const token = fs.readFileSync(tokenPath, 'utf-8').trim();

    console.log('2. Generating Weekly Plan...');
    const startDate = new Date().toISOString().split('T')[0]; // Today

    const response = await fetch('http://localhost:3000/weekly-plans/generate', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ startDate }),
    });

    if (response.ok) {
        const data = await response.json();
        console.log('SUCCESS! Generated Plan:', JSON.stringify(data, null, 2));
    } else {
        console.error('FAILED. Status:', response.status);
        const text = await response.text();
        console.log('Response:', text);
        try {
            const json = JSON.parse(text);
            console.log('Parsed Error:', JSON.stringify(json, null, 2));
        } catch (e) {
            // ignore
        }
    }
}

testPlanner();
