'use strict';

function formatBytes(n) {
  if (typeof n !== 'number' || isNaN(n) || n < 0) return '0 B';
  if (n < 1024) return Math.floor(n) + ' B';
  if (n < 1048576) return (n / 1024).toFixed(1) + ' KB';
  return (n / 1048576).toFixed(1) + ' MB';
}

function statusClass(status) {
  if (status === 0 || status === undefined || status === null) return 'failed';
  if (status >= 200 && status <= 299) return '2xx';
  if (status >= 300 && status <= 399) return '3xx';
  if (status >= 400 && status <= 499) return '4xx';
  if (status >= 500 && status <= 599) return '5xx';
  return 'other';
}

function hostOf(url) {
  try {
    const u = new URL(url);
    return u.hostname.toLowerCase();
  } catch (e) {
    return '';
  }
}

function transferBytes(entry) {
  if (!entry || !entry.response) return 0;
  const r = entry.response;
  let bytes = 0;
  let hasBody = false;
  let hasHeaders = false;

  if (typeof r.bodySize === 'number' && r.bodySize >= 0) {
    bytes += r.bodySize;
    hasBody = true;
  }
  if (typeof r.headersSize === 'number' && r.headersSize >= 0) {
    bytes += r.headersSize;
    hasHeaders = true;
  }

  // Fall back to the content size only for web requests (data: and blob: URLs transfer nothing over the network).
  const url = entry.request && typeof entry.request.url === 'string' ? entry.request.url : '';
  if (!hasBody && !hasHeaders && (!url || isWeb(url))) {
    if (r.content && typeof r.content.size === 'number' && r.content.size > 0) {
      bytes = r.content.size;
    }
  }
  return bytes;
}

function timingBreakdown(entry) {
  const t = (entry && entry.timings) || {};
  const get = (k) => (typeof t[k] === 'number' && t[k] >= 0 ? t[k] : 0);

  const blocked = get('blocked');
  const dns = get('dns');
  const connect = get('connect');
  const ssl = get('ssl');
  const send = get('send');
  const wait = get('wait');
  const receive = get('receive');

  let total;
  if (entry && typeof entry.time === 'number' && entry.time >= 0) {
    total = entry.time;
  } else {
    total = blocked + dns + connect + send + wait + receive;
  }

  return {
    blocked,
    dns,
    connect,
    ssl,
    send,
    wait,
    receive,
    total
  };
}

// A finite number from a number or a numeric string; undefined for anything else (NaN, Infinity, objects, '').
function finite(v) {
  if (typeof v === 'number') return Number.isFinite(v) ? v : undefined;
  if (typeof v === 'string' && v.trim() !== '' && Number.isFinite(Number(v))) return Number(v);
  return undefined;
}
const str = (v) => (typeof v === 'string' ? v : '');
const obj = (v) => (v && typeof v === 'object' && !Array.isArray(v) ? v : {});

// Every field the reports read, with its proper type, so that damaged or unusual files never break a report.
function normalizeEntry(e) {
  const req = obj(e.request), res = obj(e.response), content = obj(res.content), t = obj(e.timings);
  const timings = {};
  for (const k of ['blocked', 'dns', 'connect', 'ssl', 'send', 'wait', 'receive']) { const n = finite(t[k]); timings[k] = n === undefined ? -1 : n; }
  const n = (v, d) => { const x = finite(v); return x === undefined ? d : x; };
  return {
    time: finite(e.time),
    timings: timings,
    request: { method: str(req.method), url: str(req.url) },
    response: {
      status: n(res.status, 0), statusText: str(res.statusText), bodySize: n(res.bodySize, -1), headersSize: n(res.headersSize, -1),
      content: { size: n(content.size, 0), mimeType: str(content.mimeType) },
      headers: (Array.isArray(res.headers) ? res.headers : []).filter((h) => h && typeof h.name === 'string').map((h) => ({ name: h.name, value: str(h.value) }))
    }
  };
}

function parseHAR(text) {
  if (typeof text !== 'string') {
    return { error: 'the input is not text' };
  }
  let data;
  try {
    data = JSON.parse(text.replace(/^﻿/, ''));   // some tools save HAR files with a byte order mark
  } catch (e) {
    return { error: 'the text is not JSON' };
  }
  if (!data || typeof data !== 'object' || !data.log || typeof data.log !== 'object') {
    return { error: 'the log object is missing' };
  }
  if (!Array.isArray(data.log.entries)) {
    return { error: 'log.entries is missing' };
  }
  // Entries that are not objects are skipped; every other entry is read through normalizeEntry.
  const entries = data.log.entries.filter((e) => e && typeof e === 'object' && !Array.isArray(e)).map(normalizeEntry);
  return { data: { log: { creator: obj(data.log.creator), pages: Array.isArray(data.log.pages) ? data.log.pages : [], entries: entries } } };
}

// Text from the file written into Markdown: line breaks become spaces and every character with a Markdown or HTML meaning
// is backslash-escaped, so a file can never add links, images, HTML or table cells to a report.
function md(s) {
  return String(s).replace(/[\r\n]+/g, ' ').replace(/([\\`*_{}\[\]()#+!|<>~&$])/g, '\\$1');
}
const escapePipe = md;
const isWeb = (url) => /^https?:\/\//i.test(url);
const MAX_ROWS = 500;
function capRows(lines, rows) {
  for (const r of rows.slice(0, MAX_ROWS)) lines.push(r);
  if (rows.length > MAX_ROWS) { lines.push(''); lines.push('Showing the first ' + MAX_ROWS + ' of ' + rows.length + ' rows.'); }
}

function reportSummary(text) {
  const heading = '# HAR Summary';
  const parsed = parseHAR(text);
  if (parsed.error) {
    return heading + '\n\nThis file is not a valid HAR file: ' + parsed.error + '.';
  }

  const entries = parsed.data.log.entries;
  if (entries.length === 0) {
    return heading + '\n\nThe HAR file contains no requests.';
  }

  const hosts = new Set();
  let totalBytes = 0;
  let totalTime = 0;
  let failedCount = 0;
  const statusCounts = {
    '2xx': 0,
    '3xx': 0,
    '4xx': 0,
    '5xx': 0,
    'failed': 0,
    'other': 0
  };

  for (const entry of entries) {
    const url = typeof entry.request.url === 'string' && entry.request.url ? entry.request.url : '';
    const host = hostOf(url);
    if (host) hosts.add(host);

    totalBytes += transferBytes(entry);
    totalTime += timingBreakdown(entry).total;

    const status = Number(entry.response.status) || 0;   // a missing status means no response (failed)
    const cls = statusClass(status);
    statusCounts[cls]++;

    if (status === 0 || status >= 400) {
      failedCount++;
    }
  }

  const hostCount = hosts.size;
  const reqCount = entries.length;
  const reqWord = reqCount === 1 ? 'request' : 'requests';
  const hostWord = hostCount === 1 ? 'host' : 'hosts';
  const failedWord = failedCount === 1 ? 'request' : 'requests';

  let lines = [];
  lines.push(heading);
  lines.push('');
  lines.push(
    reqCount + ' ' + reqWord + ' to ' + hostCount + ' ' + hostWord + ', ' +
    formatBytes(totalBytes) + ' transferred, ' +
    Math.round(totalTime) + ' ms summed over all requests.'
  );
  // Requests run in parallel, so the sum is not the load time; the page timing of the browser is shown when the file has it.
  const page = parsed.data.log.pages[0];
  const onLoad = page && page.pageTimings ? finite(page.pageTimings.onLoad) : undefined;
  if (onLoad !== undefined && onLoad >= 0) {
    lines.push('');
    lines.push('Page load (onLoad of the first page): ' + Math.round(onLoad) + ' ms.');
  }
  lines.push('');
  lines.push(failedCount + ' failed ' + failedWord + ' (no response, or status 400 and above).');
  lines.push('');
  lines.push('| Status | Requests |');
  lines.push('| --- | ---: |');

  const order = ['2xx', '3xx', '4xx', '5xx', 'failed', 'other'];
  for (const cls of order) {
    if (statusCounts[cls] > 0) {
      lines.push('| ' + (cls === 'failed' ? 'no response' : cls) + ' | ' + statusCounts[cls] + ' |');
    }
  }

  const creator = parsed.data.log.creator;
  if (typeof creator.name === 'string' && creator.name.trim()) {
    lines.push('');
    lines.push('Recorded with ' + md(creator.name.trim()) + (typeof creator.version === 'string' && creator.version.trim() ? ' ' + md(creator.version.trim()) : '') + '.');
  }

  return lines.join('\n');
}

function reportFailedRequests(text) {
  const heading = '# Failed Requests';
  const parsed = parseHAR(text);
  if (parsed.error) {
    return heading + '\n\nThis file is not a valid HAR file: ' + parsed.error + '.';
  }

  const entries = parsed.data.log.entries;
  if (entries.length === 0) {
    return heading + '\n\nThe HAR file contains no requests.';
  }

  const failed = [];
  for (const entry of entries) {
    const status = Number(entry.response.status) || 0;   // a missing status means no response (failed)
    if (status === 0 || status >= 400) {
      failed.push(entry);
    }
  }

  if (failed.length === 0) {
    return heading + '\n\nNo failed requests.';
  }

  const count = failed.length;
  const word = count === 1 ? 'request' : 'requests';

  let lines = [];
  lines.push(heading);
  lines.push('');
  lines.push(count + ' failed ' + word + '.');
  lines.push('');
  lines.push('| Status | Method | URL | Status text |');
  lines.push('| --- | --- | --- | --- |');

  capRows(lines, failed.map((entry) => {
    const status = Number(entry.response.status) || 0;   // a missing status means no response (failed)
    const method = typeof entry.request.method === 'string' && entry.request.method ? entry.request.method : '-';
    const url = typeof entry.request.url === 'string' && entry.request.url ? entry.request.url : '-';
    const statusText = typeof entry.response.statusText === 'string' ? entry.response.statusText : '';
    return '| ' + status + ' | ' + escapePipe(method) + ' | ' + escapePipe(url) + ' | ' + escapePipe(statusText) + ' |';
  }));

  return lines.join('\n');
}

function reportSlowestRequests(text) {
  const heading = '# Slowest Requests';
  const parsed = parseHAR(text);
  if (parsed.error) {
    return heading + '\n\nThis file is not a valid HAR file: ' + parsed.error + '.';
  }

  const entries = parsed.data.log.entries;
  if (entries.length === 0) {
    return heading + '\n\nThe HAR file contains no requests.';
  }

  const indexed = entries.map((entry, i) => ({ entry, i, total: timingBreakdown(entry).total }));
  indexed.sort((a, b) => {
    if (b.total !== a.total) return b.total - a.total;
    return a.i - b.i;
  });

  const top = indexed.slice(0, 10);

  let lines = [];
  lines.push(heading);
  lines.push('');
  lines.push('| # | Time | Method | Status | Wait | URL |');
  lines.push('| ---: | ---: | --- | ---: | ---: | --- |');

  top.forEach((item, idx) => {
    const entry = item.entry;
    const tb = timingBreakdown(entry);
    const status = Number(entry.response.status) || 0;   // a missing status means no response (failed)
    const method = typeof entry.request.method === 'string' && entry.request.method ? entry.request.method : '-';
    const url = typeof entry.request.url === 'string' && entry.request.url ? entry.request.url : '-';
    lines.push(
      '| ' + (idx + 1) + ' | ' + Math.round(tb.total) + ' ms | ' + escapePipe(method) + ' | ' + status + ' | ' + Math.round(tb.wait) + ' ms | ' + escapePipe(url) + ' |'
    );
  });

  return lines.join('\n');
}

function reportHostBreakdown(text) {
  const heading = '# Host Breakdown';
  const parsed = parseHAR(text);
  if (parsed.error) {
    return heading + '\n\nThis file is not a valid HAR file: ' + parsed.error + '.';
  }

  const entries = parsed.data.log.entries;
  if (entries.length === 0) {
    return heading + '\n\nThe HAR file contains no requests.';
  }

  const hostMap = new Map();

  for (const entry of entries) {
    const url = typeof entry.request.url === 'string' && entry.request.url ? entry.request.url : '';
    // Entries without a host (data:, blob: URLs) are counted in one '(no host)' row, so the rows add up to every request.
    const host = hostOf(url) || '(no host)';

    if (!hostMap.has(host)) {
      hostMap.set(host, {
        requests: 0,
        bytes: 0,
        time: 0,
        waitSum: 0,
        errors: 0
      });
    }

    const stats = hostMap.get(host);
    stats.requests++;
    stats.bytes += transferBytes(entry);
    const tb = timingBreakdown(entry);
    stats.time += tb.total;
    stats.waitSum += tb.wait;

    const status = Number(entry.response.status) || 0;   // a missing status means no response (failed)
    if (status === 0 || status >= 400) {
      stats.errors++;
    }
  }

  const hosts = Array.from(hostMap.entries()).map(([host, stats]) => ({
    host,
    ...stats,
    avgWait: stats.requests > 0 ? Math.round(stats.waitSum / stats.requests) : 0
  }));

  hosts.sort((a, b) => {
    if (b.requests !== a.requests) return b.requests - a.requests;
    if (b.bytes !== a.bytes) return b.bytes - a.bytes;
    return a.host.localeCompare(b.host);
  });

  let lines = [];
  lines.push(heading);
  lines.push('');
  lines.push('| Host | Requests | Transferred | Time | Avg wait | Errors |');
  lines.push('| --- | ---: | ---: | ---: | ---: | ---: |');

  capRows(lines, hosts.map((h) =>
    '| ' + (h.host === '(no host)' ? h.host : escapePipe(h.host)) + ' | ' + h.requests + ' | ' + formatBytes(h.bytes) + ' | ' + Math.round(h.time) + ' ms | ' + h.avgWait + ' ms | ' + h.errors + ' |'));

  return lines.join('\n');
}

function reportCachingCompression(text) {
  const heading = '# Caching and Compression';
  const parsed = parseHAR(text);
  if (parsed.error) {
    return heading + '\n\nThis file is not a valid HAR file: ' + parsed.error + '.';
  }

  const entries = parsed.data.log.entries;
  if (entries.length === 0) {
    return heading + '\n\nThe HAR file contains no requests.';
  }

  const isTextResponse = (entry) => {
    const mime = entry.response && entry.response.content ? entry.response.content.mimeType : '';
    if (typeof mime !== 'string' || !mime) return false;
    const m = mime.toLowerCase();
    return m.startsWith('text/') || m.includes('javascript') || m.includes('json') || m.includes('xml') || m.includes('svg');
  };

  const hasHeader = (entry, name) => {
    const headers = entry.response && Array.isArray(entry.response.headers) ? entry.response.headers : [];
    return headers.some((h) => h && typeof h.name === 'string' && h.name.toLowerCase() === name.toLowerCase());
  };

  const uncompressed = [];
  const noCaching = [];
  let compressedCount = 0;
  let compressedSize = 0;
  let compressedBodySize = 0;

  // A response counts as compressed when it has a Content-Encoding other than 'identity'.
  const encoded = (entry) => entry.response.headers.some((h) => h.name.toLowerCase() === 'content-encoding' && h.value.trim().toLowerCase() !== 'identity' && h.value.trim() !== '');

  for (const entry of entries) {
    const url = typeof entry.request.url === 'string' && entry.request.url ? entry.request.url : '';
    if (!isWeb(url)) continue;   // data:, blob: and other local URLs are never sent or cached by a server
    const status = Number(entry.response.status) || 0;   // a missing status means no response (failed)
    const content = entry.response.content && typeof entry.response.content === 'object' ? entry.response.content : {};
    const size = content.size || 0;
    const bodySize = entry.response ? entry.response.bodySize : 0;

    if (isTextResponse(entry) && size > 1024 && !encoded(entry)) {
      uncompressed.push({ url, size });
    }

    if (status >= 200 && status <= 299) {
      const hasCache =
        hasHeader(entry, 'Cache-Control') ||
        hasHeader(entry, 'Expires') ||
        hasHeader(entry, 'ETag') ||
        hasHeader(entry, 'Last-Modified');
      if (!hasCache) {
        noCaching.push({ url, type: content.mimeType || '' });
      }
    }

    if (encoded(entry) && size > 0 && bodySize > 0) {
      compressedCount++;
      compressedSize += size;
      compressedBodySize += bodySize;
    }
  }

  let lines = [];
  lines.push(heading);
  lines.push('');

  lines.push('## Uncompressed text responses');
  lines.push('');
  if (uncompressed.length === 0) {
    lines.push('0 uncompressed text responses.');
  } else {
    const word = uncompressed.length === 1 ? 'response' : 'responses';
    lines.push(uncompressed.length + ' uncompressed text ' + word + '.');
    lines.push('');
    lines.push('| URL | Size |');
    lines.push('| --- | ---: |');
    capRows(lines, uncompressed.map((item) => '| ' + escapePipe(item.url) + ' | ' + formatBytes(item.size) + ' |'));
  }
  lines.push('');

  lines.push('## Responses without caching headers');
  lines.push('');
  if (noCaching.length === 0) {
    lines.push('0 responses without caching headers.');
  } else {
    const word = noCaching.length === 1 ? 'response' : 'responses';
    lines.push(noCaching.length + ' response' + (noCaching.length === 1 ? '' : 's') + ' without caching headers.');
    lines.push('');
    lines.push('| URL | Type |');
    lines.push('| --- | --- |');
    capRows(lines, noCaching.map((item) => '| ' + escapePipe(item.url) + ' | ' + (item.type ? escapePipe(item.type) : '-') + ' |'));
  }
  lines.push('');

  lines.push('## Compression savings');
  lines.push('');
  if (compressedCount === 0) {
    lines.push('No compressed responses.');
  } else {
    lines.push(
      formatBytes(compressedSize) + ' compressed to ' + formatBytes(compressedBodySize) + ' over ' + compressedCount + ' response' + (compressedCount === 1 ? '' : 's') + '.'
    );
  }

  return lines.join('\n');
}

module.exports = {
  formatBytes,
  statusClass,
  hostOf,
  transferBytes,
  timingBreakdown,
  reportSummary,
  reportFailedRequests,
  reportSlowestRequests,
  reportHostBreakdown,
  reportCachingCompression
};
