// main.js (Варіант 5: mtcars.json)

const { program } = require("commander");
const http = require("http");
const fs = require("fs");
const fsp = fs.promises;
const xml = require("fast-xml-parser");
const url = require("url");

// -------------------- CLI OPTIONS --------------------
program
  .requiredOption("-i, --input <path>", "Введіть шлях до файлу")
  .requiredOption("-h, --host <host>", "Адреса сервера")
  .requiredOption("-p, --port <port>", "Порт сервера");

program.configureOutput({
  outputError: (str, write) => {
    // глушимо стандартні помилки commander, щоб виводити свої
  },
});

// Щоб commander кидав помилки, а ми їх обробили
program.exitOverride();

let options;
try {
  program.parse(process.argv);
  options = program.opts();

  if (!fs.existsSync(options.input)) {
    console.error("Cannot find input file");
    process.exit(1);
  }
} catch (err) {
  // Якщо не задано обов'язкові параметри / значення
  if (
    err.code === "commander.missingRequiredOption" ||
    err.code === "commander.optionMissingArgument" ||
    err.code === "commander.missingMandatoryOptionValue"
  ) {
    console.error("Please write required argument");
    process.exit(1);
  }

  // Інші помилки commander
  console.error(err.message);
  process.exit(1);
}

const host = options.host;
const port = Number(options.port);
const builder = new xml.XMLBuilder();

// -------------------- HTTP SERVER --------------------
const requestListener = async function (req, res) {
  const parsedUrl = url.parse(req.url, true);
  const query = parsedUrl.query;

  // Варіант 5: ?cylinders=true та ?max_mpg=X
  const showCylinders = query.cylinders === "true";
  const maxMpg = query.max_mpg !== undefined ? parseFloat(query.max_mpg) : null;

  try {
    const content = await fsp.readFile(options.input, "utf-8");
    const data = JSON.parse(content);

    // Очікуємо, що mtcars.json — це масив об'єктів
    const carsArray = Array.isArray(data) ? data : [];
    let filteredData = carsArray;

    if (maxMpg !== null && !Number.isNaN(maxMpg)) {
      filteredData = filteredData.filter((car) => Number(car.mpg) < maxMpg);
    }

    // вихідні поля: model, (cyl якщо cylinders=true), mpg
    const outputData = filteredData.map((car) => {
      const out = {
        model: car.model,
        mpg: car.mpg,
      };
      if (showCylinders) out.cyl = car.cyl;
      return out;
    });

    const xmlObject = { cars: { car: outputData } };
    const xmlData = builder.build(xmlObject);

    res.writeHead(200, { "Content-Type": "application/xml; charset=utf-8" });
    res.end(xmlData);
  } catch (e) {
    res.writeHead(500, { "Content-Type": "text/plain; charset=utf-8" });
    res.end("Server error");
  }
};

const server = http.createServer(requestListener);

server.listen(port, host, () => {
  console.log(`Server is running on http://${host}:${port}`);
});
