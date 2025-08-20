#!/usr/bin/env node
const { spawn } = require('child_process');
const expoCli = require.resolve('expo/bin/cli');
const args = process.argv.slice(2);
process.env.EXPO_OFFLINE = '1';
const child = spawn(process.execPath, [expoCli, ...args], { stdio: 'inherit' });
child.on('close', (code) => process.exit(code));
