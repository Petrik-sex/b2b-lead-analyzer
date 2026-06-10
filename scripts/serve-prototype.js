const http = require("http");
const fs = require("fs");
const path = require("path");

const port = Number(process.env.PORT || 4173);
const prototypeDir = path.join(__dirname, "..", "prototype");
const file = path.join(prototypeDir, "index.html");

const contentTypes = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8"
};

const server = http.createServer((request, response) => {
  const requestPath = request.url === "/" ? "/index.html" : request.url || "/index.html";
  const resolved = path.normalize(path.join(prototypeDir, requestPath));

  if (!resolved.startsWith(prototypeDir) || !fs.existsSync(resolved)) {
    response.writeHead(404, { "content-type": "text/plain; charset=utf-8" });
    response.end("Not found");
    return;
  }

  response.writeHead(200, { "content-type": contentTypes[path.extname(resolved)] || "text/plain; charset=utf-8" });
  response.end(fs.readFileSync(resolved));
});

server.listen(port, () => {
  console.log(`Prototype preview running at http://localhost:${port}`);
});
