import express from "express";
import { engine } from "express-handlebars";
import bodyParser from "body-parser";
import { chromium } from "playwright-core";
import { Configuration, OpenAIApi } from "openai";
import * as dotenv from 'dotenv'

dotenv.config({
  path: '.env'
})

const configuration = new Configuration({
  apiKey: process.env.OPENAI_API_KEY as string,
});

const openai = new OpenAIApi(configuration);

const app = express();
const port = 3000;

// Use body-parser middleware to handle URL-encoded data
app.use(bodyParser.urlencoded({ extended: false }));

// To render a view using a template engine in Express.js
app.set("view engine", "handlebars");
app.engine("handlebars", engine({ defaultLayout: "main" }));
app.set("view engine", "handlebars");

const scrape = async (req, res) => {
  let { car } = req.body;

  const BROWSERLESS_IO_ENV_VARIABLE = process.env.BROWSERLESS_IO_ENV_VARIABLE as string;

  let browserlessRun = true;
  let headlessRun = false;

  // If the browserless.io env variable is set, use it
  const browser = browserlessRun ? await chromium.connect(`wss://chrome.browserless.io/playwright?token=${BROWSERLESS_IO_ENV_VARIABLE}`
  ) : await chromium.launch({
    headless: headlessRun,
  })

  // Create a new incognito browser context
  const context = await browser.newContext();
  const page = await context.newPage();

  // On console, only show debug messages
  page.on("console", (msg) => {
    msg.type() === "debug" && console.log(msg);
  });

  // Open new page
  await page.goto("https://www.olx.com.br/");

  // Type and search car
  await page.$("#searchtext-input").then((el) => el?.click());
  await page.$("#searchtext-input").then((el) => el?.fill(car));
  await page.$("#searchtext-input").then((el) => el?.press("Enter"));

  // Wait for the results to load
  await page.waitForLoadState("domcontentloaded");

  // Iterate over cars
  const cars = await page.$$eval("ul#ad-list > li", (nodes) => {
    const selectors = {
      name: ".kgl1mq-0",
      address: ".sc-1c3ysll-1",
      year: 'div[aria-label="Informações sobre o anúncio:"] > div:nth-of-type(2) > .sc-ifAKCX',
      km: 'div[aria-label="Informações sobre o anúncio:"] > div:nth-of-type(1) > .sc-ifAKCX',
      price: ".m7nrfa-0",
      url: ".sc-12rk7z2-1",
      picture_url: ".sc-1fcmfeb-2 img",
    };

    // For each car, get the data
    return nodes.map((node) => {
      return {
        name: node.querySelector(selectors.name)?.textContent as string,
        address: node.querySelector(selectors.address)?.textContent as string,
        year: node.querySelector(selectors.year)?.textContent as string,
        km: node.querySelector(selectors.km)?.textContent as string,
        price: node.querySelector(selectors.price)?.textContent as string,
        picture_url: (
          node.querySelector(selectors.picture_url) as HTMLImageElement
        )?.src,
        url: (node.querySelector(selectors.url) as HTMLAnchorElement)?.href,
      };
    });
  });

  const response = await openai.createCompletion({
    model: "text-davinci-002",
    prompt: `
    Order this data below in ascending order based on the cost-benefit of year, km, and cost, from the cheaper to the more expensive. 
    Do not consider any outliers car prices from the data I sent to you, for example: if the value is like R$ 20.000 below the average or 20.000 up the average. 
    Reply in the exact same format as the data I sent to you, in a unique Javascript array, without duplicated objects, and in a single line. 
    Also, you have to format the replied data, so then, from my side. Use less number of lines length, lines, and tokens in your response. 
    I will only run JSON.parse in your string response. 
    Here is the data: 
      ${cars.length > 0
        ? JSON.stringify(cars?.slice(0, 10) || []).replace(/"/g, "'")
        : "[]"
      }.
    `,
    temperature: 0,
    max_tokens: 2109,
    top_p: 0.01,
    frequency_penalty: 0,
    presence_penalty: 0,
  });

  const promptRes = response.data.choices[0].text || "";
  let parsedPromptRes = JSON.parse(promptRes?.replace(/'/g, '"'));

  if (parsedPromptRes) {
    try {
      res.render('home', { cars: parsedPromptRes });
    } catch (e) {
      console.log(`Error rendering JSON: ${e}`);
    }
  }

  await context.close();
  await browser.close();
};

// GET
app.get('/', (req, res) => {
  res.set("Content-Type", "text/html; charset=utf-8");
  res.send(`
  <style>
    html {
      line-height: 1.15;
      -ms-text-size-adjust: 100%;
      -webkit-text-size-adjust: 100%
    }

    body {
      margin: 0
    }

    article,
    aside,
    footer,
    header,
    nav,
    section {
      display: block
    }

    h1 {
      font-size: 2em;
      margin: .67em 0
    }

    figcaption,
    figure,
    main {
      display: block
    }

    figure {
      margin: 1em 40px
    }

    hr {
      box-sizing: content-box;
      height: 0;
      overflow: visible
    }

    pre {
      font-family: monospace, monospace;
      font-size: 1em
    }

    a {
      background-color: transparent;
      -webkit-text-decoration-skip: objects
    }

    abbr[title] {
      border-bottom: none;
      text-decoration: underline;
      text-decoration: underline dotted
    }

    b,
    strong {
      font-weight: inherit
    }

    b,
    strong {
      font-weight: bolder
    }

    code,
    kbd,
    samp {
      font-family: monospace, monospace;
      font-size: 1em
    }

    dfn {
      font-style: italic
    }

    mark {
      background-color: #ff0;
      color: #000
    }

    small {
      font-size: 80%
    }

    sub,
    sup {
      font-size: 75%;
      line-height: 0;
      position: relative;
      vertical-align: baseline
    }

    sub {
      bottom: -.25em
    }

    sup {
      top: -.5em
    }

    audio,
    video {
      display: inline-block
    }

    audio:not([controls]) {
      display: none;
      height: 0
    }

    img {
      border-style: none
    }

    svg:not(:root) {
      overflow: hidden
    }

    button,
    input,
    optgroup,
    select,
    textarea {
      font-family: sans-serif;
      font-size: 100%;
      line-height: 1.15;
      margin: 0
    }

    button,
    input {
      overflow: visible
    }

    button,
    select {
      text-transform: none
    }

    button,
    html [type=button],
    [type=reset],
    [type=submit] {
      -webkit-appearance: button
    }

    button::-moz-focus-inner,
    [type=button]::-moz-focus-inner,
    [type=reset]::-moz-focus-inner,
    [type=submit]::-moz-focus-inner {
      border-style: none;
      padding: 0
    }

    button:-moz-focusring,
    [type=button]:-moz-focusring,
    [type=reset]:-moz-focusring,
    [type=submit]:-moz-focusring {
      outline: 1px dotted ButtonText
    }

    fieldset {
      padding: .35em .75em .625em
    }

    legend {
      box-sizing: border-box;
      color: inherit;
      display: table;
      max-width: 100%;
      padding: 0;
      white-space: normal
    }

    progress {
      display: inline-block;
      vertical-align: baseline
    }

    textarea {
      overflow: auto
    }

    [type=checkbox],
    [type=radio] {
      box-sizing: border-box;
      padding: 0
    }

    [type=number]::-webkit-inner-spin-button,
    [type=number]::-webkit-outer-spin-button {
      height: auto
    }

    [type=search] {
      -webkit-appearance: textfield;
      outline-offset: -2px
    }

    [type=search]::-webkit-search-cancel-button,
    [type=search]::-webkit-search-decoration {
      -webkit-appearance: none
    }

    ::-webkit-file-upload-button {
      -webkit-appearance: button;
      font: inherit
    }

    details,
    menu {
      display: block
    }

    summary {
      display: list-item
    }

    canvas {
      display: inline-block
    }

    template {
      display: none
    }

    [hidden] {
      display: none
    }

    html {
      height: 100%
    }

    fieldset {
      margin: 0;
      padding: 0;
      -webkit-margin-start: 0;
      -webkit-margin-end: 0;
      -webkit-padding-before: 0;
      -webkit-padding-start: 0;
      -webkit-padding-end: 0;
      -webkit-padding-after: 0;
      border: 0
    }

    legend {
      margin: 0;
      padding: 0;
      display: block;
      -webkit-padding-start: 0;
      -webkit-padding-end: 0
    }

    .choices {
      position: relative;
      margin-bottom: 24px;
      font-size: 16px
    }

    .choices:focus {
      outline: none
    }

    .choices:last-child {
      margin-bottom: 0
    }

    .choices.is-disabled .choices__inner,
    .choices.is-disabled .choices__input {
      background-color: #eaeaea;
      cursor: not-allowed;
      -webkit-user-select: none;
      -moz-user-select: none;
      -ms-user-select: none;
      user-select: none
    }

    .choices.is-disabled .choices__item {
      cursor: not-allowed
    }

    .choices[data-type*=select-one] {
      cursor: pointer
    }

    .choices[data-type*=select-one] .choices__inner {
      padding-bottom: 7.5px
    }

    .choices[data-type*=select-one] .choices__input {
      display: block;
      width: 100%;
      padding: 10px;
      border-bottom: 1px solid #ddd;
      background-color: #fff;
      margin: 0
    }

    .choices[data-type*=select-one] .choices__button {
      background-color: transparent;
      padding: 0;
      background-size: 8px;
      height: 100%;
      position: absolute;
      top: 50%;
      right: 0;
      margin-top: -10px;
      margin-right: 25px;
      height: 20px;
      width: 20px;
      border-radius: 10em;
      opacity: .5
    }

    .choices[data-type*=select-one] .choices__button:hover,
    .choices[data-type*=select-one] .choices__button:focus {
      opacity: 1
    }

    .choices[data-type*=select-one] .choices__button:focus {
      box-shadow: 0 0 0 2px #00bcd4
    }

    .choices[data-type*=select-one]:after {
      content: "";
      height: 0;
      width: 0;
      border-style: solid;
      border-color: #333 transparent transparent transparent;
      border-width: 5px;
      position: absolute;
      right: 11.5px;
      top: 50%;
      margin-top: -2.5px;
      pointer-events: none
    }

    .choices[data-type*=select-one].is-open:after {
      border-color: transparent transparent #333 transparent;
      margin-top: -7.5px
    }

    .choices[data-type*=select-one][dir=rtl]:after {
      left: 11.5px;
      right: auto
    }

    .choices[data-type*=select-one][dir=rtl] .choices__button {
      right: auto;
      left: 0;
      margin-left: 25px;
      margin-right: 0
    }

    .choices[data-type*=select-multiple] .choices__inner,
    .choices[data-type*=text] .choices__inner {
      cursor: text
    }

    .choices[data-type*=select-multiple] .choices__button,
    .choices[data-type*=text] .choices__button {
      position: relative;
      display: inline-block;
      margin-top: 0;
      margin-right: -4px;
      margin-bottom: 0;
      margin-left: 8px;
      padding-left: 16px;
      border-left: 1px solid #008fa1;
      background-color: transparent;
      background-size: 8px;
      width: 8px;
      line-height: 1;
      opacity: .75
    }

    .choices[data-type*=select-multiple] .choices__button:hover,
    .choices[data-type*=select-multiple] .choices__button:focus,
    .choices[data-type*=text] .choices__button:hover,
    .choices[data-type*=text] .choices__button:focus {
      opacity: 1
    }

    .choices__inner {
      display: inline-block;
      vertical-align: top;
      width: 100%;
      background-color: #f9f9f9;
      padding: 7.5px 7.5px 3.75px;
      border: 1px solid #ddd;
      border-radius: 2.5px;
      font-size: 14px;
      min-height: 44px;
      overflow: hidden
    }

    .is-focused .choices__inner,
    .is-open .choices__inner {
      border-color: #b7b7b7
    }

    .is-open .choices__inner {
      border-radius: 2.5px 2.5px 0 0
    }

    .is-flipped.is-open .choices__inner {
      border-radius: 0 0 2.5px 2.5px
    }

    .choices__list {
      margin: 0;
      padding-left: 0;
      list-style: none
    }

    .choices__list--single {
      display: inline-block;
      padding: 4px 16px 4px 4px;
      width: 100%
    }

    [dir=rtl] .choices__list--single {
      padding-right: 4px;
      padding-left: 16px
    }

    .choices__list--single .choices__item {
      width: 100%
    }

    .choices__list--multiple {
      display: inline
    }

    .choices__list--multiple .choices__item {
      display: inline-block;
      vertical-align: middle;
      border-radius: 20px;
      padding: 4px 10px;
      font-size: 12px;
      font-weight: 500;
      margin-right: 3.75px;
      margin-bottom: 3.75px;
      background-color: #00bcd4;
      border: 1px solid #00a5bb;
      color: #fff;
      word-break: break-all
    }

    .choices__list--multiple .choices__item[data-deletable] {
      padding-right: 5px
    }

    [dir=rtl] .choices__list--multiple .choices__item {
      margin-right: 0;
      margin-left: 3.75px
    }

    .choices__list--multiple .choices__item.is-highlighted {
      background-color: #00a5bb;
      border: 1px solid #008fa1
    }

    .is-disabled .choices__list--multiple .choices__item {
      background-color: #aaa;
      border: 1px solid #919191
    }

    .choices__list--dropdown {
      display: none;
      z-index: 1;
      position: absolute;
      width: 100%;
      background-color: #fff;
      border: 1px solid #ddd;
      top: 100%;
      margin-top: -1px;
      border-bottom-left-radius: 2.5px;
      border-bottom-right-radius: 2.5px;
      overflow: hidden;
      word-break: break-all
    }

    .choices__list--dropdown.is-active {
      display: block
    }

    .is-open .choices__list--dropdown {
      border-color: #b7b7b7
    }

    .is-flipped .choices__list--dropdown {
      top: auto;
      bottom: 100%;
      margin-top: 0;
      margin-bottom: -1px;
      border-radius: .25rem .25rem 0 0
    }

    .choices__list--dropdown .choices__list {
      position: relative;
      max-height: 300px;
      overflow: auto;
      -webkit-overflow-scrolling: touch;
      will-change: scroll-position
    }

    .choices__list--dropdown .choices__item {
      position: relative;
      padding: 10px;
      font-size: 14px
    }

    [dir=rtl] .choices__list--dropdown .choices__item {
      text-align: right
    }

    @media(min-width:640px) {
      .choices__list--dropdown .choices__item--selectable {
        padding-right: 100px
      }

      .choices__list--dropdown .choices__item--selectable:after {
        content: attr(data-select-text);
        font-size: 12px;
        opacity: 0;
        position: absolute;
        right: 10px;
        top: 50%;
        transform: translateY(-50%)
      }

      [dir=rtl] .choices__list--dropdown .choices__item--selectable {
        text-align: right;
        padding-left: 100px;
        padding-right: 10px
      }

      [dir=rtl] .choices__list--dropdown .choices__item--selectable:after {
        right: auto;
        left: 10px
      }
    }

    .choices__list--dropdown .choices__item--selectable.is-highlighted {
      background-color: #f2f2f2
    }

    .choices__list--dropdown .choices__item--selectable.is-highlighted:after {
      opacity: .5
    }

    .choices__item {
      cursor: default
    }

    .choices__item--selectable {
      cursor: pointer
    }

    .choices__item--disabled {
      cursor: not-allowed;
      -webkit-user-select: none;
      -moz-user-select: none;
      -ms-user-select: none;
      user-select: none;
      opacity: .5
    }

    .choices__heading {
      font-weight: 600;
      font-size: 12px;
      padding: 10px;
      border-bottom: 1px solid #f7f7f7;
      color: gray
    }

    .choices__button {
      text-indent: -9999px;
      -webkit-appearance: none;
      -moz-appearance: none;
      appearance: none;
      border: 0;
      background-color: transparent;
      background-repeat: no-repeat;
      background-position: center;
      cursor: pointer
    }

    .choices__button:focus {
      outline: none
    }

    .choices__input {
      display: inline-block;
      vertical-align: baseline;
      background-color: #f9f9f9;
      font-size: 14px;
      margin-bottom: 5px;
      border: 0;
      border-radius: 0;
      max-width: 100%;
      padding: 4px 0 4px 2px
    }

    .choices__input:focus {
      outline: 0
    }

    [dir=rtl] .choices__input {
      padding-right: 2px;
      padding-left: 0
    }

    .choices__placeholder {
      opacity: .5
    }

    * {
      box-sizing: border-box
    }

    .s003 {
      height: 100vh;
      width: 100vw;
      display: -ms-flexbox;
      display: flex;
      -ms-flex-pack: center;
      justify-content: center;
      -ms-flex-align: center;
      align-items: center;
      font-family: poppins, sans-serif;
      background-color: transparent;
      background-size: cover;
      background-position: center center;
      padding: 15px
    }

    .s003::before {
      height: 100vh;
      width: 100vw;
      content: "";
      background-image: url("https://github.com/danielcassiano/Node-Vercel-Playwright-Browserless-MVC-OLX-Scraping/blob/master/assets/logo_olx.png?raw=true");
      background-size: cover;
      background-position: center center;
      background-repeat: no-repeat;
      position: absolute;
      top: 0px;
      right: 0px;
      bottom: 0px;
      left: 0px;
      opacity: 0.9;
      z-index: -1;
    }

    .s003 form {
      width: 100%;
      max-width: 790px;
      margin-bottom: 0
    }

    .s003 form .inner-form {
      background: #fff;
      display: -ms-flexbox;
      display: flex;
      width: 100%;
      -ms-flex-pack: justify;
      justify-content: space-between;
      -ms-flex-align: center;
      align-items: center;
      box-shadow: 0 8px 20px 0 rgba(0, 0, 0, .15);
      border-radius: 3px
    }

    .s003 form .inner-form .input-field {
      height: 68px
    }

    .s003 form .inner-form .input-field input {
      height: 100%;
      background: 0 0;
      border: 0;
      display: block;
      width: 100%;
      padding: 10px 32px;
      font-size: 16px;
      color: #555
    }

    .s003 form .inner-form .input-field input.placeholder {
      color: #888;
      font-size: 16px
    }

    .s003 form .inner-form .input-field input:-moz-placeholder {
      color: #888;
      font-size: 16px
    }

    .s003 form .inner-form .input-field input::-webkit-input-placeholder {
      color: #888;
      font-size: 16px
    }

    .s003 form .inner-form .input-field input:hover,
    .s003 form .inner-form .input-field input:focus {
      box-shadow: none;
      outline: 0;
      border-color: #fff
    }

    .s003 form .inner-form .input-field.first-wrap {
      width: 200px;
      border-right: 1px solid rgba(0, 0, 0, .1)
    }

    .s003 form .inner-form .input-field.first-wrap .choices__inner {
      background: 0 0;
      border-radius: 0;
      border: 0;
      height: 100%;
      color: #fff;
      display: -ms-flexbox;
      display: flex;
      -ms-flex-align: center;
      align-items: center;
      padding: 10px 30px
    }

    .s003 form .inner-form .input-field.first-wrap .choices__inner .choices__list.choices__list--single {
      display: -ms-flexbox;
      display: flex;
      padding: 0;
      -ms-flex-align: center;
      align-items: center;
      height: 100%
    }

    .s003 form .inner-form .input-field.first-wrap .choices__inner .choices__item.choices__item--selectable.choices__placeholder {
      display: -ms-flexbox;
      display: flex;
      -ms-flex-align: center;
      align-items: center;
      height: 100%;
      opacity: 1;
      color: #888
    }

    .s003 form .inner-form .input-field.first-wrap .choices__inner .choices__list--single .choices__item {
      display: -ms-flexbox;
      display: flex;
      -ms-flex-align: center;
      align-items: center;
      height: 100%;
      color: #555
    }

    .s003 form .inner-form .input-field.first-wrap .choices[data-type*=select-one]:after {
      right: 30px;
      border-color: #e5e5e5 transparent transparent transparent
    }

    .s003 form .inner-form .input-field.first-wrap .choices__list.choices__list--dropdown {
      border: 0;
      background: #fff;
      padding: 20px 30px;
      margin-top: 2px;
      border-radius: 4px;
      box-shadow: 0 8px 20px 0 rgba(0, 0, 0, .15)
    }

    .s003 form .inner-form .input-field.first-wrap .choices__list.choices__list--dropdown .choices__item--selectable {
      padding-right: 0
    }

    .s003 form .inner-form .input-field.first-wrap .choices__list--dropdown .choices__item--selectable.is-highlighted {
      background: #fff;
      color: #63c76a
    }

    .s003 form .inner-form .input-field.first-wrap .choices__list--dropdown .choices__item {
      color: #555;
      min-height: 24px
    }

    .s003 form .inner-form .input-field.second-wrap {
      -ms-flex-positive: 1;
      flex-grow: 1
    }

    .s003 form .inner-form .input-field.third-wrap {
      width: 74px
    }

    .s003 form .inner-form .input-field.third-wrap .btn-search {
      height: 100%;
      width: 100%;
      white-space: nowrap;
      color: #fff;
      border: 0;
      cursor: pointer;
      background: #63c76a;
      transition: all .2s ease-out, color .2s ease-out
    }

    .s003 form .inner-form .input-field.third-wrap .btn-search svg {
      width: 16px
    }

    .s003 form .inner-form .input-field.third-wrap .btn-search:hover {
      background: #50c058
    }

    .s003 form .inner-form .input-field.third-wrap .btn-search:focus {
      outline: 0;
      box-shadow: none
    }

    @media screen and (max-width:992px) {
      .s003 form .inner-form .input-field {
        height: 50px
      }
    }

    @media screen and (max-width:767px) {
      .s003 form .inner-form {
        -ms-flex-wrap: wrap;
        flex-wrap: wrap;
        padding: 20px
      }

      .s003 form .inner-form .input-field {
        margin-bottom: 20px;
        border-bottom: 1px solid rgba(0, 0, 0, .1)
      }

      .s003 form .inner-form .input-field input {
        padding: 10px 15px
      }

      .s003 form .inner-form .input-field.first-wrap {
        width: 100%;
        border-right: 0
      }

      .s003 form .inner-form .input-field.first-wrap .choices__inner {
        padding: 10px 15px
      }

      .s003 form .inner-form .input-field.first-wrap .choices[data-type*=select-one]:after {
        right: 11.5px;
        border-color: #e5e5e5 transparent transparent transparent
      }

      .s003 form .inner-form .input-field.second-wrap {
        width: 100%;
        margin-bottom: 30px
      }

      .s003 form .inner-form .input-field.second-wrap input {
        border: 1px solid rgba(255, 255, 255, .3)
      }

      .s003 form .inner-form .input-field.third-wrap {
        margin-bottom: 0;
        width: 100%
      }
    }
  </style>
  <div class="s003">
    <form action="/scrape" method="POST">
      <div class="inner-form">
        <div class="input-field second-wrap">
          <input autocomplete="off" type="text" name="car" placeholder="Exemplo: Tiggo 5X TXS 2022" id="search" />
        </div>
        <div class="input-field third-wrap">
          <button class="btn-search" type="submit">
            <svg class="svg-inline--fa fa-search fa-w-16" aria-hidden="true" data-prefix="fas" data-icon="search"
              role="img" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">
              <path fill="currentColor"
                d="M505 442.7L405.3 343c-4.5-4.5-10.6-7-17-7H372c27.6-35.3 44-79.7 44-128C416 93.1 322.9 0 208 0S0 93.1 0 208s93.1 208 208 208c48.3 0 92.7-16.4 128-44v16.3c0 6.4 2.5 12.5 7 17l99.7 99.7c9.4 9.4 24.6 9.4 33.9 0l28.3-28.3c9.4-9.4 9.4-24.6.1-34zM208 336c-70.7 0-128-57.2-128-128 0-70.7 57.2-128 128-128 70.7 0 128 57.2 128 128 0 70.7-57.2 128-128 128z">
              </path>
            </svg>
          </button>
        </div>
      </div>
    </form>
    <script>
      document.querySelector("button").addEventListener("click", () => {
        document.querySelector('button').innerHTML = "...";
        document.querySelector("button").style.cursor = "wait"
      });
    </script>
  </div>
  `);
});

// POST
app.post("/scrape", scrape);

// Start the server
app.listen(port, () => {
  console.log(`Server started on port ${port}`);
});
