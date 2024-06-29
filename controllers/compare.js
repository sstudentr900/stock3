const { dbQuery,dbInsert,dbUpdata,dbDelete } = require('../plugin/db')
const { stockCrawler } = require("../plugin/stockCrawler");
const { 
  stockPayMoreYear,
  stockYieldPrice,
  stockPayMoreMonth,
  stockCagr,
  getNowTimeObj,
  stockPay,
  stockdataFn_w,
  stockKdFn
} = require("../plugin/stockFn");

async function nowPage({row}) {
  const data = {}
  //更新時間
  data['dataDate'] = getNowTimeObj({'date':row['updated_at']})['date'];
  //id
  data['id'] = row['id']
  //股名
  data['stockname'] = row['stockname'];
  //股號
  data['stockno'] = row['stockno'];
  //stockdata 
  const stockdata= row['stockdata']?JSON.parse(row['stockdata']):'';
  //5日報酬
  data['stockPayFiveDay'] = stockPay(stockdata,5);
  //10日報酬
  data['stockPayTenDay'] = stockPay(stockdata,10);
  //20日報酬
  data['stockPayTwentyDay'] = stockPay(stockdata,20);
  //60日報酬
  data['stockPaySixtyDay'] = stockPay(stockdata,60);
  //120日報酬
  data['stockPayOneHundredDay'] = stockPay(stockdata,120);
  //今年每月報酬
  data['stockPayMonth'] = stockPayMoreMonth(stockdata,6);
  //最近10年每年報酬
  // data['stockPayYear'] = await stockPayMoreYear(stockdata,10);
  data['stockPayYear'] = await stockPayMoreYear(stockdata,6);
  //年化報酬率
  data['stockCagr'] = stockCagr(data['stockPayYear']);
  //淨值
  // if(row['networthdata']){
  //   let networthdata = JSON.parse(row['networthdata']);
  //   networthdata = networthdata[networthdata.length-1]
  //   // console.log(`networthdata,${networthdata}`)
  //   data['networthdata'] = `${networthdata['price']} / ${networthdata['networth']}`
  // }
  //殖利率
  let yieldObj = row['yielddata']?JSON.parse(row['yielddata']):'';
  yieldObj = stockYieldPrice(yieldObj,stockdata,3);
  // row['stockYield'] = yieldObj.stockYield;//每年殖利率
  // data['average'] = yieldObj.average;//平均股利
  // data['averageYield'] =yieldObj.averageYield;//平均殖利率
  data['nowYield'] = yieldObj.nowYield;//目前殖利率
  // data['cheapPrice']  = yieldObj.cheapPrice;//便宜 
  // data['fairPrice'] = yieldObj.fairPrice;//合理
  // data['expensivePrice'] =yieldObj.expensivePrice;//昂貴
  //4年高低點
  // row['highLowPrice'] = stockHighLowPriceMoreYear(row['stockdata'],4);
  //夏普值
  const sharpedata = row['sharpedata']?JSON.parse(row['sharpedata']).slice(-7)[0]:'';
  // console.log('夏普值',sharpedata)
  data['sharpe'] = sharpedata?sharpedata['sharpe']:'0';
  data['beta'] = sharpedata?sharpedata['beta']:'0';
  data['deviation'] = sharpedata?sharpedata['deviation']:'0';
  //周kd
  data['wkd_d'] = stockKdFn(stockdataFn_w(stockdata))['last_d'];
  //
  // console.log('60',data)
  return data;
}
async function search(req, res) {
  console.log(`---------查詢股票---------`)
  const data = []
  const rows = await dbQuery( 'SELECT id,sort,networthdata,stockname,stockno,stockdata,yielddata,updated_at,sharpedata from stock ORDER BY sort ASC' )
  // const rows = await dbQuery( 'SELECT id,sort,networthdata,stockname,stockno,stockdata,yielddata,updated_at,sharpedata from stock WHERE stockno="00888"' )
  if(!rows.length){console.log(`serch,dbQuery失敗跳出`)}
  for (const row of rows) {
    console.log(`--stockno:${row['stockno']}--`)
    data.push(await nowPage({row:row}))
    // console.log(`row,${JSON.stringify(data)}`)
  }
  // console.log(`row,${JSON.stringify(data)}`)
  // res.send(rows)
  res.render('compare',{
    'active': 'compare',
    'data': data,
  })
}
async function add(req, res) {
  console.log(`---------增加股票---------`)
  const params = req.body
  // if(!params.stockname || !params.stockno){
  if(!params.stockno){
    // console.log(`來源資料錯誤:${params.stockname}-${params.stockno}-${JSON.stringify(params)}`)
    console.log(`來源資料錯誤:${params.stockno}-${JSON.stringify(params)}`)
    res.json({result:'false',message:'來源資料錯誤'})
    return false;
  }
  const stockno = params.stockno
  const stocknoArray = await dbQuery( 'SELECT id from stock WHERE stockno = ?',[stockno])
  // console.log(`stocknoArray,${stocknoArray.length}`)
  if(stocknoArray.length){
    console.log('false,資料重複')
    res.json({result:'false',message:'資料重複'})
    return false;
  }else{
    console.log(`stockno:${stockno}`)
    //抓取資料
    const jsons = await stockCrawler({'stockno':stockno})
    if(!jsons){
      console.log('找不到資料')
      res.json({result:'false',message:'找不到資料'})
      return false;
    }
    const data = await nowPage({row:jsons});
    // console.log(data)

    res.json({result:'true',data: data })
  }
}
async function delet(req, res) {
  console.log(`---------刪除股票-----------`)
  const params = req.params
  const id = params.id
  console.log(`id:${id}`)
  if(!id){
    console.log(`來源資料錯誤:${params}`)
    res.json({result:'false',message:'來源資料錯誤'})
    return false;
  }
  const rows = await dbDelete('stock',id)
  if(rows){
    res.json({result:'true',message:'刪除股票成功'})
  }else{
    res.json({result:'false',message:'刪除股票失敗'})
  }
}
async function sort(req, res) {
  console.log(`---------排序股票報酬---------`)
  const params = req.body
  for (const param of params) {
    // console.log(param['sort'],param['id'])
    await dbUpdata('stock',{'sort':param['sort']},param['id'])
  }
  res.json({result:'true',message: '股票排序成功'})
}

module.exports = { 
  search,
  add,
  delet,
  sort
}