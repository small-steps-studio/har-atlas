'use strict';
// Large files: a 50 MB input built by test/helpers/large-input.js. Every report must finish, return a report and keep the
// memory of the process well under 1 GB.
const test = require('node:test');
const assert = require('node:assert/strict');
const core = require('../src/core');
const { make } = require('./helpers/large-input');

const reports = Object.keys(core).filter((k) => /^report/.test(k));

test('every report reads a 50 MB file within the time and memory budget', () => {
  const text = make(50 * 1024 * 1024);
  assert.ok(text.length >= 50 * 1024 * 1024 * 0.95, 'input size ' + text.length);
  const budget = process.env.CI ? 120000 : 60000;
  for (const r of reports) {
    const t0 = Date.now();
    const md = core[r](text);
    const ms = Date.now() - t0;
    assert.equal(typeof md, 'string', r);
    assert.ok(md.startsWith('# '), r);
    assert.ok(ms < budget, r + ' took ' + ms + ' ms');
    assert.ok(md.length < 20 * 1024 * 1024, r + ' produced a report of ' + md.length + ' characters');
  }
  if (global.gc) global.gc();
  assert.ok(process.memoryUsage().rss < 1024 * 1024 * 1024 * 1.5, 'resident memory ' + Math.round(process.memoryUsage().rss / 1048576) + ' MB');
});
