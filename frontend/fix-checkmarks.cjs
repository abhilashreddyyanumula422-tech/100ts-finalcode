const fs = require('fs');
const path = require('path');

function walk(dir) {
    let results = [];
    const list = fs.readdirSync(dir);
    list.forEach(function(file) {
        file = dir + '/' + file;
        const stat = fs.statSync(file);
        if (stat && stat.isDirectory()) {
            results = results.concat(walk(file));
        } else {
            results.push(file);
        }
    });
    return results;
}

const files = walk('./src').filter(f => f.endsWith('.jsx') || f.endsWith('.js') || f.endsWith('.ts') || f.endsWith('.tsx'));

const replacements = {
    'âœ”': '✔',
    'âœ“': '✓',
    'âœ…': '✅',
    'âœ•': '✖',
    'âœ¨': '✨'
};

files.forEach(f => {
    let content = fs.readFileSync(f, 'utf8');
    let modified = false;

    Object.keys(replacements).forEach(key => {
        if (content.includes(key)) {
            // Use regex with global flag to replace all occurrences
            const regex = new RegExp(key, 'g');
            content = content.replace(regex, replacements[key]);
            modified = true;
        }
    });

    if (modified) {
        fs.writeFileSync(f, content, 'utf8');
        console.log('Fixed in ' + f);
    }
});
