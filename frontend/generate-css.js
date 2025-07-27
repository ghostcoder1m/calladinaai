#!/usr/bin/env node

const { exec } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('🎨 Regenerating Tailwind CSS...');

// Run Tailwind CSS build
exec('npx tailwindcss -i ./src/index.css -o ./src/output.css', (error, stdout, stderr) => {
  if (error) {
    console.error('❌ Error generating CSS:', error);
    return;
  }
  
  console.log('✅ Tailwind CSS generated successfully!');
  console.log('📁 Generated file: src/output.css');
  
  // Check file size
  const filePath = path.join(__dirname, 'src', 'output.css');
  const stats = fs.statSync(filePath);
  const fileSizeInBytes = stats.size;
  const fileSizeInKB = (fileSizeInBytes / 1024).toFixed(2);
  
  console.log(`📊 File size: ${fileSizeInKB} KB`);
}); 