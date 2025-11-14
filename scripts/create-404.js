import fs from 'fs';
import path from 'path';

const distPath = path.join(process.cwd(), 'dist');
const indexPath = path.join(distPath, 'index.html');
const notFoundPath = path.join(distPath, '404.html');

fs.copyFileSync(indexPath, notFoundPath);
console.log('✓ Created 404.html from index.html');