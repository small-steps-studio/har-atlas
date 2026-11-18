'use strict';
// Contract tests: written from the specification examples. Do not edit; fix src/core.js instead.
const test = require('node:test');
const assert = require('node:assert/strict');
const core = require('../src/core');

const plain = (v) => JSON.parse(JSON.stringify(v === undefined ? null : v));

test('core exports every specified function', () => {
  for (const n of ["formatBytes", "statusClass", "hostOf", "transferBytes", "timingBreakdown", "reportSummary", "reportFailedRequests", "reportSlowestRequests", "reportHostBreakdown", "reportCachingCompression"]) assert.equal(typeof core[n], 'function', n);
});

test("formatBytes example 1", () => {
  assert.deepStrictEqual(plain(core.formatBytes(0)), "0 B");
});

test("formatBytes example 2", () => {
  assert.deepStrictEqual(plain(core.formatBytes(512)), "512 B");
});

test("formatBytes example 3", () => {
  assert.deepStrictEqual(plain(core.formatBytes(95870)), "93.6 KB");
});

test("formatBytes example 4", () => {
  assert.deepStrictEqual(plain(core.formatBytes(1048576)), "1.0 MB");
});

test("statusClass example 1", () => {
  assert.deepStrictEqual(plain(core.statusClass(0)), "failed");
});

test("statusClass example 2", () => {
  assert.deepStrictEqual(plain(core.statusClass(204)), "2xx");
});

test("statusClass example 3", () => {
  assert.deepStrictEqual(plain(core.statusClass(404)), "4xx");
});

test("statusClass example 4", () => {
  assert.deepStrictEqual(plain(core.statusClass(101)), "other");
});

test("hostOf example 1", () => {
  assert.deepStrictEqual(plain(core.hostOf("https://API.Example.com:8443/a?b=1")), "api.example.com");
});

test("hostOf example 2", () => {
  assert.deepStrictEqual(plain(core.hostOf("not a url")), "");
});

test("transferBytes example 1", () => {
  assert.deepStrictEqual(plain(core.transferBytes({"response": {"bodySize": 5000, "headersSize": 300, "content": {"size": 20000}}})), 5300);
});

test("transferBytes example 2", () => {
  assert.deepStrictEqual(plain(core.transferBytes({"response": {"bodySize": -1, "headersSize": -1, "content": {"size": 700}}})), 700);
});

test("transferBytes example 3", () => {
  assert.deepStrictEqual(plain(core.transferBytes({"response": {}})), 0);
});

test("timingBreakdown example 1", () => {
  assert.deepStrictEqual(plain(core.timingBreakdown({"time": 130, "timings": {"blocked": -1, "dns": 5, "connect": 20, "ssl": 12, "send": 1, "wait": 100, "receive": 4}})), {"blocked": 0, "dns": 5, "connect": 20, "ssl": 12, "send": 1, "wait": 100, "receive": 4, "total": 130});
});

test("timingBreakdown example 2", () => {
  assert.deepStrictEqual(plain(core.timingBreakdown({"timings": {"dns": -1, "connect": -1, "send": 2, "wait": 50, "receive": 8}})), {"blocked": 0, "dns": 0, "connect": 0, "ssl": 0, "send": 2, "wait": 50, "receive": 8, "total": 60});
});

test("reportSummary example 1", () => {
  const md = core.reportSummary("{\"log\": {\"version\": \"1.2\", \"creator\": {\"name\": \"Firefox\", \"version\": \"120\"}, \"pages\": [{\"id\": \"page_1\", \"title\": \"Shop\"}], \"entries\": [{\"pageref\": \"page_1\", \"startedDateTime\": \"2026-01-05T10:00:00.000Z\", \"time\": 130, \"request\": {\"method\": \"GET\", \"url\": \"https://shop.example.com/\", \"headers\": []}, \"response\": {\"status\": 200, \"statusText\": \"OK\", \"headers\": [{\"name\": \"Cache-Control\", \"value\": \"max-age=60\"}, {\"name\": \"Content-Encoding\", \"value\": \"gzip\"}], \"content\": {\"size\": 20000, \"mimeType\": \"text/html\"}, \"bodySize\": 5000, \"headersSize\": 300}, \"timings\": {\"blocked\": -1, \"dns\": 5, \"connect\": 20, \"ssl\": 12, \"send\": 1, \"wait\": 100, \"receive\": 4}}, {\"pageref\": \"page_1\", \"startedDateTime\": \"2026-01-05T10:00:00.200Z\", \"time\": 900, \"request\": {\"method\": \"POST\", \"url\": \"https://api.example.com/cart\", \"headers\": []}, \"response\": {\"status\": 503, \"statusText\": \"Service Unavailable\", \"headers\": [], \"content\": {\"size\": 120, \"mimeType\": \"application/json\"}, \"bodySize\": 120, \"headersSize\": 200}, \"timings\": {\"blocked\": 0, \"dns\": 0, \"connect\": 0, \"send\": 2, \"wait\": 880, \"receive\": 18}}, {\"pageref\": \"page_1\", \"startedDateTime\": \"2026-01-05T10:00:00.300Z\", \"time\": 40, \"request\": {\"method\": \"GET\", \"url\": \"https://cdn.example.net/app.js\", \"headers\": []}, \"response\": {\"status\": 200, \"statusText\": \"OK\", \"headers\": [], \"content\": {\"size\": 90000, \"mimeType\": \"application/javascript\"}, \"bodySize\": 90000, \"headersSize\": 250}, \"timings\": {\"send\": 1, \"wait\": 30, \"receive\": 9}}]}}");
  assert.equal(typeof md, 'string');
  for (const s of ["# HAR Summary", "3 requests to 3 hosts, 93.6 KB transferred, 1070 ms summed over all requests.", "1 failed request (no response, or status 400 and above).", "| 2xx | 2 |", "| 5xx | 1 |", "Recorded with Firefox 120."]) assert.ok(md.includes(s), 'missing: ' + s);
});

test("reportSummary example 2", () => {
  const md = core.reportSummary("this is not a HAR file");
  assert.equal(typeof md, 'string');
  for (const s of ["# HAR Summary", "This file is not a valid HAR file"]) assert.ok(md.includes(s), 'missing: ' + s);
});

test("reportFailedRequests example 1", () => {
  const md = core.reportFailedRequests("{\"log\": {\"version\": \"1.2\", \"creator\": {\"name\": \"Firefox\", \"version\": \"120\"}, \"pages\": [{\"id\": \"page_1\", \"title\": \"Shop\"}], \"entries\": [{\"pageref\": \"page_1\", \"startedDateTime\": \"2026-01-05T10:00:00.000Z\", \"time\": 130, \"request\": {\"method\": \"GET\", \"url\": \"https://shop.example.com/\", \"headers\": []}, \"response\": {\"status\": 200, \"statusText\": \"OK\", \"headers\": [{\"name\": \"Cache-Control\", \"value\": \"max-age=60\"}, {\"name\": \"Content-Encoding\", \"value\": \"gzip\"}], \"content\": {\"size\": 20000, \"mimeType\": \"text/html\"}, \"bodySize\": 5000, \"headersSize\": 300}, \"timings\": {\"blocked\": -1, \"dns\": 5, \"connect\": 20, \"ssl\": 12, \"send\": 1, \"wait\": 100, \"receive\": 4}}, {\"pageref\": \"page_1\", \"startedDateTime\": \"2026-01-05T10:00:00.200Z\", \"time\": 900, \"request\": {\"method\": \"POST\", \"url\": \"https://api.example.com/cart\", \"headers\": []}, \"response\": {\"status\": 503, \"statusText\": \"Service Unavailable\", \"headers\": [], \"content\": {\"size\": 120, \"mimeType\": \"application/json\"}, \"bodySize\": 120, \"headersSize\": 200}, \"timings\": {\"blocked\": 0, \"dns\": 0, \"connect\": 0, \"send\": 2, \"wait\": 880, \"receive\": 18}}, {\"pageref\": \"page_1\", \"startedDateTime\": \"2026-01-05T10:00:00.300Z\", \"time\": 40, \"request\": {\"method\": \"GET\", \"url\": \"https://cdn.example.net/app.js\", \"headers\": []}, \"response\": {\"status\": 200, \"statusText\": \"OK\", \"headers\": [], \"content\": {\"size\": 90000, \"mimeType\": \"application/javascript\"}, \"bodySize\": 90000, \"headersSize\": 250}, \"timings\": {\"send\": 1, \"wait\": 30, \"receive\": 9}}]}}");
  assert.equal(typeof md, 'string');
  for (const s of ["# Failed Requests", "1 failed request.", "| 503 | POST | https://api.example.com/cart | Service Unavailable |"]) assert.ok(md.includes(s), 'missing: ' + s);
});

test("reportFailedRequests example 2", () => {
  const md = core.reportFailedRequests("this is not a HAR file");
  assert.equal(typeof md, 'string');
  for (const s of ["# Failed Requests", "This file is not a valid HAR file"]) assert.ok(md.includes(s), 'missing: ' + s);
});

test("reportSlowestRequests example 1", () => {
  const md = core.reportSlowestRequests("{\"log\": {\"version\": \"1.2\", \"creator\": {\"name\": \"Firefox\", \"version\": \"120\"}, \"pages\": [{\"id\": \"page_1\", \"title\": \"Shop\"}], \"entries\": [{\"pageref\": \"page_1\", \"startedDateTime\": \"2026-01-05T10:00:00.000Z\", \"time\": 130, \"request\": {\"method\": \"GET\", \"url\": \"https://shop.example.com/\", \"headers\": []}, \"response\": {\"status\": 200, \"statusText\": \"OK\", \"headers\": [{\"name\": \"Cache-Control\", \"value\": \"max-age=60\"}, {\"name\": \"Content-Encoding\", \"value\": \"gzip\"}], \"content\": {\"size\": 20000, \"mimeType\": \"text/html\"}, \"bodySize\": 5000, \"headersSize\": 300}, \"timings\": {\"blocked\": -1, \"dns\": 5, \"connect\": 20, \"ssl\": 12, \"send\": 1, \"wait\": 100, \"receive\": 4}}, {\"pageref\": \"page_1\", \"startedDateTime\": \"2026-01-05T10:00:00.200Z\", \"time\": 900, \"request\": {\"method\": \"POST\", \"url\": \"https://api.example.com/cart\", \"headers\": []}, \"response\": {\"status\": 503, \"statusText\": \"Service Unavailable\", \"headers\": [], \"content\": {\"size\": 120, \"mimeType\": \"application/json\"}, \"bodySize\": 120, \"headersSize\": 200}, \"timings\": {\"blocked\": 0, \"dns\": 0, \"connect\": 0, \"send\": 2, \"wait\": 880, \"receive\": 18}}, {\"pageref\": \"page_1\", \"startedDateTime\": \"2026-01-05T10:00:00.300Z\", \"time\": 40, \"request\": {\"method\": \"GET\", \"url\": \"https://cdn.example.net/app.js\", \"headers\": []}, \"response\": {\"status\": 200, \"statusText\": \"OK\", \"headers\": [], \"content\": {\"size\": 90000, \"mimeType\": \"application/javascript\"}, \"bodySize\": 90000, \"headersSize\": 250}, \"timings\": {\"send\": 1, \"wait\": 30, \"receive\": 9}}]}}");
  assert.equal(typeof md, 'string');
  for (const s of ["# Slowest Requests", "| 1 | 900 ms | POST | 503 | 880 ms | https://api.example.com/cart |", "| 3 | 40 ms | GET | 200 | 30 ms | https://cdn.example.net/app.js |"]) assert.ok(md.includes(s), 'missing: ' + s);
});

test("reportSlowestRequests example 2", () => {
  const md = core.reportSlowestRequests("this is not a HAR file");
  assert.equal(typeof md, 'string');
  for (const s of ["# Slowest Requests", "This file is not a valid HAR file"]) assert.ok(md.includes(s), 'missing: ' + s);
});

test("reportHostBreakdown example 1", () => {
  const md = core.reportHostBreakdown("{\"log\": {\"version\": \"1.2\", \"creator\": {\"name\": \"Firefox\", \"version\": \"120\"}, \"pages\": [{\"id\": \"page_1\", \"title\": \"Shop\"}], \"entries\": [{\"pageref\": \"page_1\", \"startedDateTime\": \"2026-01-05T10:00:00.000Z\", \"time\": 130, \"request\": {\"method\": \"GET\", \"url\": \"https://shop.example.com/\", \"headers\": []}, \"response\": {\"status\": 200, \"statusText\": \"OK\", \"headers\": [{\"name\": \"Cache-Control\", \"value\": \"max-age=60\"}, {\"name\": \"Content-Encoding\", \"value\": \"gzip\"}], \"content\": {\"size\": 20000, \"mimeType\": \"text/html\"}, \"bodySize\": 5000, \"headersSize\": 300}, \"timings\": {\"blocked\": -1, \"dns\": 5, \"connect\": 20, \"ssl\": 12, \"send\": 1, \"wait\": 100, \"receive\": 4}}, {\"pageref\": \"page_1\", \"startedDateTime\": \"2026-01-05T10:00:00.200Z\", \"time\": 900, \"request\": {\"method\": \"POST\", \"url\": \"https://api.example.com/cart\", \"headers\": []}, \"response\": {\"status\": 503, \"statusText\": \"Service Unavailable\", \"headers\": [], \"content\": {\"size\": 120, \"mimeType\": \"application/json\"}, \"bodySize\": 120, \"headersSize\": 200}, \"timings\": {\"blocked\": 0, \"dns\": 0, \"connect\": 0, \"send\": 2, \"wait\": 880, \"receive\": 18}}, {\"pageref\": \"page_1\", \"startedDateTime\": \"2026-01-05T10:00:00.300Z\", \"time\": 40, \"request\": {\"method\": \"GET\", \"url\": \"https://cdn.example.net/app.js\", \"headers\": []}, \"response\": {\"status\": 200, \"statusText\": \"OK\", \"headers\": [], \"content\": {\"size\": 90000, \"mimeType\": \"application/javascript\"}, \"bodySize\": 90000, \"headersSize\": 250}, \"timings\": {\"send\": 1, \"wait\": 30, \"receive\": 9}}]}}");
  assert.equal(typeof md, 'string');
  for (const s of ["# Host Breakdown", "| cdn.example.net | 1 | 88.1 KB | 40 ms | 30 ms | 0 |", "| shop.example.com | 1 | 5.2 KB | 130 ms | 100 ms | 0 |", "| api.example.com | 1 | 320 B | 900 ms | 880 ms | 1 |"]) assert.ok(md.includes(s), 'missing: ' + s);
});

test("reportHostBreakdown example 2", () => {
  const md = core.reportHostBreakdown("this is not a HAR file");
  assert.equal(typeof md, 'string');
  for (const s of ["# Host Breakdown", "This file is not a valid HAR file"]) assert.ok(md.includes(s), 'missing: ' + s);
});

test("reportCachingCompression example 1", () => {
  const md = core.reportCachingCompression("{\"log\": {\"version\": \"1.2\", \"creator\": {\"name\": \"Firefox\", \"version\": \"120\"}, \"pages\": [{\"id\": \"page_1\", \"title\": \"Shop\"}], \"entries\": [{\"pageref\": \"page_1\", \"startedDateTime\": \"2026-01-05T10:00:00.000Z\", \"time\": 130, \"request\": {\"method\": \"GET\", \"url\": \"https://shop.example.com/\", \"headers\": []}, \"response\": {\"status\": 200, \"statusText\": \"OK\", \"headers\": [{\"name\": \"Cache-Control\", \"value\": \"max-age=60\"}, {\"name\": \"Content-Encoding\", \"value\": \"gzip\"}], \"content\": {\"size\": 20000, \"mimeType\": \"text/html\"}, \"bodySize\": 5000, \"headersSize\": 300}, \"timings\": {\"blocked\": -1, \"dns\": 5, \"connect\": 20, \"ssl\": 12, \"send\": 1, \"wait\": 100, \"receive\": 4}}, {\"pageref\": \"page_1\", \"startedDateTime\": \"2026-01-05T10:00:00.200Z\", \"time\": 900, \"request\": {\"method\": \"POST\", \"url\": \"https://api.example.com/cart\", \"headers\": []}, \"response\": {\"status\": 503, \"statusText\": \"Service Unavailable\", \"headers\": [], \"content\": {\"size\": 120, \"mimeType\": \"application/json\"}, \"bodySize\": 120, \"headersSize\": 200}, \"timings\": {\"blocked\": 0, \"dns\": 0, \"connect\": 0, \"send\": 2, \"wait\": 880, \"receive\": 18}}, {\"pageref\": \"page_1\", \"startedDateTime\": \"2026-01-05T10:00:00.300Z\", \"time\": 40, \"request\": {\"method\": \"GET\", \"url\": \"https://cdn.example.net/app.js\", \"headers\": []}, \"response\": {\"status\": 200, \"statusText\": \"OK\", \"headers\": [], \"content\": {\"size\": 90000, \"mimeType\": \"application/javascript\"}, \"bodySize\": 90000, \"headersSize\": 250}, \"timings\": {\"send\": 1, \"wait\": 30, \"receive\": 9}}]}}");
  assert.equal(typeof md, 'string');
  for (const s of ["# Caching and Compression", "1 uncompressed text response.", "| https://cdn.example.net/app.js | 87.9 KB |", "1 response without caching headers.", "| https://cdn.example.net/app.js | application/javascript |", "19.5 KB compressed to 4.9 KB over 1 response."]) assert.ok(md.includes(s), 'missing: ' + s);
});

test("reportCachingCompression example 2", () => {
  const md = core.reportCachingCompression("this is not a HAR file");
  assert.equal(typeof md, 'string');
  for (const s of ["# Caching and Compression", "This file is not a valid HAR file"]) assert.ok(md.includes(s), 'missing: ' + s);
});
