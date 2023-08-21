// 引用linebot SDK
const axios = require('axios');
const linebot = require('linebot');
const config = require("./config");
const { googleSheetGetData } = require("./googleSheet");
const { stockGrap,stockPromise } = require("./stock");
const userId = config.lineID;//Your User ID
// 用於辨識Line Channel的資訊
const bot = linebot({
  channelId: config.lineChannelId,
  channelSecret: config.lineSecret,
  channelAccessToken: config.lineAccessToken
});
//fn
const randomFn = (length)=>{
  return Math.floor(Math.random()*length)
}
const linePushFn = (message)=>{
  bot.push(userId, [message]);
  // console.log('linePushFn: ' + message);
  console.log('linePushFn');
}
//eate
const eateNow = (event)=>{
  googleSheetGetData('1151243845')
  .then(async(sheet)=>{
    const rows = await sheet.getRows();
    const array = [];
    for (row of rows) {
      array.push(row._rawData[0]);
    }

    message = array.join('\n')
    event.reply(message)
  })
}
const eateSearch = (event)=>{
  googleSheetGetData('1151243845')
  .then(async(sheet)=>{
    const rows = await sheet.getRows();
    const shops = [];
    for (row of rows) {
      shops.push(row._rawData[0]);
    }
    const shopName = shops[randomFn((shops.length-1))]
    // console.log(shopName)
    // console.log(shops)

    //reply text
    // event.reply({
    //   'type': 'text',
    //   'text': shopName
    // })
    //reply location
    // event.reply({
    //   "type": "location",
    //   "title": "my location",
    //   "address": "1-6-1 Yotsuya, Shinjuku-ku, Tokyo, 160-0004, Japan",
    //   "latitude": 35.687574,
    //   "longitude": 139.72922
    // })

    //google search url
    //https://www.google.com/maps/search/%E5%95%9E%E5%B7%B4%E9%BA%B5%E5%BA%97

    //get map location
    const serch = encodeURI(shopName)
    const axiosConfig = {
      method: 'get',
      url: 'https://maps.googleapis.com/maps/api/place/findplacefromtext/json?input='+serch+'&inputtype=textquery&fields=formatted_address%2Cname%2Crating%2Copening_hours%2Cgeometry&key='+config.googleMapID,
    };
    axios(axiosConfig)
    .then(function (response) {
      // console.log('data',response.data)
      // location { lat: 22.9899117, lng: 120.1979533 }
      // console.log('location',response.data.candidates[0].geometry.location)
      // console.log('address',response.data.candidates[0].formatted_address)
      const location = response.data.candidates[0].geometry.location
      const address = response.data.candidates[0].formatted_address
      event.reply({
        "type": "location",
        "title": shopName,
        "address": address,
        "latitude": location.lat,
        "longitude": location.lng
      })
    })
    .catch(function (error) {
      console.log('eateSearch',error);
    });
  })
}
const eateSave = (userMessage,event)=>{
  googleSheetGetData('1151243845')
  .then(async(sheet)=>{
    const array = userMessage.split(',')//[ '阿雞記吃的', '龍點心' ]
    const rows = await sheet.getRows();
    let word = array[1]
    for (row of rows) {
      if(row['shopName']==word){
        word = false
        break;
      }
    }
    // append
    if(word){
      await sheet.addRow({'shopName':word});
    }

    //reply
    event.reply('好的，我記住了')
  })
}
//word
const wordNow = (event)=>{
  googleSheetGetData('1813117258')
  .then(async(sheet)=>{
    const rows = await sheet.getRows();
    const array = [];
    for (row of rows) {
      array.push(row._rawData.join(','));
    }
    message = array.join('\n')
    event.reply(message)
  })
}
const wordSave = (userMessage,event)=>{
  googleSheetGetData('1813117258')
  .then(async(sheet)=>{
    const array = userMessage.split(',')//[ '阿雞記關鍵字', '1', '2' ]
    const rows = await sheet.getRows();
    const question = array[1]
    let message = '好的，我記住了'
    let answer = array[2]
    for (let [rowIndex, row] of rows.entries()) {
      // console.log(index, row)
      // console.log('有沒有該question',row['question']==question,row['question'],question)
      if(row['question']==question){
        //複製array
        let rawData = row._rawData.slice()
        //取array第一個
        rawData.shift()
        // console.log('有沒有該answer(-1)',rawData.indexOf(answer),rawData,answer)
        if(rawData.indexOf(answer)==-1){
          // console.log('n repeat')
          // console.log('該length>4',rawData.length)
          if(rawData.length>4){
            // console.log('more than 5')
            message = '超過儲存數'
            answer = false
            break;
          }else{
            // console.log('<5')
            //updat
            rows[rowIndex].question = question
            rawData.push(answer)
            // console.log('rowIndex',rowIndex)
            // console.log('rawData push',rawData)
            rawData.forEach((element,index) => {
              // console.log('forEach',element,index)
              rows[rowIndex]['answer'+(index+1)] = element
            });

            await rows[rowIndex].save();
            answer = false
            break;
          }
          
        }else{
          // console.log('y repeat')
          answer = false
          break;
        }
      }
    }

    // append
    if(answer){
      await sheet.addRow({'question':question,'answer1':answer});
    }

    //reply
    event.reply(message)
  })
}
const wordSearch = (userMessage,event)=>{
  googleSheetGetData('1813117258')
  .then(async(sheet)=>{
    const rows = await sheet.getRows();
    let message = ''
    for(let [index,row] of rows.entries()){
      if(row['question']==userMessage){
        let words = row._rawData.slice()
        message = words[randomFn(words.length-1)]
        break;
      }
    }

    // console.log(message)
    //reply
    event.reply(message)
  })
}
//stock
const stockNow = (event)=>{
  googleSheetGetData('340899742')
  .then(async(sheet)=>{
    const rows = await sheet.getRows();
    const array = [];
    for (row of rows) {
      array.push(row._rawData.join(','));
    }
    message = array.join('\n')
    event.reply(message)
  })
}
const stockSearch = async(event)=>{
  const sheet = await googleSheetGetData('340899742').then(sheet=>sheet)
  const rows = await sheet.getRows();
  const jsonUrl = 'https://etf.masterlink.com.tw/API/Data/F1_10_ETFPerf.json?t=0.8649854163488351'
  const etfData = await stockPromise({url: jsonUrl,method: "GET"}).then(body=>JSON.parse(body))
  let message = []
  let sheetAddRow = []
  for(const [index,value] of etfData.entries()){
    //限制幾筆
    // if(index>2)break; 
    console.log('stockNo',value['V1'],'stockName',value['V2'],'index',index)
    let isSheet = false
    for (let [rowIndex, row] of rows.entries()) {
      const stockNames = row['stock']
      if(!stockNames)continue;
      const stockNo = stockNames.split('(')[1].split(')')[0]
      if(value['V1']!=stockNo)continue;
      if(value['V1']==stockNo){
        console.log('從sheet修改')
        const stockName = stockNames.split('(')[0]
        const stockData = row['stockData']
        const yieldValue = row['yieldValue']
        const method = row['method']
        const stockRecult = await stockGrap({stockNo,stockName,yieldValue,stockData,method})
        if(!stockRecult)continue;
        rows[rowIndex].price = stockRecult.price
        rows[rowIndex].volume = stockRecult.volume
        rows[rowIndex].netWorth = stockRecult.netWorth
        rows[rowIndex].dayPrice = stockRecult.dayPrice
        rows[rowIndex].weekPrice = stockRecult.weekPrice
        rows[rowIndex].monthPrice = stockRecult.monthPrice
        rows[rowIndex].halfYearPrice = stockRecult.halfYearPrice
        rows[rowIndex].yearPrice = stockRecult.yearPrice
        rows[rowIndex].twoYearPrice = stockRecult.twoYearPrice
        rows[rowIndex].threeYearPrice = stockRecult.threeYearPrice
        rows[rowIndex].nowYield = stockRecult.nowYield
        rows[rowIndex].halfYearYield = stockRecult.halfYearYield
        rows[rowIndex].yearYield = stockRecult.yearYield
        rows[rowIndex].yieldValue = stockRecult.yieldValue
        rows[rowIndex].cheapPrice = stockRecult.cheapPrice
        rows[rowIndex].fairPrice = stockRecult.fairPrice
        rows[rowIndex].expensivePrice = stockRecult.expensivePrice
        rows[rowIndex].stockData = stockRecult.stockData
        rows[rowIndex].methodReturn = stockRecult.methodReturn
        rows[rowIndex].save()
        isSheet = true
      }
    }
    if(!isSheet){
      const stockGrapObj = await stockGrap({stockNo:value['V1'],stockName:value['V2']})
      if(!stockGrapObj)continue;
      sheetAddRow.push(stockGrapObj)
    }
  }
  if(sheetAddRow.length){
    console.log('從sheet sheetAddRow')
    // const moreRows = await sheet.addRows(sheetAddRow);
    // const moreRow = await sheet.addRow({ stock: 'Larry Page', stockData: 'larry@google.com' });
    await sheet.addRows(sheetAddRow);
  }
  //linePushFn
  // message = message.join('\n')
  // console.log(message)

  //reply
  // if(event){
  //   event.reply(message)
  // }else{
  //   linePushFn(message)
  // }
  // })
}

stockSearch()

module.exports = {
  stockSearch,
  stockNow,
  eateSearch,
  eateSave,
  eateNow,
  wordSearch,
  wordSave,
  wordNow,
  bot
} 
