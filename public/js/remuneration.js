let dragStrockTarget;
function dragStrock(item){
  function dragstart(evt) {
    // console.log('dragstart-拖拉節點-1')
    dragStrockTarget = evt.target
    // console.log('target1',dragStrockTarget)
    // console.log('evt1',evt.target.innerHTML)
    evt.dataTransfer.setData("text/plain", evt.target.innerHTML);
    evt.dataTransfer.effectAllowed = "move";
  }
  function dragover(evt) {
    // console.log('dragover-拖拉到當前節點時，在當前節點持續觸發-3')
    evt.preventDefault();//取消預設行為，才能使用 drop
    evt.dataTransfer.dropEffect = "move";
  }
  function dropped(evt) {
    // console.log('dropped-拖拉過程會持續觸發-5')
    evt.preventDefault();
    evt.stopPropagation();
    // console.log('target2',dragStrockTarget)
    // console.log('evt2',evt.target.closest('.table_content').innerHTML)
    if (confirm('你要改變股票順序嗎') == true) {
      dragStrockTarget.innerHTML = evt.target.closest('.table_content').innerHTML;
      evt.target.closest('.table_content').innerHTML = evt.dataTransfer.getData("text/plain");

      //updat sort
      const sortObj = [...document.querySelectorAll('.table_content')].map((o,i)=>{
        const delet = o.querySelector('.delet')
        return {'id': delet.dataset.id,'sort':i+1}
      })
      // console.log(sortObj)
      getJSON({
        'url': './remuneration/sort',
        'method': 'POST',
        'body': sortObj
      }).then(function (json) {
        // alert(json.message)
      });
    }
  }
  // function dragenter(evt){
  //   console.log('dragenter-拖拉進當前節點-2')
  //   console.log(evt.target)
  // }
  // function dragLeave(evt){
  //   console.log('dragLeave-拖拉離開當前節點範圍時-4')
  //   console.log(evt.target)
  // }
  // function dragend(evt){
  //   console.log('dragend-拖拉結束時-6')
  //   // console.log(evt.target)
  
  // }
  // function mouseenter(){
  //   console.log('mouseenter-進入')
  // }
  // function mouseleave(){
  //   console.log('mouseleave-超出外框')
  //   if(!dragStrockTarget)return false;
  //   if (confirm('你確定你要刪除該股票') == true) {
  //     const delet = dragStrockTarget.querySelector('.delet')
  //     // console.log(delet)
  //     deletStrockfetch(dragStrockTarget,delet.dataset.id)
  //   }
  //   dragStrockTarget = null
  // }

  item.addEventListener('dragstart', dragstart);//拖拉節點
  // item.addEventListener('dragenter', dragenter);//拖拉進當前節點
  item.addEventListener('dragover', dragover);//拖拉到當前節點時，在當前節點持續觸發
  // item.addEventListener('dragleave', dragLeave);//拖拉離開當前節點範圍時
  item.addEventListener('drop', dropped);//拖拉過程會持續觸發
  // item.addEventListener('dragend', dragend);//拖拉結束時
  //超出外框-刪除
  // document.querySelector('.publicBox').addEventListener('mouseleave',mouseleave)
  // publicBox.addEventListener('mouseenter',mouseenter,false)
}
function creatStrockHtml(data){
  // console.log('creatStrockHtml')
  const isActive = (avenge)=>{
    return Math.sign(parseInt(avenge))<0?'green':''
  }
  const stockPayYear = data['stockPayYear'].map(element => {
    return `<li class="${element.year}"><p class="${isActive(element.avenge)}">${element.avenge}</p></li>`
  }).join('');
  const stockPayMonth =data['stockPayMonth'].map(element => {
    return `<li class="${element.month}"><p class="${isActive(element.avenge)}">${element.avenge}</p></li>`
  }).join('');
  const stockYield =data['stockYield'].map(element => {
    return `<li class="${element.nowYear}"><p class="${isActive(element.yield)}">${element.yield}</p></li>`
  }).join('');
  const html = `<ul class="table_content table_content_${data["id"]}" draggable="true">  
    <li class="name">
      <div class="text">
        <p class="publicEllipsis1">${data['stockname']}</p>
        <p>${data['stockno']}</p>
      </div>
      <div class="control">
        <a href="javascript:;" class="delet" onclick="deletStrock(this)" data-id="${data["id"]}">
          <svg clip-rule="evenodd" fill-rule="evenodd" stroke-linejoin="round" stroke-miterlimit="2" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path d="m12.002 2.005c5.518 0 9.998 4.48 9.998 9.997 0 5.518-4.48 9.998-9.998 9.998-5.517 0-9.997-4.48-9.997-9.998 0-5.517 4.48-9.997 9.997-9.997zm0 1.5c-4.69 0-8.497 3.807-8.497 8.497s3.807 8.498 8.497 8.498 8.498-3.808 8.498-8.498-3.808-8.497-8.498-8.497zm4.253 7.75h-8.5c-.414 0-.75.336-.75.75s.336.75.75.75h8.5c.414 0 .75-.336.75-.75s-.336-.75-.75-.75z" fill-rule="nonzero"></path></svg>
        </a>
      </div>
    </li>
    ${stockPayYear}
    <li><p>${data['stockCagr']}</p></li>
    ${stockPayMonth}
    ${stockYield}
    <li><p>${data['average']}</p></li>
    <li><p>${data['averageYield']}</p></li>
    <li><p>${data['nowYield']}</p></li>
    <li><p>${data['networth']}</p></li>
    <li><p>${data['cheapPrice']}</p></li>
    <li><p>${data['fairPrice']}</p></li>
    <li><p>${data['expensivePrice']}</p></li>
  </ul>`
  document.querySelector('.customTable').insertAdjacentHTML('beforeend',html)
  return `.table_content_${data["id"]}`;
}
function addStrock(){
  // console.log('addStrock')
  const stockno = window.prompt('您好!請輸入股號', '0050');
  if (stockno) {
    const stockname = window.prompt('請輸入股名', '元大台灣50');
    if (stockname) {
      getJSON({
        'url': './remuneration',
        'method': 'POST',
        'body': {
          'stockno': stockno,
          'stockname': stockname
        }
      }).then(function (json) {
        if(json.result=='false'){alert(json.message);return false;}
        json.data.stockno = stockno
        json.data.stockname = stockname
        const nowObj = creatStrockHtml(json.data)
        dragStrock(document.querySelector(nowObj))
        alert(`新增${stockname}(${stockno})成功`)
      });
    } 
  } 
}
function deletStrockfetch(obj,id){
  getJSON({
      'url': `./remuneration/${id}`,
      'method': 'DELETE'
    }).then(function (json) {
      obj.remove();
      // alert(json.message)
    });
}
function deletStrock(obj){
  event.stopPropagation()//停止冒泡
  if (confirm('你確定你要刪除該股票') == true) {
    const o = obj.closest('.table_content')
    const delet = o.querySelector('.delet')
    console.log(o,delet.dataset.id)
    deletStrockfetch(o,delet.dataset.id)
  }
}
(async function(){
  //創建html
  pageJson.forEach(d=>creatStrockHtml(d))
  //拖移
  document.querySelectorAll('.table_content').forEach(o=>dragStrock(o))
}())