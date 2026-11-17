import express from "express";
import path from "node:path";

const app = express();
const PORT = process.env.PORT || 3000;

// import.meta.dirname makes paths independent of the folder the server is started from
const publicDir = path.join(import.meta.dirname, "public");

let requestsServed = 0;

// Middleware 1: request logger
function requestLogger(req, res, next) {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.originalUrl}`);
  next();
}

// Middleware 2: request counter
function requestCounter(req, res, next) {
  requestsServed += 1;
  next();
}

// Middleware must be registered before the routes
app.use(requestLogger);
app.use(requestCounter);

// Static files (public/index.html is served at "/" by express.static)
app.use(express.static(publicDir));

app.get("/hello",(req, res) => {
  res.type("text/plain").send("Hello from Abdullah's server");
});

// Hard-coded data (no database)
const courses = [
  { id: 1, title: "Web Programming", credits: 6 },
  { id: 2, title: "Data Structures", credits: 5 },
  { id: 3, title: "Computer Networks", credits: 5 },
  { id: 4, title: "Databases", credits: 6 },
];

const robotsTxt ="User-agent: *\nDisallow: /api/admin\n";

app.get("/robots.txt", (req, res) => {
  res.type("text/plain").send(robotsTxt);
});

app.get("/old-page", (req, res) => {
  res.redirect("/hello");
});

app.get("/api/courses", (req, res) => {
  res.json(courses);
});

app.get("/api/status", (req, res) => {
  res.json({
    status: "ok",
    nodeVersion: process.version,
    uptimeSeconds: Math.round(process.uptime()),
  });
});

app.get("/api/headers", (req, res) => {
  res.json({
    userAgent: req.get("User-Agent"),
    accept: req.get("Accept"),
  });
});

app.post("/api/subscribe", (req, res) => {
  res.status(201).json({ subscribed: true });
});

app.get("/api/admin", (req, res) => {
  res.status(403).json({ error: "Forbidden" });
});

app.get("/api/stats", (req, res) => {
  res.json({ requestsServed });
});

// 404 fallback: registered LAST so it never hides a real route.
// app.use without a path matches every request that reached this point (Express 5 safe).
app.use((req, res) => {
  if (req.path.startsWith("/api")) {
    res.status(404).json({ error: "Not found" });
  } else {
    res.status(404).send("404 - Page not found");
  }
});

app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});
