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

files.forEach(f => {
    let content = fs.readFileSync(f, 'utf8');
    let modified = false;

    if (content.includes('"¦')) {
        content = content.replace(/"¦/g, '...');
        modified = true;
    }

    if (modified) {
        fs.writeFileSync(f, content, 'utf8');
        console.log('Fixed in ' + f);
    }
});
