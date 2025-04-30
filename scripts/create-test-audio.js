const fs = require('fs');
const path = require('path');

// Create a simple WAV file header for a mono 16-bit PCM file at 44.1kHz
// This is a very basic implementation and might not work with all audio players
function createWavHeader(dataLength) {
  const buffer = Buffer.alloc(44);
  
  // RIFF chunk descriptor
  buffer.write('RIFF', 0);
  buffer.writeUInt32LE(36 + dataLength, 4); // File size - 8
  buffer.write('WAVE', 8);
  
  // "fmt " sub-chunk
  buffer.write('fmt ', 12);
  buffer.writeUInt32LE(16, 16); // Length of format data
  buffer.writeUInt16LE(1, 20); // PCM format
  buffer.writeUInt16LE(1, 22); // Mono channel
  buffer.writeUInt32LE(44100, 24); // Sample rate
  buffer.writeUInt32LE(44100 * 2, 28); // Byte rate (SampleRate * NumChannels * BitsPerSample/8)
  buffer.writeUInt16LE(2, 32); // Block align (NumChannels * BitsPerSample/8)
  buffer.writeUInt16LE(16, 34); // Bits per sample
  
  // "data" sub-chunk
  buffer.write('data', 36);
  buffer.writeUInt32LE(dataLength, 40); // Data size
  
  return buffer;
}

// Create a simple sine wave
function createSineWave(duration, frequency, sampleRate) {
  const numSamples = Math.floor(duration * sampleRate);
  const buffer = Buffer.alloc(numSamples * 2); // 16-bit = 2 bytes per sample
  
  for (let i = 0; i < numSamples; i++) {
    const t = i / sampleRate;
    const amplitude = 32767 * 0.5; // Half of max 16-bit amplitude
    const value = Math.floor(amplitude * Math.sin(2 * Math.PI * frequency * t));
    buffer.writeInt16LE(value, i * 2);
  }
  
  return buffer;
}

// Create a test WAV file with a 1-second 440Hz tone (A4 note)
function createTestAudioFile(outputPath) {
  const duration = 1; // seconds
  const frequency = 440; // Hz (A4 note)
  const sampleRate = 44100; // Hz
  
  const dataBuffer = createSineWave(duration, frequency, sampleRate);
  const headerBuffer = createWavHeader(dataBuffer.length);
  
  // Ensure the directory exists
  const dir = path.dirname(outputPath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  
  // Write the WAV file
  const fileStream = fs.createWriteStream(outputPath);
  fileStream.write(headerBuffer);
  fileStream.write(dataBuffer);
  fileStream.end();
  
  console.log(`Created test audio file at ${outputPath}`);
}

// Create the test audio file
const outputPath = path.join(__dirname, '../cypress/fixtures/fake-audio.wav');
createTestAudioFile(outputPath);
