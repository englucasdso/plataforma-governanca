const fs = require('fs');
const path = require('path');

const walkSync = (dir, filelist = []) => {
  fs.readdirSync(dir).forEach(file => {
    const dirFile = path.join(dir, file);
    try {
      filelist = fs.statSync(dirFile).isDirectory() ? walkSync(dirFile, filelist) : filelist.concat(dirFile);
    } catch (err) {
      if (err.code === 'ENOENT' || err.code === 'EACCES') console.log(`Cannot read ${dirFile}`);
    }
  });
  return filelist;
};

const tsxFiles = walkSync('./frontend/src').filter(f => f.endsWith('.tsx'));

let changeCount = 0;

tsxFiles.forEach(file => {
  let content = fs.readFileSync(file, 'utf-8');
  let original = content;

  // Backgrounds
  content = content.replace(/bg-white\s+dark:bg-slate-90[0|5](\/50)?/g, 'bg-card-bg backdrop-blur-xl');
  content = content.replace(/bg-white\s+dark:bg-slate-800(\/50)?/g, 'bg-card-bg backdrop-blur-xl');
  content = content.replace(/bg-gray-50\s+dark:bg-slate-80[0|5](\/50)?/g, 'bg-bg-secondary');
  content = content.replace(/bg-gray-100\s+dark:bg-slate-700/g, 'bg-bg-secondary');
  content = content.replace(/bg-white/g, 'bg-bg-secondary');
  
  // Borders
  content = content.replace(/border-gray-100\s+dark:border-slate-[78]00/g, 'border-card-border');
  content = content.replace(/border-gray-200\s+dark:border-slate-[67]00/g, 'border-card-border');
  content = content.replace(/dark:border-slate-800/g, 'border-card-border');
  
  // Text
  content = content.replace(/text-gray-900\s+dark:text-slate-50/g, 'text-text-primary');
  content = content.replace(/text-gray-800\s+dark:text-slate-200/g, 'text-text-primary');
  content = content.replace(/text-gray-600\s+dark:text-slate-300/g, 'text-text-secondary');
  content = content.replace(/text-gray-500\s+dark:text-slate-400/g, 'text-text-secondary');
  content = content.replace(/text-gray-400\s+dark:text-slate-500/g, 'text-text-secondary');
  content = content.replace(/text-gray-500/g, 'text-text-secondary');
  
  // Shadows
  content = content.replace(/shadow-sm\s+dark:shadow-none/g, '');
  content = content.replace(/shadow-2xl\s+dark:shadow-none/g, '');
  content = content.replace(/shadow-xl\s+dark:shadow-none/g, '');

  if (content !== original) {
    fs.writeFileSync(file, content);
    changeCount++;
    console.log(`Updated ${file}`);
  }
});

console.log(`Refactored ${changeCount} files.`);
