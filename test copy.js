// 假設想購買一檔債券基金, 手續費 2.4%, 計劃投入資金一年, 每個月購買 3000 圓美金的基金(假設一年內的基金市值沒有變化), 一共付了 12 期費用, 債券基金年配息 5.35%, 每月領息, 繳款期間不領息, 直接投入基金, 當繳費期滿一年後, 持續領息至少再花一年, 未來當債券價格回到當初投入價格時才全部贖回, 試計算獲利率, 並換算一下 IRR 的年化報酬率:
// debt.js
function irr(CT) {
    var maxrate = 100/100 // 100%
    var minrate = 0.0
    var k =1000           // prevent infinit loop
    var NPV,IRR
    while (k-- > 0) {
        [NPV, IRR]  = [0.0, (maxrate + minrate) / 2];
        CT.forEach( (c,i) => NPV = NPV + c/((1+IRR)**i) );
        if (Math.abs(NPV) < 1e-6 || (maxrate - minrate) < 1e-6)  break;
        if (NPV > 0)  minrate = IRR    // too small, increase IRR by changing low bound
        else          maxrate = IRR    // too big, decrease IRR by changing high bound
    }
    return [NPV, IRR]
}
// 投資債券期間現金流量
var CT = [ ]        // 初始化現金流量矩陣
var paytime = 12;    // 投資一年,分期付款
var gan = 2*paytime + 1; // 投資領息期限
var C0  = 3e3;      // 每期投入資金
var r   = 5.35/paytime/100;  // 每期債息利率, 年利率=5.35%, debt rate
var FUND  = C0 * (1 - 2.4/100);// 手續費率/每期 = 2.4%, pay discount
var BC = FUND;      // 初期基金
var COST = C0;
var S = 0.0;
CT.push(-C0);       // 初期費用
for (var i = 1; i < gan; i++) { // 續期現金流量
    income = BC*r            // 每期收入
    if (i == (gan - 1)) CT.push(BC); // 期末贖回全部基金
    else if (i < paytime) {    // 續期繳費           
        CT.push(income - C0);// 現金流量 = 利息收入 - 每期應付資金
        COST = COST + C0 - income;// 累計成本
        BC = BC + FUND;    // 基金累積
    } else {
        CT.push(income);
        S = S + income;// 累積利息
    }
}
CT.forEach( (x,i) => console.log("第" + (i+1) + "期淨收 " + Math.round(x*10)/10) );
console.log("=================\n實繳 " + Math.round(COST*10)/10 + "\t,利息收入 " + Math.round(S*10)/10);
console.log("投資共" + Math.round(gan*100/paytime)/100 + "年,報酬率: " + Math.round(S*1e4/COST)/1e2 + "%");
var [v, r] = irr(CT);
console.log("換算 IRR 年化報酬率: " + Math.round(r*paytime*1e4)/1e2 + "%" + "\t,NPV = " +  v);
// 執行 js debt 看輸出結果:
// 第1期淨收 -3000
// 第2期淨收 -2986.9
// 第3期淨收 -2973.9
// 第4期淨收 -2960.8
// 第5期淨收 -2947.8
// 第6期淨收 -2934.7
// 第7期淨收 -2921.7
// 第8期淨收 -2908.6
// 第9期淨收 -2895.6
// 第10期淨收 -2882.5
// 第11期淨收 -2869.5
// 第12期淨收 -2856.4
// 第13期淨收 156.6
// 第14期淨收 156.6
// 第15期淨收 156.6
// 第16期淨收 156.6
// 第17期淨收 156.6
// 第18期淨收 156.6
// 第19期淨收 156.6
// 第20期淨收 156.6
// 第21期淨收 156.6
// 第22期淨收 156.6
// 第23期淨收 156.6
// 第24期淨收 156.6
// 第25期淨收 35136
// =================
// 實繳 35138.4    ,利息收入 1879.8
// 投資共2.08年,報酬率: 5.35%
// 換算 IRR 年化報酬率: 3.43%    ,NPV = -0.2703545208569267