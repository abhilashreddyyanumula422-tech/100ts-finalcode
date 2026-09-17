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

    if (content.includes('â€™')) {
        content = content.replace(/â€™/g, "'");
        modified = true;
    }
    if (content.includes('â€“')) {
        content = content.replace(/â€“/g, "-");
        modified = true;
    }
    if (content.includes('â€œ')) {
        content = content.replace(/â€œ/g, '"');
        modified = true;
    }
    // Only replace â€ if it's not followed by “ or ” to prevent double replacements? No, the previous ones replaced it already.
    if (content.includes('â€')) {
        content = content.replace(/â€/g, '"');
        modified = true;
    }
    if (content.includes('â€') && !content.includes('â€œ') && !content.includes('â€')) {
        // "â€" is sometimes used for closing quotes when it's just a right double quote.
        // Wait, replace(/â€/g, '"') could replace part of other characters, but we did â€™, â€œ, â€“ already.
        // Actually, let's just do a blanket replacement of 'â€' to '"'.
        content = content.replace(/â€/g, '"');
        modified = true;
    }
    if (content.includes('â€˜')) {
        content = content.replace(/â€˜/g, "'");
        modified = true;
    }
    if (content.includes('â€¢')) {
        content = content.replace(/â€¢/g, "•");
        modified = true;
    }

    if (modified) {
        fs.writeFileSync(f, content, 'utf8');
        console.log('Replaced in ' + f);
    }
});
