import archiver from 'archiver';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const output = fs.createWriteStream('project.zip');
const archive = archiver('zip', { zlib: { level: 9 } });

output.on('close', () => {
  console.log('Project files have been zipped!');
});

archive.pipe(output);

// Add all project files
const filesToZip = [
  'server.js',
  'package.json',
  'requirements.txt',
  'public/config.js',
  'public/plots.js',
  'public/main.js',
  'public/styles.css',
  'public/index.html',
  'templates/index.html',
  'dataProcessor.js'
];

filesToZip.forEach(file => {
  archive.file(file, { name: file });
});

archive.finalize();