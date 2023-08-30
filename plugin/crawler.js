const CronJob = require('cron').CronJob;
const { crawlerStock } = require("./crawlerStock.js"); //爬蟲股票
new CronJob({
  cronTime: '0 0 21 * * *',//每天早上8點執行
  // cronTime: '* */3 * * * *',//每3分鐘執行一次
  // cronTime: '10 * * * * *',//每分鐘的第10秒執行
  onTick: async function () {
      console.log(`開始執行爬蟲排程作業： ${new Date()}`);
      await crawlerStock()
      console.log('排程作業執行完畢！');
  },
  start: true,
  timeZone: 'Asia/Taipei'
});
