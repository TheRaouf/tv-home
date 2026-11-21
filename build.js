const fs=require('fs');
const html=fs.readFileSync('src/app.html','utf8').replace('/*PRAYER*/',()=>fs.readFileSync('src/prayer.js','utf8').replace(/if \(typeof module[^\n]*\n?/,''));
fs.mkdirSync('dist',{recursive:true});fs.writeFileSync('dist/index.html',html);console.log('built',html.length);
