const puppeteer = require('puppeteer');
const cheerio = require('cheerio');
async function getOpenPrice() {
    const browser = await puppeteer.launch();
    const page = await browser.newPage();
    const url = 'https://goodinfo.tw/tw/ShowK_Chart.asp?STOCK_ID=%E5%8A%A0%E6%AC%8A%E6%8C%87%E6%95%B8&CHT_CAT2=DATE&PERIOD=365';

    await page.goto(url);

    //等待元素載入完成
    const textSelector = await page.waitForSelector("#divPriceDetail");
    // 在瀏覽器執行 JavaScript，取得元素資訊
    const fullTitle = await textSelector?.evaluate((el) => el.textContent);
    console.log(fullTitle)


    // 等待元素載入完成
    // await page.waitForSelector("#divTitleBar");
    // //把網頁的body抓出來
    // const body = await page.content();
    // //接著我們把他丟給cheerio去處理
    // const $ = await cheerio.load(body)
    // const table = $("#tblPriceDetail tr[align='center']");
    // for (let i = 1; i < table.length; i++) {
    //   const td = table.eq(i).find('td');
    //   const dates = td.eq(0).text().replace("'","").split('/')
    //   const date = `20${dates[0]}-${dates[1]}-${dates[2]}`
    //   console.log(date)
    // }
    await browser.close();
}

getOpenPrice().catch(error => console.error(error));



// 教學
// https://www.tpisoftware.com/tpu/articleDetails/3032
// https://ithelp.ithome.com.tw/articles/10199826