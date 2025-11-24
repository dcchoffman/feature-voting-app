import fs from 'fs';
import path from 'path';

const distPath = path.join(process.cwd(), 'dist');
const indexPath = path.join(distPath, 'index.html');
const notFoundPath = path.join(distPath, '404.html');

// Copy index.html to 404.html so GitHub Pages can serve it for all routes
// This allows React Router to handle client-side routing
if (fs.existsSync(indexPath)) {
  fs.copyFileSync(indexPath, notFoundPath);
  console.log('✓ Created 404.html from index.html in dist folder');
} else {
  console.error('✗ Error: index.html not found in dist folder. Run build first.');
  process.exit(1);
}