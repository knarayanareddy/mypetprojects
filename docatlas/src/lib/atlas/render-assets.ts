// Fixed front-end for the single-file dashboard: "paper briefing" skin + vanilla JS.
// (No template literals inside — these are emitted verbatim into the HTML.)

export const CSS = String.raw`
:root{--paper:#f4ecd7;--paper2:#efe5cb;--card:#fbf7ea;--ink:#1f3a8a;--ink-soft:#dfe6f7;--text:#1c2434;--muted:#6d6652;--rule:#d9ceae;--verm:#c0392b;--verm-soft:#fbe4dd;--amber:#b45309;--amber-soft:#fbefd5;--ok:#2f7d4f;--ok-soft:#e1f1e6;--serif:Georgia,"Iowan Old Style","Noto Serif","Source Han Serif SC","Songti SC",serif;--sans:-apple-system,BlinkMacSystemFont,"Segoe UI","Helvetica Neue","PingFang SC","Noto Sans",Arial,sans-serif}
*{box-sizing:border-box}
html{scroll-behavior:smooth;scroll-padding-top:20px}
body{margin:0;background:var(--paper);color:var(--text);font:15px/1.7 var(--sans);-webkit-font-smoothing:antialiased}
.layout{display:grid;grid-template-columns:316px minmax(0,1fr);min-height:100vh}
aside.side{position:sticky;top:0;height:100vh;overflow:auto;border-right:1px solid var(--rule);background:var(--paper2);padding:20px 16px 40px;font-size:13px}
.brand{font-family:var(--serif);font-weight:700;letter-spacing:.04em;color:var(--ink);font-size:15px;display:flex;align-items:center;gap:8px;margin-bottom:14px}
.brand i{display:inline-block;width:10px;height:10px;background:var(--verm);transform:rotate(45deg)}
.searchbox{position:relative;margin-bottom:10px}
.searchbox input{width:100%;padding:8px 70px 8px 10px;border:1px solid var(--rule);background:var(--card);border-radius:3px;font:inherit;color:var(--text)}
.searchbox input:focus{outline:2px solid var(--ink);outline-offset:-1px}
.searchbox .cnt{position:absolute;right:8px;top:50%;transform:translateY(-50%);font-size:11px;color:var(--muted);display:flex;gap:4px;align-items:center}
.searchbox button{border:0;background:none;cursor:pointer;color:var(--ink);font-size:13px;padding:0 2px}
.btn{display:inline-flex;align-items:center;gap:6px;border:1px solid var(--ink);background:transparent;color:var(--ink);padding:6px 10px;border-radius:3px;font:600 12px var(--sans);cursor:pointer}
.btn:hover,.btn.on{background:var(--ink);color:#fff}
.side .row{display:flex;gap:6px;flex-wrap:wrap;margin-bottom:12px}
details.tools{border:1px solid var(--rule);background:var(--card);border-radius:3px;margin-bottom:14px}
details.tools>summary{padding:7px 10px;cursor:pointer;font-weight:600;color:var(--ink);list-style:none}
details.tools>summary::-webkit-details-marker{display:none}
details.tools .inner{padding:4px 10px 10px;display:grid;gap:8px}
details.tools label{display:flex;align-items:center;gap:6px;color:var(--text)}
details.tools select{width:100%;padding:5px;border:1px solid var(--rule);background:#fff;font:inherit}
.dot{display:inline-block;width:8px;height:8px;border-radius:50%}
.dot.high{background:var(--verm)}.dot.medium{background:var(--ink)}.dot.low{background:#b9ae8d}
.toc-title{font:700 11px var(--sans);letter-spacing:.12em;text-transform:uppercase;color:var(--muted);margin:14px 0 6px}
.toc ul{list-style:none;margin:0;padding:0}
.toc ul ul{margin-left:12px;border-left:1px solid var(--rule);padding-left:8px}
.toc li{margin:1px 0}
.toc .node{display:flex;gap:4px;align-items:flex-start}
.toc .tg{flex:none;width:16px;height:20px;border:0;background:none;cursor:pointer;color:var(--muted);font-size:10px;padding:0}
.toc .tg.empty{visibility:hidden}
.toc a{color:var(--text);text-decoration:none;display:block;padding:2px 6px;border-radius:3px;line-height:1.4;flex:1}
.toc a:hover{background:rgba(31,58,138,.08)}
.toc a.active{background:var(--ink);color:#fff}
.toc a .dot{margin-right:6px;vertical-align:middle}
.toc a.active .dot{box-shadow:0 0 0 1.5px #fff}
.toc li.closed>ul{display:none}
.toc a.imp-low{color:var(--muted)}
main{padding:34px 52px 90px;max-width:1160px;width:100%}
.mast{border-bottom:3px double var(--ink);padding-bottom:18px;margin-bottom:26px}
.kicker{font:700 11px var(--sans);letter-spacing:.2em;text-transform:uppercase;color:var(--verm)}
h1.title{font-family:var(--serif);font-size:34px;line-height:1.2;margin:6px 0 10px;color:var(--ink);font-weight:700}
.mastline{font-size:12.5px;color:var(--muted);display:flex;flex-wrap:wrap;gap:4px 14px}
.mastline b{color:var(--text);font-weight:600}
.goal{margin-top:10px;font-size:13px;border-left:3px solid var(--verm);padding:2px 10px;color:var(--text);background:rgba(192,57,43,.06)}
.goal span{font-weight:700;color:var(--verm)}
section.sec{margin:34px 0}
.sec>h2{font-family:var(--serif);font-size:20px;color:var(--ink);margin:0 0 12px;display:flex;align-items:baseline;gap:10px;border-bottom:1px solid var(--rule);padding-bottom:6px}
.sec>h2 .no{font:700 12px var(--sans);color:var(--verm);letter-spacing:.08em}
.bottomline{background:var(--ink);color:#fff;padding:26px 30px;border-radius:2px;position:relative}
.bottomline .lab{font:700 11px var(--sans);letter-spacing:.2em;text-transform:uppercase;color:#f3c8bf;margin-bottom:8px}
.bottomline .txt{font-family:var(--serif);font-size:25px;line-height:1.42}
.bottomline .src{background:rgba(255,255,255,.14);color:#fff;border-color:rgba(255,255,255,.3)}
.metrics{display:grid;grid-template-columns:repeat(auto-fit,minmax(190px,1fr));gap:0;border:1px solid var(--rule);background:var(--card)}
.metric{padding:16px 18px;border-right:1px solid var(--rule);border-bottom:1px solid var(--rule);margin:0 -1px -1px 0}
.metric .v{font-family:var(--serif);font-size:38px;line-height:1.05;color:var(--ink);font-weight:700;letter-spacing:-.01em;word-break:break-word}
.metric.high .v{color:var(--verm)}
.metric .l{font-size:13px;margin-top:6px;color:var(--text)}
.metric .s{font-size:11.5px;color:var(--muted);margin-top:2px}
.exec{margin:0;padding:0;list-style:none;display:grid;gap:10px}
.exec li{padding-left:22px;position:relative;font-size:16px;line-height:1.65}
.exec li:before{content:"";position:absolute;left:4px;top:.7em;width:7px;height:7px;background:var(--verm);transform:rotate(45deg)}
.src{display:inline-flex;align-items:center;gap:3px;margin:0 2px;padding:0 6px;border:1px solid var(--rule);background:var(--card);color:var(--ink);border-radius:9px;font:600 10.5px/1.7 var(--sans);cursor:pointer;vertical-align:baseline;white-space:nowrap;max-width:240px;overflow:hidden;text-overflow:ellipsis}
.src:hover{border-color:var(--ink);background:var(--ink-soft)}
.src:before{content:"❡";font-size:9px;color:var(--verm)}
.unv{display:inline-block;font:700 10px var(--sans);color:var(--amber);border:1px solid var(--amber);background:var(--amber-soft);border-radius:3px;padding:0 5px;margin-left:4px;vertical-align:middle;letter-spacing:.04em;text-transform:uppercase}
.diagram-wrap{border:1px solid var(--rule);background:var(--card);position:relative}
.dtabs{display:flex;gap:2px;border-bottom:1px solid var(--rule);background:var(--paper2);flex-wrap:wrap}
.dtabs button{border:0;background:none;padding:9px 16px;font:600 13px var(--sans);color:var(--muted);cursor:pointer;border-bottom:2px solid transparent}
.dtabs button.on{color:var(--ink);border-bottom-color:var(--verm);background:var(--card)}
.dpanel{display:none}.dpanel.on{display:block}
.mmd{padding:18px;min-height:360px;cursor:zoom-in;overflow:auto;display:flex;justify-content:center;align-items:flex-start}
.mmd svg{max-width:100%;height:auto}
.mm-err{white-space:pre-wrap;font:12px/1.5 ui-monospace,Menlo,monospace;color:var(--muted)}
.dcap{padding:10px 16px;border-top:1px solid var(--rule);font-size:13px;color:var(--muted);display:flex;justify-content:space-between;gap:12px;align-items:center;flex-wrap:wrap}
.zoomhint{font:600 11px var(--sans);color:var(--ink)}
.charts{display:grid;grid-template-columns:repeat(auto-fit,minmax(360px,1fr));gap:16px}
.chartcard{border:1px solid var(--rule);background:var(--card);padding:14px 16px}
.chartcard h3{font:600 14px var(--sans);margin:0 0 8px;color:var(--text)}
.chartcard .cv{position:relative;height:260px}
.chartcard .cap{font-size:12px;color:var(--muted);margin-top:8px}
.tier{margin:0 0 18px}
.tier h3{font:700 11px var(--sans);letter-spacing:.14em;text-transform:uppercase;color:var(--muted);margin:0 0 8px;display:flex;align-items:center;gap:8px}
.kp{list-style:none;margin:0;padding:0;display:grid;gap:8px}
.kp li{display:grid;grid-template-columns:auto 1fr;gap:10px;padding:10px 14px;background:var(--card);border:1px solid var(--rule);border-left:4px solid var(--rule)}
.kp li.high{border-left-color:var(--verm)}.kp li.medium{border-left-color:var(--ink)}.kp li.low{border-left-color:#c9bf9f}
.kp .kind{font:700 10px var(--sans);letter-spacing:.08em;text-transform:uppercase;color:var(--ink);background:var(--ink-soft);padding:2px 7px;border-radius:2px;align-self:start;margin-top:3px}
.kp .kind.risk{color:var(--verm);background:var(--verm-soft)}
.conf{border:1px solid var(--rule);background:var(--card);margin-bottom:14px}
.conf h3{margin:0;padding:10px 16px;font:600 15px var(--sans);background:var(--amber-soft);border-bottom:1px solid var(--rule);display:flex;justify-content:space-between;gap:10px;flex-wrap:wrap}
.conf .cols{display:grid;grid-template-columns:repeat(auto-fit,minmax(260px,1fr))}
.conf .pos{padding:12px 16px;border-right:1px solid var(--rule);font-size:14px}
.conf .pos:last-child{border-right:0}
.conf .res{padding:10px 16px;border-top:1px dashed var(--rule);font-size:13px;color:var(--muted)}
.pill{display:inline-block;font:700 10px var(--sans);letter-spacing:.06em;text-transform:uppercase;padding:1px 7px;border-radius:9px;border:1px solid var(--rule);color:var(--muted)}
.pill.high{color:var(--verm);border-color:var(--verm);background:var(--verm-soft)}.pill.medium{color:var(--ink);border-color:var(--ink);background:var(--ink-soft)}
.quotes{display:grid;grid-template-columns:repeat(auto-fit,minmax(300px,1fr));gap:14px}
blockquote.q{margin:0;padding:16px 20px;background:var(--card);border-left:4px solid var(--verm);font-family:var(--serif);font-size:17px;line-height:1.55}
blockquote.q footer{font:12px var(--sans);color:var(--muted);margin-top:8px}
details.chap{border:1px solid var(--rule);background:var(--card);margin-bottom:10px}
details.chap>summary{cursor:pointer;padding:12px 16px;display:flex;gap:12px;align-items:baseline;list-style:none;font-family:var(--serif);font-size:17px;color:var(--ink);font-weight:700}
details.chap>summary::-webkit-details-marker{display:none}
details.chap>summary:before{content:"▸";font-size:12px;color:var(--verm);transition:transform .15s}
details.chap[open]>summary:before{transform:rotate(90deg)}
details.chap>summary .no{font:700 12px var(--sans);color:var(--muted)}
details.chap>summary .grow{flex:1}
.chapbody{padding:4px 18px 18px;border-top:1px solid var(--rule)}
.chapbody>*+*{margin-top:12px}
.chapbody p{margin:10px 0}
details.sub{border-left:3px solid var(--rule);margin:14px 0 0 2px;background:rgba(255,255,255,.35)}
details.sub>summary{cursor:pointer;padding:6px 12px;font:600 14px var(--sans);color:var(--text);list-style:none}
details.sub>summary::-webkit-details-marker{display:none}
details.sub>summary:before{content:"▸ ";color:var(--verm)}
details.sub[open]>summary:before{content:"▾ "}
details.sub .subbody{padding:0 14px 10px}
.callout{padding:10px 14px;border-left:4px solid var(--ink);background:var(--ink-soft);font-size:14px}
.callout b.t{display:block;font:700 11px var(--sans);letter-spacing:.1em;text-transform:uppercase;margin-bottom:2px}
.callout.warn{border-color:var(--amber);background:var(--amber-soft)}.callout.warn b.t{color:var(--amber)}
.callout.danger{border-color:var(--verm);background:var(--verm-soft)}.callout.danger b.t{color:var(--verm)}
.callout.success{border-color:var(--ok);background:var(--ok-soft)}.callout.success b.t{color:var(--ok)}
ul.pts{margin:6px 0;padding:0;list-style:none;display:grid;gap:6px}
ul.pts li{padding-left:18px;position:relative}
ul.pts li:before{content:"";position:absolute;left:2px;top:.62em;width:7px;height:7px;border-radius:50%;background:#b9ae8d}
ul.pts li.high:before{background:var(--verm)}ul.pts li.medium:before{background:var(--ink)}
.chips{display:flex;flex-wrap:wrap;gap:8px}
.chip{border:1px solid var(--rule);background:#fff8;padding:5px 10px;font-size:13px}
.chip b{font-family:var(--serif);color:var(--ink);font-size:15px;margin-right:6px}
.tblwrap{overflow:auto;border:1px solid var(--rule);background:#fff9}
table.t{border-collapse:collapse;width:100%;font-size:13px}
table.t th{background:var(--paper2);text-align:left;font-weight:700;padding:6px 10px;border-bottom:1px solid var(--rule);white-space:nowrap}
table.t td{padding:6px 10px;border-bottom:1px solid #e8dfc3}
table.t td.num{text-align:right;font-variant-numeric:tabular-nums}
.tcap{font:600 12px var(--sans);color:var(--muted);margin:6px 0 4px}
.trunc{font-size:12px;color:var(--muted);padding:4px 10px}
figure.img{margin:0}figure.img img{max-width:100%;border:1px solid var(--rule)}figure.img figcaption{font-size:12px;color:var(--muted)}
details.appx{margin-top:44px;border-top:3px double var(--rule);padding-top:10px;color:var(--muted)}
details.appx>summary{cursor:pointer;font:700 12px var(--sans);letter-spacing:.14em;text-transform:uppercase;padding:6px 0}
details.appx h3{font:700 13px var(--sans);color:var(--text);margin:22px 0 8px;letter-spacing:.04em}
.apx-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:8px}
.apx-c{border:1px solid var(--rule);background:var(--card);padding:8px 12px}
.apx-c .k{font-size:11px;text-transform:uppercase;letter-spacing:.08em;color:var(--muted)}
.apx-c .v{font:600 15px var(--sans);color:var(--text)}
.gate{display:flex;gap:8px;align-items:center;font-size:13px;color:var(--text)}
.gate i{font-style:normal;font-weight:700}
.gate.pass i{color:var(--ok)}.gate.fail i{color:var(--verm)}
table.fc td.v-ok{color:var(--ok);font-weight:700}table.fc td.v-deviation{color:var(--amber);font-weight:700}table.fc td.v-error{color:var(--verm);font-weight:700}table.fc td.v-missing{color:var(--ink);font-weight:700}
mark.hit{background:#ffe27a;color:inherit;padding:0 1px;border-radius:2px}
mark.hit.cur{background:#ff9d4d;outline:2px solid var(--verm)}
#drawer{position:fixed;right:0;top:0;bottom:0;width:min(480px,92vw);background:var(--card);border-left:1px solid var(--ink);box-shadow:-12px 0 30px rgba(0,0,0,.18);transform:translateX(105%);transition:transform .2s;z-index:50;display:flex;flex-direction:column}
#drawer.open{transform:none}
#drawer header{padding:14px 16px;border-bottom:1px solid var(--rule);display:flex;justify-content:space-between;gap:10px;align-items:flex-start}
#drawer header b{font-family:var(--serif);color:var(--ink);font-size:15px}
#drawer .body{padding:14px 16px;overflow:auto;white-space:pre-wrap;font-size:13.5px;line-height:1.65}
#drawer .body mark{background:#ffe27a}
#drawer .note{font-size:11.5px;color:var(--muted);padding:0 16px 10px}
#zoom{position:fixed;inset:0;background:rgba(244,236,215,.97);z-index:60;display:none;flex-direction:column}
#zoom.open{display:flex}
#zoom .bar{display:flex;gap:8px;align-items:center;padding:10px 16px;border-bottom:1px solid var(--rule)}
#zoom .bar b{font-family:var(--serif);color:var(--ink);flex:1}
#zoom .stage{flex:1;overflow:hidden;cursor:grab;position:relative}
#zoom .stage.drag{cursor:grabbing}
#zoom .stage .inner{position:absolute;left:0;top:0;transform-origin:0 0}
.hidden-by-filter{display:none!important}
.empty{color:var(--muted);font-style:italic}
@media(max-width:980px){.layout{grid-template-columns:1fr}aside.side{position:relative;height:auto;border-right:0;border-bottom:1px solid var(--rule)}main{padding:24px 18px 60px}.bottomline .txt{font-size:20px}}
@media print{aside.side,#drawer,#zoom,.btn{display:none!important}.layout{display:block}main{padding:0;max-width:none}details.chap>*{display:block}body{background:#fff}}
`;

export const CLIENT_JS = String.raw`
(function(){
var D=JSON.parse(document.getElementById('atlas-data').textContent);
var UI=D.ui;
function $(s,r){return (r||document).querySelector(s)}
function $$(s,r){return Array.prototype.slice.call((r||document).querySelectorAll(s))}
function openAncestors(el){var p=el;while(p){if(p.tagName==='DETAILS'&&!p.open)p.open=true;p=p.parentElement}}

/* ---------- diagrams (Mermaid, inlined) ---------- */
var mmId=0;
function renderDiagrams(){
  var els=$$('.mmd');
  if(!els.length)return;
  if(!window.mermaid){els.forEach(function(el){el.innerHTML='<div class="mm-err">'+UI.mermaidMissing+'\n\n'+esc(el.getAttribute('data-code'))+'</div>'});return}
  try{mermaid.initialize({startOnLoad:false,securityLevel:'loose',theme:'base',fontFamily:'-apple-system,Segoe UI,Helvetica,Arial,sans-serif',
    themeVariables:{primaryColor:'#e8eefb',primaryBorderColor:'#1f3a8a',primaryTextColor:'#1c2434',lineColor:'#1f3a8a',secondaryColor:'#fbf7ea',tertiaryColor:'#f4ecd7',background:'#fbf7ea',edgeLabelBackground:'#fbf7ea',fontSize:'15px'},
    flowchart:{htmlLabels:true,useMaxWidth:true,curve:'basis',nodeSpacing:36,rankSpacing:56,padding:10,wrappingWidth:210}})}catch(e){}
  var chain=Promise.resolve();
  els.forEach(function(el){chain=chain.then(function(){
    var code=el.getAttribute('data-code');
    return mermaid.render('mm'+(++mmId),code).then(function(r){el.innerHTML=r.svg;el.setAttribute('data-rendered','1')}).catch(function(e){
      el.innerHTML='<div class="mm-err">'+esc(UI.diagramError)+'\n\n'+esc(code)+'</div>';
      var junk=document.getElementById('dmm'+mmId);if(junk)junk.remove();
    })})});
}
function esc(s){return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')}

/* diagram tabs */
$$('.dtabs button').forEach(function(b){b.addEventListener('click',function(){
  var wrap=b.closest('.diagram-wrap');
  $$('.dtabs button',wrap).forEach(function(x){x.classList.toggle('on',x===b)});
  $$('.dpanel',wrap).forEach(function(p){p.classList.toggle('on',p.id===b.getAttribute('data-p'))});
})});

/* zoom modal with pan + wheel zoom */
var Z=$('#zoom'),stage=$('#zoom .stage'),inner=$('#zoom .inner'),zs=1,zx=0,zy=0;
function applyZ(){inner.style.transform='translate('+zx+'px,'+zy+'px) scale('+zs+')'}
function openZoom(el){
  var svg=$('svg',el);if(!svg)return;
  $('#zoom .bar b').textContent=el.getAttribute('data-title')||'';
  inner.innerHTML='';var c=svg.cloneNode(true);c.removeAttribute('style');
  var vb=svg.viewBox&&svg.viewBox.baseVal;var w=vb&&vb.width?vb.width:svg.getBoundingClientRect().width;var h=vb&&vb.height?vb.height:svg.getBoundingClientRect().height;
  c.setAttribute('width',w);c.setAttribute('height',h);c.style.maxWidth='none';inner.appendChild(c);
  Z.classList.add('open');
  var sw=stage.clientWidth,sh=stage.clientHeight;zs=Math.min(sw/w,sh/h)*0.94;if(zs>2.2)zs=2.2;zx=(sw-w*zs)/2;zy=(sh-h*zs)/2;applyZ();
}
function closeZoom(){Z.classList.remove('open')}
function zoomBy(f,cx,cy){var ns=Math.max(.15,Math.min(8,zs*f));cx=cx==null?stage.clientWidth/2:cx;cy=cy==null?stage.clientHeight/2:cy;zx=cx-(cx-zx)*(ns/zs);zy=cy-(cy-zy)*(ns/zs);zs=ns;applyZ()}
$$('.mmd').forEach(function(el){el.addEventListener('click',function(){if(el.getAttribute('data-rendered'))openZoom(el)})});
$('#zoom [data-z=in]').onclick=function(){zoomBy(1.3)};
$('#zoom [data-z=out]').onclick=function(){zoomBy(1/1.3)};
$('#zoom [data-z=fit]').onclick=function(){var s=inner.firstChild;if(!s)return;var w=+s.getAttribute('width'),h=+s.getAttribute('height');zs=Math.min(stage.clientWidth/w,stage.clientHeight/h)*0.94;zx=(stage.clientWidth-w*zs)/2;zy=(stage.clientHeight-h*zs)/2;applyZ()};
$('#zoom [data-z=close]').onclick=closeZoom;
stage.addEventListener('wheel',function(e){e.preventDefault();var r=stage.getBoundingClientRect();zoomBy(e.deltaY<0?1.12:1/1.12,e.clientX-r.left,e.clientY-r.top)},{passive:false});
var drag=null;
stage.addEventListener('mousedown',function(e){drag={x:e.clientX-zx,y:e.clientY-zy};stage.classList.add('drag')});
window.addEventListener('mousemove',function(e){if(drag){zx=e.clientX-drag.x;zy=e.clientY-drag.y;applyZ()}});
window.addEventListener('mouseup',function(){drag=null;stage.classList.remove('drag')});

/* ---------- charts ---------- */
function renderCharts(){
  if(!window.Chart){$$('canvas[data-chart]').forEach(function(c){c.parentNode.innerHTML='<div class="empty">'+UI.chartMissing+'</div>'});return}
  Chart.defaults.font.family='-apple-system,Segoe UI,Helvetica,Arial,sans-serif';Chart.defaults.color='#1c2434';Chart.defaults.borderColor='#d9ceae';
  $$('canvas[data-chart]').forEach(function(c){var cfg=D.charts[c.getAttribute('data-chart')];if(cfg)try{new Chart(c,cfg)}catch(e){c.parentNode.innerHTML='<div class="empty">'+esc(e.message)+'</div>'}});
}

/* ---------- source drawer ---------- */
var dr=$('#drawer');
function openSource(key,claim){
  var r=D.refs[key];if(!r)return;
  $('#drawer header b').textContent=r.label;
  var body=$('#drawer .body');
  var t=r.text||'';
  if(!t){body.textContent=UI.noSnippet}else{
    var q=(claim||'').replace(/\s+/g,' ').trim().slice(0,70),i=q?t.replace(/\s+/g,' ').indexOf(q):-1;
    body.innerHTML='';
    if(i>=0){var flat=t.replace(/\s+/g,' ');body.appendChild(document.createTextNode(flat.slice(0,i)));var m=document.createElement('mark');m.textContent=flat.slice(i,i+Math.max(q.length,Math.min(claim.length,300)));body.appendChild(m);body.appendChild(document.createTextNode(flat.slice(i+m.textContent.length)));setTimeout(function(){m.scrollIntoView({block:'center'})},50)}
    else body.textContent=t;
  }
  $('#drawer .note').textContent=r.note||'';
  dr.classList.add('open');
}
document.addEventListener('click',function(e){
  var b=e.target.closest&&e.target.closest('button.src');
  if(b){e.preventDefault();e.stopPropagation();var c=b.closest('[data-claim]');openSource(b.getAttribute('data-ref'),c?c.getAttribute('data-claim'):'');return}
  if(dr.classList.contains('open')&&!e.target.closest('#drawer'))dr.classList.remove('open');
});
$('#drawer [data-x]').onclick=function(){dr.classList.remove('open')};

/* ---------- mode toggle ---------- */
var modeBtn=$('#modeBtn'),expanded=false;
function setMode(exp){expanded=exp;$$('details.chap,details.sub').forEach(function(d){d.open=exp});modeBtn.textContent=exp?UI.briefOnly:UI.expandAll;modeBtn.classList.toggle('on',exp)}
modeBtn.addEventListener('click',function(){setMode(!expanded)});

/* ---------- filters ---------- */
function applyFilters(){
  var hide={};$$('input[data-imp]').forEach(function(i){if(!i.checked)hide[i.getAttribute('data-imp')]=1});
  var f=$('#srcFilter').value;
  $$('[data-imp]').forEach(function(el){if(el.tagName==='INPUT')return;var h=!!hide[el.getAttribute('data-imp')];
    if(!h&&f&&el.hasAttribute('data-files')){h=(' '+el.getAttribute('data-files')+' ').indexOf(' '+f+' ')<0}
    el.classList.toggle('hidden-by-filter',h)});
  $$('[data-files]:not([data-imp])').forEach(function(el){var h=false;if(f){h=(' '+el.getAttribute('data-files')+' ').indexOf(' '+f+' ')<0}el.classList.toggle('hidden-by-filter',h)});
  $$('.toc li[data-imp]').forEach(function(li){li.classList.toggle('hidden-by-filter',!!hide[li.getAttribute('data-imp')])});
}
$$('input[data-imp]').forEach(function(i){i.addEventListener('change',applyFilters)});
$('#srcFilter').addEventListener('change',applyFilters);

/* ---------- search ---------- */
var hits=[],cur=-1,main=$('main');
function clearMarks(){$$('mark.hit').forEach(function(m){var p=m.parentNode;p.replaceChild(document.createTextNode(m.textContent),m);p.normalize()});hits=[];cur=-1}
function doSearch(q){
  clearMarks();$('#cnt').textContent='';
  q=q.trim();if(q.length<2)return;
  var ql=q.toLowerCase();
  var w=document.createTreeWalker(main,NodeFilter.SHOW_TEXT,{acceptNode:function(n){var p=n.parentElement;if(!p||/^(SCRIPT|STYLE|CANVAS|SVG|TEXTAREA)$/i.test(p.tagName)||p.closest('.mmd,.nosearch'))return NodeFilter.FILTER_REJECT;return n.nodeValue.toLowerCase().indexOf(ql)>=0?NodeFilter.FILTER_ACCEPT:NodeFilter.FILTER_REJECT}});
  var nodes=[],n;while((n=w.nextNode()))nodes.push(n);
  nodes.forEach(function(t){var txt=t.nodeValue,low=txt.toLowerCase(),pos=0,i,frag=document.createDocumentFragment();
    while((i=low.indexOf(ql,pos))>=0){if(i>pos)frag.appendChild(document.createTextNode(txt.slice(pos,i)));var m=document.createElement('mark');m.className='hit';m.textContent=txt.slice(i,i+q.length);frag.appendChild(m);hits.push(m);pos=i+q.length}
    if(pos<txt.length)frag.appendChild(document.createTextNode(txt.slice(pos)));t.parentNode.replaceChild(frag,t)});
  hits.forEach(function(m){openAncestors(m)});
  $('#cnt').textContent=hits.length?('1/'+hits.length):UI.noHits;
  if(hits.length)goHit(0);
}
function goHit(i){if(!hits.length)return;if(cur>=0&&hits[cur])hits[cur].classList.remove('cur');cur=(i+hits.length)%hits.length;var m=hits[cur];m.classList.add('cur');openAncestors(m);m.scrollIntoView({block:'center',behavior:'smooth'});$('#cnt').textContent=(cur+1)+'/'+hits.length}
var st;$('#q').addEventListener('input',function(e){clearTimeout(st);var v=e.target.value;st=setTimeout(function(){doSearch(v)},180)});
$('#q').addEventListener('keydown',function(e){if(e.key==='Enter'){e.preventDefault();goHit(cur+(e.shiftKey?-1:1))}});
$('#prev').onclick=function(){goHit(cur-1)};$('#next').onclick=function(){goHit(cur+1)};
document.addEventListener('keydown',function(e){
  if(e.key==='Escape'){closeZoom();dr.classList.remove('open')}
  if(e.key==='/'&&!/INPUT|TEXTAREA|SELECT/.test(document.activeElement.tagName)){e.preventDefault();$('#q').focus()}
});

/* ---------- TOC ---------- */
$$('.toc .tg').forEach(function(t){t.addEventListener('click',function(){var li=t.closest('li');li.classList.toggle('closed');t.textContent=li.classList.contains('closed')?'▸':'▾'})});
function target(id){return document.getElementById(id)}
$$('.toc a').forEach(function(a){a.addEventListener('click',function(e){
  var id=a.getAttribute('href').slice(1),el=target(id);
  if(!el){var parts=id.split('.');while(parts.length>1&&!el){parts.pop();el=target(parts.join('.'))}}
  if(!el)return;e.preventDefault();openAncestors(el);if(el.tagName==='DETAILS')el.open=true;el.scrollIntoView({behavior:'smooth',block:'start'});history.replaceState(null,'','#'+el.id)})});
var tocLinks={};$$('.toc a').forEach(function(a){tocLinks[a.getAttribute('href').slice(1)]=a});
if('IntersectionObserver' in window){
  var vis={};var io=new IntersectionObserver(function(es){es.forEach(function(en){vis[en.target.id]=en.isIntersecting?en.boundingClientRect.top:null});
    var best=null,bt=1e9;Object.keys(vis).forEach(function(k){if(vis[k]!==null&&vis[k]>=-40&&vis[k]<bt){bt=vis[k];best=k}});
    if(!best)return;$$('.toc a.active').forEach(function(x){x.classList.remove('active')});
    var a=tocLinks[best];if(a){a.classList.add('active');var p=a.closest('li');while(p){if(p.classList&&p.classList.contains('closed')){p.classList.remove('closed');var tg=$('.tg',p);if(tg)tg.textContent='▾'}p=p.parentElement&&p.parentElement.closest('li')}
      var sb=$('aside.side');var r=a.getBoundingClientRect();if(r.top<80||r.bottom>window.innerHeight-40)a.scrollIntoView({block:'center'})}},{rootMargin:'0px 0px -70% 0px',threshold:[0,1]});
  $$('[data-toc]').forEach(function(el){io.observe(el)});
}
if(location.hash){var h=target(location.hash.slice(1));if(h){openAncestors(h);if(h.tagName==='DETAILS')h.open=true}}

setMode(false);
renderDiagrams();renderCharts();
})();
`;
