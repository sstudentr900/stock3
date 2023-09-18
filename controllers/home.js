const { dbQuery,dbInsert,dbUpdata,dbDelete } = require('../plugin/db')
const { 
  getNowTimeObj,
  getMonthly
} = require("../plugin/stockFn");
async function serch(req, res) {
  let rows = await dbQuery( 'SELECT * from market' )
  if(!rows.length){console.log(`serch,dbQuery失敗跳出`)}
  for (const row of rows) {
     //加權指數
    const data = JSON.parse(row['twii'])
    row['data'] = data.map(item=>[item.date,item.open,item.hight,item.low,item.close,item.volume])
    //時間
    row['date'] = getNowTimeObj({'date':row['updated_at']})['date']
    //3大法人買賣超融資卷
    row['threecargofinancing'] = JSON.parse(row['threecargo']).slice(-10).sort((o1,o2)=>Number(o2.date.split('-').join(''))-Number(o1.date.split('-').join('')))
    //3大法人期貨買賣超
    row['threefutures'] = JSON.parse(row['threefutures']).slice(-10).sort((o1,o2)=>Number(o2.date.split('-').join(''))-Number(o1.date.split('-').join('')))
    //大盤上下跌家數
    row['updownnumber'] = JSON.parse(row['updownnumber']).slice(-10).sort((o1,o2)=>Number(o2.date.split('-').join(''))-Number(o1.date.split('-').join('')))
    //上市類股漲跌
    row['listed'] = JSON.parse(row['listed']).sort((o1,o2)=>Number(o1.date.split('-').join(''))-Number(o2.date.split('-').join('')))
    //除息股票
    row['exdividend'] = JSON.parse(row['exdividend']).sort((o1,o2)=>Number(o1.date.split('-').join(''))-Number(o2.date.split('-').join(''))).filter((item,index)=>{
      // console.log(item.ex_date,nowDate,item.ex_date>=nowDate)
      const nowDate = getNowTimeObj()['date']
      if(item.ex_date>=nowDate){
        return item;
      }
    })
    //大股東增減
    row['holder'] = JSON.parse(row['holder']).sort((o1,o2)=>Number(o1.date.split('-').join(''))-Number(o2.date.split('-').join(''))).filter((item,index)=>{
      const nowDate = getNowTimeObj({day:'-3'})['date']
      if(item.date>=nowDate){
        return item;
      }
    })
    //羊群增減
    row['retail'] = JSON.parse(row['retail']).sort((o1,o2)=>Number(o1.date.split('-').join(''))-Number(o2.date.split('-').join(''))).filter((item,index)=>{
      const nowDate = getNowTimeObj({day:'-3'})['date']
      if(item.date>=nowDate){
        return item;
      }
    })
    //景氣對策信號
    if(row['prosperity']){
      const prosperity = JSON.parse(row['prosperity']).slice(-12)
      //日期
      row['prosperity_date'] = prosperity.map(({date})=>`${date.split('-')[0].slice(-2)}-${date.split('-')[1]}`)
      //景氣對策信號
      row['prosperity_data'] = prosperity.map(({point})=>point)
      //景氣對策信號_加權指數
      row['prosperity_market'] = prosperity.map(({date})=>{
        const obj = data.find(obj=>{
          return (date.split('-')[0]+'-'+date.split('-')[1])==(obj.date.split('-')[0]+'-'+obj.date.split('-')[1])
        })
        return obj?Number(obj.close):0
      })
    }
    //美金
    if(row['dollars']){
      const dollars = getMonthly({ year:'2020',json:JSON.parse(row['dollars']) })
      //日期
      row['dollars_date'] = dollars.map(({date})=>`${date.split('-')[0].slice(-2)}-${date.split('-')[1]}`)
      //美金資料
      row['dollars_data'] = dollars.map(({dollars})=>Number(dollars))
      //美金_加權指數
      row['dollars_market'] = dollars.map(({date})=>{
        const obj = data.find(obj=>date==obj.date)
        return obj?Number(obj.close):0
      })
    }

    //移除不需要的值和值沒有轉JSON.parse
    delete row.twii
    delete row.threecargo
    delete row.id
    delete row.prosperity
    delete row.updated_at
    delete row.dollars
  }
  // console.log(rows[0])
  res.render('home',{
    'active': 'home',
    'data': rows[0],
  })
}
async function stockAdd(req, res) {
  console.log(`---------增加股票---------`)
  const params = req.body
  if(!params.stockname || !params.stockno){
    console.log(`來源資料錯誤:${params.stockname}-${params.stockno}-${JSON.stringify(params)}`)
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
    const jsons = await stockStart({'stockno':stockno})
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
    data['networth'] = jsons['networth']

    //儲存資料
    // console.log(`儲存資料,jsons,${JSON.stringify(jsons)}`)
    const rows = await dbInsert('stock',params)
    const insertId = rows.insertId
    jsons['sort'] = insertId
    jsons['networth'] = data['networth']
    await dbUpdata('stock',jsons,insertId)

    //id
    data['id'] = insertId

    //移除不需要的值
    delete data.stockdata
    delete data.updated_at

    res.json({result:'true',data: data })
  }
}
async function stockDelet(req, res) {
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
async function stockSort(req, res) {
  console.log(`---------排序股票報酬---------`)
  const params = req.body
  for (const param of params) {
    // console.log(param['sort'],param['id'])
    await dbUpdata('stock',{'sort':param['sort']},param['id'])
  }
  res.json({result:'true',message: '股票排序成功'})
}

module.exports = { 
  serch
}