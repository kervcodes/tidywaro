import fetch from 'node-fetch';
import FormData from 'form-data';
import fs from 'fs';
import path from 'path';

async function testUpload() {
    console.log('1. Reading token...');
    const tokenPath = path.resolve(__dirname, '../../token.txt');
    if (!fs.existsSync(tokenPath)) {
        console.error('Token file not found! Run test-integration.ts first.');
        return;
    }
    const token = fs.readFileSync(tokenPath, 'utf-8').trim();

    console.log('2. Creating dummy image...');
    // Create a simple 1x1 pixel PNG buffer
    const imageBuffer = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==', 'base64');

    const form = new FormData();
    form.append('image', imageBuffer, {
        filename: 'test-image.png',
        contentType: 'image/png',
    });
    form.append('category', 'test-category');

    console.log('3. Uploading to POST /wardrobe/items...');
    const response = await fetch('http://localhost:3000/wardrobe/items', {
        method: 'POST',
        headers: {
            Authorization: `Bearer ${token}`,
            ...form.getHeaders(),
        },
        body: form,
    });

    if (response.ok) {
        const data = await response.json();
        console.log('SUCCESS! Uploaded item:', data);
    } else {
        console.error('FAILED. Status:', response.status);
        const text = await response.text();
        console.log('Response:', text);
    }
}

testUpload();
