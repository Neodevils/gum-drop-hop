// Checks the role gate in isolation: the tables are lifted verbatim from index.html.
import {readFileSync} from 'node:fs';
import assert from 'node:assert';
const src = readFileSync('/Users/neodevils/Documents/GitHub/gum-drop-hop/docs/index.html','utf8');
const grab = n => eval('('+src.match(new RegExp(`const ${n} = (\\{[\\s\\S]*?\\n\\});`))[1]+')');
const KEYS = grab('KEYS'), ROLE_KEYS = grab('ROLE_KEYS');

const P1 = [87,83,65,68], P2 = [38,40,37,39];   // from the decompiled clips
const codes = r => ROLE_KEYS[r].map(c => KEYS[c][1]);

// The host must reach P1's character and never P2's; the guest exactly the reverse.
assert.deepEqual(codes('host').filter(c=>P2.includes(c)), [], 'host can drive P2!');
assert.deepEqual(codes('guest').filter(c=>P1.includes(c)), [], 'guest can drive P1!');
for (const c of P1) assert.ok(codes('host').includes(c), `host missing ${c}`);
for (const c of P2) assert.ok(codes('guest').includes(c), `guest missing ${c}`);
assert.ok(codes('host').includes(16), 'host cannot select 2-player mode');
console.log('host  ->', codes('host').join(','), '(P1 87/83/65/68 + shift16 + space32)');
console.log('guest ->', codes('guest').join(','), '(P2 38/40/37/39)');
console.log('gate OK');
