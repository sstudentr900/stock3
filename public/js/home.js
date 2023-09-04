window.onload=async function(){
  console.log(pageJson)
  const prosperity = echarts.init(document.querySelector('.prosperity .customTable'),'dark');
  prosperity.setOption(pageJson['prosperity_option']);
  const weighted = echarts.init(document.querySelector('.weighted .customTable'),'dark');
  weighted.setOption(pageJson['weighted_option']);
}