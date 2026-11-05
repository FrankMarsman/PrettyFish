import {readdirSync} from 'node:fs';
import {join} from 'node:path';
import {execFileSync} from 'node:child_process';
function check(dir){for(const e of readdirSync(dir,{withFileTypes:true})){const file=join(dir,e.name);if(e.isDirectory())check(file);else if(/\.(?:js|mjs|cjs)$/.test(file))execFileSync(process.execPath,['--check',file],{stdio:'inherit'});}}
for(const dir of ['dist','tools'])check(dir);
console.log('JavaScript syntax checks passed.');
