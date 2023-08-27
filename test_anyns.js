

function subworker(name,number,boolean){
  return new Promise((resolve, reject)=>{
    if(boolean){
      //jsons
      setTimeout(function(){
        resolve(`${name}_value`);
      }, number);
    }else{
      //error
      setTimeout(function(){
        reject(`${name}_error`);
      }, 3000);
    }
  });
}

//1.不能繼續執行其他程式----------------------------------------------------
// async function work() {
//   const reslut_1_2 = await　Promise.all([subworker('resolve1',1000,true), subworker('resolve2',2000,true)]);
//   const resolve1 = reslut_1_2[0];
//   const resolve2 = reslut_1_2[1];
//   // console.log(resolve1,resolve2)
//   // if(!resolve1 && !resolve2) {
//   //   // return Promise.reject(new Error('something miss'));
//   //   return Promise.reject('something miss');
//   // }
//   const resolve3 = await subworker('resolve3',2000,false);
//   // return computer(resolve1, resolve2, resolve3);
//   return Promise.resolve(Object.assign({resolve1,resolve2,resolve3}));
//   // return Object.assign({resolve1,resolve2,resolve3});
// }
//Promise
// work().then(json=>{
//   console.log(`json,${json}`)
// }).catch(error=>{
//   console.log(`error,${error}`)
// })

//async
// async function aa(){
//   try{
//     const jsons = await work()
//     console.log('jsons',jsons)
//   } catch(error) {
//   //     // throw new Error(400);
//     console.log('error',error)
//   };
//   console.log(`繼續執行其他程式`)
// }
// aa()


//2.繼續執行其他程式----------------------------------------------------
async function work2() {
  const obj = {}
  //多個都成功才回傳直
  await Promise.all([subworker('resolve1',1000,true), subworker('resolve2',2000,true)])
  .then((json)=>{
    obj.resolve1 = json[0]
    obj.resolve2 = json[1]
  })
  .catch((error)=>console.log(error))
  //單個
  await subworker('resolve3',2000,false)
  .then((json)=>obj.resolve3 = json)
  .catch((error)=>console.log(error))
  return Object.values(obj).length?JSON.stringify(obj):false;
}
//async
async function cc(){
  const jsons = await work2()
  console.log(`jsons,${jsons}`)
  console.log(`繼續執行其他程式`)
}
cc()

