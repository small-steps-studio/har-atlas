'use strict';
// Hostile and odd HAR inputs for the adversarial test (invented; the payloads must come out as plain escaped text).
const PAY = ['Bad\nGateway | <b>x</b> [link](https://evil.test)', '![t](https://evil.test/p.png)', '<img src=https://evil.test/i.png>', '`code` *b* _i_ ~s~ # h', '<script>alert(1)</script>', 'a|b|c', '&lt;&amp;', '\\| escaped', 'Cost $5 and $x$ here', '?a=$b$&c'];
function har(entries, extra) { return JSON.stringify({ log: Object.assign({ version: '1.2', entries }, extra || {}) }); }
function entry(o) {
  return Object.assign({ time: 10, request: { method: 'GET', url: 'https://ok.example.test/' }, response: { status: 200, statusText: 'OK', headers: [], content: { size: 5000, mimeType: 'text/html' }, bodySize: 5000, headersSize: 100 }, timings: { send: 1, wait: 5, receive: 4 } }, o);
}
const cases = [];
PAY.forEach((p, i) => {
  cases.push({ name: 'statusText ' + i, text: har([entry({ response: { status: 503, statusText: p, headers: [], content: { size: 10, mimeType: 'text/plain' }, bodySize: 10, headersSize: 1 } })]) });
  cases.push({ name: 'url ' + i, text: har([entry({ request: { method: 'GET', url: 'https://x.example.test/?a=' + p }, response: { status: 404, statusText: '', headers: [], content: { size: 3000, mimeType: 'text/html' }, bodySize: 3000, headersSize: 1 } })]) });
  cases.push({ name: 'method ' + i, text: har([entry({ request: { method: p, url: 'https://x.example.test/' }, response: { status: 500, statusText: 'x', headers: [], content: { size: 1, mimeType: 'x' }, bodySize: 1, headersSize: 1 } })]) });
  cases.push({ name: 'mime ' + i, text: har([entry({ response: { status: 200, statusText: 'OK', headers: [], content: { size: 1, mimeType: p }, bodySize: 1, headersSize: 1 } })]) });
  cases.push({ name: 'creator ' + i, text: har([entry({})], { creator: { name: p, version: p } }) });
});
cases.push({ name: 'mime is a number', text: har([entry({ response: { status: 200, headers: [], content: { size: 5000, mimeType: 5 }, bodySize: 5000 } })]) });
cases.push({ name: 'sizes as strings', text: har([entry({ response: { status: '200', headers: [], content: { size: '3000', mimeType: 'text/html' }, bodySize: '3000', headersSize: '10' } })]) });
cases.push({ name: 'infinite time', text: '{"log":{"entries":[{"time":1e400,"request":{"url":"https://a.example.test/"},"response":{"status":200}}]}}' });
cases.push({ name: 'creator object name', text: har([entry({})], { creator: { name: { a: 1 }, version: 7 } }) });
cases.push({ name: 'identity encoding', text: har([entry({ response: { status: 200, headers: [{ name: 'Content-Encoding', value: 'identity' }], content: { size: 5000, mimeType: 'text/html' }, bodySize: 5000, headersSize: 1 } })]) });
cases.push({ name: 'headers not an array', text: har([entry({ response: { status: 200, headers: 'x', content: { size: 1 } } })]) });
module.exports = { cases };
