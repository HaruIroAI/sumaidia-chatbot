#!/usr/bin/env node

import sharp from 'sharp';
import pngToIco from 'png-to-ico';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function generateFavicon() {
    try {
        console.log('Starting favicon generation...');
        
        // Paths
        const inputPath = path.join(__dirname, '..', 'logo', 'smaichan.png');
        const outputPath = path.join(__dirname, '..', 'favicon.ico');
        const tempDir = path.join('/tmp', 'favicon-temp-' + Date.now());
        
        // Create temp directory
        await fs.mkdir(tempDir, { recursive: true });
        
        // Generate different sizes
        const sizes = [32, 16];
        const pngBuffers = [];
        
        for (const size of sizes) {
            console.log(`Generating ${size}x${size} PNG...`);
            const tempFile = path.join(tempDir, `favicon-${size}.png`);
            
            // Resize image
            await sharp(inputPath)
                .resize(size, size, {
                    fit: 'contain',
                    background: { r: 255, g: 255, b: 255, alpha: 0 }
                })
                .png()
                .toFile(tempFile);
            
            // Read the generated PNG
            const buffer = await fs.readFile(tempFile);
            pngBuffers.push(buffer);
        }
        
        console.log('Converting PNGs to ICO...');
        
        // Convert PNGs to ICO
        const icoBuffer = await pngToIco(pngBuffers);
        
        // Write favicon.ico
        await fs.writeFile(outputPath, icoBuffer);
        
        // Clean up temp files
        for (const size of sizes) {
            const tempFile = path.join(tempDir, `favicon-${size}.png`);
            await fs.unlink(tempFile).catch(() => {});
        }
        await fs.rmdir(tempDir).catch(() => {});
        
        console.log(`✅ Favicon generated successfully: ${outputPath}`);
        
        // Verify file size
        const stats = await fs.stat(outputPath);
        console.log(`   File size: ${stats.size} bytes`);
        
    } catch (error) {
        console.error('❌ Error generating favicon:', error);
        process.exit(1);
    }
}

// Run generation
generateFavicon();