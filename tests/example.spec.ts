import { test } from '@playwright/test';

test('Get cars', async ({ page }) => {
  let car = "Honda Civic";
  type Cars = {
    name: string;
    address: string;
    year: string;
    km: string;
    price: string;
    picture_url: string;
    url: string;
  }

  page.on('console', (msg) => {
    msg.type() === 'debug' && console.log(msg);
  });

  const data = {
    car: {
      "name": "Tiggo 5x",
    }
  }

  // Open new page
  await page.goto('https://www.olx.com.br/');

  // Type and search car
  await page.$('#searchtext-input').then((el) => el?.click());
  await page.$('#searchtext-input').then((el) => el?.fill(car));
  await page.$('#searchtext-input').then((el) => el?.press('Enter'));

  // Wait for the results to load
  await page.waitForLoadState('domcontentloaded');

  await page.$$eval('ul#ad-list > li', (nodes) => {
    let cars: Cars[] = [];

    const selectors = {
      name: '.kgl1mq-0',
      address: '.sc-1c3ysll-1',
      year: '.sc-fOICqy:nth-child(2) > span',
      km: 'div[aria-label="Informações sobre o anúncio\:"] > div:nth-of-type(1) > .sc-ifAKCX',
      price: '.m7nrfa-0',
      url: '.sc-12rk7z2-1',
      picture_url: '.sc-1fcmfeb-2 img'
    }

    nodes.forEach((node, i) => {
      if (i === 0) {
        cars.push(
          {
            name: node.querySelector(selectors.name)?.textContent as string,
            address: node.querySelector(selectors.address)?.textContent as string,
            year: node.querySelector(selectors.year)?.textContent as string,
            km: node.querySelector(selectors.km)?.textContent as string,
            price: node.querySelector(selectors.price)?.textContent as string,
            picture_url: (node.querySelector(selectors.picture_url) as HTMLImageElement)?.src,
            url: (node.querySelector(selectors.url) as HTMLAnchorElement)?.href,
          }
        )
      }
    });
    console.debug(cars[0]);
  });

});
