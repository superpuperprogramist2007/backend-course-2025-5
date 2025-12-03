const http = require('http');
const fs = require('fs').promises; // Використовуємо проміси для асинхронності [cite: 45]
const path = require('path');
const { Command } = require('commander'); // [cite: 29]

const program = new Command();

// 1. Налаштування параметрів командного рядка [cite: 35, 36, 37]
program
  .requiredOption('-h, --host <host>', 'Server address')
  .requiredOption('-p, --port <port>', 'Server port')
  .requiredOption('-c, --cache <path>', 'Cache directory path');

program.parse(process.argv);
const options = program.opts();

// 2. Логіка запуску сервера
async function startServer() {
    try {
        // Перевіряємо та створюємо папку для кешу, якщо її немає [cite: 38]
        const cacheDir = path.resolve(options.cache);
        
        // fs.mkdir з { recursive: true } не видасть помилку, якщо папка вже існує
        await fs.mkdir(cacheDir, { recursive: true });
        console.log(`Cache directory is ready: ${cacheDir}`);

        // Створюємо сервер [cite: 40]
        const server = http.createServer((req, res) => {
            // Поки що просто відповідаємо, що сервер працює
            res.writeHead(200, { 'Content-Type': 'text/plain' });
            res.end('Proxy Server is Running!');
        });

        // Запускаємо прослуховування на вказаному хості та порту [cite: 40]
        server.listen(options.port, options.host, () => {
            console.log(`Server is running at http://${options.host}:${options.port}`);
            console.log(`Cache folder: ${options.cache}`);
        });

    } catch (error) {
        console.error('Error starting server:', error.message);
        process.exit(1);
    }
}

startServer();