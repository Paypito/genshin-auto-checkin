import puppeteer from "puppeteer";
import schedule from "node-schedule";
import fs from "fs";
import dayjs from 'dayjs';
import * as config from "./config.json";

let browser: puppeteer.Browser;
let cookies: any[] = [];
let numberOfDay: number;
let received: number;
let hour = config.hour;
let minute = config.minute;

(async () => {
  console.log("Démarrage du bot ...");
  await getCookies();
  if (!isLogged()) login();
  else checkRewards();
})();

async function login() {
  config.linux ? 
  browser = await puppeteer.launch({ headless: false, executablePath: config.chromium}) :
  browser = await puppeteer.launch({ headless: false });
  console.log("Vous n'êtes pas connecté !");
  const page = await browser.newPage();
  await page.goto(
    config.url
  );
  while(!isLogged()) {
    await page.cookies()
    .then(cook => {
      cookies = cook;
    })
    .catch(e => {
      console.log("Une erreur est survenue, veuillez relancer")
    });
    await new Promise(r => setTimeout(r, 5000));
  }
  console.log("Connexion reussie !")
  await browser.close();
  saveCookies();
  checkRewards();
}

async function checkRewards() {
  if(config.linux) {
    config.debug ? browser = await puppeteer.launch({ headless: false, executablePath: config.chromium}) : browser = await puppeteer.launch({executablePath: config.chromium});
  } else {
    config.debug ? browser = await puppeteer.launch({ headless: false }) : browser = await puppeteer.launch();
  }
  const page = await browser.newPage();
  await page.setCookie(...cookies);
  cookies = await page.cookies();
  await page.goto(
    config.url
  ).then(() => {
    getRewards(page);
    schedule.scheduleJob({hour: hour, minute: minute}, async() => {
      getRewards(page);
    });
  }).catch(async () => {
    browser.close();
    console.log("Aucune connexion internet, nouvel essai dans 20 secondes ...")
    await new Promise(r => setTimeout(r, 20000));
    checkRewards()
  });
}

async function getRewards(_page: puppeteer.Page) {
  _page.reload()
  .then(async () => {
    await new Promise(r => setTimeout(r, 5000));
    numberOfDay = (await _page.$$('div.components-home-assets-__sign-content_---item---1VLDOZ')).length;
    received = (await _page.$$('img.components-home-assets-__sign-content_---received---2RqQAu')).length;
    let active = (await _page.$$('div.components-home-assets-__sign-content_---active---36unD3')).length;
    
    if(numberOfDay == 0) {
      console.log("Une erreur est survenue lors du chargement de la page ! Vérifiez que l'url encodée dans config.json est correcte");
      getRewards(_page);
    } else {
      console.log("Vous avez récupéré " + received + " sur " + numberOfDay + " récompenses");
      if(active != 0) {
        console.log("Récompense disponible !");
        console.log("Tentative de récupération de la récompense ...");
        await _page.click('.components-home-assets-__sign-content_---active---36unD3');
        await new Promise(r => setTimeout(r, 2000));
        active = (await _page.$$('div.components-home-assets-__sign-content_---active---36unD3')).length;
        if(active == 0) {
          console.log("La récompense à bien été récupérée !")
        } else {
          console.log("Une erreur empêche la récupération de la récompense")
        }
      } else {
        console.log("Aucune récompense disponible");
      }
      console.log("Prochaine tentative à", dayjs().hour(hour).minute(minute).format('HH:mm'));
    }
  })
  .catch(async () => {
    console.log("Aucune connexion internet, nouvel essai dans 20 secondes ...")
    await new Promise(r => setTimeout(r, 20000));
    getRewards(_page);
  });

}

function isLogged() {
    return cookies.some((e) => e.name === "cookie_token");
}

async function saveCookies() {
  console.log("Sauvegarde du cookie en cours ... ")
  await fs.promises.writeFile('./cookies.json', JSON.stringify(cookies, null, 2));
}

async function getCookies() {
  await fs.promises.readFile('./cookies.json').
  then((cook) => {
    console.log("Récupération du cookie de connexion ... ");
    cookies = JSON.parse(cook.toString());
  })
  .catch(() => {
    cookies = [];
  });
}