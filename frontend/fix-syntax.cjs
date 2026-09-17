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

    // Fix the double quote dash quote issue
    if (content.includes('""-"')) {
        content = content.replace(/""-"/g, '"-"');
        modified = true;
    }

    // Fix Network error "- is
    if (content.includes('"Network error "- is the backend running?"')) {
        content = content.replace(/"Network error "- is the backend running\?"/g, '"Network error - is the backend running?"');
        modified = true;
    }

    // Fix specific known corrupted strings from the grep output
    const replacements = [
        ['delivery"-leveraging', 'delivery - leveraging'],
        ['opportunities"-trusted', 'opportunities - trusted'],
        ['Admin "- Agent', 'Admin - Agent'],
        ['Retry "- Back', 'Retry - Back'],
        ['"user".token "-', '"user".token -'],
        ['"¢', '•'], // fixing the corrupted bullet point
        ['path "- {statusLabel', 'path - {statusLabel'],
        ['attention "- {statusLabel', 'attention - {statusLabel'],
        ['stage "- the decision', 'stage - the decision'],
        ['approved "- add delivery', 'approved - add delivery']
    ];

    replacements.forEach(([bad, good]) => {
        if (content.includes(bad)) {
            content = content.split(bad).join(good);
            modified = true;
        }
    });

    if (modified) {
        fs.writeFileSync(f, content, 'utf8');
        console.log('Fixed in ' + f);
    }
});
