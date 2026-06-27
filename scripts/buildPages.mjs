#!/usr/bin/env node
import { spawnSync } from 'node:child_process';
import process from 'node:process';

const env = {
  ...process.env,
  VITE_RENDER_MODE: process.env.VITE_RENDER_MODE || 'isr',
  VITE_API_BASE: process.env.VITE_API_BASE || '/api',
  VITE_USE_WORKER: process.env.VITE_USE_WORKER || 'false',
};

function run(command, args) {
  const result = spawnSync(command, args, {
    stdio: 'inherit',
    env,
    shell: true,
  });

  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
}

run('npm', ['exec', '--', 'tsc', '-b']);
run('npm', ['exec', '--', 'vite', 'build']);
