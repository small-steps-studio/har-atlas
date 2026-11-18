'use strict';
// Builds a HAR text of about `bytes` characters for the large-file test (invented data, many entries).
function make(bytes) {
  const parts = ['{"log":{"version":"1.2","creator":{"name":"WebInspector","version":"537.36"},"entries":['];
  let size = parts[0].length, i = 0;
  while (size < bytes) {
    const host = ['shop', 'cdn', 'api', 'img'][i % 4] + '.example.test';
    const e = '{"startedDateTime":"2026-03-02T09:15:00.000Z","time":' + (i % 997) + ',"request":{"method":"GET","url":"https://' + host + '/asset/' + i + '.js?v=' + (i % 13) +
      '","headers":[],"queryString":[],"cookies":[],"headersSize":-1,"bodySize":0},"response":{"status":' + [200, 200, 304, 404, 500][i % 5] + ',"statusText":"","headers":[' +
      (i % 3 === 0 ? '{"name":"content-encoding","value":"gzip"}' : '') + '],"cookies":[],"content":{"size":' + (i % 50000) + ',"mimeType":"application/javascript"},"redirectURL":"","headersSize":200,"bodySize":' + (i % 20000) +
      '},"cache":{},"timings":{"blocked":1,"dns":-1,"connect":-1,"send":0.1,"wait":' + (i % 500) + ',"receive":2}}';
    parts.push((i ? ',' : '') + e); size += e.length + 1; i++;
  }
  parts.push(']}}');
  return parts.join('');
}
module.exports = { make };
