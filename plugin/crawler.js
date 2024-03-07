const CronJob = require('cron').CronJob;
const { crawlerStock } = require("./crawlerStock.js"); //爬蟲股票
new CronJob({
  cronTime: '00 30 15 * * *',//時段(秒/分/時)
  onTick: async function () { //執行程式
      console.log(`開始執行爬蟲排程作業： ${new Date()}`);
      await crawlerStock()
      console.log(`排程作業執行完畢！ ${new Date()}`);
  },
  start: true, //自動
  timeZone: 'Asia/Taipei',//時區
});
