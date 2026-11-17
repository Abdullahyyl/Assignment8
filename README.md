# Assignment 8 - Study Programme Information Server

A small Node.js + Express 5 server (ES modules, no extra packages) that serves a plain HTML/CSS/JS page and a handful of routes returning text, JSON, errors and redirects. Every request is logged and counted.

## Install and run

```
git clone https://github.com/Abdullahyyl/Assignment8.git
cd Assignment8
npm install
npm start          # node server.js
npm run dev        # node --watch server.js (restarts on file changes)
```

Open http://localhost:3000. Use another port with `PORT=4000 npm start` (PowerShell: `$env:PORT=4000; npm start`).

## File organization

```
public/
  index.html   page with one button per API route
  styles.css   styles
  app.js       fetch() calls, shows status code and formatted body
server.js      Express app: middleware, routes, static files, 404 fallback
package.json   "type": "module", express dependency, start/dev scripts
package-lock.json
.gitignore     node_modules/ and .env
README.md
```

## Routes

| Route | Response |
| --- | --- |
| `GET /` | `public/index.html` (served by `express.static`) |
| `GET /hello` | plain text greeting |
| `GET /robots.txt` | plain text (`text/plain`) |
| `GET /old-page` | 302 redirect to `/hello` |
| `GET /api/courses` | JSON array of 4 courses |
| `GET /api/status` | `{ status, nodeVersion, uptimeSeconds }` from `process.version` and `process.uptime()` |
| `GET /api/headers` | echoes `User-Agent` and `Accept` |
| `POST /api/subscribe` | 201 `{ "subscribed": true }` |
| `GET /api/admin` | 403 `{ "error": "Forbidden" }` |
| `GET /api/stats` | `{ "requestsServed": n }` |
| anything else | 404 (JSON for `/api...`, text otherwise) |

## Middleware

- **Logger** prints `[ISO timestamp] METHOD url` and calls `next()`.
- **Counter** increments `requestsServed` and calls `next()`.
- **Placement:** both are registered with `app.use` before `express.static` and all routes. Express runs handlers in registration order, so only middleware registered first sees every request.
- **What is counted:** *every* request that reaches the server: API routes, the page, static files (`/styles.css`, `/app.js`), 404s, and the `/api/stats` request itself (it is counted before its handler runs). I chose this because the counter sits at the very top, so it is a true count of requests served since the start, not only of API calls. Opening the page in a browser therefore adds several requests (page, CSS, JS, possibly `/favicon.ico`).

## curl evidence

Headers `Date`, `ETag`, `Connection`, `Keep-Alive` and `X-Powered-By` were removed from the output for brevity (the server was run on port 3200 for the capture; the commands below show the default port).

```
$ curl --include -X GET http://localhost:3000/api/courses
HTTP/1.1 200 OK
Content-Type: application/json; charset=utf-8
Content-Length: 185

[{"id":1,"title":"Web Programming","credits":6},{"id":2,"title":"Data Structures","credits":5},{"id":3,"title":"Computer Networks","credits":5},{"id":4,"title":"Databases","credits":6}]

$ curl --include -X POST http://localhost:3000/api/subscribe
HTTP/1.1 201 Created
Content-Type: application/json; charset=utf-8
Content-Length: 19

{"subscribed":true}

$ curl --include -X GET http://localhost:3000/api/admin
HTTP/1.1 403 Forbidden
Content-Type: application/json; charset=utf-8
Content-Length: 21

{"error":"Forbidden"}

$ curl --include -X GET http://localhost:3000/old-page
HTTP/1.1 302 Found
Location: /hello
Vary: Accept
Content-Type: text/plain; charset=utf-8
Content-Length: 28

Found. Redirecting to /hello

$ curl --include -X GET http://localhost:3000/api/nope
HTTP/1.1 404 Not Found
Content-Type: application/json; charset=utf-8
Content-Length: 21

{"error":"Not found"}

$ curl --include -X GET http://localhost:3000/nope
HTTP/1.1 404 Not Found
Content-Type: text/html; charset=utf-8
Content-Length: 20

404 - Page not found

$ curl --include -X GET http://localhost:3000/robots.txt
HTTP/1.1 200 OK
Content-Type: text/plain; charset=utf-8
Content-Length: 35

User-agent: *
Disallow: /api/admin

$ curl --include -X GET http://localhost:3000/api/stats
HTTP/1.1 200 OK
Content-Type: application/json; charset=utf-8
Content-Length: 20

{"requestsServed":8}
```

The last count is 8 because it was the 8th request to this fresh server, including itself.

## Reasoning questions

### 1. Route order (experiment)

I moved the 404 fallback to the top of `server.js` and requested `/hello`, `/api/courses` and `/`. All three returned 404, even though the routes exist, and the logger printed nothing for them because it was now registered after the fallback. Express runs handlers in the order they are registered and the first handler that sends a response ends the chain; a catch-all at the top answers everything and the real routes are never reached. That is why the fallback must be last.

### 2. Middleware (experiment)

I removed `next()` from the logger. The server printed the log line for `GET /hello`, but nothing else, and the request never finished: curl waited until I stopped it after 4 seconds (no status code), and a browser would spin forever. Without `next()` the middleware neither sends a response nor passes control on, so the request hangs in the middle of the chain.

### 3. Status codes

`POST /api/subscribe` creates something (a subscription), and `201 Created` says exactly that, while `200 OK` only says "it worked". A missing page is a `404` because the status code is what clients, browsers, search engines and scripts read to know the outcome; a `200` with an error message in the body would tell them everything is fine, and automatic tools like `fetch().ok` would treat the failure as success.

### 4. Configuration

The port is read from `process.env.PORT` because the environment where the app runs decides which port is free or allowed (hosting platforms assign one, or 3000 may already be in use on a developer machine). Reading it from the environment lets me change it without editing the code, and `3000` is only the fallback for local development.

### 5. Dependencies

`node_modules` is large, generated and can be rebuilt from `package.json` and `package-lock.json`, so committing it would bloat the repo and could contain platform-specific files. A teammate clones the repository, runs `npm install` in the folder (which installs the exact versions from the lock file), and then `npm start`.

### 6. Same origin

If the page were opened from disk (`file:///.../index.html`), a relative URL such as `/api/courses` would be resolved against the `file://` location instead of the server, so the request would not reach Express and would fail. To use the server from a file page I would need absolute URLs such as `http://localhost:3000/api/courses`, and then the browser would block the response because the page's origin differs from the server's. This restriction is the **same-origin policy**; the server would have to allow it with CORS headers.

## Self-study notes

- **Node version and running time:** `process.version` gives the Node version string (for example `v24.18.0`) and `process.uptime()` returns the seconds the process has been running as a float, which I round with `Math.round`.
- **Plain-text content type:** `res.type("text/plain").send(...)` sets the `Content-Type` header before sending. `res.send` with a string alone would be `text/html`, which I saw in my first test of `/hello`, so I set the type explicitly for `/hello` and `/robots.txt`.
- **Pretty JSON in the page:** `JSON.stringify(JSON.parse(text), null, 2)` indents with 2 spaces. If the body is not valid JSON (like the 404 text page), the `catch` shows the raw text.
- **Express 5 fallback:** `app.get("*", ...)` is not accepted any more, so the fallback is `app.use((req, res) => ...)` without a path, registered last.
- **Path independent of the start folder:** `import.meta.dirname` is the folder of `server.js`, so `path.join(import.meta.dirname, "public")` works wherever `node` is started from. I tested it by starting the server with a different working directory.

## Challenges

- Understanding that handler order decides everything: the same code with the fallback or `next()` changed gives completely different behaviour.
- Deciding what the counter should count, and keeping `/api/stats` consistent with that decision.
- Being careful that each route sends exactly one response.
