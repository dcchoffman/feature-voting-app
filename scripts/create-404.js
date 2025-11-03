const fs = require('fs');
const path = require('path');

const distPath = path.join(__dirname, '..', 'dist');
const indexPath = path.join(distPath, 'index.html');
const error404Path = path.join(distPath, '404.html');

try {
  if (!fs.existsSync(indexPath)) {
    console.error('index.html not found in dist folder. Run build first.');
    process.exit(1);
  }
  
  const indexHtml = fs.readFileSync(indexPath, 'utf8');
  fs.writeFileSync(error404Path, indexHtml);
  console.log('Created 404.html successfully');
} catch (error) {
  console.error('Error creating 404.html:', error);
  process.exit(1);
}

