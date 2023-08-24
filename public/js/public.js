async function getJSON({url,method,headers,body}){
  if(method=='POST'){
    headers = {
      "Content-Type": "application/json",//POST with body 必帶
      "Accept": "application/json",//我是用哪種資料型態來
    }
  }
  const response = await fetch(
    url,
    {
      method: method,
      headers: headers,
      body: JSON.stringify(body)
    }
  );
  return await response.json();
}
//使用範例
// getJSON({
//   'url': 'src',
//   'method': 'POST', //DELETE,POST
//   'body': {'id': id}
// }).then(function (json) {
//   console.log(json)
// });

// function getJSON2(url,obj){
//   fetch(url,obj)
//   .then((response)=>response.json())
//   .then(function (myJson) {
//     console.log(myJson);
//   });
// }