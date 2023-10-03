const { dbQuery,dbInsert,dbUpdata,dbDelete } = require('../plugin/db')
const { stockCrawler } = require("../plugin/stockCrawler");
const { stockAvenge,getNowTimeObj } = require("../plugin/stockFn");

async function nowPage({stocks,date_start,date_end}) {
  // console.log(`nowPage,stockno,date_start,date_end,${stocks,date_start,date_end}`)
  let data = [];
  for(const stockno of stocks) {
    console.log(`nowPage,stockno,${stockno}`)
    let stockname='';
    let stockdata = await dbQuery( 'SELECT stockdata,stockname from stock WHERE stockno = ?',[stockno])
    // console.log(`nowPage,stockdata.length,${stockdata.length}`)
    if(!stockdata.length){
      let jsons = await stockCrawler({'stockno':stockno})
      // console.log(`nowPage,jsons,${jsons}`)
      if(!jsons){
        console.log(`nowPage,找不到資料`)
        // data = []
        // res.json({result:'false',message:'找不到資料'})
        return false;
        // break;
      }
      stockdata = jsons['stockdata']
      stockname = jsons['stockname']
    }else{
      stockdata = stockdata[0]['stockdata']
      stockname = stockdata[0]['stockname']
    }
    // console.log(`nowPage,抓取資料1,${date_start,date_end}}`)
    //抓取收盤資料
    stockdata = date.map(date=>{
      let value = JSON.parse(stockdata).find(obj=>obj.date==date)
      if(!value){  
        value = 0 
      }else{
        value = value['close'] 
      }
      return value;
    })
    // console.log(`stockdata1`,stockdata)
    //計算百分比
    let firstClose = 0
    stockdata = stockdata.map((close,index,array)=>{
      // return array;
      if(array[index]==0){
        return 0+'';
      }
      if(index==0 && array[index]>0 || array[index-1]==0 && array[index]>0){
        firstClose = close
        return 0+'';
      }
      return stockAvenge(firstClose, close)
    })
    // console.log(`stockdata2`,stockdata)
    //組圖表
    const obj = {}
    obj.name = `${stockname}(${stockno})`
    obj.type = 'line'
    obj.data = stockdata
    data.push(obj)
  }
  // console.log(`nowPage,data,${JSON.stringify(data)},date,${date}`)
  // res.json({ result:'true',data: {data:data,date:date} })
  return {
    data: data,
    date: date,
  };
}
async function search(req, res) {
  // console.log(`---------查詢股票---------`)
  const stocks = ['00692','0056','00713','00731','00878','00728']
  const date_start = getNowTimeObj({year:'-3'})['date']
  const date_end = getNowTimeObj()['date']
  // const stocks = ['0050']
  // const date_start = '2023-01-01'
  // const date_end = '2023-02-01'
  const data = await nowPage({
    stocks: stocks,
    date_start: date_start,
    date_end: date_end
  })
  data.date_start=date_start  
  data.date_end=date_end  
  data.stocks=stocks  
  res.render('remuneration',{
    'active': 'remuneration',
    'data': data,
  })
}
async function search_post(req, res) {
  const params = req.body
  if(!params.stocks.length || !params.date_start || !params.date_end ){
    console.log(`search_post,資料錯誤,${JSON.stringify(params)}`)
    res.json({result:'false',message:'資料錯誤'})
    return false;
  }
  // await nowPage({stocks:params.stocks,date_start:params.date_start,date_end:params.date_end,res:res})
  const data = await nowPage({stocks:params.stocks,date_start:params.date_start,date_end:params.date_end})
  // console.log(`search_post,${data}`)
  if(!data){
    res.json({result:'false',message:'找不到資料'})
    return false;
  }
  res.json({result:'true',data: data})
}

module.exports = { 
  search,
  search_post
}