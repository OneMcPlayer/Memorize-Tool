const https = require('https');
const fs = require('fs');
const path = require('path');

// URL to a small test MP3 file (this is a public domain audio file)
const url = 'https://www2.cs.uic.edu/~i101/SoundFiles/StarWars3.wav';
const outputPath = path.join(__dirname, '../cypress/fixtures/test-audio.mp3');

console.log('Downloading test audio file...');

// Create the directory if it doesn't exist
const dir = path.dirname(outputPath);
if (!fs.existsSync(dir)) {
  fs.mkdirSync(dir, { recursive: true });
}

// Download the file
const file = fs.createWriteStream(outputPath);
https.get(url, (response) => {
  response.pipe(file);
  file.on('finish', () => {
    file.close();
    console.log(`Test audio file downloaded to: ${outputPath}`);
  });
}).on('error', (err) => {
  fs.unlink(outputPath);
  console.error('Error downloading test audio file:', err.message);
});
