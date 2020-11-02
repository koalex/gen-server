import fs from 'fs';
import Debug from 'debug';
import esDirname from '../utils/dirname.js';

const pkg = JSON.parse(fs.readFileSync(`${esDirname(import.meta)}/../package.json`).toString());

export default Debug(pkg.name);
