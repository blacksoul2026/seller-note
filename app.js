'use strict';

// =====================================================================
// DATABASE（Firestore版 - 写真はサブコレクションに保存）
// =====================================================================
class DB {
  constructor() { this.userId = null; }

  async open() {
    this.userId = window._currentUser.uid;
    return this;
  }

  _col(name) { return window._fs.collection(window._firestore, 'users', this.userId, name); }
  _doc(name, id) { return window._fs.doc(window._firestore, 'users', this.userId, name, String(id)); }

  // 写真は商品ドキュメントに直接保存（480px圧縮済みなので1MB以内に収まる）
  async getAll(store) {
    const { getDocs } = window._fs;
    const snap = await getDocs(this._col(store));
    return snap.docs.map(d => d.data());
  }

  async get(store, id) {
    const { getDoc } = window._fs;
    const snap = await getDoc(this._doc(store, id));
    if (!snap.exists()) return undefined;
    return snap.data();
  }

  async put(store, data) {
    const { setDoc } = window._fs;
    const docId = store === 'settings' ? data.key : data.id;
    await setDoc(this._doc(store, String(docId)), data);
  }

  async delete(store, id) {
    const { deleteDoc } = window._fs;
    await deleteDoc(this._doc(store, String(id)));
  }

  async getAllByIndex(store, field, value) {
    const { query: fsQ, where: fsW, getDocs } = window._fs;
    const q = fsQ(this._col(store), fsW(field, '==', value));
    const snap = await getDocs(q);
    return snap.docs.map(d => d.data());
  }
}

// =====================================================================
// DEFAULT PLATFORMS（動的・DB保存対応）
// =====================================================================
const DEFAULT_PLATFORMS = [
  { key:'mercari',       name:'メルカリ',         feeRate:10,  color:'#FF0211' },
  { key:'mercari_shops', name:'メルカリShops',     feeRate:10,  color:'#FF6B6B' },
  { key:'rakuma',        name:'ラクマ',            feeRate:6,   color:'#EC536C' },
  { key:'creema',        name:'クリーマ',          feeRate:15.5,color:'#E8526A' },
  { key:'minne',         name:'ミンネ',            feeRate:9.9, color:'#E9543F' },
  { key:'yahuoku',       name:'ヤフオク',          feeRate:8.8, color:'#FFC107' },
  { key:'amazon',        name:'Amazon',            feeRate:10,  color:'#FF9900' },
  { key:'amazon_fba',    name:'Amazon FBA',        feeRate:15,  color:'#E47911' },
  { key:'paypay',        name:'PayPayフリマ',      feeRate:5,   color:'#EB3927' },
  { key:'base',          name:'BASE',              feeRate:3,   color:'#555555' },
  { key:'stores',        name:'STORES',            feeRate:3.6, color:'#4A90D9' },
  { key:'shopify',       name:'Shopify',           feeRate:0,   color:'#96BF48' },
  { key:'fril',          name:'フリル',            feeRate:6,   color:'#F06292' },
  { key:'other',         name:'その他',            feeRate:0,   color:'#888888' },
];

// 動的プラットフォーム（DB読み込み後に上書き）
let PLATFORMS = [...DEFAULT_PLATFORMS];

// =====================================================================
// SHIPPING SHORTCUTS（送料ショートカット）
// =====================================================================
const DEFAULT_SHIPPING_SHORTCUTS = [
  {label:'定形',        price:84},
  {label:'定形外',      price:120},
  {label:'定形外規格外',price:200},
  {label:'ゆうパケmini',price:180},
  {label:'ゆうパケポスト',price:215},
  {label:'ゆうパケット', price:230},
  {label:'FBA小型',    price:285},
  {label:'FBA標準',    price:519},
  {label:'FBA大型',    price:822},
  {label:'宅急便60',   price:750},
  {label:'送料込み',   price:0},
];
let SHIPPING_SHORTCUTS = [...DEFAULT_SHIPPING_SHORTCUTS];

function getPlatform(key) {
  return PLATFORMS.find(p => p.key === key) || { key:'other', name:'その他', feeRate:0, color:'#888' };
}
function platformBadgeStyle(key) {
  const p = getPlatform(key);
  return `background:${p.color};color:${isLightColor(p.color)?'#000':'#fff'};`;
}
function isLightColor(hex) {
  const r = parseInt(hex.slice(1,3),16), g = parseInt(hex.slice(3,5),16), b = parseInt(hex.slice(5,7),16);
  return (r*299+g*587+b*114)/1000 > 128;
}

const SHIPPING_PRESETS = {
  mercari:[
    {label:'ネコポス',price:210},{label:'宅急便コンパクト',price:450},
    {label:'宅急便60',price:750},{label:'宅急便80',price:850},
    {label:'宅急便100',price:1050},{label:'宅急便120',price:1200},
    {label:'宅急便140',price:1450},{label:'宅急便160',price:1600},
    {label:'ゆうパケット',price:230},{label:'ゆうパック60',price:770},
    {label:'送料込み',price:0},{label:'着払い',price:0},
  ],
  mercari_shops:[
    {label:'ネコポス',price:210},{label:'宅急便60',price:750},{label:'ゆうパケット',price:230},{label:'送料込み',price:0},
  ],
  rakuma:[
    {label:'かんたんラクマパック ネコポス',price:200},{label:'かんたんラクマパック 宅急便コンパクト',price:380},
    {label:'かんたんラクマパック 宅急便60',price:700},{label:'かんたんラクマパック ゆうパケット',price:200},
    {label:'送料込み',price:0},{label:'着払い',price:0},
  ],
  yahuoku:[
    {label:'ゆうパケット',price:230},{label:'ゆうパック60',price:770},{label:'ゆうパック80',price:870},
    {label:'ネコポス',price:210},{label:'宅急便60',price:750},{label:'送料込み',price:0},{label:'着払い',price:0},
  ],
  amazon:[{label:'FBA 小型',price:285},{label:'FBA 標準',price:519},{label:'FBA 大型',price:822},{label:'自己発送',price:0}],
  amazon_fba:[{label:'FBA 小型',price:285},{label:'FBA 標準',price:519},{label:'FBA 大型',price:822}],
  paypay:[{label:'おてがる ゆうパケット',price:230},{label:'おてがる 宅急便60',price:700},{label:'送料込み',price:0}],
  default:[{label:'送料込み',price:0},{label:'着払い',price:0}],
};
function getShippingPresets(key) { return SHIPPING_PRESETS[key] || SHIPPING_PRESETS.default; }

const LISTING_STATUSES = [
  {key:'before',   label:'出品前',   badge:'badge-gray'},
  {key:'listing',  label:'出品中',   badge:'badge-blue'},
  {key:'payment',  label:'入金待ち', badge:'badge-yellow'},
  {key:'shipping', label:'発送準備中',badge:'badge-orange'},
  {key:'review',   label:'評価待ち', badge:'badge-orange'},
  {key:'completed',label:'取引完了', badge:'badge-green'},
  {key:'canceled', label:'キャンセル',badge:'badge-gray'},
];
const STATUS_MAP = Object.fromEntries(LISTING_STATUSES.map(s=>[s.key,s]));

const SORT_OPTIONS = [
  {key:'custom',         label:'カスタム順（ドラッグで変更）'},
  {key:'createdAt_desc', label:'作成日（新しい順）'},
  {key:'createdAt_asc',  label:'作成日（古い順）'},
  {key:'purchaseDate_desc',label:'仕入れ日（新しい順）'},
  {key:'purchaseDate_asc', label:'仕入れ日（古い順）'},
  {key:'name_asc',       label:'名前（あいうえお順）'},
  {key:'stock_asc',      label:'在庫（少ない順）'},
  {key:'stock_desc',     label:'在庫（多い順）'},
  {key:'price_asc',      label:'仕入れ値（安い順）'},
  {key:'price_desc',     label:'仕入れ値（高い順）'},
];

// =====================================================================
// UTILS
// =====================================================================
function uid() { return Date.now().toString(36)+Math.random().toString(36).slice(2,6); }
function yen(n) { return '¥'+(Number(n)||0).toLocaleString('ja-JP'); }
function fmtDate(d) {
  if(!d) return '';
  const dt=new Date(d);
  return `${dt.getFullYear()}/${String(dt.getMonth()+1).padStart(2,'0')}/${String(dt.getDate()).padStart(2,'0')}`;
}
function todayStr() { return new Date().toISOString().slice(0,10); }
function esc(s) {
  return String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}
function decodeEsc(s) {
  return String(s||'').replace(/&amp;/g,'&').replace(/&lt;/g,'<').replace(/&gt;/g,'>').replace(/&quot;/g,'"');
}

function toast(msg,dur=2200) {
  const el=document.getElementById('toast');
  el.textContent=msg; el.classList.remove('hidden');
  clearTimeout(el._t); el._t=setTimeout(()=>el.classList.add('hidden'),dur);
}

function confirmDialog(msg,okLabel='削除',okClass='btn-danger') {
  return new Promise(resolve=>{
    const ov=document.getElementById('confirm-overlay');
    document.getElementById('confirm-msg').textContent=msg;
    const ok=document.getElementById('confirm-ok'),cancel=document.getElementById('confirm-cancel');
    ok.textContent=okLabel; ok.className=`btn ${okClass}`;
    ov.classList.remove('hidden');
    const done=v=>{ov.classList.add('hidden');ok.onclick=cancel.onclick=null;resolve(v);};
    ok.onclick=()=>done(true); cancel.onclick=()=>done(false);
  });
}

async function fileToBase64(f) {
  return new Promise((r,j)=>{const rd=new FileReader();rd.onload=e=>r(e.target.result);rd.onerror=j;rd.readAsDataURL(f);});
}
function resizeImage(b64,maxW=480,maxH=480) {
  return new Promise(r=>{
    const img=new Image();
    img.onload=()=>{
      let w=img.width,h=img.height;
      if(w>maxW||h>maxH){const ratio=Math.min(maxW/w,maxH/h);w=Math.floor(w*ratio);h=Math.floor(h*ratio);}
      const c=document.createElement('canvas');c.width=w;c.height=h;
      c.getContext('2d').drawImage(img,0,0,w,h);r(c.toDataURL('image/jpeg',0.70));
    };img.src=b64;
  });
}

function _copyText(text,msg='コピーしました') {
  const decoded=decodeEsc(text);
  if(navigator.clipboard?.writeText){navigator.clipboard.writeText(decoded).then(()=>toast('✅ '+msg)).catch(()=>_fallbackCopy(decoded,msg));}
  else{_fallbackCopy(decoded,msg);}
}
function _fallbackCopy(text,msg){
  const ta=document.createElement('textarea');ta.value=text;ta.style.cssText='position:fixed;top:-9999px;';
  document.body.appendChild(ta);ta.select();
  try{document.execCommand('copy');toast('✅ '+msg);}catch{toast('コピーできませんでした');}
  ta.remove();
}

// =====================================================================
// APP
// =====================================================================
const App = (() => {
  const db = new DB();
  let currentTab = 'home';
  let pageStack = [];
  let _currentSort = 'createdAt_desc';
  let _currentPhotos = [];
  let _renderPhotoGrid = null;
  let _currentProductPhotos = [];
  let _selPlatform = 'mercari';
  let _customOrder = [];
  let _gridDragOccurred = false;
  let _salesItemMode = 'simple';     // 売上管理表の表示形式を永続化
  let _salesFilterStatus = 'active'; // 売上管理表のフィルタを永続化
  let _salesViewMode = 'list';       // 売上管理表のビューモードを永続化
  let JAN_CODES = [];                // JANコードリスト

  const TAB_TITLES = {home:'分析',sales:'売上管理表',products:'商品マスタ',settings:'設定'};

  // ===== ROUTER =====
  async function switchTab(tab) {
    currentTab = tab;
    // タブの初期ページもpageStackに積む（戻るボタン制御のため）
    pageStack = [{page:tab, params:{}, title:TAB_TITLES[tab]||tab}];
    document.querySelectorAll('.tab-btn').forEach(b=>b.classList.toggle('active',b.dataset.tab===tab));
    await _render(tab,{},TAB_TITLES[tab]||tab);
  }

  async function navigate(page,params={},title='') {
    pageStack.push({page,params,title});
    await _render(page,params,title);
  }

  async function goBack() {
    if(pageStack.length>1){
      pageStack.pop();
      const prev=pageStack[pageStack.length-1];
      await _render(prev.page,prev.params,prev.title);
    } else {
      await switchTab(currentTab);
    }
  }

  async function _render(page,params,title) {
    const main=document.getElementById('main');
    const backBtn=document.getElementById('back-btn');
    const actionBtn=document.getElementById('action-btn');
    const titleEl=document.getElementById('page-title');
    main.innerHTML='<div class="loading">読み込み中...</div>';
    titleEl.textContent=title||page;
    // 戻るボタン: pageStackに2つ以上あれば表示
    backBtn.className='header-btn back-circle '+(pageStack.length>1?'':'hidden');
    backBtn.onclick=()=>goBack();
    backBtn.innerHTML='&#8249; 戻る';
    actionBtn.className='header-btn hidden';
    actionBtn.onclick=null; actionBtn.textContent=''; actionBtn.innerHTML='';
    switch(page){
      case 'home':       await pgHome(main); break;
      case 'products':   await pgProducts(main,actionBtn); break;
      case 'product-detail': await pgProductDetail(main,params,actionBtn); break;
      case 'product-form':
        titleEl.textContent=params.id?'商品を編集':'商品を追加';
        _setupSaveBtn(actionBtn,()=>document.getElementById('__save-product')?.click());
        await pgProductForm(main,params); break;
      case 'listings':   await pgListings(main,params,actionBtn); break;
      case 'sales':      await pgSales(main,actionBtn); break;
      case 'sale-form':
        titleEl.textContent=params.editId?'売上を編集':'売上を記録';
        _setupSaveBtn(actionBtn,()=>document.getElementById('__save-sale')?.click());
        await pgSaleForm(main,params); break;
      case 'sale-detail': await pgSaleDetail(main,params); break;
      case 'settings':   await pgSettings(main); break;
      case 'platform-settings': await pgPlatformSettings(main,actionBtn); break;
      case 'shipping-settings': await pgShippingSettings(main,actionBtn); break;
      case 'jan-settings': await pgJanSettings(main,actionBtn); break;
    }
  }

  function _setupSaveBtn(btn,fn){
    btn.className='header-btn pill-btn'; btn.textContent='保存'; btn.onclick=fn;
  }

  // =====================================================================
  // HOME
  // =====================================================================
  async function pgHome(main) {
    const [products,listings]=await Promise.all([db.getAll('products'),db.getAll('listings')]);
    const completedL=listings.filter(l=>l.status==='completed');
    const now=new Date();
    let tab='monthly';
    let mYear=now.getFullYear(),mMonth=now.getMonth();
    let aYear=now.getFullYear();
    let rkPeriod='month',rkYear=now.getFullYear(),rkMonth=now.getMonth(),rkSort='qty';
    let invDays=30,invShowPaused=false,invShowDiscontinued=false;
    let pfPeriod='month',pfYear=now.getFullYear(),pfMonth=now.getMonth();

    const MO=['1月','2月','3月','4月','5月','6月','7月','8月','9月','10月','11月','12月'];
    const fbm=(list,y,m)=>list.filter(l=>{const d=new Date(l.saleDate||l.createdAt);return d.getFullYear()===y&&d.getMonth()===m;});
    const fby=(list,y)=>list.filter(l=>new Date(l.saleDate||l.createdAt).getFullYear()===y);
    const cs=list=>({
      sales:list.reduce((a,l)=>a+(Number(l.salePrice)||0),0),
      cost:list.reduce((a,l)=>a+(Number(l.purchasePrice)||0)+(Number(l.fee)||0)+(Number(l.shipping)||0),0),
      grossProfit:list.reduce((a,l)=>a+(Number(l.salePrice)||0)-(Number(l.purchasePrice)||0),0), // 粗利＝売上−仕入れ値
      profit:list.reduce((a,l)=>a+(Number(l.profit)||0),0), // 利益＝売上−仕入れ−手数料−送料
      get margin(){return this.sales>0?(this.profit/this.sales*100).toFixed(1):'0.0';},
      count:list.length
    });
    const sh=s=>`<div class="ana-stats-grid">
      <div class="ana-stat"><div class="ana-stat-lbl">売上</div><div class="ana-stat-val">${yen(s.sales)}</div></div>
      <div class="ana-stat"><div class="ana-stat-lbl">コスト</div><div class="ana-stat-val">${yen(s.cost)}</div></div>
      <div class="ana-stat"><div class="ana-stat-lbl">粗利</div><div class="ana-stat-val" style="color:${s.grossProfit>=0?'var(--success)':'var(--danger)'};">${yen(s.grossProfit)}</div></div>
      <div class="ana-stat"><div class="ana-stat-lbl">利益</div><div class="ana-stat-val" style="color:${s.profit>=0?'var(--success)':'var(--danger)'};">${yen(s.profit)}</div></div>
      <div class="ana-stat"><div class="ana-stat-lbl">利益率</div><div class="ana-stat-val">${s.margin}%</div></div>
      <div class="ana-stat"><div class="ana-stat-lbl">販売数</div><div class="ana-stat-val">${s.count}件</div></div>
    </div>`;

    function renderContent(){
      const body=document.getElementById('__ana-body');
      if(!body)return;

      if(tab==='monthly'){
        const s=cs(fbm(completedL,mYear,mMonth));
        body.innerHTML=`<div class="ana-period-bar"><button class="ana-nav" onclick="App._anaNav('m',-1)">‹</button><span class="ana-period-lbl">${mYear}年${MO[mMonth]}</span><button class="ana-nav" onclick="App._anaNav('m',1)">›</button></div>${sh(s)}${s.count===0?'<div class="ana-empty">この月の売上はありません</div>':''}`;

      }else if(tab==='yearly'){
        const s=cs(fby(completedL,aYear));
        const mrows=Array.from({length:12},(_,i)=>{const ms=cs(fbm(completedL,aYear,i));return `<tr><td>${MO[i]}</td><td class="n">${yen(ms.sales)}</td><td class="n" style="color:${ms.profit>=0?'var(--success)':'var(--danger)'};">${yen(ms.profit)}</td><td class="n">${ms.margin}%</td><td class="n">${ms.count}</td></tr>`;}).join('');
        body.innerHTML=`<div class="ana-period-bar"><button class="ana-nav" onclick="App._anaNav('y',-1)">‹</button><span class="ana-period-lbl">${aYear}年</span><button class="ana-nav" onclick="App._anaNav('y',1)">›</button></div>${sh(s)}<div class="ana-tbl-wrap"><table class="ana-tbl"><thead><tr><th>月</th><th class="n">売上</th><th class="n">利益</th><th class="n">利益率</th><th class="n">件数</th></tr></thead><tbody>${mrows}</tbody></table></div>`;

      }else if(tab==='ranking'){
        const list=rkPeriod==='month'?fbm(completedL,rkYear,rkMonth):fby(completedL,rkYear);
        const plbl=rkPeriod==='month'?`${rkYear}年${MO[rkMonth]}`:`${rkYear}年`;
        const pmap=Object.fromEntries(products.map(p=>[p.id,p]));
        const map={};
        list.forEach(l=>{
          const pid=l.productId||'__x';
          if(!map[pid])map[pid]={name:l.productName||'（不明）',code:l.productCode||l.productTitle||'',qty:0,sales:0,profit:0,lastDate:null,pid};
          map[pid].qty++;map[pid].sales+=Number(l.salePrice)||0;map[pid].profit+=Number(l.profit)||0;
          if(!map[pid].lastDate||l.saleDate>map[pid].lastDate)map[pid].lastDate=l.saleDate;
        });
        let ranked=Object.values(map);
        if(rkSort==='qty')ranked.sort((a,b)=>b.qty-a.qty);
        else if(rkSort==='profit')ranked.sort((a,b)=>b.profit-a.profit);
        else if(rkSort==='sales')ranked.sort((a,b)=>b.sales-a.sales);
        else ranked.sort((a,b)=>{const ma=a.sales>0?a.profit/a.sales:-Infinity,mb=b.sales>0?b.profit/b.sales:-Infinity;return mb-ma;});
        ranked=ranked.slice(0,30);
        const sbns=[{k:'qty',l:'販売数'},{k:'profit',l:'利益'},{k:'sales',l:'売上'},{k:'margin',l:'利益率'}].map(s=>`<button class="ana-sbtn${rkSort===s.k?' ana-sbtn-on':''}" onclick="App._anaRkSort('${s.k}')">${s.l}</button>`).join('');
        const rows=ranked.map((item,i)=>{const mg=item.sales>0?(item.profit/item.sales*100).toFixed(1):'0.0';const stk=pmap[item.pid]?.stockCount??'−';return `<tr><td class="n" style="color:var(--text-secondary);">${i+1}</td><td style="font-size:12px;">${esc(item.name)}${item.code?`<div style="font-size:10px;color:var(--text-secondary);">${esc(item.code)}</div>`:''}</td><td class="n">${item.qty}</td><td class="n">${yen(item.sales)}</td><td class="n" style="color:${item.profit>=0?'var(--success)':'var(--danger)'};">${yen(item.profit)}</td><td class="n">${mg}%</td><td class="n">${stk}</td><td class="n" style="font-size:11px;white-space:nowrap;">${fmtDate(item.lastDate)}</td></tr>`;}).join('');
        body.innerHTML=`<div class="ana-period-bar"><div style="display:flex;gap:4px;"><button class="ana-sbtn${rkPeriod==='month'?' ana-sbtn-on':''}" onclick="App._anaRkPeriod('month')">月別</button><button class="ana-sbtn${rkPeriod==='year'?' ana-sbtn-on':''}" onclick="App._anaRkPeriod('year')">年間</button></div><button class="ana-nav" onclick="App._anaNav('r',-1)">‹</button><span class="ana-period-lbl">${plbl}</span><button class="ana-nav" onclick="App._anaNav('r',1)">›</button></div><div class="ana-sort-bar">${sbns}</div>${ranked.length===0?'<div class="ana-empty">この期間の売上はありません</div>':`<div class="ana-tbl-wrap"><table class="ana-tbl ana-tbl-sm"><thead><tr><th>順</th><th>商品名</th><th class="n">販売数</th><th class="n">売上</th><th class="n">利益</th><th class="n">利益率</th><th class="n">在庫</th><th class="n">最終日</th></tr></thead><tbody>${rows}</tbody></table></div>`}`;

      }else if(tab==='inventory'){
        const cutMs=Date.now()-invDays*86400000;
        const d30Ms=Date.now()-30*86400000;
        const smap={};
        completedL.forEach(l=>{
          if(!smap[l.productId])smap[l.productId]={qty30:0,qtyAll:0,sales:0,profit:0,lastDate:null};
          smap[l.productId].qtyAll++;
          smap[l.productId].sales+=Number(l.salePrice)||0;
          smap[l.productId].profit+=Number(l.profit)||0;
          if(!smap[l.productId].lastDate||l.saleDate>smap[l.productId].lastDate)smap[l.productId].lastDate=l.saleDate;
          if(l.saleDate&&new Date(l.saleDate).getTime()>=d30Ms)smap[l.productId].qty30++;
        });
        const prods=products.filter(p=>{
          const st=p.productStatus||'active';
          if(st==='paused'&&!invShowPaused)return false;
          if(st==='discontinued'&&!invShowDiscontinued)return false;
          return true;
        });
        const ann=prods.map(p=>{
          const s=smap[p.id]||{qty30:0,qtyAll:0,sales:0,profit:0,lastDate:null};
          const stk=p.stockCount||0,pst=p.productStatus||'active';
          const lastMs=s.lastDate?new Date(s.lastDate).getTime():0;
          const labels=[];
          if(stk===0&&pst==='active')labels.push({l:'在庫切れ',c:'var(--danger)'});
          if(stk>0&&stk<=3&&s.qty30>0)labels.push({l:'補充候補',c:'#2196F3'});
          if(s.qtyAll>0&&lastMs<cutMs)labels.push({l:'長期未販売',c:'#FF9800'});
          return {p,s,labels};
        });
        const rows=ann.map(({p,s,labels})=>`<tr><td style="font-size:12px;">${esc(p.name)}${p.code?`<div style="font-size:10px;color:var(--text-secondary);">${esc(p.code)}</div>`:''}${labels.length?`<div style="margin-top:2px;">${labels.map(l=>`<span class="inv-lbl" style="background:${l.c}20;color:${l.c};">${l.l}</span>`).join('')}</div>`:''}</td><td class="n">${p.stockCount||0}</td><td class="n">${s.qty30}</td><td class="n">${s.qtyAll}</td><td class="n" style="font-size:11px;white-space:nowrap;">${fmtDate(s.lastDate)||'−'}</td><td class="n">${yen(s.sales)}</td><td class="n" style="color:${s.profit>=0?'var(--success)':'var(--danger)'};">${yen(s.profit)}</td></tr>`).join('');
        body.innerHTML=`<div style="padding:8px 12px;display:flex;flex-wrap:wrap;gap:6px;align-items:center;background:var(--white);border-bottom:1px solid var(--gray-border);"><span style="font-size:11px;color:var(--text-secondary);">長期未販売:</span>${[30,60,90].map(d=>`<button class="ana-sbtn${invDays===d?' ana-sbtn-on':''}" onclick="App._anaInvDays(${d})">${d}日以上</button>`).join('')}<div style="margin-left:auto;display:flex;gap:4px;"><button class="ana-sbtn${invShowPaused?' ana-sbtn-on':''}" onclick="App._anaInvToggle('paused')">休止も表示</button><button class="ana-sbtn${invShowDiscontinued?' ana-sbtn-on':''}" onclick="App._anaInvToggle('disc')">廃番も表示</button></div></div>${ann.length===0?'<div class="ana-empty">表示する商品がありません</div>':`<div class="ana-tbl-wrap"><table class="ana-tbl ana-tbl-sm"><thead><tr><th>商品名</th><th class="n">在庫</th><th class="n">30日</th><th class="n">累計</th><th class="n">最終日</th><th class="n">売上</th><th class="n">粗利</th></tr></thead><tbody>${rows}</tbody></table></div>`}`;

      }else if(tab==='platform'){
        const list=pfPeriod==='month'?fbm(completedL,pfYear,pfMonth):fby(completedL,pfYear);
        const plbl=pfPeriod==='month'?`${pfYear}年${MO[pfMonth]}`:`${pfYear}年`;
        const pfmap={};
        list.forEach(l=>{const pf=l.platform||'unknown';if(!pfmap[pf])pfmap[pf]={sales:0,profit:0,count:0};pfmap[pf].sales+=Number(l.salePrice)||0;pfmap[pf].profit+=Number(l.profit)||0;pfmap[pf].count++;});
        const sorted=Object.entries(pfmap).sort((a,b)=>b[1].sales-a[1].sales);
        const rows=sorted.map(([pfKey,s])=>{const pf=getPlatform(pfKey);const mg=s.sales>0?(s.profit/s.sales*100).toFixed(1):'0.0';return `<tr><td><span class="platform-badge" style="${platformBadgeStyle(pfKey)}">${pf.name}</span></td><td class="n">${yen(s.sales)}</td><td class="n" style="color:${s.profit>=0?'var(--success)':'var(--danger)'};">${yen(s.profit)}</td><td class="n">${s.count}</td><td class="n">${mg}%</td></tr>`;}).join('');
        body.innerHTML=`<div class="ana-period-bar"><div style="display:flex;gap:4px;"><button class="ana-sbtn${pfPeriod==='month'?' ana-sbtn-on':''}" onclick="App._anaPfPeriod('month')">月別</button><button class="ana-sbtn${pfPeriod==='year'?' ana-sbtn-on':''}" onclick="App._anaPfPeriod('year')">年間</button></div><button class="ana-nav" onclick="App._anaNav('p',-1)">‹</button><span class="ana-period-lbl">${plbl}</span><button class="ana-nav" onclick="App._anaNav('p',1)">›</button></div>${sorted.length===0?'<div class="ana-empty">この期間の売上はありません</div>':`<div class="ana-tbl-wrap"><table class="ana-tbl"><thead><tr><th>プラットフォーム</th><th class="n">売上</th><th class="n">粗利</th><th class="n">件数</th><th class="n">利益率</th></tr></thead><tbody>${rows}</tbody></table></div>`}`;
      }
    }

    const TABS=[{k:'monthly',l:'月別'},{k:'yearly',l:'年別'},{k:'ranking',l:'ランキング'},{k:'inventory',l:'在庫判断'},{k:'platform',l:'PF別'}];
    main.innerHTML=`<div class="ana-tab-bar" id="__ana-tabs">${TABS.map(t=>`<button class="ana-tab${tab===t.k?' active':''}" data-tab="${t.k}" onclick="App._anaTab('${t.k}')">${t.l}</button>`).join('')}</div><div id="__ana-body"></div><div style="height:70px;"></div>`;
    renderContent();

    App._anaTab=k=>{tab=k;document.querySelectorAll('.ana-tab').forEach(b=>b.classList.toggle('active',b.dataset.tab===k));renderContent();};
    App._anaNav=(type,dir)=>{
      if(type==='m'){mMonth+=dir;if(mMonth<0){mMonth=11;mYear--;}if(mMonth>11){mMonth=0;mYear++;}}
      else if(type==='y')aYear+=dir;
      else if(type==='r'){if(rkPeriod==='month'){rkMonth+=dir;if(rkMonth<0){rkMonth=11;rkYear--;}if(rkMonth>11){rkMonth=0;rkYear++;}}else rkYear+=dir;}
      else if(type==='p'){if(pfPeriod==='month'){pfMonth+=dir;if(pfMonth<0){pfMonth=11;pfYear--;}if(pfMonth>11){pfMonth=0;pfYear++;}}else pfYear+=dir;}
      renderContent();
    };
    App._anaRkSort=s=>{rkSort=s;renderContent();};
    App._anaRkPeriod=p=>{rkPeriod=p;renderContent();};
    App._anaPfPeriod=p=>{pfPeriod=p;renderContent();};
    App._anaInvDays=d=>{invDays=d;renderContent();};
    App._anaInvToggle=w=>{if(w==='paused')invShowPaused=!invShowPaused;else invShowDiscontinued=!invShowDiscontinued;renderContent();};
  }

  // =====================================================================
  // PRODUCT MASTER LIST（グリッド + 並び替え）
  // =====================================================================
  async function pgProducts(main,actionBtn) {
    const products=await db.getAll('products');
    actionBtn.className='header-btn icon-pill';
    actionBtn.innerHTML='<span style="font-size:18px;">＋</span>';
    actionBtn.onclick=()=>navigate('product-form',{},'商品を追加');
    let searchQ='', showHidden=false, selectedCategory='all';

    function sortProducts(list) {
      const arr=[...list];
      switch(_currentSort){
        case 'custom': {
          if(_customOrder.length){
            const orderMap=Object.fromEntries(_customOrder.map((id,i)=>[id,i]));
            return arr.sort((a,b)=>(orderMap[a.id]??999999)-(orderMap[b.id]??999999));
          }
          return arr.sort((a,b)=>b.createdAt-a.createdAt);
        }
        case 'createdAt_desc': return arr.sort((a,b)=>b.createdAt-a.createdAt);
        case 'createdAt_asc':  return arr.sort((a,b)=>a.createdAt-b.createdAt);
        case 'purchaseDate_desc': return arr.sort((a,b)=>new Date(b.purchaseDate||0)-new Date(a.purchaseDate||0));
        case 'purchaseDate_asc':  return arr.sort((a,b)=>new Date(a.purchaseDate||0)-new Date(b.purchaseDate||0));
        case 'name_asc': return arr.sort((a,b)=>(a.name||'').localeCompare(b.name||'','ja'));
        case 'stock_asc': return arr.sort((a,b)=>(a.stockCount||0)-(b.stockCount||0));
        case 'stock_desc': return arr.sort((a,b)=>(b.stockCount||0)-(a.stockCount||0));
        case 'price_asc': return arr.sort((a,b)=>(a.purchasePrice||0)-(b.purchasePrice||0));
        case 'price_desc': return arr.sort((a,b)=>(b.purchasePrice||0)-(a.purchasePrice||0));
        default: return arr.sort((a,b)=>b.createdAt-a.createdAt);
      }
    }

    function getCategories() {
      const cats=[...new Set(products.map(p=>p.category||'').filter(c=>c))];
      return cats.sort((a,b)=>a.localeCompare(b,'ja'));
    }

    function renderCategoryBar() {
      const bar=document.getElementById('__category-bar');
      if(!bar) return;
      const cats=getCategories();
      if(cats.length===0){bar.style.display='none';return;}
      bar.style.display='';
      bar.innerHTML=[{k:'all',l:'すべて'},...cats.map(c=>({k:c,l:c}))].map(c=>
        `<button class="cat-filter-btn${selectedCategory===c.k?' active':''}" onclick="App._setCategoryFilter('${esc(c.k)}')">${esc(c.l)}</button>`
      ).join('');
    }

    function filtered() {
      let base=showHidden?products:products.filter(p=>!p.hidden);
      if(selectedCategory!=='all') base=base.filter(p=>(p.category||'')=== selectedCategory);
      if(!searchQ) return sortProducts(base);
      return sortProducts(base.filter(p=>(p.name||'').includes(searchQ)||(p.sku||'').includes(searchQ)||(p.code||'').includes(searchQ)));
    }

    function renderGrid() {
      const body=document.getElementById('__product-grid');
      if(!body) return;
      const list=filtered();
      const countEl=document.getElementById('__grid-count');
      const sortLabel=SORT_OPTIONS.find(s=>s.key===_currentSort)?.label||'新着順';
      if(countEl) countEl.textContent=`${list.length}件`;
      const sortEl=document.getElementById('__sort-label');
      if(sortEl) sortEl.textContent=sortLabel;
      if(!list.length){
        body.innerHTML=`<div class="empty-state" style="grid-column:1/-1;min-height:300px;"><div class="empty-icon">📦</div><p>商品がありません</p><small>右上の＋から追加してください</small></div>`;
        return;
      }
      body.innerHTML=list.map(p=>{
        const thumb=p.photos?.[0]?`<img src="${p.photos[0]}" alt="" loading="lazy" style="width:100%;height:100%;object-fit:cover;">`:`<div class="product-grid-placeholder">📦</div>`;
        const stock=p.stockCount||0;
        const stockBadge=`<div class="product-grid-stock ${stock===0?'out':stock<=2?'low':''}">${stock}</div>`;
        const pst=p.productStatus||'active';
        const statusOverlay=pst!=='active'?`<div style="position:absolute;top:4px;left:4px;font-size:10px;padding:2px 6px;border-radius:3px;font-weight:700;background:${pst==='paused'?'rgba(245,124,0,0.92)':'rgba(117,117,117,0.92)'};color:#fff;">${pst==='paused'?'休止':'廃番'}</div>`:'';
        const gridLabel=esc(p.name);
        return `<div class="product-grid-item" data-id="${p.id}" draggable="true"
          style="${p.hidden?'opacity:0.45;':''}"
          onclick="if(App._gridDragOccurred)return;App.navigate('product-detail',{id:'${p.id}'},'${esc(p.name)}')"
          oncontextmenu="App._showSortSheet();event.preventDefault();">
          ${thumb}
          ${stockBadge}
          ${statusOverlay}
          ${p.salePrice?`<div class="product-grid-price">${yen(p.salePrice)}</div>`:''}
          <div class="product-grid-name">${gridLabel}</div>
        </div>`;
      }).join('');
    }

    main.innerHTML=`
      <div class="search-bar">
        <div class="search-wrap">
          <svg viewBox="0 0 24 24"><path d="M15.5 14h-.79l-.28-.27A6.471 6.471 0 0 0 16 9.5 6.5 6.5 0 1 0 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z"/></svg>
          <input class="search-input" id="__product-search" type="search" placeholder="商品名・管理番号で検索">
        </div>
      </div>
      <div id="__category-bar" style="display:none;overflow-x:auto;white-space:nowrap;padding:8px 12px;background:var(--white);border-bottom:1px solid var(--gray-border);-webkit-overflow-scrolling:touch;scrollbar-width:none;"></div>
      <div class="grid-action-bar">
        <span class="grid-count" id="__grid-count">${products.length}件</span>
        <div style="display:flex;align-items:center;gap:8px;">
          <button id="__hidden-toggle" class="grid-sort-btn" style="color:var(--text-secondary);" onclick="App._toggleHidden()">非表示を表示</button>
          <button class="grid-sort-btn" onclick="App._showSortSheet()">↕ <span id="__sort-label">${SORT_OPTIONS.find(s=>s.key===_currentSort)?.label||'新着順'}</span></button>
        </div>
      </div>
      <div class="product-grid" id="__product-grid" oncontextmenu="App._showSortSheet();event.preventDefault();"></div>
      <div style="height:80px;"></div>`;

    renderGrid();
    renderCategoryBar();
    App._refreshProductGrid=renderGrid;
    App._setCategoryFilter=(cat)=>{selectedCategory=cat;renderCategoryBar();renderGrid();};
    setupGridDrag();

    document.getElementById('__product-search')?.addEventListener('input',e=>{searchQ=e.target.value.trim();renderGrid();});

    App._toggleHidden=()=>{
      showHidden=!showHidden;
      const btn=document.getElementById('__hidden-toggle');
      if(btn){btn.textContent=showHidden?'非表示を隠す':'非表示を表示';btn.style.color=showHidden?'var(--primary)':'var(--text-secondary)';}
      renderGrid();
    };

    // ===== ドラッグ&ドロップ並び替え =====
    async function doReorder(fromId, toId) {
      const g=document.getElementById('__product-grid');if(!g)return;
      const items=[...g.querySelectorAll('.product-grid-item[data-id]')];
      const ids=items.map(i=>i.dataset.id);
      const fromIdx=ids.indexOf(fromId), toIdx=ids.indexOf(toId);
      if(fromIdx<0||toIdx<0) return;
      ids.splice(fromIdx,1); ids.splice(toIdx,0,fromId);
      _customOrder=ids; _currentSort='custom';
      await db.put('settings',{key:'customProductOrder',value:ids});
      renderGrid();
    }

    function setupGridDrag() {
      const g=document.getElementById('__product-grid');if(!g)return;

      // ---- Desktop HTML5 Drag ----
      let dragSrcId=null, dragMoved=false;
      g.addEventListener('dragstart',e=>{
        const item=e.target.closest('.product-grid-item[data-id]');if(!item)return;
        dragSrcId=item.dataset.id; dragMoved=false;
        setTimeout(()=>item.classList.add('dragging'),0);
        e.dataTransfer.effectAllowed='move';
        e.dataTransfer.setData('text/plain',dragSrcId);
      });
      g.addEventListener('dragover',e=>{
        e.preventDefault(); e.dataTransfer.dropEffect='move';
        const item=e.target.closest('.product-grid-item[data-id]');
        if(!item||item.dataset.id===dragSrcId)return;
        g.querySelectorAll('.product-grid-item').forEach(i=>i.classList.remove('drag-over'));
        item.classList.add('drag-over');
      });
      g.addEventListener('dragleave',e=>{
        const item=e.target.closest('.product-grid-item[data-id]');
        if(item)item.classList.remove('drag-over');
      });
      g.addEventListener('drop',async e=>{
        e.preventDefault();
        const over=e.target.closest('.product-grid-item[data-id]');
        if(!over||!dragSrcId||over.dataset.id===dragSrcId)return;
        dragMoved=true;
        await doReorder(dragSrcId,over.dataset.id);
      });
      g.addEventListener('dragend',()=>{
        g.querySelectorAll('.product-grid-item').forEach(i=>i.classList.remove('dragging','drag-over'));
        if(dragMoved){_gridDragOccurred=true;setTimeout(()=>{_gridDragOccurred=false;},300);}
        dragSrcId=null;
      });

      // ---- Mobile Touch Drag ----
      let touchDragId=null, touchClone=null, touchTimer=null, touchDragEl=null;
      g.addEventListener('touchstart',e=>{
        const item=e.target.closest('.product-grid-item[data-id]');if(!item)return;
        touchTimer=setTimeout(()=>{
          touchDragEl=item; touchDragId=item.dataset.id;
          const rect=item.getBoundingClientRect();
          touchClone=item.cloneNode(true);
          Object.assign(touchClone.style,{
            position:'fixed',width:rect.width+'px',height:rect.height+'px',
            top:rect.top+'px',left:rect.left+'px',
            opacity:'0.88',border:'2.5px solid var(--primary)',borderRadius:'8px',
            zIndex:'9999',pointerEvents:'none',transform:'scale(1.06)',
            boxShadow:'0 8px 24px rgba(0,0,0,0.28)',transition:'none',
          });
          document.body.appendChild(touchClone);
          item.style.opacity='0.3';
          if(navigator.vibrate)navigator.vibrate(40);
        },430);
      },{passive:true});

      g.addEventListener('touchmove',e=>{
        if(touchTimer){clearTimeout(touchTimer);touchTimer=null;}
        if(!touchDragId||!touchClone)return;
        e.preventDefault();
        const touch=e.touches[0];
        const tw=parseFloat(touchClone.style.width);
        const th=parseFloat(touchClone.style.height);
        touchClone.style.left=(touch.clientX-tw/2)+'px';
        touchClone.style.top=(touch.clientY-th/2)+'px';
        touchClone.style.display='none';
        const el=document.elementFromPoint(touch.clientX,touch.clientY);
        touchClone.style.display='';
        const over=el?.closest('.product-grid-item[data-id]');
        g.querySelectorAll('.product-grid-item').forEach(i=>i.classList.remove('drag-over'));
        if(over&&over.dataset.id!==touchDragId)over.classList.add('drag-over');
      },{passive:false});

      const endTouch=async e=>{
        if(touchTimer){clearTimeout(touchTimer);touchTimer=null;}
        const wasDragging=touchDragId!==null;
        if(touchClone){touchClone.remove();touchClone=null;}
        g.querySelectorAll('.product-grid-item').forEach(i=>{i.classList.remove('drag-over','dragging');i.style.opacity='';});
        if(wasDragging&&e.changedTouches){
          const touch=e.changedTouches[0];
          const el=document.elementFromPoint(touch.clientX,touch.clientY);
          const over=el?.closest('.product-grid-item[data-id]');
          if(over&&over.dataset.id!==touchDragId)await doReorder(touchDragId,over.dataset.id);
        }
        touchDragId=null; touchDragEl=null;
      };
      g.addEventListener('touchend',endTouch,{passive:true});
      g.addEventListener('touchcancel',endTouch,{passive:true});
    }
  }

  function _showSortSheet() {
    const overlay=document.createElement('div');
    overlay.className='status-popup-overlay';
    overlay.innerHTML=`<div class="status-popup">
      <div style="padding:14px;font-weight:700;text-align:center;font-size:15px;border-bottom:1px solid var(--gray-border);">並び替え</div>
      ${SORT_OPTIONS.map(s=>`<button class="status-popup-item ${_currentSort===s.key?'active':''}" data-key="${s.key}">${_currentSort===s.key?'✓ ':''} ${s.label}</button>`).join('')}
    </div>`;
    document.body.appendChild(overlay);
    overlay.addEventListener('click',e=>{
      const btn=e.target.closest('.status-popup-item');
      if(btn){_currentSort=btn.dataset.key;App._refreshProductGrid?.();}
      overlay.remove();
    });
  }

  // =====================================================================
  // PRODUCT DETAIL
  // =====================================================================
  async function pgProductDetail(main,{id},actionBtn) {
    const product=await db.get('products',id);
    if(!product){main.innerHTML='<div class="empty-state"><p>商品が見つかりません</p></div>';return;}
    actionBtn.className='header-btn pill-btn'; actionBtn.textContent='編集';
    actionBtn.onclick=()=>navigate('product-form',{id},'商品を編集');

    const listings=await db.getAllByIndex('listings','productId',id);
    const done=listings.filter(l=>l.status==='completed');
    const totalQty=done.length;
    const totalSales=done.reduce((a,l)=>a+(Number(l.salePrice)||0),0);
    const totalCost=done.reduce((a,l)=>a+(Number(l.purchasePrice)||0)+(Number(l.fee)||0)+(Number(l.shipping)||0),0);
    const totalProfit=done.reduce((a,l)=>a+(Number(l.profit)||0),0);
    const avgRoi=totalSales>0?(totalProfit/totalSales*100).toFixed(1):'0.0';

    const statusCounts={};
    LISTING_STATUSES.forEach(s=>{statusCounts[s.key]=0;});
    listings.forEach(l=>{if(statusCounts[l.status]!==undefined)statusCounts[l.status]++;});

    // 写真（スクエア表示 + 矢印ナビ）
    let photosHtml='';
    if(product.photos?.length){
      const n=product.photos.length;
      const dots=product.photos.map((_,i)=>`<div class="photo-dot ${i===0?'active':''}"></div>`).join('');
      const arrows=n>1?`
        <button id="__photo-prev" onclick="App._photoNav(-1)" style="position:absolute;left:6px;top:50%;transform:translateY(-50%);z-index:10;width:34px;height:34px;border-radius:50%;background:rgba(0,0,0,0.45);color:#fff;font-size:20px;display:flex;align-items:center;justify-content:center;line-height:1;">‹</button>
        <button id="__photo-next" onclick="App._photoNav(1)"  style="position:absolute;right:6px;top:50%;transform:translateY(-50%);z-index:10;width:34px;height:34px;border-radius:50%;background:rgba(0,0,0,0.45);color:#fff;font-size:20px;display:flex;align-items:center;justify-content:center;line-height:1;">›</button>`:'';
      photosHtml=`<div class="photo-swiper-wrap" style="position:relative;">
        <div class="photo-swiper" id="__photo-swiper">
          ${product.photos.map(ph=>`<img src="${ph}" alt="" style="flex:0 0 100%;width:100%;aspect-ratio:1;object-fit:cover;scroll-snap-align:start;pointer-events:none;user-select:none;">`).join('')}
        </div>
        ${arrows}
        <div class="photo-action-bar">
          <span class="photo-count-badge" id="__photo-num">1 / ${n}枚</span>
          <button onclick="App._downloadAllPhotos()">📥 画像を一括保存</button>
        </div>
        ${n>1?`<div class="photo-dots" id="__photo-dots" style="bottom:44px;">${dots}</div>`:''}
      </div>`;
    } else {
      photosHtml=`<div style="aspect-ratio:1;max-height:300px;display:flex;align-items:center;justify-content:center;font-size:60px;background:#F0F0F0;">📦</div>`;
    }

    main.innerHTML=`
    <div class="page-pad" style="background:var(--gray-light);">
      ${photosHtml}

      <!-- 商品詳細ラベル + タイトル + 説明文コピーエリア -->
      <div class="section-hd">商品情報</div>
      <div style="background:var(--white);padding:12px 16px;margin-bottom:2px;">
        <div class="prod-detail-label">商品名</div>
        <div style="display:flex;align-items:center;justify-content:space-between;gap:10px;">
          <div style="flex:1;min-width:0;">
            <div style="font-size:15px;font-weight:700;">${esc(product.name)}</div>
          </div>
          <button class="copy-btn" onclick="App._copyText('${esc(product.name)}','商品名をコピーしました')">📋 取得</button>
        </div>
      </div>

      ${product.description?`<div style="background:var(--white);padding:12px 16px;margin-bottom:2px;">
        <div class="prod-detail-label">商品説明</div>
        <div style="display:flex;align-items:flex-start;justify-content:space-between;gap:10px;">
          <div style="flex:1;font-size:13px;white-space:pre-wrap;line-height:1.6;">${esc(product.description)}</div>
          <button class="copy-btn" onclick="App._copyText(${JSON.stringify(product.description)},'説明文をコピーしました')" style="flex-shrink:0;">📋 取得</button>
        </div>
      </div>`:''}

      <!-- 在庫: 入庫(左) / 出庫(右) -->
      <div class="section-hd">在庫</div>
      <div class="stock-row">
        <button class="stock-btn" onclick="App._stockIn('${id}')">入庫する</button>
        <div class="stock-count" id="__stock-count">${product.stockCount||0}</div>
        <button class="stock-btn" onclick="App._showOutboundSheet('${id}')">出庫する</button>
      </div>

      <!-- 商品詳細 -->
      <div class="section-hd">商品詳細</div>
      <div class="detail-group">
        <div class="detail-row"><span class="detail-label">ステータス</span><span class="detail-value"><span class="prod-status-badge prod-status-${product.productStatus||'active'}">${{active:'販売中',paused:'販売休止',discontinued:'廃番'}[product.productStatus||'active']}</span></span></div>
        ${product.code?`<div class="detail-row"><span class="detail-label">管理番号</span><span class="detail-value">${esc(product.code)}</span></div>`:''}
        ${product.sku?`<div class="detail-row"><span class="detail-label">商品タイトル</span><span class="detail-value">${esc(product.sku)}</span></div>`:''}
        ${product.salePrice?`<div class="detail-row"><span class="detail-label">販売価格</span><span class="detail-value">${yen(product.salePrice)}</span></div>`:''}
        <div class="detail-row"><span class="detail-label">仕入額</span><span class="detail-value">${yen(product.purchasePrice)}</span></div>
        <div class="detail-row"><span class="detail-label">仕入日</span><span class="detail-value">${fmtDate(product.purchaseDate)}</span></div>
        ${product.purchaseSource?`<div class="detail-row"><span class="detail-label">仕入れ先</span><span class="detail-value">${esc(product.purchaseSource)}</span></div>`:''}
        ${product.category?`<div class="detail-row"><span class="detail-label">種類</span><span class="detail-value">${esc(product.category)}</span></div>`:''}
        ${product.condition?`<div class="detail-row"><span class="detail-label">状態</span><span class="detail-value">${esc(product.condition)}</span></div>`:''}
      </div>

      <!-- 実績 -->
      <div class="section-hd">実績</div>
      <div class="detail-group">
        <div class="detail-row"><span class="detail-label">販売個数</span><span class="detail-value">${totalQty}個</span></div>
        <div class="detail-row"><span class="detail-label">総売上</span><span class="detail-value">${yen(totalSales)}</span></div>
        <div class="detail-row"><span class="detail-label">総コスト</span><span class="detail-value">${yen(totalCost)}</span></div>
        <div class="detail-row"><span class="detail-label">総純利益</span><span class="detail-value green">${yen(totalProfit)}</span></div>
        <div class="detail-row"><span class="detail-label">平均利益率</span><span class="detail-value">${avgRoi}%</span></div>
      </div>

      <!-- 出品情報 -->
      <div class="section-hd">出品情報</div>
      <div class="detail-group">
        ${LISTING_STATUSES.map(s=>`<div class="detail-row"><span class="detail-label">${s.label}</span><span class="detail-value">${statusCounts[s.key]||0}個</span></div>`).join('')}
        <div style="text-align:right;padding:10px 16px;">
          <button style="color:var(--primary);font-size:14px;font-weight:500;" onclick="App.navigate('listings',{id:'${id}'},'出品一覧')">出品一覧 ›</button>
        </div>
      </div>

      <!-- メモ -->
      <div class="section-hd">メモ</div>
      <div style="background:var(--white);min-height:60px;padding:12px 16px;font-size:14px;display:flex;align-items:flex-start;justify-content:space-between;gap:10px;">
        <div style="flex:1;color:${product.memo?'var(--text)':'var(--text-secondary)'};">${product.memo?esc(product.memo):'（メモなし）'}</div>
        ${product.memo?`<button class="copy-btn" onclick="App._copyText(${JSON.stringify(product.memo)},'メモをコピーしました')">📋 取得</button>`:''}
      </div>

      <!-- ボタン -->
      <div style="padding:16px;display:flex;flex-direction:column;gap:10px;">
        <button class="btn btn-primary btn-full" onclick="App.navigate('sale-form',{productId:'${id}',productName:${JSON.stringify(product.name)},purchasePrice:'${product.purchasePrice||0}'},'売上を記録')">売上を記録する</button>
        <button class="btn btn-outline-red btn-full" style="color:var(--danger);border-color:var(--danger);" onclick="App._deleteProduct('${id}')">削除</button>
      </div>
    </div>`;

    _currentProductPhotos=product.photos||[];
    const swiper=document.getElementById('__photo-swiper');
    const dotsEl=document.getElementById('__photo-dots');
    const numEl=document.getElementById('__photo-num');
    const photoCount=product.photos?.length||0;

    function updatePhotoUI(idx){
      if(dotsEl) dotsEl.querySelectorAll('.photo-dot').forEach((d,i)=>d.classList.toggle('active',i===idx));
      if(numEl) numEl.textContent=`${idx+1} / ${photoCount}枚`;
      // 矢印の表示制御
      const prev=document.getElementById('__photo-prev');
      const next=document.getElementById('__photo-next');
      if(prev) prev.style.opacity=idx===0?'0.3':'1';
      if(next) next.style.opacity=idx===photoCount-1?'0.3':'1';
    }

    if(swiper){
      swiper.addEventListener('scroll',()=>{
        const i=Math.round(swiper.scrollLeft/swiper.offsetWidth);
        updatePhotoUI(i);
      },{passive:true});
      updatePhotoUI(0);
    }

    // 矢印ボタンで移動
    App._photoNav=dir=>{
      if(!swiper) return;
      const cur=Math.round(swiper.scrollLeft/swiper.offsetWidth);
      const next=Math.max(0,Math.min(photoCount-1,cur+dir));
      swiper.scrollTo({left:next*swiper.offsetWidth,behavior:'smooth'});
    };
  }

  // =====================================================================
  // PRODUCT FORM
  // =====================================================================
  async function pgProductForm(main,{id}) {
    const product=id?await db.get('products',id):null;
    _currentPhotos=product?.photos?[...product.photos]:[];

    // ドラッグ状態（renderPhotoGrid外で管理してlistener重複を防ぐ）
    let _pds=null; // {src, clone, timer}
    let _pdGridEl=null; // 現在のgrid要素

    function _getPhotoCell(x,y){
      if(_pds?.clone) _pds.clone.style.visibility='hidden';
      const el=document.elementFromPoint(x,y);
      if(_pds?.clone) _pds.clone.style.visibility='';
      return el?.closest('.photo-cell[data-idx]');
    }

    function _pdMoveClone(x,y){
      if(!_pds?.clone) return;
      const tw=parseFloat(_pds.clone.style.width), th=parseFloat(_pds.clone.style.height);
      _pds.clone.style.left=(x-tw/2)+'px';
      _pds.clone.style.top=(y-th/2)+'px';
      const over=_getPhotoCell(x,y);
      _pdGridEl?.querySelectorAll('.photo-cell[data-idx]').forEach(c=>c.classList.remove('drag-over'));
      if(over&&parseInt(over.dataset.idx)!==_pds.src) over.classList.add('drag-over');
    }

    function _pdEnd(x,y){
      if(_pds?.timer){clearTimeout(_pds.timer);}
      const src=_pds?.src??null;
      const wasDragging=src!==null&&_pds?.clone;
      if(_pds?.clone){_pds.clone.remove();}
      _pdGridEl?.querySelectorAll('.photo-cell[data-idx]').forEach(c=>{c.classList.remove('drag-over');c.style.opacity='';});
      _pds=null;
      if(wasDragging&&x!=null){
        const over=_getPhotoCell(x,y);
        if(over){
          const dest=parseInt(over.dataset.idx);
          if(dest!==src){
            const moved=_currentPhotos.splice(src,1)[0];
            _currentPhotos.splice(dest,0,moved);
            renderPhotoGrid();
            return;
          }
        }
      }
    }

    function _pdStartDrag(cell,srcIdx){
      _pds={src:srcIdx,clone:null,timer:null};
      if(navigator.vibrate) navigator.vibrate(40);
      const rect=cell.getBoundingClientRect();
      const clone=cell.cloneNode(true);
      Object.assign(clone.style,{
        position:'fixed',width:rect.width+'px',height:rect.height+'px',
        top:rect.top+'px',left:rect.left+'px',opacity:'0.88',
        border:'2px solid #555',borderRadius:'8px',zIndex:'9999',
        pointerEvents:'none',transform:'scale(1.07)',
        boxShadow:'0 8px 24px rgba(0,0,0,0.3)',
      });
      document.body.appendChild(clone);
      _pds.clone=clone;
      cell.style.opacity='0.25';
    }

    // グローバルmouseイベント（PC対応）
    function _onMouseMove(e){ if(_pds?.clone) _pdMoveClone(e.clientX,e.clientY); }
    function _onMouseUp(e){ document.removeEventListener('mousemove',_onMouseMove); document.removeEventListener('mouseup',_onMouseUp); _pdEnd(e.clientX,e.clientY); }

    function renderPhotoGrid(){
      const oldGrid=document.getElementById('__photo-grid');
      if(!oldGrid) return;
      // 古いlistenerをクリアするためにノードを置き換え
      const grid=oldGrid.cloneNode(false);
      oldGrid.parentNode.replaceChild(grid,oldGrid);
      _pdGridEl=grid;

      let html='';
      for(let i=0;i<10;i++){
        if(_currentPhotos[i]){
          html+=`<div class="photo-cell" data-idx="${i}" style="cursor:grab;touch-action:none;">
            <img src="${_currentPhotos[i]}" alt="" style="width:100%;height:100%;object-fit:cover;pointer-events:none;user-select:none;">
            <div class="photo-del" data-del="${i}">×</div>
            <div style="position:absolute;bottom:2px;left:0;right:0;text-align:center;font-size:9px;color:white;background:rgba(0,0,0,0.45);pointer-events:none;">${i+1}</div>
          </div>`;
        } else {
          html+=`<div class="photo-cell" style="opacity:0.2;"><span style="font-size:16px;">📷</span><div style="font-size:9px;color:#999;">${i+1}</div></div>`;
        }
      }
      grid.innerHTML=html;
      const hd=document.getElementById('__photo-hd');
      if(hd) hd.textContent=`写真（最大10枚 · ${_currentPhotos.length}枚登録済み）`;

      // 削除ボタン
      grid.querySelectorAll('.photo-del[data-del]').forEach(btn=>{
        btn.addEventListener('click',e=>{e.stopPropagation();_currentPhotos.splice(parseInt(btn.dataset.del),1);renderPhotoGrid();});
      });

      // タッチドラッグ（iPhone）
      grid.addEventListener('touchstart',e=>{
        const cell=e.target.closest('.photo-cell[data-idx]');
        if(!cell||e.target.dataset.del!=null) return;
        const srcIdx=parseInt(cell.dataset.idx);
        _pds={src:null,clone:null,timer:setTimeout(()=>_pdStartDrag(cell,srcIdx),400)};
      },{passive:true});

      grid.addEventListener('touchmove',e=>{
        if(_pds?.timer&&!_pds.clone){clearTimeout(_pds.timer);_pds.timer=null;_pds=null;return;}
        if(!_pds?.clone) return;
        e.preventDefault();
        const t=e.touches[0];
        _pdMoveClone(t.clientX,t.clientY);
      },{passive:false});

      grid.addEventListener('touchend',e=>{
        if(_pds?.timer){clearTimeout(_pds.timer);_pds=null;return;}
        const t=e.changedTouches[0];
        _pdEnd(t?.clientX,t?.clientY);
      },{passive:true});

      grid.addEventListener('touchcancel',()=>{if(_pds?.timer)clearTimeout(_pds.timer);_pdEnd(null,null);},{passive:true});

      // マウスドラッグ（PC）
      grid.addEventListener('mousedown',e=>{
        const cell=e.target.closest('.photo-cell[data-idx]');
        if(!cell||e.target.dataset.del!=null) return;
        const srcIdx=parseInt(cell.dataset.idx);
        _pds={src:null,clone:null,timer:setTimeout(()=>{
          _pdStartDrag(cell,srcIdx);
          document.addEventListener('mousemove',_onMouseMove);
          document.addEventListener('mouseup',_onMouseUp);
        },300)};
      });
    }
    _renderPhotoGrid=renderPhotoGrid;

    main.innerHTML=`
    <div class="page-pad" style="background:var(--gray-light);">
      <div class="section-hd" id="__photo-hd">写真（最大10枚 · ${_currentPhotos.length}枚登録済み）</div>
      <label class="photo-add-big" for="__photo-input-main">
        📷 写真を追加（複数まとめて選択OK）
        <input type="file" id="__photo-input-main" accept="image/*" multiple style="display:none" onchange="App._addPhotos(this)">
      </label>
      <div class="photo-edit-grid" id="__photo-grid"></div>
      <div style="height:10px;"></div>
      <div class="form-group">
        <div class="form-row">
          <label class="form-label required">商品名</label>
          <div class="form-input-wrap">
            <input class="form-input" id="f-name" type="text" placeholder="商品名" value="${esc(product?.name||'')}" oninput="document.getElementById('f-name-cnt').textContent=this.value.length+'文字'">
            <div class="char-cnt" id="f-name-cnt">${(product?.name||'').length}文字</div>
          </div>
        </div>
        <div class="form-row"><label class="form-label">管理番号</label><input class="form-input" id="f-code" type="text" placeholder="例: C-1215" value="${esc(product?.code||'')}"></div>
        <div class="form-row"><label class="form-label">ステータス</label>
          <select class="form-select" id="f-product-status">
            <option value="active" ${(!product?.productStatus||product?.productStatus==='active')?'selected':''}>販売中</option>
            <option value="paused" ${product?.productStatus==='paused'?'selected':''}>販売休止</option>
            <option value="discontinued" ${product?.productStatus==='discontinued'?'selected':''}>廃番</option>
          </select>
        </div>
      </div>
      <div class="form-group">
        <div class="form-row"><label class="form-label required">仕入額</label><input class="form-input" id="f-purchasePrice" type="number" inputmode="numeric" placeholder="0" value="${product?.purchasePrice||''}"><span class="form-suffix">円</span></div>
        <div class="form-row"><label class="form-label">販売価格</label><input class="form-input" id="f-salePrice" type="number" inputmode="numeric" placeholder="0" value="${product?.salePrice||''}"><span class="form-suffix">円</span></div>
        <div class="form-row"><label class="form-label">仕入日</label><input class="form-input" id="f-purchaseDate" type="date" value="${product?.purchaseDate||todayStr()}"></div>
        <div class="form-row"><label class="form-label">仕入れ先</label><input class="form-input" id="f-purchaseSource" type="text" placeholder="例: アリエク" value="${esc(product?.purchaseSource||'')}"></div>
      </div>
      <div class="form-group">
        <div class="form-row">
          <label class="form-label">在庫数</label>
          <div class="stepper">
            <button type="button" onclick="App._step('f-stock',-1)">−</button>
            <input type="number" id="f-stock" value="${product?.stockCount??1}" min="0" inputmode="numeric">
            <button type="button" onclick="App._step('f-stock',1)">＋</button>
          </div>
        </div>
        <div class="form-row"><label class="form-label">種類</label><input class="form-input" id="f-category" type="text" placeholder="例: スケボー" value="${esc(product?.category||'')}"></div>
        <div class="form-row"><label class="form-label">状態</label>
          <select class="form-select" id="f-condition">
            <option value="">（未設定）</option>
            ${['新品','未使用に近い','目立った傷や汚れなし','やや傷や汚れあり','傷や汚れあり','全体的に状態が悪い'].map(c=>`<option value="${c}" ${product?.condition===c?'selected':''}>${c}</option>`).join('')}
          </select>
        </div>
      </div>
      <div class="form-group">
        <div class="form-row" style="align-items:flex-start;padding-top:8px;">
          <label class="form-label" style="padding-top:4px;">商品説明</label>
          <div class="form-input-wrap">
            <textarea class="form-textarea" id="f-desc" placeholder="出品説明文など" oninput="document.getElementById('f-desc-cnt').textContent=this.value.length+'文字'">${esc(product?.description||'')}</textarea>
            <div class="char-cnt" id="f-desc-cnt">${(product?.description||'').length}文字</div>
          </div>
        </div>
        <div class="form-row" style="align-items:flex-start;padding-top:8px;">
          <label class="form-label" style="padding-top:4px;">メモ</label>
          <div class="form-input-wrap">
            <textarea class="form-textarea" id="f-memo" placeholder="自由メモ" oninput="document.getElementById('f-memo-prod-cnt').textContent=this.value.length+'文字'">${esc(product?.memo||'')}</textarea>
            <div class="char-cnt" id="f-memo-prod-cnt">${(product?.memo||'').length}文字</div>
          </div>
        </div>
      </div>
      <div class="form-group">
        <div class="form-row" style="justify-content:space-between;">
          <label class="form-label">非表示にする</label>
          <label style="display:flex;align-items:center;gap:8px;cursor:pointer;">
            <input type="checkbox" id="f-hidden" ${product?.hidden?'checked':''} style="width:20px;height:20px;cursor:pointer;">
            <span style="font-size:13px;color:var(--text-secondary);">グリッドから非表示</span>
          </label>
        </div>
      </div>
      <button id="__save-product" style="display:none;" onclick="App._saveProduct('${id||''}')"></button>
    </div>`;
    renderPhotoGrid();
  }

  let _productSaving = false;
  async function _saveProduct(id) {
    if (_productSaving) return; // 二重保存防止
    _productSaving = true;
    try {
      const name=document.getElementById('f-name')?.value?.trim();
      if(!name){toast('商品名を入力してください');return;}
      const existing=id?await db.get('products',id):null;
      const product={
        id:id||uid(), name,
        sku:existing?.sku||'',
        code:document.getElementById('f-code')?.value?.trim()||'',
        productStatus:document.getElementById('f-product-status')?.value||'active',
        hidden:document.getElementById('f-hidden')?.checked||false,
        purchasePrice:Number(document.getElementById('f-purchasePrice')?.value)||0,
        salePrice:Number(document.getElementById('f-salePrice')?.value)||0,
        purchaseDate:document.getElementById('f-purchaseDate')?.value||'',
        purchaseSource:document.getElementById('f-purchaseSource')?.value?.trim()||'',
        stockCount:Number(document.getElementById('f-stock')?.value)||0,
        category:document.getElementById('f-category')?.value?.trim()||'',
        condition:document.getElementById('f-condition')?.value||'',
        description:document.getElementById('f-desc')?.value?.trim()||'',
        memo:document.getElementById('f-memo')?.value?.trim()||'',
        photos:_currentPhotos||[],
        createdAt:existing?.createdAt||Date.now(),
        updatedAt:Date.now(),
      };
      const hasNewPhotos = (_currentPhotos||[]).some(p=>p.startsWith('data:'));
      if (hasNewPhotos) toast('📤 写真をクラウドにアップロード中...', 12000);
      try {
        await db.put('products',product);
      } catch(e) {
        toast('❌ エラー: ' + (e.message||e), 5000);
        return;
      }
      toast(hasNewPhotos ? '✅ 写真をクラウドに保存しました' : '保存しました');
      pageStack.pop();
      const title=`${product.sku?product.sku+' ':''}${product.name}`;
      if(id) await _render('product-detail',{id},title);
      else await _render('products',{},'商品マスタ');
    } finally {
      _productSaving = false;
    }
  }

  async function _addPhotos(input) {
    const files=Array.from(input.files);
    if(!files.length) return;
    const remaining=10-_currentPhotos.length;
    const toAdd=files.slice(0,remaining);
    if(files.length>remaining) toast(`${files.length}枚選択 → 残り${remaining}枚のみ追加`);
    for(const file of toAdd){
      const b64=await fileToBase64(file);
      _currentPhotos.push(await resizeImage(b64));
    }
    _renderPhotoGrid?.();
    input.value='';
  }

  function _removePhoto(idx){_currentPhotos.splice(idx,1);_renderPhotoGrid?.();}
  function _step(id,d){const el=document.getElementById(id);if(el)el.value=Math.max(0,(Number(el.value)||0)+d);}

  async function _stockIn(productId){
    const p=await db.get('products',productId);
    if(!p) return;
    // 数量入力ダイアログ
    const ov=document.createElement('div');ov.className='status-popup-overlay';ov.style.alignItems='flex-end';
    ov.innerHTML=`<div class="outbound-sheet" style="padding-bottom:24px;">
      <h3 style="margin-bottom:16px;">入庫数量</h3>
      <div style="font-size:13px;color:var(--text-secondary);text-align:center;margin-bottom:16px;">${esc(p.name)}</div>
      <div style="display:flex;align-items:center;justify-content:center;gap:16px;margin-bottom:20px;">
        <button id="__si-minus" style="width:44px;height:44px;border-radius:50%;background:var(--gray-light);font-size:24px;font-weight:700;color:var(--text);display:flex;align-items:center;justify-content:center;">−</button>
        <span id="__si-qty" style="font-size:32px;font-weight:700;min-width:48px;text-align:center;">1</span>
        <button id="__si-plus" style="width:44px;height:44px;border-radius:50%;background:var(--gray-light);font-size:24px;font-weight:700;color:var(--text);display:flex;align-items:center;justify-content:center;">＋</button>
      </div>
      <div style="display:flex;gap:8px;">
        <button class="btn btn-gray btn-full" onclick="this.closest('.status-popup-overlay').remove()">キャンセル</button>
        <button class="btn btn-primary btn-full" id="__si-ok">入庫する</button>
      </div>
    </div>`;
    document.body.appendChild(ov);
    ov.addEventListener('click',e=>{if(e.target===ov)ov.remove();});
    let qty=1;
    const qtyEl=ov.querySelector('#__si-qty');
    ov.querySelector('#__si-minus').onclick=()=>{if(qty>1){qty--;qtyEl.textContent=qty;}};
    ov.querySelector('#__si-plus').onclick=()=>{qty++;qtyEl.textContent=qty;};
    ov.querySelector('#__si-ok').onclick=async()=>{
      p.stockCount=(p.stockCount||0)+qty; p.updatedAt=Date.now();
      await db.put('products',p);
      const el=document.getElementById('__stock-count');
      if(el) el.textContent=p.stockCount;
      ov.remove();
      toast(`入庫しました +${qty}個（計${p.stockCount}個）`);
    };
  }

  async function _showOutboundSheet(productId){
    const product=await db.get('products',productId);
    if(!product) return;
    if((product.stockCount||0)<=0){toast('在庫がありません');return;}

    const overlay=document.createElement('div');
    overlay.className='status-popup-overlay';
    overlay.style.alignItems='flex-end';

    const scBtns=SHIPPING_SHORTCUTS.map(s=>
      `<button class="shipping-sc-btn" data-price="${s.price}" onclick="App._obSelShipping(${s.price},this)">${s.label}${s.price>0?' ¥'+s.price:''}</button>`
    ).join('');

    overlay.innerHTML=`
      <div class="outbound-sheet">
        <div class="outbound-sheet-header">
          <button onclick="this.closest('.status-popup-overlay').remove()" style="color:var(--primary);font-size:14px;font-weight:600;padding:4px 8px;">← 戻る</button>
          <span class="outbound-sheet-title">出庫・売上を記録</span>
          <div style="width:60px;"></div>
        </div>
        <div class="outbound-sheet-body">
          <div style="font-size:13px;color:var(--text-secondary);text-align:center;margin-bottom:12px;padding:4px 0;">
            ${esc(product.code?`[${product.code}] `:'')}${esc(product.name)}
          </div>

          <!-- プラットフォーム -->
          <div style="font-size:12px;color:var(--text-secondary);margin-bottom:6px;font-weight:600;">プラットフォーム</div>
          <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:5px;margin-bottom:14px;" id="__ob-platforms">
            ${PLATFORMS.map(p=>`<button class="platform-btn ${p.key==='mercari'?'selected':''}" data-key="${p.key}" style="font-size:11px;padding:7px 3px;${p.key==='mercari'?'background:'+p.color+';color:'+(isLightColor(p.color)?'#000':'#fff')+';border-color:'+p.color+';':''}">${p.name}</button>`).join('')}
          </div>

          <!-- 販売価格 -->
          <div style="font-size:12px;color:var(--text-secondary);margin-bottom:4px;font-weight:600;">販売価格 <span style="color:var(--danger);">*</span></div>
          <div class="outbound-price-row">
            <input type="number" inputmode="numeric" id="__ob-price" placeholder="0" value="${product.salePrice||''}">
            <span>円</span>
          </div>

          <!-- 仕入額 -->
          <div style="font-size:12px;color:var(--text-secondary);margin-bottom:4px;font-weight:600;">仕入額</div>
          <div class="outbound-price-row">
            <input type="number" inputmode="numeric" id="__ob-purchase" placeholder="0" value="${product.purchasePrice||''}">
            <span>円</span>
          </div>

          <!-- 送料 -->
          <div style="font-size:12px;color:var(--text-secondary);margin-bottom:6px;font-weight:600;">送料</div>
          <div class="shipping-shortcuts">${scBtns}</div>
          <div class="outbound-price-row">
            <input type="number" inputmode="numeric" id="__ob-shipping" placeholder="0" value="0">
            <span>円</span>
          </div>

          <!-- 手数料率 -->
          <div style="font-size:12px;color:var(--text-secondary);margin-bottom:4px;font-weight:600;">手数料率</div>
          <div class="outbound-price-row" style="margin-bottom:14px;">
            <input type="number" inputmode="numeric" id="__ob-fee-rate" placeholder="10" value="10">
            <span>%</span>
          </div>

          <!-- 売れた日・ステータス -->
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:14px;">
            <div>
              <div style="font-size:12px;color:var(--text-secondary);margin-bottom:4px;font-weight:600;">売れた日</div>
              <input type="date" id="__ob-date" value="${todayStr()}" style="width:100%;padding:9px 10px;border-radius:10px;border:1.5px solid var(--gray-border);font-size:13px;background:var(--gray-light);">
            </div>
            <div>
              <div style="font-size:12px;color:var(--text-secondary);margin-bottom:4px;font-weight:600;">ステータス</div>
              <select id="__ob-status" style="width:100%;padding:10px 10px;border-radius:10px;border:1.5px solid var(--gray-border);font-size:13px;background:var(--gray-light);">
                ${LISTING_STATUSES.map(s=>`<option value="${s.key}" ${s.key==='shipping'?'selected':''}>${s.label}</option>`).join('')}
              </select>
            </div>
          </div>

          <!-- 出庫個数 -->
          <div style="font-size:12px;color:var(--text-secondary);margin-bottom:6px;font-weight:600;">出庫個数（在庫: ${product.stockCount||0}個）</div>
          <div style="display:flex;align-items:center;gap:12px;margin-bottom:14px;">
            <button id="__ob-qty-minus" style="width:40px;height:40px;border-radius:50%;background:var(--gray-light);font-size:22px;font-weight:700;color:var(--text);display:flex;align-items:center;justify-content:center;flex-shrink:0;">−</button>
            <span id="__ob-qty-disp" style="font-size:24px;font-weight:700;min-width:36px;text-align:center;">1</span>
            <button id="__ob-qty-plus" style="width:40px;height:40px;border-radius:50%;background:var(--gray-light);font-size:22px;font-weight:700;color:var(--text);display:flex;align-items:center;justify-content:center;flex-shrink:0;">＋</button>
            <span style="font-size:13px;color:var(--text-secondary);">個（個別に売上記録を作成）</span>
          </div>

          <!-- 純利益 -->
          <div style="background:var(--gray-light);border-radius:10px;padding:12px 14px;display:flex;justify-content:space-between;align-items:center;">
            <span style="font-size:13px;color:var(--text-secondary);">純利益（概算）</span>
            <span id="__ob-profit" style="font-size:18px;font-weight:700;color:var(--success);">¥0</span>
          </div>
        </div>
        <div class="outbound-sheet-footer">
          <button class="btn btn-primary btn-full" id="__ob-submit" style="font-size:16px;">出庫 &amp; 記録する</button>
        </div>
      </div>`;

    document.body.appendChild(overlay);

    let selPlatformKey='mercari';
    let selShippingBtn=null;
    let obQty=1;
    const qtyDisp=overlay.querySelector('#__ob-qty-disp');
    overlay.querySelector('#__ob-qty-minus').onclick=()=>{if(obQty>1){obQty--;qtyDisp.textContent=obQty;}};
    overlay.querySelector('#__ob-qty-plus').onclick=()=>{
      if(obQty<(product.stockCount||1)){obQty++;qtyDisp.textContent=obQty;}
      else toast('在庫数以上は出庫できません');
    };

    App._obSelShipping=(price,btn)=>{
      overlay.querySelectorAll('.shipping-sc-btn').forEach(b=>b.classList.remove('selected'));
      btn.classList.add('selected');
      const el=overlay.querySelector('#__ob-shipping');if(el){el.value=price;calcProfit();}
    };

    function calcProfit(){
      const sp=Number(overlay.querySelector('#__ob-price')?.value)||0;
      const pp=Number(overlay.querySelector('#__ob-purchase')?.value)||0;
      const sh=Number(overlay.querySelector('#__ob-shipping')?.value)||0;
      const rate=(Number(overlay.querySelector('#__ob-fee-rate')?.value)||0)/100;
      const fee=Math.floor(sp*rate);
      const profit=sp-pp-fee-sh;
      const el=overlay.querySelector('#__ob-profit');
      if(el){el.textContent=yen(profit);el.style.color=profit>=0?'var(--success)':'var(--danger)';}
    }
    App._calcObProfit=calcProfit;

    function selectPlatform(key){
      selPlatformKey=key;
      const p=getPlatform(key);
      overlay.querySelectorAll('#__ob-platforms .platform-btn').forEach(b=>{
        const isSel=b.dataset.key===key;
        b.classList.toggle('selected',isSel);
        if(isSel){b.style.background=p.color;b.style.color=isLightColor(p.color)?'#000':'#fff';b.style.borderColor=p.color;}
        else{b.style.background='';b.style.color='';b.style.borderColor='';}
      });
      const feeEl=overlay.querySelector('#__ob-fee-rate');
      if(feeEl) feeEl.value=p.feeRate;
      calcProfit();
    }

    overlay.querySelector('#__ob-platforms').addEventListener('click',e=>{
      const btn=e.target.closest('.platform-btn');if(btn)selectPlatform(btn.dataset.key);
    });
    overlay.querySelector('#__ob-price')?.addEventListener('input',calcProfit);
    overlay.querySelector('#__ob-purchase')?.addEventListener('input',calcProfit);
    overlay.querySelector('#__ob-shipping')?.addEventListener('input',calcProfit);
    overlay.querySelector('#__ob-fee-rate')?.addEventListener('input',calcProfit);

    overlay.querySelector('#__ob-submit').onclick=async()=>{
      const salePrice=Number(overlay.querySelector('#__ob-price')?.value)||0;
      if(salePrice<=0){toast('販売価格を入力してください');return;}
      const pp=Number(overlay.querySelector('#__ob-purchase')?.value)||product.purchasePrice||0;
      const sh=Number(overlay.querySelector('#__ob-shipping')?.value)||0;
      const status=overlay.querySelector('#__ob-status')?.value||'shipping';
      const saleDate=overlay.querySelector('#__ob-date')?.value||todayStr();
      const feeRate=(Number(overlay.querySelector('#__ob-fee-rate')?.value)||0)/100;
      const fee=Math.floor(salePrice*feeRate);
      const profit=salePrice-pp-fee-sh;
      // obQty個分の売上記録を作成
      for(let i=0;i<obQty;i++){
        const listing={
          id:uid(), productId, productName:product.name,
          photo:product.photos?.[0]||'',
          productTitle:product.sku||'', productCode:product.code||'',
          platform:selPlatformKey, salePrice, purchasePrice:pp,
          feeRate, fee, shipping:sh, profit,
          saleDate, status, memo:'', createdAt:Date.now()+i,
        };
        await db.put('listings',listing);
      }
      product.stockCount=Math.max(0,(product.stockCount||0)-obQty);
      product.updatedAt=Date.now();
      await db.put('products',product);
      const el=document.getElementById('__stock-count');
      if(el) el.textContent=product.stockCount;
      overlay.remove();
      toast(`✅ ${obQty}個出庫しました（在庫${product.stockCount}個）`);
    };

    selectPlatform('mercari');
    calcProfit();
  }

  async function _deleteProduct(id){
    const ok=await confirmDialog('この商品を削除しますか？');
    if(!ok) return;
    await db.delete('products',id);
    toast('削除しました');
    pageStack.splice(0);
    await _render('products',{},'商品マスタ');
  }

  // =====================================================================
  // LISTINGS
  // =====================================================================
  async function pgListings(main,{id:productId},actionBtn){
    const product=productId?await db.get('products',productId):null;
    let listings=productId?await db.getAllByIndex('listings','productId',productId):await db.getAll('listings');
    listings.sort((a,b)=>b.createdAt-a.createdAt);
    actionBtn.className='header-btn pill-btn'; actionBtn.textContent='＋追加';
    actionBtn.onclick=()=>navigate('sale-form',{productId,productName:product?.name||'',purchasePrice:product?.purchasePrice||0},'売上を記録');
    let filterStatus='all';

    function grouped(list){
      const groups={};
      list.forEach(l=>{const st=STATUS_MAP[l.status]||STATUS_MAP.before;if(!groups[st.key])groups[st.key]={label:st.label,items:[]};groups[st.key].items.push(l);});
      return Object.values(groups).map(g=>`<div class="section-hd">${g.label}</div>${g.items.map(l=>renderItem(l)).join('')}`).join('');
    }

    function renderItem(l){
      const p=getPlatform(l.platform),st=STATUS_MAP[l.status]||STATUS_MAP.before,profit=Number(l.profit)||0;
      const thumb=product?.photos?.[0]?`<img src="${product.photos[0]}" alt="" style="width:100%;height:100%;object-fit:cover;">`:`<div class="listing-thumb-placeholder">📦</div>`;
      const canComplete=['payment','shipping','review','listing'].includes(l.status);
      return `<div class="listing-item">
        <div class="listing-thumb">${thumb}</div>
        <div class="listing-body">
          <div class="listing-top"><span class="listing-date">${fmtDate(l.saleDate)}</span><span class="listing-price-top">${yen(l.salePrice)}</span></div>
          <div class="listing-sku">${esc(l.productName)}</div>
          <span class="platform-badge" style="${platformBadgeStyle(l.platform)}">${p.name}</span>
          <div class="listing-info-grid">
            <div class="listing-info-item"><div class="li-label">販売価格</div><div class="li-value">${yen(l.salePrice)}</div></div>
            <div class="listing-info-item"><div class="li-label">仕入額</div><div class="li-value">${yen(l.purchasePrice)}</div></div>
            <div class="listing-info-item"><div class="li-label">送料</div><div class="li-value">${yen(l.shipping)}</div></div>
            <div class="listing-info-item"><div class="li-label">手数料</div><div class="li-value">${yen(l.fee)}</div></div>
            <div class="listing-info-item"><div class="li-label">純利益</div><div class="li-value" style="color:${profit>=0?'var(--success)':'var(--danger)'};">${yen(profit)}</div></div>
            <div class="listing-info-item"><div class="li-label">利益率</div><div class="li-value">${l.salePrice>0?(profit/l.salePrice*100).toFixed(1):'0.0'}%</div></div>
          </div>
        </div>
        <div class="listing-right">
          ${canComplete?`<button class="complete-btn" onclick="App._setStatus('${l.id}','completed')">取引完了</button>`:`<span class="badge ${st.badge}">${st.label}</span>`}
          <button class="status-change-btn" onclick="App._showStatusPopup('${l.id}')">変更</button>
        </div>
      </div>`;
    }

    function renderList(){
      const body=document.getElementById('__listing-body');
      if(!body) return;
      const list=filterStatus==='all'?listings:listings.filter(l=>{
        if(filterStatus==='trading') return['payment','shipping','review','listing'].includes(l.status);
        return l.status===filterStatus;
      });
      if(!list.length){body.innerHTML=`<div class="empty-state"><div class="empty-icon">📋</div><p>出品がありません</p></div>`;return;}
      body.innerHTML=grouped(list);
    }

    main.innerHTML=`
      <div class="filter-tabs">
        <button class="filter-tab active" data-f="all">すべて</button>
        <button class="filter-tab" data-f="trading">取引中</button>
        <button class="filter-tab" data-f="completed">完了</button>
        <button class="filter-tab" data-f="before">出品前</button>
        <button class="filter-tab" data-f="listing">出品中</button>
        <button class="filter-tab" data-f="canceled">キャンセル</button>
      </div>
      <div id="__listing-body" class="page-pad"></div>`;

    renderList();
    document.querySelector('.filter-tabs')?.addEventListener('click',e=>{
      const btn=e.target.closest('.filter-tab');
      if(!btn) return;
      filterStatus=btn.dataset.f;
      document.querySelectorAll('.filter-tab').forEach(b=>b.classList.toggle('active',b.dataset.f===filterStatus));
      renderList();
    });

    App._setStatus=async(lid,status)=>{
      const l=await db.get('listings',lid);if(!l)return;
      l.status=status;await db.put('listings',l);
      const idx=listings.findIndex(x=>x.id===lid);if(idx>=0)listings[idx]=l;
      if(status==='completed'&&l.productId){const prod=await db.get('products',l.productId);if(prod){prod.stockCount=Math.max(0,(prod.stockCount||0)-1);await db.put('products',prod);}}
      toast(STATUS_MAP[status]?.label+'にしました');renderList();
    };
    App._showStatusPopup=async(lid)=>{
      const overlay=document.createElement('div');overlay.className='status-popup-overlay';
      const l=await db.get('listings',lid);
      overlay.innerHTML=`<div class="status-popup"><div style="padding:12px;font-weight:700;text-align:center;border-bottom:1px solid var(--gray-border);">ステータスを変更</div>${LISTING_STATUSES.map(s=>`<button class="status-popup-item ${l?.status===s.key?'active':''}" data-key="${s.key}">${s.label}</button>`).join('')}</div>`;
      document.body.appendChild(overlay);
      overlay.onclick=e=>{const btn=e.target.closest('.status-popup-item');if(btn)App._setStatus(lid,btn.dataset.key);overlay.remove();};
    };
  }

  // =====================================================================
  // SALES（売上管理表）
  // =====================================================================
  async function pgSales(main,actionBtn){
    const listings=await db.getAll('listings');
    listings.sort((a,b)=>b.createdAt-a.createdAt);
    // 商品マスタ読み込み（更新日・仕入日ソート用）
    const allProducts=await db.getAll('products');
    const productMap=Object.fromEntries(allProducts.map(p=>[p.id,p]));

    // ヘッダーボタン設定
    actionBtn.className='header-btn-group';
    actionBtn.style.cssText='display:flex;gap:6px;background:none;border:none;padding:0;';
    actionBtn.onclick=null;
    actionBtn.innerHTML=`<button class="hbg-btn" onclick="App.navigate('sale-form',{},'売上を記録')">＋</button><button class="hbg-btn" onclick="App._salesSettingsSheet()" style="font-size:18px;letter-spacing:1px;">⋯</button>`;

    // 状態変数
    let filterStatus=_salesFilterStatus, sortMode='date', searchQ='';
    let viewMode=_salesViewMode;
    let itemMode=_salesItemMode;    // モジュール変数から復元（画面移動後も維持）
    let calYear=new Date().getFullYear(), calMonth=new Date().getMonth();
    let calDateBasis='saleDate', calSelectedDate=null;

    const FILTER_OPTS=[
      {key:'all',       label:'全て'},
      {key:'active',    label:'発送待ち（未完了）'},
      {key:'completed', label:'取引完了のみ'},
    ];

    const SORT_OPTS=[
      {key:'date',          label:'売れた順（新しい順）'},
      {key:'date_asc',      label:'売れた順（古い順）'},
      {key:'platform',      label:'プラットフォーム順'},
      {key:'updatedAt',     label:'更新日順（商品マスタ）'},
      {key:'purchaseDate',  label:'仕入日順'},
      {key:'completedDate', label:'取引完了日順'},
      {key:'code_jp',       label:'あ順（管理番号）'},
      {key:'code_en',       label:'A順（管理番号）'},
      {key:'code_num',      label:'数字順（管理番号）'},
    ];

    function _codeNum(l){
      const m=(l.productCode||'').match(/\d+/);return m?Number(m[0]):Infinity;
    }
    function sortList(list){
      const collator=new Intl.Collator('ja',{sensitivity:'base'});
      switch(sortMode){
        case 'date':         return list.sort((a,b)=>new Date(b.saleDate||0)-new Date(a.saleDate||0)||b.createdAt-a.createdAt);
        case 'date_asc':     return list.sort((a,b)=>new Date(a.saleDate||0)-new Date(b.saleDate||0)||a.createdAt-b.createdAt);
        case 'updatedAt':    return list.sort((a,b)=>(productMap[b.productId]?.updatedAt||0)-(productMap[a.productId]?.updatedAt||0));
        case 'purchaseDate': return list.sort((a,b)=>new Date(productMap[b.productId]?.purchaseDate||0)-new Date(productMap[a.productId]?.purchaseDate||0));
        case 'completedDate':return list.sort((a,b)=>(b.updatedAt||b.createdAt||0)-(a.updatedAt||a.createdAt||0));
        case 'code_jp':      return list.sort((a,b)=>collator.compare(a.productCode||'',b.productCode||''));
        case 'code_en':      return list.sort((a,b)=>(a.productCode||'').localeCompare(b.productCode||'','en'));
        case 'code_num':     return list.sort((a,b)=>_codeNum(a)-_codeNum(b));
        default:             return list.sort((a,b)=>new Date(b.saleDate||0)-new Date(a.saleDate||0)||b.createdAt-a.createdAt);
      }
    }

    function filtered(){
      let list=[...listings];
      if(searchQ) list=list.filter(l=>(l.productName||'').includes(searchQ)||(l.productCode||'').includes(searchQ));
      if(filterStatus==='active')    list=list.filter(l=>!['completed','cancelled'].includes(l.status));
      else if(filterStatus==='completed') list=list.filter(l=>l.status==='completed');
      return sortList(list);
    }

    let statPeriod='list'; // list / month / year / all
    const now=new Date();
    const STAT_PERIOD_OPTS=[
      {key:'list',  label:'表示中のリスト'},
      {key:'month', label:`今月（${now.getFullYear()}/${now.getMonth()+1}月）`},
      {key:'year',  label:`今年（${now.getFullYear()}年）`},
      {key:'all',   label:'全期間'},
    ];

    function getStatList(){
      if(statPeriod==='list') return filtered();
      let base=[...listings];
      if(statPeriod==='month'){
        const y=now.getFullYear(),m=now.getMonth()+1;
        const prefix=`${y}-${String(m).padStart(2,'0')}`;
        base=base.filter(l=>(l.saleDate||'').startsWith(prefix));
      } else if(statPeriod==='year'){
        const y=String(now.getFullYear());
        base=base.filter(l=>(l.saleDate||'').startsWith(y));
      }
      return base;
    }

    function calcStats(list){
      const saleT=list.reduce((a,l)=>a+(Number(l.salePrice)||0),0);
      const purT =list.reduce((a,l)=>a+(Number(l.purchasePrice)||0),0);
      const shT  =list.reduce((a,l)=>a+(Number(l.shipping)||0),0);
      const feeT =list.reduce((a,l)=>a+(Number(l.fee)||0),0);
      const profT=list.reduce((a,l)=>a+(Number(l.profit)||0),0);
      const roi  =saleT>0?(profT/saleT*100).toFixed(1):'0.0';
      return {saleT,purT,shT,feeT,profT,roi,cnt:list.length};
    }

    function renderStats(){
      const el=document.getElementById('__sales-stats');if(!el)return;
      const statList=getStatList();
      const s=calcStats(statList);
      const periodLabel=STAT_PERIOD_OPTS.find(o=>o.key===statPeriod)?.label||'表示中';
      el.innerHTML=`
        <div style="display:flex;align-items:center;justify-content:space-between;padding:8px 0 10px;">
          <span style="font-size:12px;color:var(--text-secondary);">集計期間</span>
          <button id="__stat-period-btn" style="font-size:13px;font-weight:600;color:var(--primary);display:flex;align-items:center;gap:3px;">${periodLabel} <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor"><path d="M7 10l5 5 5-5z"/></svg></button>
        </div>
        <div style="text-align:right;font-size:11px;color:var(--text-secondary);margin-bottom:2px;">${s.cnt}件</div>
        <div class="sales-stat-grid">
          <div class="ss-cell"><div class="ss-lbl">販売価格</div><div class="ss-val">${yen(s.saleT)}</div></div>
          <div class="ss-cell"><div class="ss-lbl">仕入額</div><div class="ss-val">${yen(s.purT)}</div></div>
          <div class="ss-cell accent"><div class="ss-lbl">純利益</div><div class="ss-val" style="color:${s.profT>=0?'var(--success)':'var(--danger)'};">${yen(s.profT)}</div></div>
          <div class="ss-cell"><div class="ss-lbl">送料+梱包</div><div class="ss-val">${yen(s.shT)}</div></div>
          <div class="ss-cell"><div class="ss-lbl">手数料</div><div class="ss-val">${yen(s.feeT)}</div></div>
          <div class="ss-cell roi"><div class="ss-lbl">利益率</div><div class="ss-val" style="color:var(--primary);">${s.roi}%</div></div>
        </div>`;
      document.getElementById('__stat-period-btn')?.addEventListener('click',()=>{
        const ov=document.createElement('div');ov.className='status-popup-overlay';
        ov.innerHTML=`<div class="status-popup">
          <div style="padding:12px 16px;font-weight:700;font-size:15px;text-align:center;border-bottom:1px solid var(--gray-border);">集計期間</div>
          ${STAT_PERIOD_OPTS.map(o=>`<button class="status-popup-item ${statPeriod===o.key?'active':''}" data-key="${o.key}">${o.label}</button>`).join('')}
        </div>`;
        document.body.appendChild(ov);
        ov.addEventListener('click',e=>{
          const btn=e.target.closest('.status-popup-item');
          if(btn){statPeriod=btn.dataset.key;renderStats();}
          ov.remove();
        });
      });
    }

    function renderItem(l){
      const st=STATUS_MAP[l.status]||STATUS_MAP.completed;
      const profit=Number(l.profit)||0;
      const roi=l.salePrice>0?(profit/l.salePrice*100).toFixed(1):'0.0';
      const p=getPlatform(l.platform);
      const thumb=l.photo
        ?`<img src="${l.photo}" style="width:100%;height:100%;object-fit:cover;">`
        :`<span style="font-size:18px;">📦</span>`;
      const codeLine=l.productCode?`<div style="font-size:10px;color:var(--text-secondary);font-weight:600;margin-top:1px;white-space:nowrap;">${esc(l.productCode)}</div>`:'';
      const memoRow=l.memo?`<div style="font-size:11px;color:var(--text-secondary);padding:3px 0 0;border-top:1px solid var(--gray-border);margin-top:4px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">📝 ${esc(l.memo)}</div>`:'';
      const onClickHandler=`if(this.closest('.sli-wrap').dataset.swiped){this.style.transition='transform 0.2s';this.style.transform='translateX(0)';delete this.closest('.sli-wrap').dataset.swiped;return;}App.navigate('sale-detail',{id:'${l.id}'},'売上詳細')`;

      if(itemMode==='simple'){
        // シンプル表示
        return `<div class="sli-wrap" data-id="${l.id}">
          <div class="sli-swipe-actions">
            <button class="sli-act-btn sli-act-dup" onclick="App._dupSale('${l.id}')"><span class="sli-act-icon">⎘</span>複製</button>
            <button class="sli-act-btn sli-act-memo" onclick="App._editSaleMemo('${l.id}')"><span class="sli-act-icon">📝</span>メモ</button>
          </div>
          <div class="sli-simple sli" onclick="${onClickHandler}">
            <div class="sli-simple-thumb">${thumb}</div>
            <div class="sli-simple-body">
              <div class="sli-simple-name">${esc(l.productName)}</div>
              ${codeLine}
              <div class="sli-simple-sub">
                <span>${fmtDate(l.saleDate)}</span>
                <span class="platform-badge" style="${platformBadgeStyle(l.platform)};font-size:10px;padding:1px 6px;">${p.name}</span>
                ${l.memo?`<span style="color:var(--text-secondary);">📝</span>`:''}
              </div>
            </div>
            <div class="sli-simple-right">
              <div class="sli-simple-profit" style="color:${profit>=0?'var(--success)':'var(--danger)'};">${yen(profit)}</div>
              <div class="sli-simple-price">${yen(l.salePrice)}</div>
              <div style="margin-top:3px;">
                <button class="sli-status-btn ${l.status}" onclick="event.stopPropagation();App._showStatusPopupSale('${l.id}')" style="font-size:10px;padding:2px 7px;">${st.label}</button>
              </div>
            </div>
          </div>
        </div>`;
      }

      // 詳細表示
      return `<div class="sli-wrap" data-id="${l.id}">
        <div class="sli-swipe-actions">
          <button class="sli-act-btn sli-act-dup" onclick="App._dupSale('${l.id}')"><span class="sli-act-icon">⎘</span>複製</button>
          <button class="sli-act-btn sli-act-memo" onclick="App._editSaleMemo('${l.id}')"><span class="sli-act-icon">📝</span>メモ</button>
        </div>
        <div class="sli" onclick="${onClickHandler}">
          <div class="sli-thumb">${thumb}</div>
          <div class="sli-body">
            <div class="sli-top">
              <div style="flex:1;min-width:0;">
                <div class="sli-name">${esc(l.productName)}</div>
                ${codeLine}
              </div>
              <div style="display:flex;align-items:center;gap:4px;flex-shrink:0;">
                <button class="sli-status-btn ${l.status}" onclick="event.stopPropagation();App._showStatusPopupSale('${l.id}')">${st.label}</button>
                <button style="color:var(--text-secondary);font-size:18px;padding:2px 6px;line-height:1;border-radius:6px;background:none;" onclick="event.stopPropagation();App._showSaleActions('${l.id}')">⋯</button>
              </div>
            </div>
            <div class="sli-date">
              ${fmtDate(l.saleDate)}
              <span class="platform-badge" style="${platformBadgeStyle(l.platform)};font-size:10px;padding:1px 7px;margin-left:5px;">${p.name}</span>
            </div>
            <div class="sli-nums">
              <span class="sli-num"><span class="sli-lbl">販売</span><span class="sli-val">${yen(l.salePrice)}</span></span>
              <span class="sli-num"><span class="sli-lbl">仕入</span><span class="sli-val">${yen(l.purchasePrice||0)}</span></span>
              <span class="sli-num"><span class="sli-lbl">利益</span><span class="sli-val" style="color:${profit>=0?'var(--success)':'var(--danger)'};">${yen(profit)}</span></span>
            </div>
            <div class="sli-nums">
              <span class="sli-num"><span class="sli-lbl">送料</span><span class="sli-val">${yen(l.shipping||0)}</span></span>
              <span class="sli-num"><span class="sli-lbl">手数料</span><span class="sli-val">${yen(l.fee||0)}</span></span>
              <span class="sli-num"><span class="sli-lbl">利益率</span><span class="sli-val">${roi}%</span></span>
            </div>
            ${memoRow}
          </div>
        </div>
      </div>`;
    }

    function buildGroups(list){
      if(sortMode==='platform'){
        // プラットフォーム別グループ
        const groups={};
        list.forEach(l=>{
          const p=getPlatform(l.platform);
          if(!groups[l.platform])groups[l.platform]={label:p.name,color:p.color,items:[]};
          groups[l.platform].items.push(l);
        });
        const pfOrder=PLATFORMS.map(p=>p.key);
        const sortedKeys=[...pfOrder.filter(k=>groups[k]),...Object.keys(groups).filter(k=>!pfOrder.includes(k))];
        return sortedKeys.map(k=>groups[k]).map(g=>
          `<div class="sales-month-hd" style="background:${g.color};">${g.label}（${g.items.length}件）</div>`+
          g.items.map(l=>renderItem(l)).join('')
        ).join('');
      } else {
        // 日付別グループ
        const groups={};
        list.forEach(l=>{
          const d=l.saleDate||todayStr();
          const label=d.replace(/-/g,'/');
          if(!groups[d])groups[d]={label,items:[]};
          groups[d].items.push(l);
        });
        // 既にsortList()でソート済みなのでinsert order維持
        return Object.values(groups).map(g=>
          `<div class="sales-month-hd">${g.label}（${g.items.length}件）</div>`+
          g.items.map(l=>renderItem(l)).join('')
        ).join('');
      }
    }

    function renderList(){
      if(viewMode==='calendar'){renderCalendar();return;}

      const list=filtered();
      renderStats();
      const countEl=document.getElementById('__sales-count');
      if(countEl) countEl.textContent=`${list.length}件`;

      // 一括完了ボタンの件数更新
      const bulkBtn=document.getElementById('__bulk-ship-btn');
      if(bulkBtn){
        if(list.length>0&&filterStatus==='active'){
          bulkBtn.textContent=`✅ ${list.length}件を全て取引完了にする`;
          bulkBtn.parentElement.classList.remove('hidden');
        } else {
          bulkBtn.parentElement.classList.add('hidden');
        }
      }

      const body=document.getElementById('__sales-body');if(!body)return;
      if(!list.length){
        body.innerHTML=filterStatus==='active'
          ?`<div class="empty-state"><div class="empty-icon">🎉</div><p>発送待ちの商品はありません</p><small>全て完了しています</small></div>`
          :`<div class="empty-state"><div class="empty-icon">💴</div><p>売上がありません</p></div>`;
        return;
      }
      body.innerHTML=buildGroups(list);
      setupSalesSwipe();
    }

    function renderCalendar(){
      const list=filtered();
      const body=document.getElementById('__sales-body');if(!body)return;
      // 一括完了バー非表示
      const bulkWrap=document.getElementById('__bulk-ship-wrap');
      if(bulkWrap)bulkWrap.classList.add('hidden');

      // 日付マップ構築
      const dateMap={};
      list.forEach(l=>{
        let key;
        if(calDateBasis==='createdAt'){
          const d=new Date(l.createdAt);
          key=`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
        } else {
          key=l.saleDate||todayStr();
        }
        if(!dateMap[key])dateMap[key]=[];
        dateMap[key].push(l);
      });

      const firstDay=new Date(calYear,calMonth,1);
      const lastDay=new Date(calYear,calMonth+1,0);
      const startDow=firstDay.getDay();
      const totalDays=lastDay.getDate();
      const todayKey=todayStr();
      const DOWS=['日','月','火','水','木','金','土'];
      const basisLabels={saleDate:'取引日',createdAt:'作成日'};

      let cells='';
      for(let i=0;i<startDow;i++) cells+=`<div class="cal-cell"></div>`;
      for(let d=1;d<=totalDays;d++){
        const dateStr=`${calYear}-${String(calMonth+1).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
        const isToday=dateStr===todayKey;
        const isSel=dateStr===calSelectedDate;
        const hasData=!!(dateMap[dateStr]?.length);
        const dow=(startDow+d-1)%7;
        cells+=`<div class="cal-cell ${isToday?'today':''} ${isSel?'selected':''} ${dow===0?'sun':''} ${dow===6?'sat':''}" onclick="App._calSelect('${dateStr}')">
          <div class="cal-day-num">${d}</div>
          ${hasData?`<div class="cal-dot"></div>`:`<div style="width:5px;height:5px;"></div>`}
        </div>`;
      }

      const selItems=calSelectedDate?(dateMap[calSelectedDate]||[]):[];
      body.innerHTML=`
        <div class="cal-wrap">
          <div class="cal-nav">
            <button class="cal-nav-btn" onclick="App._calNav(-1)">‹</button>
            <div style="display:flex;align-items:center;">
              <span class="cal-title">${calYear}年${calMonth+1}月</span>
              <button class="cal-today-btn" onclick="App._calToday()">今日</button>
            </div>
            <button class="cal-nav-btn" onclick="App._calNav(1)">›</button>
          </div>
          <div style="display:flex;align-items:center;padding:2px 14px 6px;">
            <span style="font-size:11px;color:var(--text-secondary);">基準日：</span>
            <button class="cal-basis-btn" onclick="App._calBasisSheet()">${basisLabels[calDateBasis]||calDateBasis} ▾</button>
          </div>
          <div class="cal-grid">
            ${DOWS.map(d=>`<div class="cal-dow">${d}</div>`).join('')}
            ${cells}
          </div>
        </div>
        <div class="cal-selected-hd">
          ${calSelectedDate?`${calSelectedDate.replace(/-/g,'/')} の取引（${selItems.length}件）`:'日付をタップして取引を確認'}
        </div>
        ${selItems.length?selItems.map(l=>renderItem(l)).join(''):calSelectedDate?`<div class="empty-state" style="min-height:60px;padding:20px;"><p style="font-size:13px;">この日の取引はありません</p></div>`:''}
      `;
      setupSalesSwipe();
    }

    function setupSalesSwipe(){
      const body=document.getElementById('__sales-body');if(!body)return;
      let touchStartX=0,touchStartY=0,activeWrap=null,startTransX=0,isHoriz=null;
      body.addEventListener('touchstart',e=>{
        const wrap=e.target.closest('.sli-wrap');
        // Close other open items
        body.querySelectorAll('.sli-wrap[data-swiped]').forEach(w=>{
          if(w!==wrap){const s=w.querySelector('.sli');if(s){s.style.transition='transform 0.2s';s.style.transform='translateX(0)';}delete w.dataset.swiped;}
        });
        if(!wrap)return;
        touchStartX=e.touches[0].clientX;
        touchStartY=e.touches[0].clientY;
        activeWrap=wrap;
        startTransX=wrap.dataset.swiped?120:0;
        isHoriz=null;
        const sli=wrap.querySelector('.sli');if(sli)sli.style.transition='none';
      },{passive:true});
      body.addEventListener('touchmove',e=>{
        if(!activeWrap)return;
        const dx=e.touches[0].clientX-touchStartX;
        const dy=e.touches[0].clientY-touchStartY;
        if(isHoriz===null)isHoriz=Math.abs(dx)>Math.abs(dy)+3;
        if(!isHoriz)return;
        e.preventDefault();
        const newX=Math.max(0,Math.min(120,startTransX+dx));
        const sli=activeWrap.querySelector('.sli');
        if(sli)sli.style.transform=`translateX(${newX}px)`;
      },{passive:false});
      body.addEventListener('touchend',e=>{
        if(!activeWrap||!isHoriz){activeWrap=null;return;}
        const dx=e.changedTouches[0].clientX-touchStartX;
        const finalX=startTransX+dx;
        const sli=activeWrap.querySelector('.sli');
        if(sli)sli.style.transition='transform 0.2s';
        if(finalX>50){
          if(sli)sli.style.transform='translateX(120px)';
          activeWrap.dataset.swiped='1';
        } else {
          if(sli)sli.style.transform='translateX(0)';
          delete activeWrap.dataset.swiped;
        }
        activeWrap=null;
      },{passive:true});
    }

    function setFilterLabel(){
      const btn=document.getElementById('__sales-filter-btn');
      if(btn) btn.innerHTML=`${FILTER_OPTS.find(f=>f.key===filterStatus)?.label||'発送待ち'} <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor"><path d="M7 10l5 5 5-5z"/></svg>`;
    }
    function setSortLabel(){
      const btn=document.getElementById('__sales-sort-btn');
      if(btn) btn.innerHTML=`↕ ${SORT_OPTS.find(s=>s.key===sortMode)?.label||'売れた順'}`;
    }

    main.innerHTML=`
      <div class="sales-top-wrap">
        <div class="search-bar" style="padding:8px 12px 6px;">
          <div class="search-wrap">
            <svg viewBox="0 0 24 24"><path d="M15.5 14h-.79l-.28-.27A6.471 6.471 0 0 0 16 9.5 6.5 6.5 0 1 0 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z"/></svg>
            <input class="search-input" id="__sales-search" type="search" placeholder="商品名で探す">
          </div>
        </div>
        <div class="view-toggle-bar">
          <button class="view-toggle-btn active" id="__view-list-btn" onclick="App._salesSetView('list')">リスト</button>
          <button class="view-toggle-btn" id="__view-cal-btn" onclick="App._salesSetView('calendar')">カレンダー</button>
        </div>
        <div id="__sales-list-controls">
          <div style="display:flex;align-items:center;justify-content:space-between;padding:4px 14px 8px;gap:8px;">
            <button id="__sales-filter-btn" class="sales-filter-btn">読み込み中 <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor"><path d="M7 10l5 5 5-5z"/></svg></button>
            <div style="display:flex;align-items:center;gap:6px;">
              <button id="__sales-sort-btn" class="grid-sort-btn" style="white-space:nowrap;">↕ 売れた順</button>
              <span id="__sales-count" style="font-size:12px;color:var(--text-secondary);white-space:nowrap;">0件</span>
            </div>
          </div>
          <div id="__sales-stats" style="padding:0 14px 10px;border-top:1px solid var(--gray-border);"></div>
        </div>
      </div>
      <!-- 一括取引完了バー -->
      <div id="__bulk-ship-wrap" class="bulk-ship-wrap hidden">
        <button id="__bulk-ship-btn" class="bulk-ship-btn" onclick="App._bulkComplete()">✅ 0件を全て取引完了にする</button>
      </div>
      <div id="__sales-body"></div>
      <div style="height:70px;"></div>`;

    renderList();
    setFilterLabel(); // 前回のフィルター状態でラベルを初期化

    document.getElementById('__sales-search')?.addEventListener('input',e=>{searchQ=e.target.value.trim();renderList();});

    document.getElementById('__sales-filter-btn')?.addEventListener('click',()=>{
      const ov=document.createElement('div');ov.className='status-popup-overlay';
      ov.innerHTML=`<div class="status-popup">
        <div style="padding:12px 16px;font-weight:700;font-size:15px;text-align:center;border-bottom:1px solid var(--gray-border);">表示する商品</div>
        ${FILTER_OPTS.map(f=>`<button class="status-popup-item ${filterStatus===f.key?'active':''}" data-key="${f.key}">${f.label}</button>`).join('')}
      </div>`;
      document.body.appendChild(ov);
      ov.addEventListener('click',e=>{
        const btn=e.target.closest('.status-popup-item');
        if(btn){filterStatus=btn.dataset.key;_salesFilterStatus=filterStatus;db.put('settings',{key:'salesFilterStatus',value:_salesFilterStatus});setFilterLabel();renderList();}
        ov.remove();
      });
    });

    document.getElementById('__sales-sort-btn')?.addEventListener('click',()=>{
      const ov=document.createElement('div');ov.className='status-popup-overlay';
      ov.innerHTML=`<div class="status-popup">
        <div style="padding:12px 16px;font-weight:700;font-size:15px;text-align:center;border-bottom:1px solid var(--gray-border);">並び替え</div>
        ${SORT_OPTS.map(s=>`<button class="status-popup-item ${sortMode===s.key?'active':''}" data-key="${s.key}">${s.label}</button>`).join('')}
      </div>`;
      document.body.appendChild(ov);
      ov.addEventListener('click',e=>{
        const btn=e.target.closest('.status-popup-item');
        if(btn){sortMode=btn.dataset.key;setSortLabel();renderList();}
        ov.remove();
      });
    });

    App._showStatusPopupSale=async lid=>{
      const ov=document.createElement('div');ov.className='status-popup-overlay';
      const sale=await db.get('listings',lid);
      // よく使う3つを上に、その他を下に
      const main3=['payment','shipping','completed'];
      const others=LISTING_STATUSES.filter(s=>!main3.includes(s.key));
      const main3Items=LISTING_STATUSES.filter(s=>main3.includes(s.key));
      ov.innerHTML=`<div class="status-popup-lg">
        <div style="font-size:11px;color:var(--text-secondary);text-align:center;padding:4px 0 2px;">よく使う</div>
        ${main3Items.map(s=>`<button class="status-btn-lg ${sale?.status===s.key?'active':''}" data-key="${s.key}">${s.label}</button>`).join('')}
        <div style="font-size:11px;color:var(--text-secondary);text-align:center;padding:6px 0 2px;border-top:1px solid var(--gray-border);margin-top:4px;">その他</div>
        ${others.map(s=>`<button class="status-btn-lg ${sale?.status===s.key?'active':''}" data-key="${s.key}" style="font-size:13px;padding:10px;">${s.label}</button>`).join('')}
      </div>`;
      document.body.appendChild(ov);
      ov.addEventListener('click',e=>{
        const btn=e.target.closest('.status-btn-lg');
        if(btn){
          db.get('listings',lid).then(s=>{
            if(!s)return;
            s.status=btn.dataset.key;
            db.put('listings',s).then(()=>{
              const idx=listings.findIndex(x=>x.id===lid);
              if(idx>=0)listings[idx]=s;
              toast(STATUS_MAP[btn.dataset.key]?.label+'にしました');
              renderList();
            });
          });
        }
        ov.remove();
      });
    };

    App._salesSettingsSheet=()=>{
      const ov=document.createElement('div');ov.className='status-popup-overlay';ov.style.alignItems='flex-end';
      ov.innerHTML=`<div class="outbound-sheet" style="padding-bottom:24px;">
        <h3 style="margin-bottom:16px;">売上管理表の設定</h3>
        <div style="font-size:12px;color:var(--text-secondary);margin-bottom:8px;">表示形式</div>
        <div style="display:flex;gap:8px;margin-bottom:20px;">
          <button data-mode="simple" class="btn ${itemMode==='simple'?'btn-primary':'btn-gray'} btn-full" style="font-size:14px;">シンプル</button>
          <button data-mode="detail" class="btn ${itemMode==='detail'?'btn-primary':'btn-gray'} btn-full" style="font-size:14px;">詳細</button>
        </div>
        <div style="font-size:12px;color:var(--text-secondary);margin-bottom:8px;">CSV出力</div>
        <div style="display:flex;flex-direction:column;gap:6px;margin-bottom:16px;">
          <button id="__sheet-csv-cur" class="btn btn-outline-red btn-full" style="font-size:13px;">📊 現在の表示でCSV</button>
          <button id="__sheet-csv-month" class="btn btn-outline-red btn-full" style="font-size:13px;">📊 月別CSV出力</button>
          <button id="__sheet-csv-year" class="btn btn-outline-red btn-full" style="font-size:13px;">📊 年別CSV出力</button>
          <button id="__sheet-csv-custom" class="btn btn-outline-red btn-full" style="font-size:13px;">📊 期間指定CSV出力</button>
        </div>
        <button class="btn btn-gray btn-full" onclick="this.closest('.status-popup-overlay').remove()">閉じる</button>
      </div>`;
      document.body.appendChild(ov);
      ov.addEventListener('click',e=>{
        const modeBtn=e.target.closest('[data-mode]');
        if(modeBtn){itemMode=modeBtn.dataset.mode;_salesItemMode=itemMode;db.put('settings',{key:'salesItemMode',value:_salesItemMode});ov.remove();renderList();return;}
        if(e.target===ov)ov.remove();
      });
      ov.querySelector('#__sheet-csv-cur').onclick=()=>{App._exportSalesCSV(filtered());ov.remove();};
      ov.querySelector('#__sheet-csv-month').onclick=()=>{ov.remove();App._csvByPeriod('month');};
      ov.querySelector('#__sheet-csv-year').onclick=()=>{ov.remove();App._csvByPeriod('year');};
      ov.querySelector('#__sheet-csv-custom').onclick=()=>{ov.remove();App._csvByPeriod('custom');};
    };

    App._toggleSel=()=>{};
    App._completeSale=async lid=>{
      const l=await db.get('listings',lid);if(!l)return;
      l.status='completed';await db.put('listings',l);
      const idx=listings.findIndex(x=>x.id===lid);if(idx>=0)listings[idx]=l;
      toast('取引完了にしました');renderList();
    };
    App._bulkComplete=async()=>{
      const list=filtered();
      if(!list.length)return;
      const ok=await confirmDialog(`発送待ち ${list.length}件を全て取引完了にしますか？\nこの操作で全件が画面から消えます。`,'全て完了','btn-success');
      if(!ok)return;
      for(const l of list){
        l.status='completed';await db.put('listings',l);
        const idx=listings.findIndex(x=>x.id===l.id);if(idx>=0)listings[idx]=l;
      }
      toast(`✅ ${list.length}件を取引完了にしました`);
      renderList();
    };

    App._salesSetView=mode=>{
      viewMode=mode;_salesViewMode=mode;
      db.put('settings',{key:'salesViewMode',value:mode});
      document.getElementById('__view-list-btn')?.classList.toggle('active',mode==='list');
      document.getElementById('__view-cal-btn')?.classList.toggle('active',mode==='calendar');
      const ctrl=document.getElementById('__sales-list-controls');
      if(ctrl)ctrl.style.display=mode==='list'?'':'none';
      renderList();
    };

    App._calNav=dir=>{
      calMonth+=dir;
      if(calMonth<0){calMonth=11;calYear--;}
      if(calMonth>11){calMonth=0;calYear++;}
      calSelectedDate=null;renderCalendar();
    };
    App._calToday=()=>{
      const now=new Date();calYear=now.getFullYear();calMonth=now.getMonth();
      calSelectedDate=null;renderCalendar();
    };
    App._calSelect=dateStr=>{
      calSelectedDate=calSelectedDate===dateStr?null:dateStr;
      renderCalendar();
    };
    App._calBasisSheet=()=>{
      const ov=document.createElement('div');ov.className='status-popup-overlay';
      const opts=[{key:'saleDate',label:'取引日（売れた日）'},{key:'createdAt',label:'作成日'}];
      ov.innerHTML=`<div class="status-popup">
        <div style="padding:12px;font-weight:700;text-align:center;font-size:14px;border-bottom:1px solid var(--gray-border);">基準日を選択</div>
        ${opts.map(o=>`<button class="status-popup-item ${calDateBasis===o.key?'active':''}" data-key="${o.key}">${o.label}</button>`).join('')}
      </div>`;
      document.body.appendChild(ov);
      ov.addEventListener('click',e=>{
        const btn=e.target.closest('.status-popup-item');
        if(btn){calDateBasis=btn.dataset.key;renderCalendar();}
        ov.remove();
      });
    };

    App._dupSale=async id=>{
      const orig=await db.get('listings',id);if(!orig)return;
      const copy={...orig,id:uid(),createdAt:Date.now()};
      await db.put('listings',copy);
      listings.unshift(copy);
      // 閉じる
      const wrap=document.querySelector(`.sli-wrap[data-id="${id}"]`);
      if(wrap){const s=wrap.querySelector('.sli');if(s){s.style.transition='transform 0.2s';s.style.transform='translateX(0)';}delete wrap.dataset.swiped;}
      toast('複製しました');renderList();
    };

    App._showSaleActions=id=>{
      const ov=document.createElement('div');ov.className='status-popup-overlay';
      ov.innerHTML=`<div class="status-popup">
        <div style="padding:12px 16px;font-weight:700;font-size:14px;text-align:center;border-bottom:1px solid var(--gray-border);">操作を選択</div>
        <button class="status-popup-item" data-action="dup">⎘ 複製する</button>
        <button class="status-popup-item" data-action="memo">📝 メモを編集</button>
      </div>`;
      document.body.appendChild(ov);
      ov.addEventListener('click',e=>{
        const btn=e.target.closest('.status-popup-item');
        if(btn){
          if(btn.dataset.action==='dup') App._dupSale(id);
          else App._editSaleMemo(id);
        }
        ov.remove();
      });
    };

    App._editSaleMemo=async id=>{
      const sale=await db.get('listings',id);if(!sale)return;
      // スワイプを閉じる
      const wrap=document.querySelector(`.sli-wrap[data-id="${id}"]`);
      if(wrap){const s=wrap.querySelector('.sli');if(s){s.style.transition='transform 0.2s';s.style.transform='translateX(0)';}delete wrap.dataset.swiped;}
      const ov=document.createElement('div');ov.className='status-popup-overlay';ov.style.alignItems='flex-end';
      ov.innerHTML=`<div class="outbound-sheet">
        <h3>メモを編集</h3>
        <div style="font-size:13px;color:var(--text-secondary);text-align:center;margin-bottom:12px;">${esc(sale.productName)}</div>
        <textarea id="__memo-edit-ta" style="width:100%;border:1.5px solid var(--gray-border);border-radius:10px;padding:10px;font-size:14px;min-height:90px;resize:none;outline:none;" placeholder="メモを入力...">${esc(sale.memo||'')}</textarea>
        <div style="display:flex;gap:10px;margin-top:12px;">
          <button class="btn btn-gray btn-full" onclick="this.closest('.status-popup-overlay').remove()">キャンセル</button>
          <button class="btn btn-primary btn-full" id="__memo-save-btn">保存</button>
        </div>
      </div>`;
      document.body.appendChild(ov);
      ov.addEventListener('click',e=>{if(e.target===ov)ov.remove();});
      setTimeout(()=>ov.querySelector('#__memo-edit-ta')?.focus(),100);
      ov.querySelector('#__memo-save-btn').onclick=async()=>{
        const newMemo=ov.querySelector('#__memo-edit-ta')?.value?.trim()||'';
        sale.memo=newMemo;
        await db.put('listings',sale);
        const idx=listings.findIndex(x=>x.id===id);if(idx>=0)listings[idx]=sale;
        ov.remove();
        toast('メモを保存しました');renderList();
      };
    };
  }

  // =====================================================================
  // SALE DETAIL
  // =====================================================================
  async function pgSaleDetail(main,{id}){
    const l=await db.get('listings',id);
    if(!l){main.innerHTML='<div class="empty-state"><p>見つかりません</p></div>';return;}
    const p=getPlatform(l.platform),st=STATUS_MAP[l.status]||STATUS_MAP.completed,profit=Number(l.profit)||0;
    main.innerHTML=`
    <div class="page-pad" style="background:var(--gray-light);">
      <div style="background:var(--white);padding:14px 16px;margin-bottom:10px;">
        <div style="display:flex;align-items:center;gap:8px;margin-bottom:6px;">
          <span class="platform-badge" style="${platformBadgeStyle(l.platform)}">${p.name}</span>
          <span class="badge ${st.badge}">${st.label}</span>
          <span style="flex:1;"></span>
          <button class="btn btn-gray btn-sm" onclick="App.navigate('sale-form',{editId:'${id}'},'売上を編集')" style="padding:6px 14px;font-size:13px;">✏️ 編集</button>
        </div>
        <div style="font-size:16px;font-weight:700;">${esc(l.productName)}</div>
        ${l.productCode?`<div style="font-size:11px;color:var(--text-secondary);margin-top:2px;">管理番号: ${esc(l.productCode)}</div>`:''}
        <div style="font-size:12px;color:var(--text-secondary);margin-top:4px;">${fmtDate(l.saleDate)}</div>
      </div>
      <div style="background:var(--white);margin-bottom:10px;">
        <div class="profit-row"><span class="p-label">売値</span><span class="p-value">${yen(l.salePrice)}</span></div>
        <div class="profit-row"><span class="p-label">仕入額</span><span class="p-value">−${yen(l.purchasePrice||0)}</span></div>
        <div class="profit-row"><span class="p-label">手数料（${((l.feeRate||0)*100).toFixed(1)}%）</span><span class="p-value">−${yen(l.fee)}</span></div>
        <div class="profit-row"><span class="p-label">送料</span><span class="p-value">−${yen(l.shipping)}</span></div>
        <div class="profit-row total"><span class="p-label">純利益</span><span class="p-value ${profit>=0?'plus':'minus'}">${yen(profit)}</span></div>
        <div class="profit-row"><span class="p-label">利益率</span><span class="p-value">${l.salePrice>0?(profit/l.salePrice*100).toFixed(1):'0.0'}%</span></div>
      </div>
      ${l.memo?`<div style="background:var(--white);padding:12px 16px;margin-bottom:10px;font-size:14px;white-space:pre-wrap;">📝 ${esc(l.memo)}</div>`:''}
      <div style="padding:0 12px;display:flex;flex-direction:column;gap:8px;margin-bottom:16px;">
        ${['payment','shipping','review','listing'].includes(l.status)?`<button class="btn btn-success btn-full" onclick="App._completeFromDetail('${id}')">取引完了にする</button>`:''}
        <button class="btn btn-outline-red btn-full btn-sm" onclick="App._showStatusPopupSale('${id}')">ステータスを変更</button>
        <button class="btn btn-full btn-sm" style="color:var(--danger);border:1.5px solid var(--danger);background:transparent;" onclick="App._deleteSale('${id}')">削除</button>
      </div>
    </div>`;
    App._completeFromDetail=async sid=>{const sale=await db.get('listings',sid);if(!sale)return;sale.status='completed';await db.put('listings',sale);toast('取引完了にしました');await _render('sale-detail',{id:sid},'売上詳細');};
    App._showStatusPopupSale=async lid=>{
      const overlay=document.createElement('div');overlay.className='status-popup-overlay';
      const sale=await db.get('listings',lid);
      overlay.innerHTML=`<div class="status-popup">${LISTING_STATUSES.map(s=>`<button class="status-popup-item ${sale?.status===s.key?'active':''}" data-key="${s.key}">${s.label}</button>`).join('')}</div>`;
      document.body.appendChild(overlay);
      overlay.onclick=e=>{const btn=e.target.closest('.status-popup-item');if(btn){db.get('listings',lid).then(s=>{if(s){s.status=btn.dataset.key;db.put('listings',s).then(()=>{toast(STATUS_MAP[btn.dataset.key]?.label+'にしました');_render('sale-detail',{id:lid},'売上詳細');});}});}overlay.remove();};
    };
    App._deleteSale=async sid=>{const ok=await confirmDialog('この売上を削除しますか？');if(!ok)return;await db.delete('listings',sid);toast('削除しました');pageStack.pop();pageStack.pop();await _render('sales',{},'売上管理表');};
  }

  // =====================================================================
  // SALE FORM
  // =====================================================================
  async function pgSaleForm(main,{productId,productName,purchasePrice,editId}={}){
    _selPlatform='mercari';
    const products=await db.getAll('products');
    const editSale=editId?await db.get('listings',editId):null;
    if(editSale){
      productId=editSale.productId||'';
      productName=editSale.productName||'';
      purchasePrice=editSale.purchasePrice||0;
      _selPlatform=editSale.platform||'mercari';
    }

    function updateCalc(){
      const sp=Number(document.getElementById('f-salePrice')?.value)||0;
      const pp=Number(document.getElementById('f-purchasePrice')?.value)||0;
      const rate=(Number(document.getElementById('f-feeRate')?.value)||0)/100;
      const fee=Math.floor(sp*rate);
      const el=document.getElementById('f-fee');if(el)el.value=fee;
      const sh=Number(document.getElementById('f-shipping')?.value)||0;
      const profit=sp-pp-fee-sh;
      const pel=document.getElementById('__calc-profit');
      if(pel){pel.textContent=yen(profit);pel.style.color=profit>=0?'var(--success)':'var(--danger)';}
    }

    function selectPlatform(key){
      _selPlatform=key;
      const p=getPlatform(key);
      document.querySelectorAll('.platform-btn').forEach(b=>{
        const isSel=b.dataset.platform===key;
        b.classList.toggle('selected',isSel);
        if(isSel){b.style.background=p.color;b.style.color=isLightColor(p.color)?'#000':'#fff';b.style.borderColor=p.color;}
        else{b.style.background='';b.style.color='';b.style.borderColor='';}
      });
      const feeEl=document.getElementById('f-feeRate');if(feeEl)feeEl.value=p.feeRate;
      const presets=getShippingPresets(key);
      const sel=document.getElementById('f-shipping-preset');
      if(sel)sel.innerHTML=`<option value="">送料を選択</option>`+presets.map(p=>`<option value="${p.price}">${p.label}${p.price>0?'（'+yen(p.price)+'）':''}</option>`).join('');
      updateCalc();
    }
    App._selectPlatformSale=selectPlatform;
    App._updateCalc=updateCalc;

    main.innerHTML=`
    <div class="page-pad" style="background:var(--gray-light);">
      <div class="section-hd">プラットフォーム</div>
      <div class="platform-grid">
        ${PLATFORMS.map(p=>`<button class="platform-btn ${p.key==='mercari'?'selected':''}" data-platform="${p.key}" onclick="App._selectPlatformSale('${p.key}')" style="${p.key==='mercari'?'background:'+p.color+';color:'+(isLightColor(p.color)?'#000':'#fff')+';border-color:'+p.color+';':''}">${p.name}</button>`).join('')}
      </div>
      <div class="form-group">
        <div class="form-row">
          <label class="form-label required">商品</label>
          <select class="form-select" id="f-product" onchange="App._onProdSel(this)">
            <option value="">商品を選択</option>
            ${productId?`<option value="${productId}|${esc(productName||'')}|${purchasePrice||0}" selected>${esc(productName||'')}</option>`:''}
            ${products.filter(p=>p.id!==productId).map(p=>`<option value="${p.id}|${esc(p.name)}|${p.purchasePrice||0}">${esc(p.sku?p.sku+' ':'')}${esc(p.name)}</option>`).join('')}
            <option value="__manual__">＋ 直接入力</option>
          </select>
        </div>
        <div class="form-row hidden" id="__manual-row"><label class="form-label">商品名</label><input class="form-input" id="f-manual-name" type="text" placeholder="商品名を入力"></div>
      </div>
      <div class="form-group">
        <div class="form-row"><label class="form-label required">売値</label><input class="form-input" id="f-salePrice" type="number" inputmode="numeric" placeholder="0" value="${editSale?.salePrice||''}" oninput="App._updateCalc()"><span class="form-suffix">円</span></div>
        <div class="form-row"><label class="form-label">仕入額</label><input class="form-input" id="f-purchasePrice" type="number" inputmode="numeric" placeholder="0" oninput="App._updateCalc()" value="${editSale?.purchasePrice??purchasePrice??''}"><span class="form-suffix">円</span></div>
        <div class="form-row"><label class="form-label">手数料率</label><input class="form-input" id="f-feeRate" type="number" inputmode="numeric" value="${editSale?((editSale.feeRate||0)*100):10}" oninput="App._updateCalc()"><span class="form-suffix">%（変更可）</span></div>
        <div class="form-row"><label class="form-label">手数料</label><input class="form-input" id="f-fee" type="number" inputmode="numeric" placeholder="自動計算" value="${editSale?.fee??''}" oninput="App._updateCalc()"><span class="form-suffix">円</span></div>
      </div>
      <div class="form-group">
        <div class="form-row" style="flex-direction:column;align-items:flex-start;gap:8px;padding:10px 16px;">
          <label class="form-label">送料プリセット</label>
          <div class="shipping-shortcuts">
            ${SHIPPING_SHORTCUTS.map(s=>`<button type="button" class="shipping-sc-btn ${editSale&&editSale.shipping===s.price?'selected':''}" onclick="App._selShortcut(${s.price},this)">${s.label}${s.price>0?' ¥'+s.price:''}</button>`).join('')}
          </div>
        </div>
        <div class="form-row"><label class="form-label">送料（円）</label><input class="form-input" id="f-shipping" type="number" inputmode="numeric" placeholder="0" value="${editSale?.shipping??0}" oninput="App._updateCalc()"><span class="form-suffix">円</span></div>
      </div>
      <div style="background:var(--white);padding:14px 16px;margin-bottom:10px;display:flex;justify-content:space-between;align-items:center;">
        <span style="font-size:15px;font-weight:600;">純利益（概算）</span>
        <span id="__calc-profit" style="font-size:18px;font-weight:700;color:var(--success);">¥0</span>
      </div>
      <div class="form-group">
        <div class="form-row"><label class="form-label">売れた日</label><input class="form-input" id="f-saleDate" type="date" value="${editSale?.saleDate||todayStr()}"></div>
        <div class="form-row"><label class="form-label">ステータス</label>
          <select class="form-select" id="f-status">
            ${LISTING_STATUSES.map(s=>`<option value="${s.key}" ${(editSale?editSale.status===s.key:s.key==='completed')?'selected':''}>${s.label}</option>`).join('')}
          </select>
        </div>
        <div class="form-row" style="align-items:flex-start;padding-top:8px;"><label class="form-label" style="padding-top:4px;">メモ</label><textarea class="form-textarea" id="f-memo" placeholder="メモ">${esc(editSale?.memo||'')}</textarea></div>
      </div>
      ${editId?`<div style="padding:12px;"><button class="btn btn-full btn-sm" style="color:var(--danger);border:1.5px solid var(--danger);background:transparent;" onclick="App._deleteSale('${editId}')">この売上を削除</button></div>`:''}
      <button id="__save-sale" style="display:none;" onclick="App._saveSale('${editId||''}')"></button>
    </div>`;

    selectPlatform(_selPlatform||'mercari');
    App._onProdSel=sel=>{
      const v=sel.value;const row=document.getElementById('__manual-row');
      if(v==='__manual__') row?.classList.remove('hidden');
      else{row?.classList.add('hidden');if(v){const[,,pp]=v.split('|');const ppEl=document.getElementById('f-purchasePrice');if(ppEl){ppEl.value=pp||'';updateCalc();}}}
    };
    App._onShPreset=sel=>{if(sel.value!==''){const el=document.getElementById('f-shipping');if(el){el.value=sel.value;updateCalc();}}};
    App._selShortcut=(price,btn)=>{
      document.querySelectorAll('.shipping-sc-btn').forEach(b=>b.classList.remove('selected'));
      btn.classList.add('selected');
      const el=document.getElementById('f-shipping');if(el){el.value=price;updateCalc();}
    };
    if(productId){const sel=document.getElementById('f-product');if(sel)for(const o of sel.options)if(o.value.startsWith(productId)){o.selected=true;break;}}
    updateCalc();
  }

  async function _saveSale(editId){
    const spVal=document.getElementById('f-salePrice')?.value;
    if(!spVal||Number(spVal)<=0){toast('売値を入力してください');return;}
    const prodSel=document.getElementById('f-product');
    let productId='',productName='',purchasePrice=0,photo='';
    if(prodSel?.value==='__manual__'){productName=document.getElementById('f-manual-name')?.value?.trim()||'（未設定）';}
    else if(prodSel?.value&&prodSel.value!==''){
      const parts=prodSel.value.split('|');productId=parts[0];productName=parts[1];purchasePrice=Number(parts[2])||0;
      const prod=productId?await db.get('products',productId):null;photo=prod?.photos?.[0]||'';
      if(prod){productName=productName||prod.name;}
    } else{toast('商品を選択してください');return;}
    const salePrice=Number(spVal)||0;
    const pp=Number(document.getElementById('f-purchasePrice')?.value)||purchasePrice||0;
    const feeRate=(Number(document.getElementById('f-feeRate')?.value)||0)/100;
    const fee=Number(document.getElementById('f-fee')?.value)||Math.floor(salePrice*feeRate);
    const shipping=Number(document.getElementById('f-shipping')?.value)||0;
    const profit=salePrice-pp-fee-shipping;

    if(editId){
      // 編集モード: 既存データを更新
      const existing=await db.get('listings',editId);
      if(!existing){toast('売上データが見つかりません');return;}
      const updated={
        ...existing,
        productId,productName,
        photo:photo||existing.photo||'',
        platform:_selPlatform||existing.platform||'mercari',
        salePrice,purchasePrice:pp,
        feeRate,fee,shipping,profit,
        saleDate:document.getElementById('f-saleDate')?.value||existing.saleDate||todayStr(),
        status:document.getElementById('f-status')?.value||existing.status||'completed',
        memo:document.getElementById('f-memo')?.value?.trim()||'',
        updatedAt:Date.now(),
      };
      await db.put('listings',updated);
      toast('売上を更新しました');
      pageStack.pop();
      await _render('sale-detail',{id:editId},'売上詳細');
    } else {
      // 新規作成モード
      const prod=productId?await db.get('products',productId):null;
      const listing={
        id:uid(),productId,productName,photo,
        productTitle:prod?.sku||'',productCode:prod?.code||'',
        platform:_selPlatform||'mercari',salePrice,purchasePrice:pp,
        feeRate,fee,shipping,profit,
        saleDate:document.getElementById('f-saleDate')?.value||todayStr(),
        status:document.getElementById('f-status')?.value||'completed',
        memo:document.getElementById('f-memo')?.value?.trim()||'',
        createdAt:Date.now(),
      };
      await db.put('listings',listing);
      if(listing.status==='completed'&&productId){const p=await db.get('products',productId);if(p){p.stockCount=Math.max(0,(p.stockCount||0)-1);p.updatedAt=Date.now();await db.put('products',p);}}
      toast('売上を記録しました');
      pageStack.pop();await _render('sales',{},'売上管理表');
    }
  }

  // =====================================================================
  // SHIPPING SETTINGS
  // =====================================================================
  async function pgShippingSettings(main,actionBtn){
    actionBtn.className='header-btn pill-btn';actionBtn.textContent='＋追加';
    actionBtn.onclick=()=>_showShippingEditDialog(null);

    async function saveShortcuts(){
      await db.put('settings',{key:'shippingShortcuts',value:SHIPPING_SHORTCUTS});
    }

    async function _showShippingEditDialog(idx){
      const isEdit=idx!=null;
      const item=isEdit?SHIPPING_SHORTCUTS[idx]:null;
      const ov=document.createElement('div');ov.className='status-popup-overlay';
      ov.style.cssText='position:fixed;inset:0;background:rgba(0,0,0,0.5);z-index:9999;display:flex;align-items:center;justify-content:center;';
      ov.innerHTML=`<div style="background:var(--white);border-radius:16px;padding:20px;width:88%;max-width:360px;">
        <div style="font-size:17px;font-weight:700;margin-bottom:16px;">${isEdit?'送料を編集':'送料を追加'}</div>
        <div style="display:flex;flex-direction:column;gap:10px;">
          <div><label style="font-size:13px;color:var(--text-secondary);display:block;margin-bottom:4px;">ラベル名</label>
            <input id="__sh-label" class="form-input" type="text" placeholder="例: 定形" value="${esc(item?.label||'')}" style="width:100%;"></div>
          <div><label style="font-size:13px;color:var(--text-secondary);display:block;margin-bottom:4px;">送料（円）</label>
            <input id="__sh-price" class="form-input" type="number" inputmode="numeric" placeholder="0" value="${item?.price??''}" style="width:100%;"></div>
        </div>
        <div style="display:flex;gap:8px;margin-top:20px;">
          ${isEdit?`<button class="btn btn-sm" style="flex:1;color:var(--danger);border:1px solid var(--danger);background:transparent;" id="__sh-del">削除</button>`:''}
          <button class="btn btn-sm btn-outline" style="flex:1;" id="__sh-cancel">キャンセル</button>
          <button class="btn btn-sm btn-primary" style="flex:1;" id="__sh-save">${isEdit?'保存':'追加'}</button>
        </div>
      </div>`;
      document.body.appendChild(ov);
      ov.querySelector('#__sh-cancel').onclick=()=>ov.remove();
      if(isEdit){
        ov.querySelector('#__sh-del').onclick=async()=>{
          const ok=await confirmDialog('この送料プリセットを削除しますか？');if(!ok)return;
          SHIPPING_SHORTCUTS.splice(idx,1);await saveShortcuts();ov.remove();renderList();
        };
      }
      ov.querySelector('#__sh-save').onclick=async()=>{
        const label=document.getElementById('__sh-label')?.value?.trim();
        const price=Number(document.getElementById('__sh-price')?.value)||0;
        if(!label){toast('ラベル名を入力してください');return;}
        if(isEdit){SHIPPING_SHORTCUTS[idx]={label,price};}
        else{SHIPPING_SHORTCUTS.push({label,price});}
        await saveShortcuts();ov.remove();renderList();
      };
    }

    function renderList(){
      const container=document.getElementById('__sh-list');if(!container)return;
      container.innerHTML=SHIPPING_SHORTCUTS.length===0
        ?`<div class="empty-state"><div class="empty-icon">✉️</div><p>送料プリセットがありません</p></div>`
        :SHIPPING_SHORTCUTS.map((s,i)=>`
        <div style="display:flex;align-items:center;padding:14px 16px;border-bottom:1px solid var(--gray-border);gap:12px;cursor:pointer;" onclick="App._editShipping(${i})">
          <div style="flex:1;"><div style="font-size:15px;font-weight:500;">${esc(s.label)}</div><div style="font-size:12px;color:var(--text-secondary);">${s.price>0?yen(s.price):'送料込み（¥0）'}</div></div>
          <span style="color:#BDBDBD;font-size:18px;">›</span>
        </div>`).join('');
    }

    App._editShipping=(idx)=>_showShippingEditDialog(idx);

    main.innerHTML=`
    <div class="page-pad" style="background:var(--gray-light);">
      <div class="section-hd">送料プリセット一覧</div>
      <div style="background:var(--white);" id="__sh-list"></div>
      <div style="padding:16px;"><button class="btn btn-outline-red btn-full btn-sm" onclick="App._resetShipping()">デフォルトに戻す</button></div>
    </div>`;
    renderList();
  }

  // =====================================================================
  // SETTINGS
  // =====================================================================
  // =====================================================================
  // JAN CODE SETTINGS
  // =====================================================================
  async function pgJanSettings(main, actionBtn) {
    let sortDir = 'asc';

    actionBtn.className = 'header-btn pill-btn';
    actionBtn.textContent = '＋追加';
    actionBtn.onclick = () => showAddDialog();

    function renderList() {
      const sorted = [...JAN_CODES].sort((a, b) => {
        const cmp = (a.number || '').localeCompare(b.number || '', undefined, {numeric: true, sensitivity: 'base'});
        return sortDir === 'asc' ? cmp : -cmp;
      });
      main.innerHTML = `<div class="page-pad" style="background:var(--gray-light);">
        <div style="display:flex;align-items:center;justify-content:space-between;padding:8px 0 12px;">
          <span style="font-size:13px;color:var(--text-secondary);">${JAN_CODES.length}件</span>
          <button id="__jan-sort-btn" class="grid-sort-btn">番号 ${sortDir === 'asc' ? '↑ 昇順' : '↓ 降順'}</button>
        </div>
        ${sorted.length === 0
          ? '<div style="text-align:center;padding:40px 0;color:var(--text-secondary);font-size:14px;">JANコードがありません<br><span style="font-size:12px;">右上の＋追加ボタンで追加できます</span></div>'
          : `<div style="background:var(--white);border-radius:8px;overflow:hidden;">${sorted.map((item, i) => `
            <div style="display:flex;align-items:center;padding:12px 14px;${i > 0 ? 'border-top:1px solid var(--gray-border);' : ''}gap:12px;">
              ${item.photo
                ? `<img src="${item.photo}" style="width:52px;height:52px;object-fit:cover;border-radius:6px;flex-shrink:0;">`
                : '<div style="width:52px;height:52px;border-radius:6px;background:var(--gray-light);flex-shrink:0;display:flex;align-items:center;justify-content:center;font-size:22px;">🏷</div>'}
              <div style="flex:1;font-size:15px;font-weight:500;font-family:monospace;word-break:break-all;">${esc(item.number)}</div>
              <button onclick="App._deleteJanCode('${item.id}')" style="background:none;border:none;color:var(--danger);font-size:22px;padding:4px 10px;cursor:pointer;flex-shrink:0;">✕</button>
            </div>`).join('')}</div>`
        }
      </div>`;
      document.getElementById('__jan-sort-btn')?.addEventListener('click', () => {
        sortDir = sortDir === 'asc' ? 'desc' : 'asc';
        renderList();
      });
    }

    renderList();

    App._deleteJanCode = async id => {
      const ok = await confirmDialog('このJANコードを削除しますか？', '削除', 'btn-danger');
      if (!ok) return;
      JAN_CODES = JAN_CODES.filter(j => j.id !== id);
      await db.put('settings', {key: 'janCodes', value: JAN_CODES});
      toast('削除しました');
      renderList();
    };

    function showAddDialog() {
      const ov = document.createElement('div'); ov.className = 'status-popup-overlay'; ov.style.alignItems = 'flex-end';
      ov.innerHTML = `<div class="outbound-sheet" style="padding-bottom:24px;">
        <h3 style="margin-bottom:16px;">JANコードを追加</h3>
        <div style="margin-bottom:12px;">
          <div style="font-size:12px;color:var(--text-secondary);margin-bottom:6px;">番号</div>
          <input id="__jan-num-input" type="tel" placeholder="例: 4901234567890" class="form-input" style="width:100%;font-family:monospace;font-size:16px;box-sizing:border-box;" autocomplete="off">
        </div>
        <div style="margin-bottom:20px;">
          <div style="font-size:12px;color:var(--text-secondary);margin-bottom:6px;">写真（任意）</div>
          <div style="display:flex;align-items:center;gap:10px;">
            <label style="cursor:pointer;display:inline-flex;align-items:center;gap:6px;background:var(--gray-light);border:1px dashed var(--gray-border);border-radius:8px;padding:10px 16px;font-size:13px;color:var(--text-secondary);">
              📷 写真を選択
              <input type="file" accept="image/*" id="__jan-photo-input" style="display:none;">
            </label>
            <div id="__jan-photo-thumb"></div>
          </div>
        </div>
        <div style="display:flex;gap:8px;">
          <button id="__jan-cancel-btn" class="btn btn-gray btn-full">キャンセル</button>
          <button id="__jan-save-btn" class="btn btn-primary btn-full">保存</button>
        </div>
      </div>`;
      document.body.appendChild(ov);

      let photoData = null;

      document.getElementById('__jan-photo-input').addEventListener('change', async e => {
        const f = e.target.files[0]; if (!f) return;
        const b64 = await fileToBase64(f);
        photoData = await resizeImage(b64, 400, 400);
        document.getElementById('__jan-photo-thumb').innerHTML = `<img src="${photoData}" style="width:52px;height:52px;object-fit:cover;border-radius:6px;">`;
      });

      document.getElementById('__jan-save-btn').onclick = async () => {
        const num = document.getElementById('__jan-num-input').value.trim();
        if (!num) { toast('番号を入力してください'); return; }
        JAN_CODES.push({id: uid(), number: num, photo: photoData, createdAt: Date.now()});
        await db.put('settings', {key: 'janCodes', value: JAN_CODES});
        toast('追加しました'); ov.remove(); renderList();
      };
      document.getElementById('__jan-cancel-btn').onclick = () => ov.remove();
      ov.addEventListener('click', e => { if (e.target === ov) ov.remove(); });
      setTimeout(() => document.getElementById('__jan-num-input')?.focus(), 100);
    }
  }

  async function pgSettings(main){
    const products=await db.getAll('products'),listings=await db.getAll('listings');
    main.innerHTML=`
    <div class="page-pad" style="background:var(--gray-light);">
      <div class="section-hd">プラットフォーム管理</div>
      <div style="background:var(--white);">
        <div style="display:flex;align-items:center;padding:14px 16px;border-bottom:1px solid var(--gray-border);gap:12px;cursor:pointer;" onclick="App.navigate('platform-settings',{},'プラットフォーム管理')">
          <span style="font-size:22px;">🏪</span>
          <div style="flex:1;"><div style="font-size:15px;font-weight:500;">プラットフォームを管理</div><div style="font-size:12px;color:var(--text-secondary);">追加・色変更・手数料変更（現在${PLATFORMS.length}件）</div></div>
          <span style="color:#BDBDBD;font-size:18px;">›</span>
        </div>
        <div style="display:flex;align-items:center;padding:14px 16px;border-bottom:1px solid var(--gray-border);gap:12px;cursor:pointer;" onclick="App.navigate('shipping-settings',{},'送料プリセット管理')">
          <span style="font-size:22px;">✉️</span>
          <div style="flex:1;"><div style="font-size:15px;font-weight:500;">送料プリセットを管理</div><div style="font-size:12px;color:var(--text-secondary);">送料ショートカットの追加・編集（現在${SHIPPING_SHORTCUTS.length}件）</div></div>
          <span style="color:#BDBDBD;font-size:18px;">›</span>
        </div>
        <div style="display:flex;align-items:center;padding:14px 16px;gap:12px;cursor:pointer;" onclick="App.navigate('jan-settings',{},'JANコード管理')">
          <span style="font-size:22px;">🏷</span>
          <div style="flex:1;"><div style="font-size:15px;font-weight:500;">JANコードを管理</div><div style="font-size:12px;color:var(--text-secondary);">写真・番号の保存（現在${JAN_CODES.length}件）</div></div>
          <span style="color:#BDBDBD;font-size:18px;">›</span>
        </div>
      </div>
      <div class="section-hd" style="margin-top:10px;">データ管理</div>
      <div style="background:var(--white);">
        <div style="display:flex;align-items:center;padding:14px 16px;border-bottom:1px solid var(--gray-border);gap:12px;cursor:pointer;" onclick="App._export()">
          <span style="font-size:22px;">📤</span>
          <div style="flex:1;"><div style="font-size:15px;font-weight:500;">バックアップ（JSONエクスポート）</div><div style="font-size:12px;color:var(--text-secondary);">商品${products.length}件・売上${listings.length}件</div></div>
          <span style="color:#BDBDBD;font-size:18px;">›</span>
        </div>
        <div style="display:flex;align-items:center;padding:14px 16px;border-bottom:1px solid var(--gray-border);gap:12px;cursor:pointer;" onclick="App._import()">
          <span style="font-size:22px;">📥</span>
          <div style="flex:1;"><div style="font-size:15px;font-weight:500;">インポート</div></div>
          <input type="file" id="__import-file" accept=".json" style="display:none" onchange="App._onImport(this)">
          <span style="color:#BDBDBD;font-size:18px;">›</span>
        </div>
        <div style="display:flex;align-items:center;padding:14px 16px;gap:12px;cursor:pointer;color:var(--danger);" onclick="App._clearAll()">
          <span style="font-size:22px;">🗑</span>
          <div style="flex:1;"><div style="font-size:15px;font-weight:500;">全データを削除</div></div>
        </div>
      </div>
      <div class="section-hd" style="margin-top:10px;">アカウント</div>
      <div style="background:var(--white);">
        <div style="display:flex;align-items:center;padding:14px 16px;border-bottom:1px solid var(--gray-border);gap:12px;">
          <span style="font-size:22px;">☁️</span>
          <div style="flex:1;"><div style="font-size:15px;font-weight:500;">クラウド保存</div><div style="font-size:12px;color:var(--text-secondary);">${window._currentUser?.email||''}</div></div>
          <span style="font-size:11px;color:#4CAF50;font-weight:600;">有効</span>
        </div>
        <div style="display:flex;align-items:center;padding:14px 16px;gap:12px;cursor:pointer;color:var(--danger);" onclick="window._signOut()">
          <span style="font-size:22px;">🚪</span>
          <div style="flex:1;"><div style="font-size:15px;font-weight:500;">ログアウト</div></div>
        </div>
      </div>
      <div class="section-hd" style="margin-top:10px;">このアプリについて</div>
      <div style="background:var(--white);padding:16px;font-size:14px;color:var(--text-secondary);">セラーノート v1.1<br>個人用フリマ・EC出品管理アプリ</div>
    </div>`;
  }

  // =====================================================================
  // PLATFORM SETTINGS
  // =====================================================================
  async function pgPlatformSettings(main,actionBtn){
    actionBtn.className='header-btn pill-btn'; actionBtn.textContent='＋追加';
    actionBtn.onclick=()=>_showPlatformEditDialog(null);

    async function pfDoReorder(fromKey,toKey){
      const fi=PLATFORMS.findIndex(p=>p.key===fromKey);
      const ti=PLATFORMS.findIndex(p=>p.key===toKey);
      if(fi<0||ti<0||fi===ti)return;
      const item=PLATFORMS.splice(fi,1)[0];
      PLATFORMS.splice(ti,0,item);
      await db.put('settings',{key:'platforms',value:PLATFORMS});
      renderList();
    }

    function setupPlatformDrag(){
      const list=document.getElementById('__pf-list');if(!list)return;
      // Desktop HTML5 drag
      let dragSrcKey=null;
      list.addEventListener('dragstart',e=>{
        const row=e.target.closest('.pf-row[data-key]');if(!row)return;
        dragSrcKey=row.dataset.key;
        setTimeout(()=>row.classList.add('dragging'),0);
        e.dataTransfer.effectAllowed='move';
        e.dataTransfer.setData('text/plain',dragSrcKey);
      });
      list.addEventListener('dragover',e=>{
        e.preventDefault();e.dataTransfer.dropEffect='move';
        const row=e.target.closest('.pf-row[data-key]');
        if(!row||row.dataset.key===dragSrcKey)return;
        list.querySelectorAll('.pf-row').forEach(r=>r.classList.remove('drag-over'));
        row.classList.add('drag-over');
      });
      list.addEventListener('dragleave',e=>{
        const row=e.target.closest('.pf-row[data-key]');
        if(row)row.classList.remove('drag-over');
      });
      list.addEventListener('drop',async e=>{
        e.preventDefault();
        const row=e.target.closest('.pf-row[data-key]');
        if(!row||!dragSrcKey||row.dataset.key===dragSrcKey)return;
        await pfDoReorder(dragSrcKey,row.dataset.key);
      });
      list.addEventListener('dragend',()=>{
        list.querySelectorAll('.pf-row').forEach(r=>r.classList.remove('dragging','drag-over'));
        dragSrcKey=null;
      });
      // Mobile touch long-press drag
      let touchKey=null,touchClone=null,touchTimer=null;
      list.addEventListener('touchstart',e=>{
        const row=e.target.closest('.pf-row[data-key]');if(!row)return;
        touchTimer=setTimeout(()=>{
          touchKey=row.dataset.key;
          const rect=row.getBoundingClientRect();
          touchClone=row.cloneNode(true);
          Object.assign(touchClone.style,{position:'fixed',width:rect.width+'px',height:rect.height+'px',top:rect.top+'px',left:rect.left+'px',opacity:'0.85',border:'2px solid var(--primary)',zIndex:'9999',pointerEvents:'none',transform:'scale(1.02)',boxShadow:'0 6px 20px rgba(0,0,0,0.22)',transition:'none'});
          document.body.appendChild(touchClone);
          row.style.opacity='0.3';
          if(navigator.vibrate)navigator.vibrate(40);
        },430);
      },{passive:true});
      list.addEventListener('touchmove',e=>{
        if(touchTimer){clearTimeout(touchTimer);touchTimer=null;}
        if(!touchKey||!touchClone)return;
        e.preventDefault();
        const touch=e.touches[0];
        touchClone.style.top=(touch.clientY-parseFloat(touchClone.style.height)/2)+'px';
        touchClone.style.display='none';
        const el=document.elementFromPoint(touch.clientX,touch.clientY);
        touchClone.style.display='';
        const over=el?.closest('.pf-row[data-key]');
        list.querySelectorAll('.pf-row').forEach(r=>r.classList.remove('drag-over'));
        if(over&&over.dataset.key!==touchKey)over.classList.add('drag-over');
      },{passive:false});
      const endTouch=async e=>{
        if(touchTimer){clearTimeout(touchTimer);touchTimer=null;}
        const wasDragging=touchKey!==null;
        if(touchClone){touchClone.remove();touchClone=null;}
        list.querySelectorAll('.pf-row').forEach(r=>{r.classList.remove('drag-over','dragging');r.style.opacity='';});
        if(wasDragging&&e.changedTouches){
          const touch=e.changedTouches[0];
          const el=document.elementFromPoint(touch.clientX,touch.clientY);
          const over=el?.closest('.pf-row[data-key]');
          if(over&&over.dataset.key!==touchKey)await pfDoReorder(touchKey,over.dataset.key);
        }
        touchKey=null;
      };
      list.addEventListener('touchend',endTouch,{passive:true});
      list.addEventListener('touchcancel',endTouch,{passive:true});
    }

    function renderList(){
      const body=document.getElementById('__pf-list');if(!body)return;
      body.innerHTML=PLATFORMS.map((p,i)=>`
        <div class="pf-row" data-key="${p.key}" draggable="true"
          style="display:flex;align-items:center;padding:10px 12px;border-bottom:1px solid var(--gray-border);background:var(--white);gap:8px;"
          oncontextmenu="App._showPlatformMoveMenu('${p.key}',event);event.preventDefault();">
          <div class="drag-handle">⠿</div>
          <div style="width:32px;height:32px;border-radius:8px;background:${p.color};flex-shrink:0;"></div>
          <div style="flex:1;min-width:0;">
            <div style="font-size:14px;font-weight:600;">${esc(p.name)}</div>
            <div style="font-size:12px;color:var(--text-secondary);">手数料: ${p.feeRate}%</div>
          </div>
          <button style="color:var(--primary);font-size:13px;font-weight:500;padding:6px 10px;border:1px solid var(--gray-border);border-radius:8px;" onclick="App._showPlatformEditDialog('${p.key}')">編集</button>
          ${i>=DEFAULT_PLATFORMS.length-1?`<button style="color:var(--danger);font-size:13px;padding:6px 8px;" onclick="App._deletePlatform('${p.key}')">削除</button>`:''}
        </div>`).join('');
      setupPlatformDrag();
    }

    main.innerHTML=`
    <div class="page-pad" style="background:var(--gray-light);">
      <div style="padding:10px 16px;font-size:13px;color:var(--text-secondary);">ドラッグ（⠿）または長押し・右クリックで並び替え。プラットフォームの順番は売上管理表のプラットフォーム別表示に反映されます。</div>
      <div id="__pf-list"></div>
      <div style="padding:12px;"><button class="btn btn-outline-red btn-full" onclick="App._resetPlatforms()">デフォルトに戻す</button></div>
    </div>`;
    renderList();
    App._pfRefresh=renderList;

    App._showPlatformMoveMenu=async(key,event)=>{
      const idx=PLATFORMS.findIndex(p=>p.key===key);
      const ov=document.createElement('div');ov.className='status-popup-overlay';
      ov.innerHTML=`<div class="status-popup">
        <div style="padding:12px;font-weight:700;text-align:center;font-size:14px;border-bottom:1px solid var(--gray-border);">並び替え</div>
        ${idx>0?`<button class="status-popup-item" data-action="up">↑ 上に移動</button>`:''}
        ${idx<PLATFORMS.length-1?`<button class="status-popup-item" data-action="down">↓ 下に移動</button>`:''}
        ${idx>0?`<button class="status-popup-item" data-action="top">⤒ 一番上へ</button>`:''}
        ${idx<PLATFORMS.length-1?`<button class="status-popup-item" data-action="bottom">⤓ 一番下へ</button>`:''}
      </div>`;
      document.body.appendChild(ov);
      ov.addEventListener('click',async e=>{
        const btn=e.target.closest('.status-popup-item');
        if(btn){
          const ci=PLATFORMS.findIndex(p=>p.key===key);
          const item=PLATFORMS.splice(ci,1)[0];
          const action=btn.dataset.action;
          if(action==='up')PLATFORMS.splice(ci-1,0,item);
          else if(action==='down')PLATFORMS.splice(ci+1,0,item);
          else if(action==='top')PLATFORMS.unshift(item);
          else PLATFORMS.push(item);
          await db.put('settings',{key:'platforms',value:PLATFORMS});
          renderList();
        }
        ov.remove();
      });
    };
  }

  function _showPlatformEditDialog(key){
    const p=key?getPlatform(key):{key:'custom_'+uid(),name:'',feeRate:0,color:'#888888'};
    const isNew=!key;
    const overlay=document.createElement('div');
    overlay.className='status-popup-overlay';
    overlay.innerHTML=`
      <div class="outbound-sheet">
        <h3>${isNew?'プラットフォームを追加':'プラットフォームを編集'}</h3>
        <div class="form-group" style="margin-bottom:12px;">
          <div class="form-row"><label class="form-label required">名前</label><input class="form-input" id="__pf-name" type="text" value="${esc(p.name)}" placeholder="プラットフォーム名"></div>
          <div class="form-row"><label class="form-label">手数料</label><input class="form-input" id="__pf-fee" type="number" inputmode="numeric" value="${p.feeRate}" placeholder="0"><span class="form-suffix">%</span></div>
          <div class="form-row" style="align-items:center;">
            <label class="form-label">色</label>
            <input type="color" id="__pf-color" value="${p.color}" style="width:48px;height:36px;border:none;border-radius:8px;cursor:pointer;background:none;">
            <span style="font-size:13px;margin-left:8px;color:var(--text-secondary);">タップして変更</span>
          </div>
        </div>
        <div style="display:flex;gap:10px;">
          <button class="btn btn-gray btn-full" onclick="this.closest('.status-popup-overlay').remove()">キャンセル</button>
          <button class="btn btn-primary btn-full" onclick="App._savePlatform('${p.key}',${isNew})">保存</button>
        </div>
      </div>`;
    document.body.appendChild(overlay);
    overlay.addEventListener('click',e=>{if(e.target===overlay)overlay.remove();});
  }

  async function _savePlatform(key,isNew){
    const name=document.getElementById('__pf-name')?.value?.trim();
    if(!name){toast('名前を入力してください');return;}
    const feeRate=Number(document.getElementById('__pf-fee')?.value)||0;
    const color=document.getElementById('__pf-color')?.value||'#888888';
    if(isNew){
      PLATFORMS.push({key,name,feeRate,color});
    } else {
      const idx=PLATFORMS.findIndex(p=>p.key===key);
      if(idx>=0) PLATFORMS[idx]={key,name,feeRate,color};
    }
    await db.put('settings',{key:'platforms',value:PLATFORMS});
    document.querySelector('.status-popup-overlay')?.remove();
    toast('保存しました');
    App._pfRefresh?.();
  }

  async function _deletePlatform(key){
    const ok=await confirmDialog('このプラットフォームを削除しますか？');if(!ok)return;
    PLATFORMS=PLATFORMS.filter(p=>p.key!==key);
    await db.put('settings',{key:'platforms',value:PLATFORMS});
    toast('削除しました');App._pfRefresh?.();
  }

  async function _resetPlatforms(){
    const ok=await confirmDialog('デフォルトに戻しますか？\nカスタム追加分は削除されます。','リセット','btn-primary');
    if(!ok)return;
    PLATFORMS=[...DEFAULT_PLATFORMS];
    await db.put('settings',{key:'platforms',value:PLATFORMS});
    toast('リセットしました');App._pfRefresh?.();
  }

  // =====================================================================
  // HELPERS
  // =====================================================================
  async function _downloadAllPhotos(){
    const photos=_currentProductPhotos||[];
    if(!photos.length){toast('画像がありません');return;}
    toast(`${photos.length}枚を保存中...`);
    for(let i=0;i<photos.length;i++){
      await new Promise(r=>setTimeout(r,300*i));
      const a=document.createElement('a');a.href=photos[i];a.download=`photo_${i+1}.jpg`;a.click();
    }
    toast(`✅ ${photos.length}枚を保存しました`);
  }

  async function _export(){
    const products=await db.getAll('products'),listings=await db.getAll('listings');
    const data={version:2,exportedAt:new Date().toISOString(),products,listings,platforms:PLATFORMS,shippingShortcuts:SHIPPING_SHORTCUTS,janCodes:JAN_CODES};
    const blob=new Blob([JSON.stringify(data,null,2)],{type:'application/json'});
    const url=URL.createObjectURL(blob);
    const a=document.createElement('a');a.href=url;a.download=`seller-note-${todayStr()}.json`;a.click();
    URL.revokeObjectURL(url);toast('バックアップしました');
  }
  function _exportSalesCSV(listings){
    const rows=[['管理番号','商品名','プラットフォーム','売値','仕入額','手数料','送料','純利益','利益率','ステータス','売れた日','メモ']];
    listings.forEach(l=>{
      const profit=Number(l.profit)||0;
      const roi=l.salePrice>0?(profit/l.salePrice*100).toFixed(1):'0.0';
      const st=STATUS_MAP[l.status]||STATUS_MAP.completed;
      rows.push([l.productCode||'',l.productName||'',getPlatform(l.platform).name,l.salePrice||0,l.purchasePrice||0,l.fee||0,l.shipping||0,profit,roi+'%',st.label,l.saleDate||'',l.memo||'']);
    });
    const csv=rows.map(r=>r.map(v=>`"${String(v).replace(/"/g,'""')}"`).join(',')).join('\r\n');
    const bom='\uFEFF';
    const blob=new Blob([bom+csv],{type:'text/csv;charset=utf-8;'});
    const url=URL.createObjectURL(blob);
    const a=document.createElement('a');a.href=url;a.download=`sales-${todayStr()}.csv`;a.click();
    URL.revokeObjectURL(url);toast(`✅ ${listings.length}件をCSV出力しました`);
  }
  function _exportListingsCSV(list,periodLabel){
    const SL={before:'出品前',listing:'出品中',payment:'入金待ち',shipping:'発送準備中',review:'評価待ち',completed:'取引完了',canceled:'キャンセル'};
    const rows=[['売上日','取引完了日','商品名','SKU/管理番号','プラットフォーム','売上金額','送料','手数料','仕入額','梱包費','経費','粗利','取引状態']];
    list.forEach(l=>{
      const completedDate=l.status==='completed'&&l.updatedAt?new Date(l.updatedAt).toISOString().slice(0,10):'';
      rows.push([l.saleDate||'',completedDate,l.productName||'',l.productCode||l.productTitle||'',getPlatform(l.platform).name,l.salePrice||0,l.shipping||0,l.fee||0,l.purchasePrice||0,0,0,l.profit||0,SL[l.status]||l.status||'']);
    });
    const csv=rows.map(r=>r.map(v=>`"${String(v).replace(/"/g,'""')}"`).join(',')).join('\r\n');
    const blob=new Blob(['\uFEFF'+csv],{type:'text/csv;charset=utf-8;'});
    const url=URL.createObjectURL(blob);
    const a=document.createElement('a');a.href=url;a.download=`sales-${periodLabel}.csv`;a.click();
    URL.revokeObjectURL(url);toast(`✅ ${list.length}件をCSV出力しました`);
  }
  async function _csvByPeriod(type){
    const allL=await db.getAll('listings');
    const now=new Date();
    const sheet=document.createElement('div');sheet.className='status-popup-overlay';sheet.style.alignItems='flex-end';
    if(type==='month'){
      const defVal=`${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}`;
      sheet.innerHTML=`<div class="outbound-sheet" style="padding-bottom:24px;"><h3 style="margin-bottom:16px;">月別CSV出力</h3><div style="margin-bottom:20px;"><input type="month" id="__csv-m" class="form-input" value="${defVal}" style="width:100%;box-sizing:border-box;"></div><div style="display:flex;gap:8px;"><button class="btn btn-gray btn-full" onclick="this.closest('.status-popup-overlay').remove()">キャンセル</button><button id="__csv-ok" class="btn btn-primary btn-full">出力</button></div></div>`;
      document.body.appendChild(sheet);
      sheet.addEventListener('click',e=>{if(e.target===sheet)sheet.remove();});
      sheet.querySelector('#__csv-ok').onclick=()=>{
        const val=sheet.querySelector('#__csv-m').value;if(!val)return;
        const[y,m]=val.split('-').map(Number);
        const fl=allL.filter(l=>{const d=new Date(l.saleDate||l.createdAt);return d.getFullYear()===y&&d.getMonth()===m-1;});
        _exportListingsCSV(fl,`${y}年${m}月`);sheet.remove();
      };
    }else if(type==='year'){
      const opts=Array.from({length:5},(_,i)=>now.getFullYear()-i).map(y=>`<option value="${y}">${y}年</option>`).join('');
      sheet.innerHTML=`<div class="outbound-sheet" style="padding-bottom:24px;"><h3 style="margin-bottom:16px;">年別CSV出力</h3><div style="margin-bottom:20px;"><select id="__csv-y" class="form-select" style="width:100%;">${opts}</select></div><div style="display:flex;gap:8px;"><button class="btn btn-gray btn-full" onclick="this.closest('.status-popup-overlay').remove()">キャンセル</button><button id="__csv-ok" class="btn btn-primary btn-full">出力</button></div></div>`;
      document.body.appendChild(sheet);
      sheet.addEventListener('click',e=>{if(e.target===sheet)sheet.remove();});
      sheet.querySelector('#__csv-ok').onclick=()=>{
        const y=Number(sheet.querySelector('#__csv-y').value);
        const fl=allL.filter(l=>new Date(l.saleDate||l.createdAt).getFullYear()===y);
        _exportListingsCSV(fl,`${y}年`);sheet.remove();
      };
    }else{
      const firstDay=new Date(now.getFullYear(),now.getMonth(),1).toISOString().slice(0,10);
      sheet.innerHTML=`<div class="outbound-sheet" style="padding-bottom:24px;"><h3 style="margin-bottom:16px;">期間指定CSV出力</h3><div style="display:flex;gap:8px;align-items:center;margin-bottom:20px;"><input type="date" id="__csv-f" class="form-input" style="flex:1;" value="${firstDay}"><span>〜</span><input type="date" id="__csv-t" class="form-input" style="flex:1;" value="${todayStr()}"></div><div style="display:flex;gap:8px;"><button class="btn btn-gray btn-full" onclick="this.closest('.status-popup-overlay').remove()">キャンセル</button><button id="__csv-ok" class="btn btn-primary btn-full">出力</button></div></div>`;
      document.body.appendChild(sheet);
      sheet.addEventListener('click',e=>{if(e.target===sheet)sheet.remove();});
      sheet.querySelector('#__csv-ok').onclick=()=>{
        const from=sheet.querySelector('#__csv-f').value,to=sheet.querySelector('#__csv-t').value;
        if(!from||!to){toast('期間を選択してください');return;}
        const fromMs=new Date(from).getTime(),toMs=new Date(to).getTime()+86400000-1;
        const fl=allL.filter(l=>{const ms=new Date(l.saleDate||l.createdAt).getTime();return ms>=fromMs&&ms<=toMs;});
        _exportListingsCSV(fl,`${from}〜${to}`);sheet.remove();
      };
    }
  }
  function _import(){document.getElementById('__import-file')?.click();}
  async function _onImport(input){
    const file=input.files?.[0];if(!file)return;
    try{
      const data=JSON.parse(await file.text());
      const ok=await confirmDialog(`商品${(data.products||[]).length}件・売上${(data.listings||data.sales||[]).length}件をインポートしますか？`,'インポート','btn-primary');
      if(!ok)return;
      for(const p of(data.products||[]))await db.put('products',p);
      for(const l of(data.listings||data.sales||[]))await db.put('listings',l);
      if(data.platforms){PLATFORMS=data.platforms;await db.put('settings',{key:'platforms',value:PLATFORMS});}
      if(data.shippingShortcuts&&data.shippingShortcuts.length){SHIPPING_SHORTCUTS=data.shippingShortcuts;await db.put('settings',{key:'shippingShortcuts',value:SHIPPING_SHORTCUTS});}
      if(data.janCodes&&data.janCodes.length){JAN_CODES=data.janCodes;await db.put('settings',{key:'janCodes',value:JAN_CODES});}
      toast('インポートしました');await _render('settings',{},'設定');
    }catch(e){toast('インポート失敗: '+e.message);}
  }
  async function _clearAll(){
    const ok=await confirmDialog('全データを削除しますか？\nこの操作は取り消せません。');if(!ok)return;
    const[ps,ls]=await Promise.all([db.getAll('products'),db.getAll('listings')]);
    for(const p of ps)await db.delete('products',p.id);
    for(const l of ls)await db.delete('listings',l.id);
    toast('削除しました');await _render('settings',{},'設定');
  }

  // =====================================================================
  // INIT
  // =====================================================================
  async function init(){
    await db.open();
    // DBからプラットフォームを読み込む
    const saved=await db.get('settings','platforms');
    if(saved?.value) PLATFORMS=saved.value;
    // DBからカスタム並び順を読み込む
    const savedOrder=await db.get('settings','customProductOrder');
    if(savedOrder?.value&&savedOrder.value.length){
      _customOrder=savedOrder.value;
      _currentSort='custom';
    }
    // DBから送料プリセットを読み込む
    const savedShipping=await db.get('settings','shippingShortcuts');
    if(savedShipping?.value&&savedShipping.value.length) SHIPPING_SHORTCUTS=savedShipping.value;
    // DBから売上管理表の設定を読み込む
    const savedItemMode=await db.get('settings','salesItemMode');
    if(savedItemMode?.value) _salesItemMode=savedItemMode.value;
    const savedFilterStatus=await db.get('settings','salesFilterStatus');
    if(savedFilterStatus?.value) _salesFilterStatus=savedFilterStatus.value;
    const savedViewMode=await db.get('settings','salesViewMode');
    if(savedViewMode?.value) _salesViewMode=savedViewMode.value;
    // DBからJANコードを読み込む
    const savedJan=await db.get('settings','janCodes');
    if(savedJan?.value) JAN_CODES=savedJan.value;
    await switchTab('home');
  }

  return {
    switchTab, navigate, goBack, init,
    get _gridDragOccurred(){return _gridDragOccurred;},
    _showSortSheet, _refreshProductGrid:null,
    _saveProduct, _addPhotos, _removePhoto, _step,
    _stockIn, _showOutboundSheet, _calcObProfit:()=>{},
    _deleteProduct, _saveSale,
    _copyText, _downloadAllPhotos, _photoNav:()=>{},
    _selectPlatformSale:()=>{}, _updateCalc:()=>{},
    _onProdSel:()=>{}, _onShPreset:()=>{}, _selShortcut:()=>{},
    _toggleSel:()=>{}, _completeSale:()=>{}, _bulkComplete:()=>{},
    _completeFromDetail:()=>{}, _showStatusPopupSale:()=>{}, _deleteSale:()=>{},
    _setStatus:()=>{}, _showStatusPopup:()=>{},
    _toggleHidden:()=>{},
    _showPlatformEditDialog, _savePlatform, _deletePlatform, _resetPlatforms, _pfRefresh:null,
    _showPlatformMoveMenu:()=>{},
    _salesSetView:()=>{}, _salesSettingsSheet:()=>{},
    _exportSalesCSV,
    _calNav:()=>{}, _calToday:()=>{}, _calSelect:()=>{}, _calBasisSheet:()=>{},
    _dupSale:()=>{}, _editSaleMemo:()=>{}, _showSaleActions:()=>{},
    _obSelShipping:()=>{},
    _deleteJanCode:()=>{},
    _anaTab:()=>{}, _anaNav:()=>{}, _anaRkSort:()=>{}, _anaRkPeriod:()=>{},
    _anaPfPeriod:()=>{}, _anaInvDays:()=>{}, _anaInvToggle:()=>{},
    _exportListingsCSV, _csvByPeriod,
    _editShipping:()=>{}, _resetShipping:async()=>{
      const ok=await confirmDialog('送料プリセットをデフォルトに戻しますか？');if(!ok)return;
      SHIPPING_SHORTCUTS=[...DEFAULT_SHIPPING_SHORTCUTS];
      await db.put('settings',{key:'shippingShortcuts',value:SHIPPING_SHORTCUTS});
      toast('リセットしました');await _render('shipping-settings',{},'送料プリセット管理');
    },
    _export, _import, _onImport, _clearAll,
  };
})();

// App.init() はFirebase認証完了後にindex.htmlから呼ばれる
