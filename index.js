const http = require("http");
const fs = require("fs");
const fsPromises = require("fs").promises;
const path = require("path");
const { Command } = require("commander");
const superagent = require("superagent"); // Підключаємо superagent

// === Setup Commander ===
const program = new Command();

program
  .requiredOption("-h, --host <host>", "Server host address")
  .requiredOption("-p, --port <port>", "Server port number")
  .requiredOption("-c, --cache <path>", "Cache directory path");

program.parse(process.argv);
const options = program.opts();

// === Ensure cache directory exists ===
if (!fs.existsSync(options.cache)) {
  fs.mkdirSync(options.cache, { recursive: true });
  console.log(` Created cache directory: ${options.cache}`);
}

const getFilePath = (code) => path.join(options.cache, `${code}.jpg`);

// === Server Logic ===
const server = http.createServer(async (req, res) => {
  const code = req.url.substring(1); // беремо "200" з "/200"

  if (!code) {
    res.writeHead(404, { "Content-Type": "text/plain" });
    return res.end("Not Found");
  }

  const filePath = getFilePath(code);

  try {
    // --- METHOD: GET ---
    if (req.method === "GET") {
      try {
        // 1. Спробуємо знайти файл у кеші
        const image = await fsPromises.readFile(filePath);
        res.writeHead(200, { "Content-Type": "image/jpeg" });
        res.end(image);
      } catch (err) {
        // 2. Якщо файлу немає (ENOENT), йдемо на http.cat
        if (err.code === "ENOENT") {
          console.log(`Cache miss for ${code}. Fetching from http.cat...`);
          try {
            // Робимо запит на зовнішній сервер
            const remoteRes = await superagent.get(`https://http.cat/${code}`);
            
            // Зберігаємо отриману картинку в кеш (remoteRes.body - це буфер картинки)
            await fsPromises.writeFile(filePath, remoteRes.body);
            
            // Віддаємо картинку клієнту
            res.writeHead(200, { "Content-Type": "image/jpeg" });
            res.end(remoteRes.body);
          } catch (remoteErr) {
            // Якщо і на http.cat такого коду немає (наприклад, код 999)
            console.error(`Error fetching from http.cat: ${remoteErr.status}`);
            res.writeHead(404, { "Content-Type": "text/plain" });
            res.end("Not Found on http.cat");
          }
        } else {
          throw err; // Інші помилки кидаємо далі
        }
      }
    } 
    // --- METHOD: PUT ---
    else if (req.method === "PUT") {
      const writeStream = fs.createWriteStream(filePath);
      req.pipe(writeStream);
      req.on("end", () => {
        res.writeHead(201, { "Content-Type": "text/plain" });
        res.end("Created");
      });
    } 
    // --- METHOD: DELETE ---
    else if (req.method === "DELETE") {
      await fsPromises.unlink(filePath);
      res.writeHead(200, { "Content-Type": "text/plain" });
      res.end("OK");
    } 
    // --- OTHER METHODS ---
    else {
      res.writeHead(405, { "Content-Type": "text/plain" });
      res.end("Method Not Allowed");
    }
  } catch (error) {
    if (error.code === 'ENOENT') {
        res.writeHead(404, { "Content-Type": "text/plain" });
        res.end("Not Found");
    } else {
        console.error("Server Error:", error);
        res.writeHead(500, { "Content-Type": "text/plain" });
        res.end("Internal Server Error");
    }
  }
});

server.listen(options.port, options.host, () => {
  console.log(`Server running at http://${options.host}:${options.port}/`);
  console.log(`Cache path: ${options.cache}`);
});