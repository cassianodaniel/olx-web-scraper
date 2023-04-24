# Web Scraping OLX

## Description

This project is a web scraping of the OLX website, it is a simple project that
uses the puppeteer library to scrape the data from the website.

## Installation

Clone the project and install the dependencies.

```bash
$ git clone https://github.com/danielcassiano/OLX-Web-Scraping
$ cd web-scraping-olx
$ pnpm install
```

## Running the app

```bash
# development
$ pnpm run start

# codegen
$ pnpm run codegen
```

## Test

```bash
`pnpm exec playwright codegen` 
# Auto generate tests with Codegen.

`pnpm exec playwright test` 
# Runs the end-to-end tests.

`pnpm exec playwright test --ui` 
# Starts the interactive UI mode.

# `pnpm exec playwright test --project=chromium` 
Runs the tests only on Desktop
Chrome.

# `pnpm exec playwright test example` 
Runs the tests in a specific file.

# `pnpm exec playwright test --debug` 
Runs the tests in debug mode.
```

## Authors

- [Daniel Chaves](https://github.com/danielcassiano)
- [Andressa Alves](https://github.com/aandressaalves)
