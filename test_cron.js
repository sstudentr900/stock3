const CronJob = require('cron').CronJob;

// CronJob(cronTime, onTick, onComplete, start, timezone, context, runOnInit, unrefTimeout)
// cronTime [必填] 設定定時任務時間
// onTick [必填] 定時任務要執行的函式
// onComplete [選填] 完成定時任務後要執行的函式
// Start [選填] 是否自動啟動job，默認為false
// timeZone [選填] - 指定執行的時區

//每秒都執行
// * * * * * *
//每分鐘的第 10 秒執行
// 10 * * * * *
//每天晚上 10點30分10秒時執行
// 10 30 22 * * *


//官網範例
// const job = new CronJob(
// 	'* 30 9 * * *',
// 	function() {
// 		console.log('You will see this message every second');
// 	},
// 	null,
// 	true,
// 	'Asia/Taipei'
// );

new CronJob({
  cronTime: '1 53 9 * * *',//時段(秒/分/時)
  onTick: async function () { //執行程式
      console.log(`開始執行爬蟲排程作業： ${new Date()}`);
      // await crawler()
      console.log('排程作業執行完畢！');
  },
  start: true, //自動
  timeZone: 'Asia/Taipei',//時區
});
