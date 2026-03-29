const fs = require('fs');
const path = require('path');
['public/icons/icon-192x192.png', 'public/icons/icon-512x512.png'].forEach((file) => {
  const p = path.join(__dirname, '..', file);
  try {
    const buf = fs.readFileSync(p);
    console.log(file, 'size', buf.length);
    console.log('header', buf.slice(0, 8).toString('hex'));
    console.log('IHDR', buf.slice(12, 29).toString('hex'));
    console.log('IEND tail', buf.slice(-12).toString('hex'));
  } catch (e) {
    console.error('ERROR', file, e.message);
  }
});
