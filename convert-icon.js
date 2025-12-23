const fs = require('fs');
const pngToIco = require('png-to-ico');

console.log('Converting icon.png to icon.ico...');
pngToIco('public/icon.png')
    .then(buf => {
        fs.writeFileSync('public/icon.ico', buf);
        console.log('Success: Created public/icon.ico');
    })
    .catch(err => {
        console.error('Error converting icon:', err);
        process.exit(1);
    });
