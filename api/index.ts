import express from 'express';
import { engine } from 'express-handlebars';
import bodyParser from 'body-parser';
import { chromium } from 'playwright';

const app = express();
const port = 3000;

// Use body-parser middleware to handle URL-encoded data
app.use(bodyParser.urlencoded({ extended: false }));

// To render a view using a template engine in Express.js
app.set('view engine', 'handlebars');

app.engine('handlebars', engine({ defaultLayout: 'main' }));
app.set('view engine', 'handlebars');

const scrape = async (req, res) => {
  let { car } = req.body;

  const browser = process.env.ENV === 'DEV' ? await chromium.launch({
    headless: false
  }) : await chromium.connect(
    'wss://chrome.browserless.io/playwright?token=eebe19e4-9443-4b0d-b63d-c554768985f6'
  );

  const context = await browser.newContext();
  const page = await context.newPage();

  // On console, only show debug messages
  page.on('console', (msg) => {
    msg.type() === 'debug' && console.log(msg);
  });

  // Open new page
  await page.goto('https://www.olx.com.br/');

  // Type and search car
  await page.$('#searchtext-input').then((el) => el?.click());
  await page.$('#searchtext-input').then((el) => el?.fill(car));
  await page.$('#searchtext-input').then((el) => el?.press('Enter'));

  // Wait for the results to load
  await page.waitForLoadState('domcontentloaded');


  // Iterate over cars
  const cars = await page.$$eval('ul#ad-list > li', (nodes) => {
    const selectors = {
      name: '.kgl1mq-0',
      address: '.sc-1c3ysll-1',
      year: 'div[aria-label="Informações sobre o anúncio\:"] > div:nth-of-type(2) > .sc-ifAKCX',
      km: 'div[aria-label="Informações sobre o anúncio\:"] > div:nth-of-type(1) > .sc-ifAKCX',
      price: '.m7nrfa-0',
      url: '.sc-12rk7z2-1',
      picture_url: '.sc-1fcmfeb-2 img'
    }

    // For each car, get the data
    return nodes.map((node) => {
      return {
        name: node.querySelector(selectors.name)?.textContent as string,
        address: node.querySelector(selectors.address)?.textContent as string,
        year: node.querySelector(selectors.year)?.textContent as string,
        km: node.querySelector(selectors.km)?.textContent as string,
        price: node.querySelector(selectors.price)?.textContent as string,
        picture_url: (node.querySelector(selectors.picture_url) as HTMLImageElement)?.src,
        url: (node.querySelector(selectors.url) as HTMLAnchorElement)?.href,
      }
    });
  });

  function weight(car) {
    return car.km * 0.65 + car.price * 0.25 + car.year * 0.1;
  }

  const sortedCars = cars.sort((car1, car2) => weight(car1) - weight(car2));

  res.render('home', { cars: sortedCars });

  await context.close();
  await browser.close();
};

// Routes
// GET
app.get("/", (req, res) => {
  res.set("Content-Type", "text/html; charset=utf-8");

  res.send(`
    <style>
      h1, form {
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        text-align: center;
        margin: 0 auto;
        max-width: 80%;
      }

      input[type="text"], button {
        display: block;
        margin: 10px auto;
        width: 100%;
        max-width: 300px;
        padding: 10px;
        border: 1px solid #ccc;
        border-radius: 5px;
        font-size: 16px;
      }
    </style>
    <h1>Pesquise o carro</h1>
    <form action="/scrape" method="POST">
      <input autocomplete="off" type="text" name="car" placeholder="Nome do carro" />
      <button type="submit">Pesquisar</button>
    </form>
    <script>
      document.querySelector("body > form > button").addEventListener("click", () => {
        document.querySelector("body > form > button").innerHTML = "Pesquisando...";
      });
    </script>
  `);
});

// POST 
app.post("/scrape", scrape);

// Start the server
app.listen(port, () => {
  console.log(`Server started on port ${port}`);
});