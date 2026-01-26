#!/usr/bin/env node
/* eslint-disable @typescript-eslint/no-require-imports */

const path = require('path')

const docPath = path.join('docs', 'AI_AGENTS.md')
const message = [
  '',
  '🔎 Reminder für Agents:',
  `- Lies dir die Dokumentation im Docs Folder durch (${docPath}) bevor du loslegst.`,
  '- Inhalt: Stack, Datenmodell, UI-Bausteine, Do/Don’ts.',
  '',
].join('\n')

console.log(message)
/* eslint-disable @typescript-eslint/no-require-imports */
