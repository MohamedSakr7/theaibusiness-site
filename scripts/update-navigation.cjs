const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '..');

function simplifyNavigation(html) {
  const startPattern = /<div class="resources-dropdown"[^>]*>/;
  let match;
  while ((match = startPattern.exec(html))) {
    const divs = /<\/?div\b[^>]*>/g;
    divs.lastIndex = match.index;
    let depth = 0, token, end;
    while ((token = divs.exec(html))) {
      depth += token[0].startsWith('</') ? -1 : 1;
      if (depth === 0) { end = divs.lastIndex; break; }
    }
    if (!end) throw new Error('Unclosed Resources dropdown.');
    html = html.slice(0, match.index) + '<a class="resources-nav-link" href="/resources/">Resources</a>' + html.slice(end);
  }
  return html;
}

function updateNavigation(directory = root) {
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    if (entry.isDirectory() && !['.git', 'node_modules', 'test-artifacts', 'apps-script', 'assets', 'templates'].includes(entry.name)) updateNavigation(path.join(directory, entry.name));
    if (entry.isFile() && entry.name.endsWith('.html')) {
      const file = path.join(directory, entry.name);
      const before = fs.readFileSync(file, 'utf8');
      const after = simplifyNavigation(before);
      if (after !== before) fs.writeFileSync(file, after);
    }
  }
}

module.exports = { simplifyNavigation, updateNavigation };
if (require.main === module) updateNavigation();
