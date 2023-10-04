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
  stockKdFn,
  getSort,
  getMa,
  getAccumulate
} = require("../plugin/stockFn");

async function nowPage({row}) {
  if(!row){
    console.log(`nowPage,row沒有值跳出`)
    return false;
  }
  const data = {}
  // //更新時間
  data['dataDate'] = getNowTimeObj({'date':row['updated_at']})['date']
  // //stockname
  data['stockno'] = row['stockno'];
  // //stockname
  data['stockname'] = row['stockname'];
  // //stockdata 
  data['stockdata'] = row['stockdata']?JSON.parse(row['stockdata']):'';
  // const stockdataLess = data['stockdata'].slice(-132)
  const stockdataLess = data['stockdata']
  data['stock_date'] = stockdataLess.map(item=>item.date)
  data['stock_price'] = stockdataLess.map(item=>[item.open,item.close,item.low,item.high])
  data['stock_vol'] = stockdataLess.map(item=>item.volume)
  data['stock_ma5'] = getMa(5,stockdataLess)
  data['stock_ma10'] = getMa(10,stockdataLess)
  data['stock_ma20'] = getMa(20,stockdataLess)
  //法人買賣超
  // data['threecargo'] = row['threecargo']?JSON.parse(row['threecargo']):'';
  const threecargo = row['threecargo']?JSON.parse(row['threecargo']):''
  data['threecargo'] = getSort({obj:row['threecargo'],number:18})
  //法人買賣超_日期
  data['threecargo_date'] = threecargo.map(({date})=>date)
  //法人買賣超
  // console.log(threecargo)
  data['threecargo_data'] = threecargo.map(({totle})=>totle)
  data['threecargo_data'] = getAccumulate({ obj:data['threecargo_data'] })
  //法人買賣超_加權指數
  data['threecargo_market'] = threecargo.map(({date})=>{
    const obj = data['stockdata'].find(item=>date==item.date)
    return obj?Number(obj.close):0
  })
  //融資融劵		
  // data['threecargo'] = row['threecargo']?JSON.parse(row['threecargo']):'';
  const financing = row['financing']?JSON.parse(row['financing']):''
  data['financing'] = getSort({obj:row['financing'],number:18})
  //融資融劵_日期
  data['financing_date'] = financing.map(({date})=>date)
  //融資融劵
  data['financing_data'] = financing.map(({financing_balance})=>Number(financing_balance))
  //融資融劵_加權指數
  data['financing_market'] = financing.map(({date})=>{
    const obj = data['stockdata'].find(item=>date==item.date)
    return obj?Number(obj.close):0
  })
  //股東持股分級週統計圖	
  const holder = JSON.parse(row['holder'])
  data['holder'] = getSort({obj:row['holder'],number:18})
  //股東持股分級_日期
  data['holder_date'] = holder.map(({date})=>date)
  //股東持股分級
  data['holder_data'] = holder.map(({big50,big100,big400,big800,big1000,big1001})=>{
    return Number(big400.split(',').join(''))+Number(big800.split(',').join(''))+Number(big1000.split(',').join(''))+Number(big1001.split(',').join(''))
    // return Number(big50.split(',').join(''))+Number(big100.split(',').join(''))
  })
  data['holder_data'] = getAccumulate({ obj:data['holder_data'] })
  //股東持股分級_加權指數
  data['holder_market'] = holder.map(({date})=>{
    // const obj = data['stockdata'].find(item=>item.date == date)
    // return obj?Number(obj.close):0
    let number = 0
    const obj = data['stockdata'].find((obj,index)=>{
      number = index;
      return date==obj.date
    })
    // console.log(obj)
    return obj?Number(obj.close):Number(data['stockdata'][number].close)
  })
  //今年每月報酬
  // row['stockPayMonth'] = stockPayMoreMonth(row['stockdata']);
  //最近5年每年報酬
  data['stockPayYear'] = await stockPayMoreYear(data['stockdata'],5);
  //年化報酬率
  data['stockCagr'] = stockCagr(data['stockPayYear']);
  //淨值
  // row['networthdata'] = row['networthdata']?JSON.parse(row['networthdata']):''
  data['networthdata'] = getSort({obj:row['networthdata'],number:6})
  //殖利率
  row['yielddata'] = row['yielddata']?JSON.parse(row['yielddata']):''
  const yieldObj = stockYieldPrice(row['yielddata'],data['stockdata']);
  data['stockYield'] = yieldObj.stockYield;//每年殖利率
  // data['average'] = yieldObj.average;//平均股利
  // data['averageYield'] =yieldObj.averageYield;//平均殖利率
  data['nowYield'] = yieldObj.nowYield;//目前殖利率
  data['cheapPrice']  = yieldObj.cheapPrice;//便宜 
  data['fairPrice'] = yieldObj.fairPrice;//合理
  data['expensivePrice'] =yieldObj.expensivePrice;//昂貴
  //持股產業
  data['industry'] = row['industry']?JSON.parse(row['industry']):'';
  //持股明細
  data['shareholding'] = row['shareholding']?JSON.parse(row['shareholding']):'';
  //夏普值
  data['sharpedata'] = row['sharpedata']?JSON.parse(row['sharpedata']).slice(-7):'';
  //5年高低點
  data['highLowPrice'] = stockHighLowPriceMoreYear(data['stockdata'],5);
  //周kd
  // data['wkd_d'] = stockKdFn(stockdataFn_w(data['stockdata']))['last_d'];

  return data;
}
async function search(req, res) {
  console.log(`---------查詢股票---------`)
  const params = req.params
  // console.log(params.stockno)
  if(!params.stockno){
    console.log(`來源資料錯誤:${params.stockno}-${JSON.stringify(params)}`)
    res.render('individual',{
      'active': 'individual',
      'data': 0,
    })
    return false;
  }
  let data = ''
  const stockno = params.stockno
  const rows = await dbQuery( 'SELECT networthdata,stockname,stockno,stockdata,yielddata,threecargo,financing,holder,shareholding,industry,sharpedata,updated_at from stock WHERE stockno = ?',[stockno] )
  if(rows.length){
    console.log(`serch有值`)
    data = await nowPage({row:rows[0]})
    console.log(data)
  }else{
    console.log(`serch沒有該股重新抓取，stockno:${stockno}`)
    //抓取資料
    const jsons = await stockCrawler({'stockno':stockno})
    if(!jsons){
      console.log('serch抓取不到資料')
      data = 0;
    }else{
      console.log('serch抓取資料')
      data = await nowPage({row:jsons})
    }
  }
  res.render('individual',{
    'active': 'individual',
    'data': data,
  })
}
// async function add(req, res) {
//   console.log(`---------增加股票---------`)
//   const params = req.body
//   // if(!params.stockname || !params.stockno){
//   if(!params.stockno){
//     // console.log(`來源資料錯誤:${params.stockname}-${params.stockno}-${JSON.stringify(params)}`)
//     console.log(`來源資料錯誤:${params.stockno}-${JSON.stringify(params)}`)
//     res.json({result:'false',message:'來源資料錯誤'})
//     return false;
//   }
//   const stockno = params.stockno
//   const stocknoArray = await dbQuery( 'SELECT id from stock WHERE stockno = ?',[stockno])
//   // console.log(`stocknoArray,${stocknoArray.length}`)
//   if(stocknoArray.length){
//     console.log('false,資料重複')
//     res.json({result:'false',message:'資料重複'})
//     return false;
//   }else{
//     console.log(`stockno:${stockno}`)
//     //抓取資料
//     const jsons = await stockCrawler({'stockno':stockno})
//     if(!jsons){
//       console.log('找不到資料')
//       res.json({result:'false',message:'找不到資料'})
//       return false;
//     }
//     // console.log(jsons)
//     const data = {}
//     //stockdata 轉換 parse
//     // console.log(JSON.stringify(jsons))
//     const stockdata = jsons['stockdata']?JSON.parse(jsons['stockdata']):''
//     // console.log(`抓取數量:${stockdata.length}`)
//     //股名
//     data['stockname'] = jsons['stockName']
//     //股號
//     data['stockno'] = stockno
//     //今年月報酬
//     data['stockPayMonth'] = stockPayMoreMonth(stockdata)
//     //8年報酬
//     data['stockPayYear'] = stockPayMoreYear(stockdata,8)
//     //年化報酬率
//     data['stockCagr'] = stockCagr(data['stockPayYear'])
//     //殖利率
//     const yielddata = jsons['yielddata']?JSON.parse(jsons['yielddata']):'';
//     const yieldObj = stockYieldPrice(yielddata,stockdata);
//     data['stockYield'] = yieldObj.stockYield;//每年殖利率
//     data['average'] = yieldObj.average;//平均股利
//     data['averageYield'] =yieldObj.averageYield;//平均殖利率
//     data['nowYield'] = yieldObj.nowYield;//目前殖利率
//     data['cheapPrice']  = yieldObj.cheapPrice;//便宜 
//     data['fairPrice'] = yieldObj.fairPrice;//合理
//     data['expensivePrice'] =yieldObj.expensivePrice;//昂貴
//     //4年高低點
//     data['highLowPrice'] = stockHighLowPriceMoreYear(stockdata,4);
//     //周kd
//     data['wkd_d'] = stockKdFn(stockdataFn_w(stockdata))['last_d'];
//     //目前淨值
//     if(jsons['networthdata']){
//       let networthdata = JSON.parse(jsons['networthdata']);
//       networthdata = networthdata[networthdata.length-1]
//       // console.log(`networthdata,${networthdata}`)
//       data['networthdata'] = `${networthdata['price']} / ${networthdata['networth']}`
//     }else{
//       data['networthdata'] = 0;
//     }
//     //id
//     data['id'] = jsons['insertId']

//     //移除不需要的值
//     delete data.stockdata
//     delete data.updated_at

//     res.json({result:'true',data: data })
//   }
// }
// async function delet(req, res) {
//   console.log(`---------刪除股票-----------`)
//   const params = req.params
//   const id = params.id
//   console.log(`id:${id}`)
//   if(!id){
//     console.log(`來源資料錯誤:${params}`)
//     res.json({result:'false',message:'來源資料錯誤'})
//     return false;
//   }
//   const rows = await dbDelete('stock',id)
//   if(rows){
//     res.json({result:'true',message:'刪除股票成功'})
//   }else{
//     res.json({result:'false',message:'刪除股票失敗'})
//   }
// }
// async function sort(req, res) {
//   console.log(`---------排序股票報酬---------`)
//   const params = req.body
//   for (const param of params) {
//     // console.log(param['sort'],param['id'])
//     await dbUpdata('stock',{'sort':param['sort']},param['id'])
//   }
//   res.json({result:'true',message: '股票排序成功'})
// }

module.exports = { 
  search,
  // add,
  // delet,
  // sort
}