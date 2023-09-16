const { dbQuery,dbInsert,dbUpdata,dbDelete } = require('../plugin/db')
const { stockCrawler } = require("../plugin/stockCrawler");
const { 
  stockPayMoreYear,
  stockYieldPrice,
  stockPayMoreMonth,
  stockCagr,
  getNowTimeObj,
  stockHighLowPriceMoreYear,
  stockdataFn_w,
  stockKdFn
} = require("../plugin/stockFn");

async function search(req, res) {
  console.log(`---------查詢股票---------`)
  const rows = await dbQuery( 'SELECT id,sort,networthdata,stockname,stockno,stockdata,yielddata,updated_at from stock ORDER BY sort ASC' )
  if(!rows.length){console.log(`serch,dbQuery失敗跳出`)}
  for (const row of rows) {
    console.log(`--stockno:${row['stockno']}--`)
    //更新時間
    row['dataDate'] = getNowTimeObj({'date':row['updated_at']})['date']
    //stockdata 
    row['stockdata'] = row['stockdata']?JSON.parse(row['stockdata']):'';
    //今年每月報酬
    row['stockPayMonth'] = stockPayMoreMonth(row['stockdata']);
    //最近8年每年報酬
    row['stockPayYear'] = await stockPayMoreYear(row['stockdata'],8);
    //年化報酬率
    row['stockCagr'] = stockCagr(row['stockPayYear']);
    //淨值
    if(row['networthdata']){
      let networthdata = JSON.parse(row['networthdata']);
      networthdata = networthdata[networthdata.length-1]
      // console.log(`networthdata,${networthdata}`)
      row['networthdata'] = `${networthdata['price']} / ${networthdata['networth']}`
    }
    //殖利率
    let yieldObj = row['yielddata']?JSON.parse(row['yielddata']):'';
    yieldObj = stockYieldPrice(yieldObj,row['stockdata']);
    row['stockYield'] = yieldObj.stockYield;//每年殖利率
    row['average'] = yieldObj.average;//平均股利
    row['averageYield'] =yieldObj.averageYield;//平均殖利率
    row['nowYield'] = yieldObj.nowYield;//目前殖利率
    row['cheapPrice']  = yieldObj.cheapPrice;//便宜 
    row['fairPrice'] = yieldObj.fairPrice;//合理
    row['expensivePrice'] =yieldObj.expensivePrice;//昂貴
    //4年高低點
    row['highLowPrice'] = stockHighLowPriceMoreYear(row['stockdata'],4);
    //周kd
    row['wkd_d'] = stockKdFn(stockdataFn_w(row['stockdata']))['last_d'];
  
    //移除不需要的值
    delete row.stockdata
    delete row.yielddata
    delete row.updated_at
    console.log(`row,${JSON.stringify(row)}`)
  }
  // res.send(rows)
  res.render('remuneration',{
    'active': 'remuneration',
    'data': rows,
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
    // console.log(jsons)
    const data = {}
    //stockdata 轉換 parse
    // console.log(JSON.stringify(jsons))
    const stockdata = jsons['stockdata']?JSON.parse(jsons['stockdata']):''
    // console.log(`抓取數量:${stockdata.length}`)
    //股名
    data['stockname'] = jsons['stockName']
    //股號
    data['stockno'] = stockno
    //今年月報酬
    data['stockPayMonth'] = stockPayMoreMonth(stockdata)
    //8年報酬
    data['stockPayYear'] = stockPayMoreYear(stockdata,8)
    //年化報酬率
    data['stockCagr'] = stockCagr(data['stockPayYear'])
    //殖利率
    const yielddata = jsons['yielddata']?JSON.parse(jsons['yielddata']):'';
    const yieldObj = stockYieldPrice(yielddata,stockdata);
    data['stockYield'] = yieldObj.stockYield;//每年殖利率
    data['average'] = yieldObj.average;//平均股利
    data['averageYield'] =yieldObj.averageYield;//平均殖利率
    data['nowYield'] = yieldObj.nowYield;//目前殖利率
    data['cheapPrice']  = yieldObj.cheapPrice;//便宜 
    data['fairPrice'] = yieldObj.fairPrice;//合理
    data['expensivePrice'] =yieldObj.expensivePrice;//昂貴
    //4年高低點
    data['highLowPrice'] = stockHighLowPriceMoreYear(stockdata,4);
    //周kd
    data['wkd_d'] = stockKdFn(stockdataFn_w(stockdata))['last_d'];
    //目前淨值
    if(jsons['networthdata']){
      let networthdata = JSON.parse(jsons['networthdata']);
      networthdata = networthdata[networthdata.length-1]
      // console.log(`networthdata,${networthdata}`)
      data['networthdata'] = `${networthdata['price']} / ${networthdata['networth']}`
    }else{
      data['networthdata'] = 0;
    }
    //id
    data['id'] = jsons['insertId']

    //移除不需要的值
    delete data.stockdata
    delete data.updated_at

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