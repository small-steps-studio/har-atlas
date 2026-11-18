# Reports

Every report reads the text of the active editor and opens its result as a new Markdown document. Your file is never changed and nothing is sent anywhere. The examples below come from the sample file (Open Sample File).

## Show Summary

Command: **HAR Atlas: Show Summary**

Shows how many requests the page made and to how many hosts, how many bytes went over the network, how many requests failed (no response, or a status of 400 and above) and how the responses split into 2xx, 3xx, 4xx and 5xx. When the browser recorded it, the page load time (onLoad) is shown too. The time line adds up the duration of every request; because browsers load many requests at the same time, this sum is larger than the time the page took to load.

Example (sample file):

> # HAR Summary
>
> 8 requests to 4 hosts, 307.3 KB transferred, 2539 ms summed over all requests.
>
> Page load (onLoad of the first page): 1640 ms.
>
> 2 failed requests (no response, or status 400 and above).
>
> | Status | Requests |
> | --- | ---: |
> | 2xx | 4 |
> | 3xx | 2 |
> | 5xx | 1 |
> | no response | 1 |
>
> Recorded with WebInspector 537.36.

## Show Failed Requests

Command: **HAR Atlas: Show Failed Requests**

Lists every request that received no response (status 0, for example blocked by the browser or a network error) or a status of 400 and above, in the order they were made, with the method, the URL and the status text. Start here when someone reports that a page is broken.

Example (sample file):

> # Failed Requests
>
> 2 failed requests.
>
> | Status | Method | URL | Status text |
> | --- | --- | --- | --- |
> | 0 | GET | https://ads.tracker.example.test/pixel.gif |  |
> | 502 | POST | https://api.example.test/v2/checkout | Bad Gateway |

## Show Slowest Requests

Command: **HAR Atlas: Show Slowest Requests**

Lists the ten requests that took longest, with their total time and their wait time: the time from sending the request to receiving the first byte of the answer. A long wait points at the server; a long total with a short wait points at a large download or a slow connection.

Example (sample file):

> # Slowest Requests
>
> | # | Time | Method | Status | Wait | URL |
> | ---: | ---: | --- | ---: | ---: | --- |
> | 1 | 2041 ms | POST | 502 | 2030 ms | https://api.example.test/v2/checkout |
> | 2 | 183 ms | GET | 200 | 109 ms | https://shop.example.test/ |
> | 3 | 140 ms | GET | 200 | 120 ms | https://shop.example.test/styles/site.css |
> | 4 | 96 ms | GET | 301 | 50 ms | http://shop.example.test/old-path |
> | 5 | 64 ms | GET | 200 | 30 ms | https://cdn.example-static.test/app.min.js?v=7\|beta |
> | 6 | 13 ms | GET | 304 | 11 ms | https://cdn.example-static.test/logo.svg |
> | 7 | 3 ms | GET | 200 | 0 ms | data:image/png;base64,iVBORw0KGgo= |
> | 8 | 0 ms | GET | 0 | 0 ms | https://ads.tracker.example.test/pixel.gif |

## Show Host Breakdown (Pro)

Command: **HAR Atlas: Show Host Breakdown** (Pro; part of the 14-day trial)

Groups the requests by host and shows, for each one, the number of requests, the bytes transferred, the time spent, the average wait (time to first byte) and the number of failed requests. Useful to see how much of a page comes from your own servers and how much from content delivery networks, analytics and other third parties. Requests without a host (data: and blob: URLs) are counted in a row named (no host), so the rows always add up to every request.

Example (sample file):

> # Host Breakdown
>
> | Host | Requests | Transferred | Time | Avg wait | Errors |
> | --- | ---: | ---: | ---: | ---: | ---: |
> | shop.example.test | 3 | 11.7 KB | 418 ms | 93 ms | 0 |
> | cdn.example-static.test | 2 | 295.2 KB | 77 ms | 21 ms | 0 |
> | api.example.test | 1 | 388 B | 2041 ms | 2030 ms | 1 |
> | (no host) | 1 | 0 B | 3 ms | 0 ms | 0 |
> | ads.tracker.example.test | 1 | 0 B | 0 ms | 0 ms | 1 |

## Show Caching And Compression (Pro)

Command: **HAR Atlas: Show Caching And Compression** (Pro; part of the 14-day trial)

Checks the responses from web servers for two common performance problems: text responses (HTML, CSS, JavaScript, JSON, XML, SVG) larger than 1 KB that were sent without compression, and successful responses that carry none of the caching headers Cache-Control, Expires, ETag or Last-Modified. It also adds up how much the compressed responses saved. Local data: and blob: URLs are left out, because no server sends them.

Example (sample file):

> # Caching and Compression
>
> ## Uncompressed text responses
>
> 2 uncompressed text responses.
>
> | URL | Size |
> | --- | ---: |
> | https://cdn.example-static.test/app.min.js?v=7\|beta | 294.8 KB |
> | https://shop.example.test/styles/site.css | 2.0 KB |
>
> ## Responses without caching headers
>
> 1 response without caching headers.
>
> | URL | Type |
> | --- | --- |
> | https://shop.example.test/styles/site.css | text/css |
>
> ## Compression savings
>
> 47.1 KB compressed to 8.9 KB over 1 response.
