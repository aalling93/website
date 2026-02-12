import { pbkdf2Sync, randomBytes } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import readline from 'node:readline/promises';
import { stdin as input, stdout as output } from 'node:process';

const ROOT = process.cwd();
const DATA_DIR = join(ROOT, 'data');
const USER_DB = join(DATA_DIR, 'users.json');
const USER_DB_TEMPLATE = join(DATA_DIR, 'users.example.json');

const iterations = 150000;
const keylen = 64;
const digest = 'sha512';

function hashPassword(password, salt) {
  return pbkdf2Sync(password, salt, iterations, keylen, digest).toString('hex');
}

async function loadDb() {
  await mkdir(DATA_DIR, { recursive: true });
  if (existsSync(USER_DB)) {
    const raw = await readFile(USER_DB, 'utf-8');
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed.users)) {
      parsed.users = [];
    }
    return parsed;
  }

  if (existsSync(USER_DB_TEMPLATE)) {
    const raw = await readFile(USER_DB_TEMPLATE, 'utf-8');
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed.users)) {
      parsed.users = [];
    }
    return parsed;
  }

  return { users: [] };
}

async function saveDb(db) {
  await writeFile(USER_DB, `${JSON.stringify(db, null, 2)}\n`, 'utf-8');
}

function usage() {
  console.log('Usage: npm run create-user -- <username>');
}

const username = process.argv[2];
if (!username) {
  usage();
  process.exit(1);
}

let password = process.argv[3];
let confirm = process.argv[4];

if (!password) {
  const rl = readline.createInterface({ input, output });
  password = await rl.question(`Password for ${username}: `);
  confirm = await rl.question('Confirm password: ');
  rl.close();
}

if (typeof confirm === 'undefined') {
  confirm = password;
}

if (!password || password.length < 10) {
  console.error('Password must be at least 10 characters.');
  process.exit(1);
}

if (password !== confirm) {
  console.error('Passwords do not match.');
  process.exit(1);
}

const db = await loadDb();
const salt = randomBytes(16).toString('hex');
const hash = hashPassword(password, salt);
const userRecord = {
  username,
  salt,
  hash,
  iterations,
  keylen,
  digest,
  createdAt: new Date().toISOString()
};

const existingIndex = db.users.findIndex((entry) => entry.username === username);
if (existingIndex >= 0) {
  db.users[existingIndex] = userRecord;
  await saveDb(db);
  console.log(`Updated existing user: ${username}`);
  process.exit(0);
}

db.users.push(userRecord);
await saveDb(db);
console.log(`Created user: ${username}`);
