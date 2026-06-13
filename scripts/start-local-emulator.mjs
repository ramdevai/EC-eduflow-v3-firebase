import { existsSync, mkdirSync } from 'node:fs';
import { spawn } from 'node:child_process';

const exportDirectory = '.firebase/emulator-data';
mkdirSync('.firebase', { recursive: true });
const runApp = process.argv.includes('--exec');
const args = [
  runApp ? 'emulators:exec' : 'emulators:start',
  '--project',
  'demo-eduflow-local',
  '--only',
  'firestore',
];

if (existsSync(`${exportDirectory}/firebase-export-metadata.json`)) {
  args.push('--import', exportDirectory);
}

args.push('--export-on-exit', exportDirectory);

if (runApp) {
  args.push('npm run dev:app');
}

const child = spawn('firebase', args, {
  stdio: 'inherit',
  env: {
    ...process.env,
    NEXT_PUBLIC_APP_ENV: 'local',
    FIRESTORE_EMULATOR_HOST: '127.0.0.1:8080',
  },
});

child.on('exit', (code, signal) => {
  if (signal) {
    process.kill(process.pid, signal);
    return;
  }
  process.exit(code ?? 1);
});
