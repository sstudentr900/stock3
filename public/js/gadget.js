window.onload=async function(){
  function StockReturn(buyPrice, sellPrice) {
    const capitalGain = sellPrice - buyPrice;
    const returnPercentage = (capitalGain / buyPrice) * 100;
    return returnPercentage.toFixed(2); // 取兩位小數
  }
}