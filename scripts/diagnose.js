const fs = require('fs');
const path = require('path');

function walk(dir) {
  let results = [];
  if (!fs.existsSync(dir)) return results;
  const list = fs.readdirSync(dir);
  list.forEach(file => {
    const full = path.join(dir, file);
    const stat = fs.statSync(full);
    if (stat && stat.isDirectory()) {
      if (!file.includes('node_modules') && !file.includes('.next') && !file.includes('.git')) {
        results = results.concat(walk(full));
      }
    } else if (file.endsWith('.tsx') || file.endsWith('.ts')) {
      results.push(full);
    }
  });
  return results;
}

const files = walk('./app').concat(walk('./components'));
const rawButtons = [];
const rawInputs = [];
const rawSelects = [];
const rawTextareas = [];
const unsizedIcons = [];

files.forEach(f => {
  const code = fs.readFileSync(f, 'utf8');
  const rel = path.relative('.', f).replace(/\\/g, '/');
  const isUi = rel.startsWith('components/ui/');

  if (!isUi) {
    if (/<button[\s>]/.test(code)) rawButtons.push(rel);
    if (/<input[\s>]/.test(code)) rawInputs.push(rel);
    if (/<select[\s>]/.test(code)) rawSelects.push(rel);
    if (/<textarea[\s>]/.test(code)) rawTextareas.push(rel);
  }

  // Check for lucide icon imports and usages without size / className size
  // e.g. <Icon /> without size={...} or className="... w- ... h- ..."
  const iconUsages = code.match(/<[A-Z][A-Za-z]+(\s+[^>]*)?\/>/g) || [];
  // Also check <svg
  const svgMatches = code.match(/<svg[^>]*>/g) || [];
  svgMatches.forEach(m => {
    if (!m.includes('width=') && !m.includes('size=') && !m.includes('w-') && !m.includes('h-')) {
      unsizedIcons.push({ file: rel, match: m });
    }
  });
});

console.log('--- RAW BUTTONS (outside components/ui) ---');
console.log(rawButtons);
console.log('--- RAW INPUTS (outside components/ui) ---');
console.log(rawInputs);
console.log('--- RAW SELECTS (outside components/ui) ---');
console.log(rawSelects);
console.log('--- RAW TEXTAREAS (outside components/ui) ---');
console.log(rawTextareas);
console.log('--- UNSIZED SVGS ---');
console.log(unsizedIcons);
