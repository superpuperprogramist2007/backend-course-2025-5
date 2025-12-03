const http = require("http");
const fs = require("fs"); // Звичайний fs для sync операцій (перевірка папки)
const fsPromises = require("fs").promises; // Проміси для читання/запису файлів (вимога лаби)
const path = require("path");
const { Command } = require("commander");

// === 1. Налаштування Commander ===
const program = new Command();

program
  .requiredOption("-h, --host <host>", "Server host address")
  .requiredOption("-p, --port <port>", "Server port number")
  .requiredOption("-c, --cache <path>", "Cache directory path");

program.parse(process.argv);
const options = program.opts();

// === 2. Перевірка папки кешу ===
if (!fs.existsSync(options.cache)) {
  fs.mkdirSync(options.cache, { recursive: true });
  console.log(`Created cache directory: ${options.cache}`);
}

// === 3. Допоміжна функція для отримання шляху до файлу ===
const getFilePath = (code) => path.join(options.cache, `${code}.jpg`);

// === 4. Створення сервера ===
const server = http.createServer(async (req, res) => {
  // Отримуємо код з URL (наприклад, /200 -> "200")
  const code = req.url.substring(1);

  // Якщо код не задано, повертаємо 404
  if (!code) {
    res.writeHead(404, { "Content-Type": "text/plain" });
    return res.end("Not Found");
  }

  const filePath = getFilePath(code);

  try {
    // --- METHOD: GET (Отримати картинку) ---
    if (req.method === "GET") {
      const image = await fsPromises.readFile(filePath);
      res.writeHead(200, { "Content-Type": "image/jpeg" }); // [cite: 54]
      res.end(image);
    } 
    // --- METHOD: PUT (Зберегти картинку) ---
    else if (req.method === "PUT") {
      // Створюємо потік запису у файл
      const writeStream = fs.createWriteStream(filePath);
      
      // Перенаправляємо дані з запиту прямо у файл
      req.pipe(writeStream);

      req.on('end', () => {
          res.writeHead(201, { "Content-Type": "text/plain" }); // [cite: 53]
          res.end("Created");
      });
      
      req.on('error', (err) => {
          console.error(err);
          res.writeHead(500);
          res.end("Server Error");
      });
    } 
    // --- METHOD: DELETE (Видалити картинку) ---
    else if (req.method === "DELETE") {
      await fsPromises.unlink(filePath);
      res.writeHead(200, { "Content-Type": "text/plain" });
      res.end("OK");
    } 
    // --- ІНШІ МЕТОДИ ---
    else {
      res.writeHead(405, { "Content-Type": "text/plain" }); // [cite: 50]
      res.end("Method Not Allowed");
    }
  } catch (error) {
    // Якщо файлу немає (помилка ENOENT), повертаємо 404
    if (error.code === 'ENOENT') {
        res.writeHead(404, { "Content-Type": "text/plain" }); // [cite: 51]
        res.end("Not Found");
    } else {
        console.error("Server error:", error);
        res.writeHead(500, { "Content-Type": "text/plain" });
        res.end("Internal Server Error");
    }
  }
});

// === 5. Запуск ===
server.listen(options.port, options.host, () => {
  console.log(`Server running at http://${options.host}:${options.port}/`);
  console.log(`Cache path: ${options.cache}`);
});