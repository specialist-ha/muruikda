
/* ════════════════════════
   페이지 전환 - scroll-snap 없이 JS로만
════════════════════════ */
let curPage = 'home';
let isScrolling = false;

function smoothScrollTo(el, targetTop, duration){
  const start = el.scrollTop;
  const dist = targetTop - start;
  const startTime = performance.now();
  function easeInOutCubic(t){ return t<0.5 ? 4*t*t*t : 1-Math.pow(-2*t+2,3)/2; }
  function step(now){
    const elapsed = now - startTime;
    const progress = Math.min(elapsed / duration, 1);
    el.scrollTop = start + dist * easeInOutCubic(progress);
    if(progress < 1) requestAnimationFrame(step);
    else isScrolling = false;
  }
  requestAnimationFrame(step);
}

function goPage(to){
  const wrap = document.getElementById('pageWrap');
  const target = to === 'home'
    ? document.getElementById('ph')
    : document.getElementById('pd');
  if(!target || !wrap) return;

  if(to === 'db' && !dbInited) initDB();

  isScrolling = true;
  const targetTop = target.offsetTop;
  smoothScrollTo(wrap, targetTop, 600);

  document.querySelectorAll('#mn li').forEach(l => l.classList.remove('active'));
  const m = document.getElementById('mn-' + to);
  if(m) m.classList.add('active');

  curPage = to;
  updatePlayerVisibility(to);
}

function updatePlayerVisibility(page){
  const plHome = document.querySelector('.pl-home');
  const plDb   = document.querySelector('.pl-db');
  if(plHome) plHome.style.display = page === 'home' ? 'flex' : 'none';
  if(plDb)   plDb.style.display   = page === 'db'   ? 'flex' : 'none';
}

/* 휠 이벤트 */
let wheelLock = false;

function isMenuOpen(){
  return document.getElementById('mp').classList.contains('open');
}

function isInsideScrollableArea(target){
  return !!target.closest('.tt-scr, .board, textarea, input, select');
}

window.addEventListener('wheel', function(e){
  if(isMenuOpen()) return;
  if(isInsideScrollableArea(e.target)) return;
  if(wheelLock) return;

  if(curPage === 'home' && e.deltaY > 20){
    e.preventDefault();
    wheelLock = true;
    goPage('db');
    setTimeout(() => { wheelLock = false; }, 700);
  } else if(curPage === 'db' && e.deltaY < -20){
    const wrap = document.getElementById('pageWrap');
    const pd = document.getElementById('pd');
    if(wrap.scrollTop <= pd.offsetTop + 5){
      e.preventDefault();
      wheelLock = true;
      goPage('home');
      setTimeout(() => { wheelLock = false; }, 700);
    }
  }
}, { passive: false });

/* 키보드 */
window.addEventListener('keydown', function(e){
  if(isMenuOpen() || wheelLock) return;
  if((e.key==='ArrowDown'||e.key==='PageDown'||e.key===' ') && curPage==='home'){
    e.preventDefault(); wheelLock=true; goPage('db'); setTimeout(()=>{wheelLock=false;},800);
  }
  if((e.key==='ArrowUp'||e.key==='PageUp') && curPage==='db'){
    const wrap=document.getElementById('pageWrap');
    const pd=document.getElementById('pd');
    if(wrap.scrollTop<=pd.offsetTop+5){
      e.preventDefault(); wheelLock=true; goPage('home'); setTimeout(()=>{wheelLock=false;},800);
    }
  }
});

/* 스크롤 감지로 curPage 동기화 */
document.getElementById('pageWrap').addEventListener('scroll', function(){
  const wrap = this;
  const pd = document.getElementById('pd');
  const pdTop = pd.offsetTop;
  if(wrap.scrollTop >= pdTop - 100){
    if(curPage !== 'db'){ curPage = 'db'; updatePlayerVisibility('db'); updateMenuActive('db'); if(!dbInited) initDB(); }
  } else {
    if(curPage !== 'home'){ curPage = 'home'; updatePlayerVisibility('home'); updateMenuActive('home'); }
  }
}, { passive: true });

function updateMenuActive(page){
  document.querySelectorAll('#mn li').forEach(l => l.classList.remove('active'));
  const m = document.getElementById('mn-' + page);
  if(m) m.classList.add('active');
}

/* GAS */
const GAS_ATTENDANCE_URL = 'https://script.google.com/macros/s/AKfycbxKEk0fmuGAYwQK-ohstljDNfZDXMZ9-KPt1yDZZ9qp25WvRHrLY1EIgfopU83SasCo/exec';
function getUserKey(){let k=localStorage.getItem('userKey');if(!k){k='u_'+Math.random().toString(36).slice(2)+Date.now();localStorage.setItem('userKey',k);}return k;}
function getUserName(){let n=localStorage.getItem('userName');if(!n){n=prompt('이름 또는 닉네임을 입력하세요')||'익명';localStorage.setItem('userName',n);}return n;}
async function checkIn_old() {
  const payload = { action:'checkIn', userKey:getUserKey(), name:getUserName() };
  fetch(GAS_ATTENDANCE_URL, {
    method:'POST',
    mode:'no-cors',
    body:JSON.stringify(payload)
  });
  // 응답 못 받으니까 UI만 바로 업데이트
  document.getElementById('wcStatus').className = 'wc-status working';
  document.getElementById('wcStatusTxt').textContent = '근무중';
  document.getElementById('wcOutBtn').classList.add('active');
  alert('출근 처리했어요!');
}

async function checkOut_old() {
  const payload = { action:'checkOut', userKey:getUserKey(), name:getUserName() };
  fetch(GAS_ATTENDANCE_URL, {
    method:'POST',
    mode:'no-cors',
    body:JSON.stringify(payload)
  });
  document.getElementById('wcStatus').className = 'wc-status';
  document.getElementById('wcStatusTxt').textContent = '퇴근';
  document.getElementById('wcOutBtn').classList.remove('active');
  alert('퇴근 처리했어요!');
}
async function loadAttendanceSummary(){const url=`${GAS_ATTENDANCE_URL}?action=summary&userKey=${encodeURIComponent(getUserKey())}`;const r=await fetch(url);const d=await r.json();const mins=d.myWorkMinutes??0;const pct=Math.min(100,Math.round(mins/480*100));document.getElementById('todayCheckinCount').textContent=d.todayCheckinCount??0;document.getElementById('workingCount').textContent=d.workingCount??0;document.getElementById('myWorkTime').textContent=d.myWorkTimeText??'0시간 0분';document.getElementById('wcProgFill').style.width=pct+'%';document.getElementById('wcProgPct').textContent=pct+'%';}

/* 시계 */
const DAYS=['일','월','화','수','목','금','토'];
function f2(n){return String(n).padStart(2,'0');}
function tick(){
  const n=new Date();
  const t=f2(n.getHours())+':'+f2(n.getMinutes())+':'+f2(n.getSeconds());
  const d=n.getFullYear()+'. '+f2(n.getMonth()+1)+'. '+f2(n.getDate())+' ('+DAYS[n.getDay()]+')';
  const dl=n.getFullYear()+'년 '+(n.getMonth()+1)+'월 '+n.getDate()+'일 '+DAYS[n.getDay()]+'요일';
  const hC=document.getElementById('hClock');const hD=document.getElementById('hDate');
  const dC=document.getElementById('dClock');const dD=document.getElementById('dDate');
  const dc=document.getElementById('dC');const dd=document.getElementById('dD');
  if(hC)hC.textContent=t;if(hD)hD.textContent=dl;if(dC)dC.textContent=t;if(dD)dD.textContent=d;if(dc)dc.textContent=t;if(dd)dd.textContent=d;
}
tick();setInterval(tick,1000);

/* 메뉴 */
let mOpen=false;
function toggleMenu(){mOpen=!mOpen;document.getElementById('mp').classList.toggle('open',mOpen);document.getElementById('mo').classList.toggle('open',mOpen);['hn','dn'].forEach(id=>{const el=document.getElementById(id);if(el)el.classList.toggle('mopen',mOpen);});}
function closeMenu(){mOpen=false;document.getElementById('mp').classList.remove('open');document.getElementById('mo').classList.remove('open');['hn','dn'].forEach(id=>{const el=document.getElementById(id);if(el)el.classList.remove('mopen');});}

/* 플레이어 */
/* ════════════════════════
   YouTube 플레이어
════════════════════════ */
let ytPlayer = null;
let ytReady = false;
let ytPlaying = false;
let ytProgressTmr = null;

const YT_PLAYLISTS = [
  { title:'Lo-fi Study Beats', sub:'집중 공부용', id:'PLOzDu-MXXLliO9gyCms7TeQi8UhtBEggr', type:'playlist' },
  { title:'Chill Lo-fi Hip Hop', sub:'카페 분위기', id:'PLFPg_IUxqnZNnACUGvsGALFJHMOTt5Dke', type:'playlist' },
  { title:'Study Music Alpha Waves', sub:'집중력 향상', id:'PLtwekgaLBpNv5v_CJYt-0K0SWKOH7PB1a', type:'playlist' },
  { title:'Piano Study Music', sub:'피아노 감성', id:'PL6NdkXsPL07KiewBDpJC9lCn-XRDwI9eq', type:'playlist' },
  { title:'Jazz for Study', sub:'재즈 카페', id:'PLOPiWVjg6aTzsA53N19YqJQeZpSCH9QPc', type:'playlist' },
];

function onYouTubeIframeAPIReady(){
  ytPlayer = new YT.Player('ytPlayer', {
    height:'1', width:'1',
    events:{
      onReady: () => { ytReady = true; renderYtPlaylists(); },
      onStateChange: onYtStateChange,
      onError: (e) => { console.log('YT Error:', e.data); }
    }
  });
}

function onYtStateChange(e){
  if(e.data === YT.PlayerState.PLAYING){
    ytPlaying = true;
    updatePlayBtn(true);
    startYtProgress();
    updateYtInfo();
  } else if(e.data === YT.PlayerState.PAUSED || e.data === YT.PlayerState.ENDED){
    ytPlaying = false;
    updatePlayBtn(false);
    stopYtProgress();
  }
}

function updatePlayBtn(playing){
  const pauseIcon = '<path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/>';
  const playIcon  = '<path d="M8 5v14l11-7z"/>';
  ['hPI','dPI','fPI'].forEach(id => {
    const el = document.getElementById(id);
    if(el) el.innerHTML = playing ? pauseIcon : playIcon;
  });
}

function togglePlay(){
  if(!ytReady || !ytPlayer) { openYtPicker(); return; }
  try {
    const state = ytPlayer.getPlayerState();
    if(state === YT.PlayerState.PLAYING){ ytPlayer.pauseVideo(); }
    else { ytPlayer.playVideo(); }
  } catch(e) { openYtPicker(); }
}

function ytNext(){
  if(!ytReady || !ytPlayer) return;
  try { ytPlayer.nextVideo(); } catch(e){}
}

function ytPrev(){
  if(!ytReady || !ytPlayer) return;
  try { ytPlayer.previousVideo(); } catch(e){}
}

function seekP(e, bar){
  if(!ytReady || !ytPlayer) return;
  try {
    const r = bar.getBoundingClientRect();
    const pct = Math.max(0, Math.min(1, (e.clientX - r.left) / r.width));
    const dur = ytPlayer.getDuration() || 0;
    ytPlayer.seekTo(pct * dur, true);
  } catch(ex){}
}

function startYtProgress(){
  stopYtProgress();
  ytProgressTmr = setInterval(updateYtProgress, 500);
}

function stopYtProgress(){
  if(ytProgressTmr){ clearInterval(ytProgressTmr); ytProgressTmr = null; }
}

function updateYtProgress(){
  if(!ytReady || !ytPlayer) return;
  try {
    const cur = ytPlayer.getCurrentTime() || 0;
    const dur = ytPlayer.getDuration() || 0;
    const pct = dur > 0 ? (cur / dur * 100).toFixed(1) + '%' : '0%';
    const curStr = fmtSec(cur);
    const durStr = fmtSec(dur);
    ['hPF','dPF','fPF'].forEach(id => { const el=document.getElementById(id); if(el) el.style.width=pct; });
    ['hPT','dPT','fPT'].forEach(id => { const el=document.getElementById(id); if(el) el.textContent=curStr; });
    ['hPD','dPD','fPD'].forEach(id => { const el=document.getElementById(id); if(el) el.textContent=durStr; });
  } catch(e){}
}

function updateYtInfo(){
  if(!ytReady || !ytPlayer) return;
  try {
    const data = ytPlayer.getVideoData();
    const title = data.title || '재생 중';
    ['hPiT','dPiT','fYtTitle'].forEach(id => { const el=document.getElementById(id); if(el) el.textContent=title; });
    ['hPiA','dPiA','fYtSub'].forEach(id => { const el=document.getElementById(id); if(el) el.textContent='YouTube'; });
    const vid = data.video_id;
    if(vid){
      const bg = `url(https://img.youtube.com/vi/${vid}/default.jpg) center/cover`;
      ['ytThumb','ytThumbDb'].forEach(id => { const el=document.getElementById(id); if(el){ el.style.background=bg; el.textContent=''; }});
      const fThumb = document.getElementById('fYtThumb');
      if(fThumb) fThumb.innerHTML = `<img src="https://img.youtube.com/vi/${vid}/default.jpg" style="width:100%;height:100%;object-fit:cover;">`;
    }
  } catch(e){}
}

function fmtSec(s){
  s = Math.floor(s||0);
  const m = Math.floor(s/60);
  const sec = s%60;
  return m+':'+String(sec).padStart(2,'0');
}

function openYtPicker(){
  document.getElementById('ytModal').style.display = 'block';
  renderYtPlaylists();
}

function closeYtPicker(){
  document.getElementById('ytModal').style.display = 'none';
}

function renderYtPlaylists(){
  const list = document.getElementById('ytPlaylistList');
  if(!list) return;
  list.innerHTML = '';
  YT_PLAYLISTS.forEach((pl, idx) => {
    const div = document.createElement('div');
    div.style.cssText = 'display:flex;align-items:center;gap:12px;padding:10px 12px;background:var(--db-bg3);border:.5px solid var(--db-b);border-radius:8px;cursor:pointer;transition:background .15s;';
    div.innerHTML = `
      <div style="width:36px;height:36px;border-radius:6px;background:linear-gradient(135deg,#e05a5a,#5a9fd4);display:flex;align-items:center;justify-content:center;font-size:16px;flex-shrink:0;">🎵</div>
      <div style="flex:1;min-width:0;">
        <div style="font-size:13px;font-weight:500;color:var(--t);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${pl.title}</div>
        <div style="font-size:11px;color:var(--t3);margin-top:2px;">${pl.sub}</div>
      </div>
      <div style="font-size:11px;color:var(--blue);flex-shrink:0;">▶ 재생</div>
    `;
    div.addEventListener('mouseenter', () => div.style.background = 'var(--db-bg4)');
    div.addEventListener('mouseleave', () => div.style.background = 'var(--db-bg3)');
    div.addEventListener('click', () => loadYtPlaylist(pl));
    list.appendChild(div);
  });
}

function loadYtPlaylist(pl){
  if(!ytReady || !ytPlayer) return;
  try {
    ytPlayer.loadPlaylist({ list: pl.id, listType: 'playlist', index: 0, startSeconds: 0 });
    ['hPiT','dPiT'].forEach(id => { const el=document.getElementById(id); if(el) el.textContent=pl.title; });
    ['hPiA','dPiA'].forEach(id => { const el=document.getElementById(id); if(el) el.textContent=pl.sub; });
    closeYtPicker();
  } catch(e){ console.log(e); }
}

function loadYtUrl(){
  const url = document.getElementById('ytUrlInput').value.trim();
  if(!url || !ytReady || !ytPlayer) return;

  // 비디오 ID 추출
  let vid = '';
  let listId = '';
  try {
    const u = new URL(url);
    vid    = u.searchParams.get('v') || '';
    listId = u.searchParams.get('list') || '';
  } catch(e){
    const m = url.match(/(?:v=|youtu\.be\/)([^&\n?#]+)/);
    if(m) vid = m[1];
  }

  try {
    if(listId){
      ytPlayer.loadPlaylist({ list: listId, listType: 'playlist' });
    } else if(vid){
      ytPlayer.loadVideoById(vid);
    } else {
      alert('유효한 유튜브 URL을 입력해줘');
      return;
    }
    closeYtPicker();
  } catch(e){ console.log(e); }
}

/* 날씨 */
const GAS_WEATHER_URL="https://script.googleusercontent.com/macros/echo?user_content_key=AWDtjMVxpO_o7U2Cp9eSijp86_TZpx85IJIJWuBuDX51hkpYUiz-RO7rjyBhKrADVB-GQZw-vmbVeBlo013fDQoT3pQPxetG6h-dIpOXIUP3xS3LO3ltzlhZXiDiJI43zV-BwWsuwVAsUF-PpFPtaZL1Tr9x9a0VnHLabrAG0aLaYm7JdYeMZ8cVUoeM9H5Om_0dVB8mDKWyUps_seRdpzIR7v2oeMRCgP6dcLwcR51SWF4qtU0o96b7MKjhnTFedEyJHlDuHOM2f7lcDqYLpmDqaeh6-4mGgQ&lib=M_ekVY90NL4iHSOWS95eD6ba-RLMj33V4";
let wxDay=0,weatherCache=null;
async function fetchWeatherFromGas(){const r=await fetch(GAS_WEATHER_URL);if(!r.ok)throw new Error('날씨 실패');weatherCache=await r.json();return weatherCache;}
function iconByDesc(d){if(!d)return'sun';d=d.toLowerCase();if(d.includes('비'))return'rain';if(d.includes('눈'))return'snow';if(d.includes('흐림')||d.includes('구름'))return'cloud';return'sun';}
function parseMm(v){const c=String(v).replace(/[^0-9.]/g,'');const n=Number(c);return isNaN(n)?0:n;}
function wxIconSvg(t){const m={sun:`<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="4"></circle><path d="M12 2.5v2.5M12 19v2.5M2.5 12H5M19 12h2.5M5.64 5.64l1.77 1.77M16.59 16.59l1.77 1.77M5.64 18.36l1.77-1.77M16.59 7.41l1.77-1.77"></path></svg>`,cloud:`<svg viewBox="0 0 24 24"><path d="M7 18.5h9a4 4 0 0 0 .4-7.98A5.5 5.5 0 0 0 6.12 8.8 3.8 3.8 0 0 0 7 18.5Z"></path></svg>`,rain:`<svg viewBox="0 0 24 24"><path d="M7 15.5h9a4 4 0 0 0 .4-7.98A5.5 5.5 0 0 0 6.12 5.8 3.8 3.8 0 0 0 7 15.5Z"></path><path d="M9 17.5l-1 2.2M13 17.5l-1 2.2M17 17.5l-1 2.2"></path></svg>`};return m[t]||m.cloud;}
function renderWx(){if(!weatherCache||!weatherCache.cities)return;const city=document.getElementById('wxCity').value;const w=weatherCache.cities[city];if(!w)return;let tgt=wxDay===0?w.current:wxDay===1?w.today:w.tomorrow;const desc=wxDay===0?(w.current.desc||'--'):(parseMm(tgt.rain)>0?'비':'맑음');document.getElementById('wxIcon').innerHTML=wxIconSvg(iconByDesc(desc));document.getElementById('wxTemp').textContent=wxDay===0?(w.current.temp||'--'):(tgt.high||'--');document.getElementById('wxDesc').textContent=desc;document.getElementById('wxHL').textContent='최저 '+(tgt.low||'--');document.getElementById('wxHH').textContent='최고 '+(tgt.high||'--');document.getElementById('wxRain').textContent='강수 : '+(tgt.rain||'--');const pm10=w.today.pm10||'--';const pm25=w.today.pm25||'--';document.getElementById('wxPm').textContent='미세먼지 '+pm10+' / 초미세먼지 '+pm25;}
function switchWx(el,day){document.querySelectorAll('.wx-tab').forEach(t=>t.classList.remove('active'));el.classList.add('active');wxDay=day;renderWx();}
function updateWx(){renderWx();}
async function initWx(){try{await fetchWeatherFromGas();renderWx();setInterval(async()=>{try{await fetchWeatherFromGas();renderWx();}catch(e){}},600000);}catch(e){document.getElementById('wxDesc').textContent='불러오기 실패';}}

/* 타임테이블 */
const ROWS=37;
const TIMES=['06:00','06:30','07:00','07:30','08:00','08:30','09:00','09:30','10:00','10:30','11:00','11:30','12:00','12:30','13:00','13:30','14:00','14:30','15:00','15:30','16:00','16:30','17:00','17:30','18:00','18:30','19:00','19:30','20:00','20:30','21:00','21:30','22:00','22:30','23:00','23:30','00:00'];
const ROW_H=32;
let blocks=[],selBlock=null,selRange=null,blockIdCtr=0;
const initBlocks=[{col:0,startRow:8,span:1,text:'[N코레-파트3] 틀린 문제',color:'cp'},{col:1,startRow:8,span:1,text:'[N코레-파트3] 틀린 문제',color:'cp'},{col:0,startRow:9,span:1,text:'엑셀 태블릿 정리',color:'cp'},{col:1,startRow:9,span:1,text:'엑셀 태블릿 정리',color:'cp'},{col:0,startRow:12,span:1,text:'[경영 2900제]',color:'cb'},{col:1,startRow:12,span:1,text:'[경영 2900제] 1400~2900',color:'cb'},{col:0,startRow:14,span:1,text:'[NCS-응수] 30문',color:'cg'},{col:1,startRow:14,span:1,text:'[NCS-응수] 30문',color:'cg'},{col:0,startRow:19,span:1,text:'[철도법령]',color:'cy'},{col:1,startRow:24,span:1,text:'[경영 2900제] 1~1400',color:'cb'},{col:1,startRow:25,span:1,text:'틀린 문제 다시',color:'cb'},{col:1,startRow:32,span:1,text:'틀린 문제 다시',color:'cb'},{col:1,startRow:35,span:1,text:'[철도법령]',color:'cy'}];

function getCurrentRowIndex(){const now=new Date();const mins=now.getHours()*60+now.getMinutes();return Math.max(0,Math.min(ROWS-1,Math.floor((mins-360)/30)));}
function colWidth(){return Math.round((document.getElementById('ttGrid').offsetWidth-54)/2);}
function colToX(col){return col===0?54:54+colWidth();}

function buildTT(){
  const grid=document.getElementById('ttGrid');if(!grid)return;
  grid.innerHTML='';
  for(let i=0;i<ROWS;i++){const row=document.createElement('div');row.className='tt-row';row.style.height=ROW_H+'px';const tm=document.createElement('div');tm.className='tt-time';tm.textContent=TIMES[i];const g=document.createElement('div');g.className='tt-cell-wrap';const r=document.createElement('div');r.className='tt-cell-wrap';row.append(tm,g,r);grid.appendChild(row);}
  for(let c=0;c<2;c++){const ov=document.createElement('div');ov.className='tt-sel-overlay';ov.id='ttOv'+c;grid.appendChild(ov);}
  blocks.forEach(b=>renderBlock(b));
  setupTTEvents();
  setTimeout(()=>scrollTTToNow(true),300);
}

function scrollTTToNow(force){const ttScr=document.getElementById('ttScr');if(!ttScr)return;const idx=getCurrentRowIndex();ttScr.scrollTo({top:Math.max(0,idx*ROW_H),behavior:force?'auto':'smooth'});highlightCurrentTime();}
function highlightCurrentTime(){const idx=getCurrentRowIndex();document.querySelectorAll('.tt-row.now').forEach(el=>el.classList.remove('now'));const rows=document.querySelectorAll('.tt-row');if(rows[idx])rows[idx].classList.add('now');}

function renderBlock(b){
  let el=document.getElementById('blk-'+b.id);
  if(!el){el=document.createElement('div');el.id='blk-'+b.id;el.className='tt-block';el.addEventListener('mousedown',e=>startBlockDrag(e,b));el.addEventListener('click',e=>{e.stopPropagation();selectBlock(b);});document.getElementById('ttGrid').appendChild(el);}
  const cw=colWidth();
  el.className='tt-block '+(b.color||'')+' '+(selBlock&&selBlock.id===b.id?'selected':'');
  el.style.cssText=`top:${b.startRow*ROW_H+2}px;height:${b.span*ROW_H-4}px;left:${colToX(b.col)+2}px;width:${cw-4}px;`;
  if(!el.querySelector('input')){const inp=document.createElement('input');inp.type='text';inp.value=b.text||'';inp.addEventListener('change',e=>{b.text=e.target.value;});inp.addEventListener('mousedown',e=>e.stopPropagation());el.appendChild(inp);}
  else el.querySelector('input').value=b.text||'';
}

function selectBlock(b){selBlock=b;selRange=null;updateSelectionOverlay();document.getElementById('ttSelInfo').textContent='선택: '+(b.col===0?'목표':'실제')+' '+TIMES[b.startRow]+' ('+b.span+'칸)';blocks.forEach(x=>{const el=document.getElementById('blk-'+x.id);if(el)el.classList.toggle('selected',x.id===b.id);});}

function startBlockDrag(e,b){e.preventDefault();e.stopPropagation();selectBlock(b);const startY=e.clientY,startRow=b.startRow;const grid=document.getElementById('ttGrid');const gridRect=grid.getBoundingClientRect();function onMove(ev){const dy=ev.clientY-startY;const dr=Math.round(dy/ROW_H);const newRow=Math.max(0,Math.min(ROWS-b.span,startRow+dr));const mx=ev.clientX-gridRect.left;const newCol=mx<54+colWidth()?0:1;b.startRow=newRow;b.col=newCol;renderBlock(b);}function onUp(){document.removeEventListener('mousemove',onMove);document.removeEventListener('mouseup',onUp);}document.addEventListener('mousemove',onMove);document.addEventListener('mouseup',onUp);}

function setupTTEvents(){
  const grid=document.getElementById('ttGrid');if(!grid)return;
  let dragStart=null;
  grid.addEventListener('mousedown',e=>{if(e.target.closest('.tt-block'))return;const rect=grid.getBoundingClientRect();const x=e.clientX-rect.left;const y=e.clientY-rect.top;if(x<54)return;const col=x<54+colWidth()?0:1;const row=Math.max(0,Math.min(ROWS-1,Math.floor(y/ROW_H)));dragStart={col,row};selBlock=null;document.querySelectorAll('.tt-block').forEach(b=>b.classList.remove('selected'));e.preventDefault();});
  document.addEventListener('mousemove',e=>{if(!dragStart)return;const rect=grid.getBoundingClientRect();const y=e.clientY-rect.top;const row=Math.max(0,Math.min(ROWS-1,Math.floor(y/ROW_H)));const r1=Math.min(dragStart.row,row);const r2=Math.max(dragStart.row,row);selRange={col:dragStart.col,r1,r2};document.getElementById('ttSelInfo').textContent=(dragStart.col===0?'목표':'실제')+' '+TIMES[r1]+'~'+TIMES[Math.min(r2+1,ROWS-1)]+' ('+(r2-r1+1)+'칸 선택)';updateSelectionOverlay();});
  document.addEventListener('mouseup',()=>{if(dragStart){dragStart=null;updateSelectionOverlay();}});
}

function mergeSelected(){if(!selRange)return;const{col,r1,r2}=selRange;const ov=blocks.filter(b=>b.col===col&&!(b.startRow+b.span<=r1||b.startRow>r2)).sort((a,b)=>a.startRow-b.startRow);let keepText='',keepColor='cb';if(ov.length){keepText=ov[0].text||'';keepColor=ov[0].color||'cb';}blocks=blocks.filter(b=>{if(b.col!==col)return true;const o=!(b.startRow+b.span<=r1||b.startRow>r2);if(o){const el=document.getElementById('blk-'+b.id);if(el)el.remove();}return!o;});const b={id:++blockIdCtr,col,startRow:r1,span:r2-r1+1,text:keepText,color:keepColor};blocks.push(b);renderBlock(b);selectBlock(b);selRange=null;updateSelectionOverlay();}
function unmergeSelected(){if(!selBlock)return;const{col,startRow,span,text,color}=selBlock;blocks=blocks.filter(b=>b.id!==selBlock.id);const el=document.getElementById('blk-'+selBlock.id);if(el)el.remove();selBlock=null;for(let i=0;i<span;i++){const b={id:++blockIdCtr,col,startRow:startRow+i,span:1,text:i===0?text:'',color};blocks.push(b);renderBlock(b);}document.getElementById('ttSelInfo').textContent='셀을 드래그하여 범위 선택 후 병합';}
function deleteSelected(){if(selBlock){blocks=blocks.filter(b=>b.id!==selBlock.id);const el=document.getElementById('blk-'+selBlock.id);if(el)el.remove();selBlock=null;document.getElementById('ttSelInfo').textContent='셀을 드래그하여 범위 선택 후 병합';}}
function addBlock(){let col=0,row=getCurrentRowIndex();if(selRange){col=selRange.col;row=selRange.r1;}const b={id:++blockIdCtr,col,startRow:row,span:selRange?(selRange.r2-selRange.r1+1):1,text:'새 일정',color:'cb'};blocks.push(b);renderBlock(b);selectBlock(b);selRange=null;updateSelectionOverlay();}
function setBlockColor(c){if(!selBlock)return;selBlock.color=c;renderBlock(selBlock);}
function updateSelectionOverlay(){['ttOv0','ttOv1'].forEach((id,idx)=>{const el=document.getElementById(id);if(!el)return;if(!selRange||selRange.col!==idx){el.style.display='none';return;}el.style.display='block';el.style.top=(selRange.r1*ROW_H)+'px';el.style.height=((selRange.r2-selRange.r1+1)*ROW_H)+'px';el.style.left=(54+(idx===0?0:colWidth()))+'px';el.style.width=colWidth()+'px';});}
function copySelectedBlock(){if(!selBlock)return;const newStart=Math.min(ROWS-selBlock.span,selBlock.startRow+selBlock.span);const c={id:++blockIdCtr,col:selBlock.col,startRow:newStart,span:selBlock.span,text:selBlock.text||'',color:selBlock.color||''};blocks.push(c);renderBlock(c);selectBlock(c);}

/* 게시판 */
const boards={info:[{t:'KORAIL 운전직 시험 일정 총정리 2026',m:'공지 · 댓글 12 · 2시간 전'},{t:'철도법령 단원별 핵심 정리 공유합니다',m:'study_k · 댓글 7 · 3시간 전'},{t:'NCS 수리 공식 모음 PDF',m:'레일러 · 댓글 4 · 어제'},{t:'경영학 2900제 풀이 순서 추천',m:'익명 · 댓글 9 · 어제'},{t:'모의고사 오답 정리 방법',m:'user42 · 댓글 3 · 2일 전'}],free:[{t:'1주일 남았는데 불안해요',m:'익명 · 댓글 18 · 30분 전'},{t:'합격 후기 올립니다 (운전직)',m:'합격자 · 댓글 34 · 1시간 전'},{t:'같이 스터디 하실 분 구해요',m:'서울 · 댓글 6 · 2시간 전'},{t:'공부하다 지칠 때 어떻게 하세요?',m:'익명 · 댓글 11 · 어제'},{t:'무르익다 쓰니까 관리가 잘 돼요',m:'user91 · 댓글 2 · 2일 전'}],famous:[{t:'와 개지린다',m:'무르 · 댓글 29 · 32분 전'}]};
let curBoard='info';
function renderBoard(){document.getElementById('boardList').innerHTML=boards[curBoard].map(it=>`<div class="bi"><div class="bi-t">${it.t}</div><div class="bi-m">${it.m}</div></div>`).join('');}
function switchBoard(el,k){document.querySelectorAll('.btab').forEach(t=>t.classList.remove('active'));el.classList.add('active');curBoard=k;renderBoard();}

/* 뽀모도로 */
let pomoRun=false,pomoIsRest=false,pomoSec=25*60,pomoCyc=25,pomoRest=5,pomoDone=0,pomoTot=4,pomoTmr=null,pomoFocusColor='#e05a5a',pomoRestColor='#5a9fd4',pomoExpanded=false;
const CARD_CIRC=314,FULL_CIRC=911;

function updatePomo(){
  const total=pomoIsRest?pomoRest*60:pomoCyc*60;const pct=pomoSec/total;const off=Math.round(CARD_CIRC*(1-pct));
  const rF=document.getElementById('pomoR'),rR=document.getElementById('pomoRest');
  if(!pomoIsRest){if(rF){rF.setAttribute('stroke-dashoffset',off);rF.style.stroke=pomoFocusColor;rF.style.opacity='1';}if(rR){rR.setAttribute('stroke-dashoffset',CARD_CIRC);rR.style.stroke=pomoRestColor;rR.style.opacity='0';}}
  else{if(rF){rF.setAttribute('stroke-dashoffset',CARD_CIRC);rF.style.opacity='0';}if(rR){rR.setAttribute('stroke-dashoffset',off);rR.style.stroke=pomoRestColor;rR.style.opacity='1';}}
  const tm=Math.floor(pomoSec/60)+':'+f2(pomoSec%60);
  document.getElementById('pomoTm').textContent=tm;
  document.getElementById('pomoCn').textContent=pomoDone+' / '+pomoTot+' 싸이클';
  document.getElementById('pomoMode').textContent=!pomoRun?'대기':(pomoIsRest?'휴식':'집중');
  const psT=document.getElementById('psT'),psC=document.getElementById('psC'),psR=document.getElementById('psR'),psD=document.getElementById('psD');
  if(psT)psT.textContent=pomoTot+' 회';if(psC)psC.textContent=pomoCyc+' 분';if(psR)psR.textContent=pomoRest+' 분';if(psD)psD.textContent=pomoDone+' 회';
  const ct=document.getElementById('cardTot'),cc=document.getElementById('cardCyc'),cr=document.getElementById('cardRest');
  if(ct)ct.value=pomoTot;if(cc)cc.value=pomoCyc;if(cr)cr.value=pomoRest;
}
updatePomo();

function syncFullRun(){
  const total=pomoIsRest?pomoRest*60:pomoCyc*60;const pct=pomoSec/total;const off=Math.round(FULL_CIRC*(1-pct));
  const rF=document.getElementById('fRunFill'),rR=document.getElementById('fRunRest');
  if(!pomoIsRest){if(rF){rF.setAttribute('stroke-dashoffset',off);rF.setAttribute('stroke',pomoFocusColor);}if(rR)rR.setAttribute('stroke-dashoffset',FULL_CIRC);}
  else{if(rF)rF.setAttribute('stroke-dashoffset',FULL_CIRC);if(rR){rR.setAttribute('stroke-dashoffset',off);rR.setAttribute('stroke',pomoRestColor);}}
  const tm=Math.floor(pomoSec/60)+':'+f2(pomoSec%60);const mode=pomoIsRest?'휴식':'집중';
  const fT=document.getElementById('fRunTm'),fC=document.getElementById('fRunCn'),fM=document.getElementById('fRunMode'),fB=document.getElementById('fRunBtn');
  if(fT)fT.textContent=tm;if(fC)fC.textContent=(pomoDone+1)+' / '+pomoTot+' 싸이클';if(fM){fM.textContent=mode;fM.style.color=pomoIsRest?pomoRestColor:pomoFocusColor;}if(fB)fB.textContent=pomoRun?'일시정지':'시작';
}

function pomoTick(){
  if(pomoSec>0){pomoSec--;updatePomo();syncFullRun();return;}
  if(!pomoIsRest){playBell();showPomoNotify('공부 완료! 휴식 시작 🟦');pomoIsRest=true;pomoSec=pomoRest*60;updatePomo();syncFullRun();}
  else{pomoDone++;playBell();if(pomoDone>=pomoTot){clearInterval(pomoTmr);pomoRun=false;pomoIsRest=false;pomoSec=pomoCyc*60;updatePomoBtn(false);updatePomo();syncFullRun();showPomoNotify('🎉 모든 싸이클 완료!');setTimeout(()=>{alert('🎉 '+pomoTot+'싸이클 전부 완료! 수고했어요!');resetPomo();},400);return;}showPomoNotify(pomoDone+'싸이클 완료! 다음 공부 시작 🟥');pomoIsRest=false;pomoSec=pomoCyc*60;updatePomo();syncFullRun();}
}

function updatePomoBtn(running){const btn=document.getElementById('pomoBtn');if(!btn)return;if(running){btn.textContent='일시정지';btn.classList.add('run');expandCardRing();}else{btn.textContent='시작';btn.classList.remove('run');shrinkCardRing();}}

function expandCardRing(){if(pomoExpanded)return;pomoExpanded=true;const wrap=document.getElementById('pomoRingWrap'),svg=document.getElementById('pomoSvg'),stats=document.getElementById('pomoStats'),ctrls=document.getElementById('pomoCtrls');wrap.style.width='160px';wrap.style.height='160px';svg.setAttribute('width','160');svg.setAttribute('height','160');svg.setAttribute('viewBox','0 0 160 160');document.querySelectorAll('#pomoSvg circle').forEach(c=>{c.setAttribute('cx','80');c.setAttribute('cy','80');c.setAttribute('r','66');c.setAttribute('stroke-dasharray',Math.round(2*Math.PI*66));});document.getElementById('pomoTm').style.fontSize='26px';if(ctrls)ctrls.innerHTML=`<button class="pb" onclick="skipPomo()">스킵</button><button class="pb prim run" id="pomoBtn" onclick="togglePomo()">일시정지</button>`;if(stats)stats.style.display='none';}
function shrinkCardRing(){if(!pomoExpanded)return;pomoExpanded=false;const wrap=document.getElementById('pomoRingWrap'),svg=document.getElementById('pomoSvg'),stats=document.getElementById('pomoStats'),ctrls=document.getElementById('pomoCtrls');wrap.style.width='120px';wrap.style.height='120px';svg.setAttribute('width','120');svg.setAttribute('height','120');svg.setAttribute('viewBox','0 0 120 120');document.querySelectorAll('#pomoSvg circle').forEach(c=>{c.setAttribute('cx','60');c.setAttribute('cy','60');c.setAttribute('r','50');c.setAttribute('stroke-dasharray','314');});document.getElementById('pomoTm').style.fontSize='22px';if(ctrls)ctrls.innerHTML=`<button class="pb" onclick="skipPomo()">스킵</button><button class="pb prim" id="pomoBtn" onclick="togglePomo()">시작</button><button class="pb" onclick="resetPomo()">초기화</button>`;if(stats)stats.style.display='';updatePomo();}

function togglePomo(){pomoRun=!pomoRun;if(pomoRun){pomoTmr=setInterval(pomoTick,1000);updatePomoBtn(true);}else{clearInterval(pomoTmr);updatePomoBtn(false);}updatePomo();syncFullRun();}
function togglePomoFull(){pomoRun=!pomoRun;if(pomoRun){pomoTmr=setInterval(pomoTick,1000);}else clearInterval(pomoTmr);const fB=document.getElementById('fRunBtn');if(fB)fB.textContent=pomoRun?'일시정지':'시작';syncFullRun();}
function skipPomo(){if(!pomoIsRest){showPomoNotify('공부 스킵 → 휴식 시작 🟦');pomoIsRest=true;pomoSec=pomoRest*60;if(!pomoRun){pomoRun=true;pomoTmr=setInterval(pomoTick,1000);updatePomoBtn(true);}}else{pomoDone++;if(pomoDone>=pomoTot){showPomoNotify('🎉 모든 싸이클 완료!');clearInterval(pomoTmr);pomoRun=false;setTimeout(()=>{alert('🎉 완료!');resetPomo();},300);return;}showPomoNotify(pomoDone+'싸이클 완료! 다음 공부 시작 🟥');pomoIsRest=false;pomoSec=pomoCyc*60;if(!pomoRun){pomoRun=true;pomoTmr=setInterval(pomoTick,1000);updatePomoBtn(true);}}updatePomo();syncFullRun();}
function resetPomo(){clearInterval(pomoTmr);pomoRun=false;pomoIsRest=false;pomoDone=0;pomoSec=pomoCyc*60;updatePomoBtn(false);updatePomo();syncFullRun();}
function adjPomo(t,d){if(t==='tot')pomoTot=Math.max(1,Math.min(20,pomoTot+d));if(t==='cyc')pomoCyc=Math.max(1,Math.min(90,pomoCyc+d));if(t==='rest')pomoRest=Math.max(1,Math.min(30,pomoRest+d));if(!pomoRun){pomoSec=pomoCyc*60;pomoIsRest=false;}updateFullSetupDisp();updatePomo();}
function setPomoVal(t,v){const n=parseInt(v);if(isNaN(n))return;if(t==='tot')pomoTot=Math.max(1,Math.min(20,n));if(t==='cyc')pomoCyc=Math.max(1,Math.min(90,n));if(t==='rest')pomoRest=Math.max(1,Math.min(30,n));if(!pomoRun){pomoSec=pomoCyc*60;pomoIsRest=false;}updateFullSetupDisp();updatePomo();}
function setPomoColorDirect(t,c){if(t==='focus'){pomoFocusColor=c;const ci=document.getElementById('cardFocusColor');if(ci)ci.value=c;}else{pomoRestColor=c;const ci=document.getElementById('cardRestColor');if(ci)ci.value=c;}applyPomoColors();}
function applyPomoColors(){const rF=document.getElementById('pomoR'),rR=document.getElementById('pomoRest');if(rF)rF.style.stroke=pomoFocusColor;if(rR)rR.style.stroke=pomoRestColor;const fF=document.getElementById('fRunFill'),fR=document.getElementById('fRunRest');if(fF)fF.setAttribute('stroke',pomoFocusColor);if(fR)fR.setAttribute('stroke',pomoRestColor);const sa=document.getElementById('fSetupFocusArc'),sb=document.getElementById('fSetupRestArc');if(sa)sa.setAttribute('stroke',pomoFocusColor);if(sb)sb.setAttribute('stroke',pomoRestColor);}
function updateFullSetupDisp(){
  const t=document.getElementById('fTotDisp'),c=document.getElementById('fCycDisp'),r=document.getElementById('fRestDisp');
  if(t)t.value=pomoTot;if(c)c.value=pomoCyc;if(r)r.value=pomoRest;
  const prev=document.getElementById('fSetupPreview');
  if(prev)prev.textContent=pomoCyc+'분 · '+pomoRest+'분 × '+pomoTot+'회';
}
function setFullBg(type){
  const bg=document.getElementById('pomoFullBg');
  const solid=document.getElementById('pomoFullBgSolid');
  const colorPanel=document.getElementById('bgColorPanel');
  const ids=['bgOptForest','bgOptDark','bgOptTrans'];
  ids.forEach(id=>{const el=document.getElementById(id);if(el){el.style.background='rgba(255,255,255,.05)';el.style.border='.5px solid rgba(255,255,255,.1)';el.style.color='rgba(255,255,255,.5)';el.style.fontWeight='400';}});
  const on=document.getElementById(type==='forest'?'bgOptForest':type==='solid'?'bgOptDark':'bgOptTrans');
  if(on){on.style.background='rgba(255,255,255,.15)';on.style.border='1.5px solid rgba(255,255,255,.4)';on.style.color='#fff';on.style.fontWeight='600';}
  if(colorPanel) colorPanel.style.display = type==='solid' ? 'flex' : 'none';
  if(type==='forest'){if(bg){bg.style.display='block';bg.style.opacity='0.6';}if(solid)solid.style.display='none';}
  else if(type==='solid'){if(bg)bg.style.display='none';const picker=document.getElementById('bgColorPicker');applyBgColor(picker?picker.value:'#0f1112');}
  else if(type==='transparent'){if(bg){bg.style.display='block';bg.style.opacity='0.1';}if(solid)solid.style.display='none';}
}
function applyBgColor(color){
  const solid=document.getElementById('pomoFullBgSolid');
  const bg=document.getElementById('pomoFullBg');
  if(bg) bg.style.display='none';
  if(solid){solid.style.display='block';solid.style.background=color;}
  const picker=document.getElementById('bgColorPicker');
  if(picker) picker.value=color;
}
function randomBgColor(){
  const h=Math.floor(Math.random()*360);
  const s=Math.floor(Math.random()*40+10);
  const l=Math.floor(Math.random()*20+5);
  const color=`hsl(${h},${s}%,${l}%)`;
  // hsl → hex 변환
  const el=document.createElement('div');
  el.style.color=color;
  document.body.appendChild(el);
  const computed=getComputedStyle(el).color;
  document.body.removeChild(el);
  const m=computed.match(/\d+/g);
  if(m){
    const hex='#'+[m[0],m[1],m[2]].map(x=>parseInt(x).toString(16).padStart(2,'0')).join('');
    applyBgColor(hex);
  }
}
/* ════════════════════════
   커스텀 HSV 컬러피커
════════════════════════ */
const cpState = {
  focus: { h:0, s:0.65, v:0.87, hex:'#e05a5a' },
  rest:  { h:210, s:0.58, v:0.83, hex:'#5a9fd4' },
  bg:    { h:0, s:0, v:0.06, hex:'#0f1112' }
};

function hsvToHex(h,s,v){
  const f=(n,k=(n+h/60)%6)=>v-v*s*Math.max(Math.min(k,4-k,1),0);
  const r=Math.round(f(5)*255),g=Math.round(f(3)*255),b=Math.round(f(1)*255);
  return '#'+[r,g,b].map(x=>x.toString(16).padStart(2,'0')).join('');
}

function hexToHsv(hex){
  const r=parseInt(hex.slice(1,3),16)/255,g=parseInt(hex.slice(3,5),16)/255,b=parseInt(hex.slice(5,7),16)/255;
  const max=Math.max(r,g,b),min=Math.min(r,g,b),d=max-min;
  let h=0;
  if(d){
    if(max===r) h=((g-b)/d+6)%6;
    else if(max===g) h=(b-r)/d+2;
    else h=(r-g)/d+4;
    h*=60;
  }
  return {h,s:max?d/max:0,v:max};
}

function cpUpdateUI(type){
  const st=cpState[type];
  const hex=hsvToHex(st.h,st.s,st.v);
  st.hex=hex;
  // SV 배경색 (순수 색조)
  const svEl=document.getElementById('cpSv'+cap(type));
  if(svEl) svEl.style.background=`hsl(${st.h},100%,50%)`;
  // SV 커서 위치
  const cur=document.getElementById('cpSvCursor'+cap(type));
  if(cur&&svEl){
    cur.style.left=(st.s*100)+'%';
    cur.style.top=((1-st.v)*100)+'%';
    cur.style.background=hex;
  }
  // Hue 커서
  const hc=document.getElementById('cpHueCursor'+cap(type));
  if(hc) hc.style.left=(st.h/360*100)+'%';
  // Preview
  const prev=document.getElementById('cpPreview'+cap(type));
  if(prev) prev.style.background=hex;
  // Hex input
  const hexEl=document.getElementById('cpHex'+cap(type));
  if(hexEl&&document.activeElement!==hexEl) hexEl.value=hex;
  // Swatch
  const sw=document.getElementById('cpSwatch'+cap(type));
  if(sw) sw.style.background=hex;
}

function cap(s){return s.charAt(0).toUpperCase()+s.slice(1);}

function toggleCP(type){
  ['focus','rest','bg'].forEach(t=>{
    if(t!==type) document.getElementById('cpPanel'+cap(t))?.classList.remove('open');
  });
  const panel=document.getElementById('cpPanel'+cap(type));
  if(panel){
    panel.classList.toggle('open');
    if(panel.classList.contains('open')) cpUpdateUI(type);
  }
}

// SV 드래그
function cpSvDrag(type,e){
  const el=document.getElementById('cpSv'+cap(type));
  if(!el) return;
  const rect=el.getBoundingClientRect();
  const st=cpState[type];
  function move(ev){
    const cx=(ev.clientX??ev.touches[0].clientX)-rect.left;
    const cy=(ev.clientY??ev.touches[0].clientY)-rect.top;
    st.s=Math.max(0,Math.min(1,cx/rect.width));
    st.v=Math.max(0,Math.min(1,1-cy/rect.height));
    cpUpdateUI(type);
  }
  function up(){ document.removeEventListener('mousemove',move);document.removeEventListener('mouseup',up);document.removeEventListener('touchmove',move);document.removeEventListener('touchend',up); }
  move(e);
  document.addEventListener('mousemove',move);document.addEventListener('mouseup',up);
  document.addEventListener('touchmove',move,{passive:false});document.addEventListener('touchend',up);
}

// Hue 드래그
function cpHueDrag(type,e){
  const el=document.getElementById('cpHue'+cap(type));
  if(!el) return;
  const rect=el.getBoundingClientRect();
  const st=cpState[type];
  function move(ev){
    const cx=(ev.clientX??ev.touches[0].clientX)-rect.left;
    st.h=Math.max(0,Math.min(360,cx/rect.width*360));
    cpUpdateUI(type);
  }
  function up(){ document.removeEventListener('mousemove',move);document.removeEventListener('mouseup',up);document.removeEventListener('touchmove',move);document.removeEventListener('touchend',up); }
  move(e);
  document.addEventListener('mousemove',move);document.addEventListener('mouseup',up);
  document.addEventListener('touchmove',move,{passive:false});document.addEventListener('touchend',up);
}

function cpHexInput(type,val){
  if(/^#[0-9a-fA-F]{6}$/.test(val)){
    const hsv=hexToHsv(val);
    Object.assign(cpState[type],hsv);
    cpUpdateUI(type);
  }
}

function cpConfirm(type){
  const hex=cpState[type].hex;
  if(type==='bg'){ applyBgColor(hex); }
  else { setPomoColorDirect(type,hex); }
  document.getElementById('cpPanel'+cap(type))?.classList.remove('open');
}

function cpRandom(type){
  cpState[type].h=Math.random()*360;
  cpState[type].s=0.5+Math.random()*0.5;
  cpState[type].v=0.6+Math.random()*0.4;
  cpUpdateUI(type);
}

// 이벤트 바인딩 (DOMContentLoaded 후)
function initCPEvents(){
  ['focus','rest','bg'].forEach(type=>{
    const sv=document.getElementById('cpSv'+cap(type));
    const hue=document.getElementById('cpHue'+cap(type));
    if(sv){ sv.addEventListener('mousedown',e=>cpSvDrag(type,e)); sv.addEventListener('touchstart',e=>cpSvDrag(type,e),{passive:false}); }
    if(hue){ hue.addEventListener('mousedown',e=>cpHueDrag(type,e)); hue.addEventListener('touchstart',e=>cpHueDrag(type,e),{passive:false}); }
  });
  // 외부 클릭 시 닫기
  document.addEventListener('click',e=>{
    if(!e.target.closest('.cp-wrap')) ['focus','rest','bg'].forEach(t=>document.getElementById('cpPanel'+cap(t))?.classList.remove('open'));
  });
}

function randomPomoColor(type){
  cpState[type].h=Math.random()*360;
  cpState[type].s=0.5+Math.random()*0.5;
  cpState[type].v=0.6+Math.random()*0.4;
  cpUpdateUI(type);
  cpConfirm(type);
}
function setPomoColorFull(type,color){
  setPomoColorDirect(type,color);
  const picker=document.getElementById(type==='focus'?'fFocusColorPicker':'fRestColorPicker');
  if(picker)picker.value=color;
}
function setPomoColor(t,c,el){if(t==='focus'){pomoFocusColor=c;el.parentElement.querySelectorAll('div').forEach(d=>d.style.border='2px solid transparent');}else{pomoRestColor=c;el.parentElement.querySelectorAll('div').forEach(d=>d.style.border='2px solid transparent');}el.style.border='2px solid #fff';applyPomoColors();}
function openPomoFull(){const f=document.getElementById('pomoFull');if(!f)return;f.style.display='block';updateFullSetupDisp();applyPomoColors();if(pomoRun||pomoDone>0)showPomoFullRun();else showPomoFullSetup();}
function closePomoFull(){const f=document.getElementById('pomoFull');if(f)f.style.display='none';}
function showPomoFullSetup(){document.getElementById('pomoFullSetup').style.display='flex';document.getElementById('pomoFullRun').style.display='none';updateFullSetupDisp();}
function showPomoFullRun(){document.getElementById('pomoFullSetup').style.display='none';document.getElementById('pomoFullRun').style.display='flex';syncFullRun();}
function startPomoFromFull(){resetPomo();showPomoFullRun();pomoRun=true;pomoTmr=setInterval(pomoTick,1000);const fB=document.getElementById('fRunBtn');if(fB)fB.textContent='일시정지';syncFullRun();updatePomoBtn(true);}
function editPomoFull(){if(pomoRun){clearInterval(pomoTmr);pomoRun=false;updatePomoBtn(false);}showPomoFullSetup();}
function playBell(){try{const ctx=new(window.AudioContext||window.webkitAudioContext)();const osc=ctx.createOscillator();const gain=ctx.createGain();osc.connect(gain);gain.connect(ctx.destination);osc.frequency.value=880;osc.type='sine';gain.gain.setValueAtTime(0.4,ctx.currentTime);gain.gain.exponentialRampToValueAtTime(0.001,ctx.currentTime+1.2);osc.start(ctx.currentTime);osc.stop(ctx.currentTime+1.2);}catch(e){}}
function showPomoNotify(msg){const old=document.getElementById('pomoNotify');if(old)old.remove();const el=document.createElement('div');el.id='pomoNotify';el.textContent=msg;el.style.cssText='position:fixed;bottom:80px;left:50%;transform:translateX(-50%);background:rgba(15,17,18,.9);color:#fff;font-size:13px;font-family:var(--font);padding:10px 20px;border-radius:8px;border:.5px solid rgba(255,255,255,.15);backdrop-filter:blur(10px);z-index:99999;white-space:nowrap;opacity:0;transition:opacity .25s;pointer-events:none;';document.body.appendChild(el);requestAnimationFrame(()=>{el.style.opacity='1';setTimeout(()=>{el.style.opacity='0';setTimeout(()=>el.remove(),300);},2200);});}

document.addEventListener('keydown',e=>{if(e.key==='Escape'){const f=document.getElementById('pomoFull');if(f&&f.style.display!=='none')closePomoFull();}});

/* 테마 */
function applyTheme(theme){document.documentElement.setAttribute('data-theme',theme);localStorage.setItem('theme',theme);const l=document.getElementById('themeMenuLabel');if(l)l.textContent=theme==='light'?'다크 모드':'화이트 모드';}
function toggleTheme(){const c=document.documentElement.getAttribute('data-theme')||'dark';applyTheme(c==='dark'?'light':'dark');}
(function(){applyTheme(localStorage.getItem('theme')||'dark');})();

/* 대시보드 초기화 */
/* ════════════════════════
   바로가기
════════════════════════ */
const QK_DEFAULT = [
  {emoji:'📝', name:'퀴즈', link:'https://naver.com', color:'rgba(90,159,212,.15)'},
  {emoji:'🎵', name:'뮤직', link:'https://naver.com', color:'rgba(232,168,68,.15)'},
  {emoji:'✍️', name:'자소서', link:'https://naver.com', color:'rgba(124,185,138,.15)'},
];
let qkItems = [];
let qkEditIdx = -1;
let qkSelectedEmoji = '';

let qkEditMode = false;

function toggleQkEdit(){
  qkEditMode = !qkEditMode;
  const btn = document.getElementById('qkEditBtn');
  if(btn) btn.textContent = qkEditMode ? '완료' : '편집';
  if(btn) btn.style.color = qkEditMode ? 'var(--red)' : '';
  renderQk();
}

function loadQk(){
  try { qkItems = JSON.parse(localStorage.getItem('qkItems') || 'null') || QK_DEFAULT.map(i=>({...i})); }
  catch(e){ qkItems = QK_DEFAULT.map(i=>({...i})); }
  renderQk();
}

function saveQk(){ localStorage.setItem('qkItems', JSON.stringify(qkItems)); }

function renderQk(){
  const bar = document.getElementById('qkBar');
  if(!bar) return;
  bar.innerHTML = '';
  qkItems.forEach((item, idx) => {
    const div = document.createElement('div');
    div.className = 'qk';
    div.style.position = 'relative';
    div.innerHTML = `
      <div class="qk-ic" style="background:${item.color||'rgba(90,159,212,.15)'};">${item.emoji||'🔗'}</div>
      <span class="qk-lb">${item.name}</span>
      <div style="display:${qkEditMode?'flex':'none'};position:absolute;top:-6px;right:-6px;gap:2px;">
        <div onclick="event.stopPropagation();openQkEdit(${idx})" style="width:18px;height:18px;background:var(--blue);border-radius:50%;display:flex;align-items:center;justify-content:center;cursor:pointer;font-size:9px;">✏️</div>
        <div onclick="event.stopPropagation();deleteQk(${idx})" style="width:18px;height:18px;background:var(--red);border-radius:50%;display:flex;align-items:center;justify-content:center;cursor:pointer;font-size:9px;color:#fff;font-weight:bold;">×</div>
      </div>
    `;
    // 클릭: 링크 열기
    div.addEventListener('click', () => { if(!qkEditMode && item.link) window.open(item.link, '_blank'); });
    // 롱프레스/우클릭: 편집모드
    div.addEventListener('contextmenu', e => { e.preventDefault(); openQkEdit(idx); });
    bar.appendChild(div);
  });
}

function deleteQk(idx){
  if(!confirm('삭제할까요?')) return;
  qkItems.splice(idx, 1);
  saveQk();
  renderQk();
}

function openQkAdd(){
  qkEditIdx = -1;
  qkSelectedEmoji = '📝';
  document.getElementById('qkModalTitle').textContent = '바로가기 추가';
  document.getElementById('qkNameInput').value = '';
  document.getElementById('qkLinkInput').value = 'https://naver.com';
  document.getElementById('qkEmojiInput').value = '📝';
  document.getElementById('qkModal').style.display = 'block';
  initEmojiPicker();
}

function openQkEdit(idx){
  qkEditIdx = idx;
  const item = qkItems[idx];
  qkSelectedEmoji = item.emoji || '🔗';
  document.getElementById('qkModalTitle').textContent = '바로가기 수정';
  document.getElementById('qkNameInput').value = item.name;
  document.getElementById('qkLinkInput').value = item.link;
  document.getElementById('qkEmojiInput').value = item.emoji;
  document.getElementById('qkModal').style.display = 'block';
  initEmojiPicker();
}

function initEmojiPicker(){
  const emojis = ['📝','📚','🎵','✍️','🤖','🌐','📊','💡','🎯','📌','🔗','⭐','🏆','📅','🔍','💼','🧠','🎓','📰','🛠️'];
  const picker = document.getElementById('qkEmojiPicker');
  picker.innerHTML = '';
  emojis.forEach(e => {
    const btn = document.createElement('div');
    btn.textContent = e;
    btn.style.cssText = `font-size:20px;cursor:pointer;padding:4px;border-radius:6px;border:2px solid ${e===qkSelectedEmoji?'var(--blue)':'transparent'};transition:border-color .15s;`;
    btn.addEventListener('click', () => {
      qkSelectedEmoji = e;
      document.getElementById('qkEmojiInput').value = e;
      picker.querySelectorAll('div').forEach(d => d.style.borderColor = 'transparent');
      btn.style.borderColor = 'var(--blue)';
    });
    picker.appendChild(btn);
  });
}

function closeQkModal(){
  document.getElementById('qkModal').style.display = 'none';
}

function saveQkItem(){
  const name = document.getElementById('qkNameInput').value.trim();
  const link = document.getElementById('qkLinkInput').value.trim();
  const emoji = document.getElementById('qkEmojiInput').value.trim() || qkSelectedEmoji || '🔗';
  if(!name){ alert('이름을 입력해줘'); return; }
  const colors = ['rgba(90,159,212,.15)','rgba(232,168,68,.15)','rgba(124,185,138,.15)','rgba(224,90,90,.15)','rgba(200,216,176,.15)'];
  const color = colors[qkItems.length % colors.length];
  if(qkEditIdx >= 0){
    qkItems[qkEditIdx] = { emoji, name, link: link||'https://naver.com', color: qkItems[qkEditIdx].color };
  } else {
    qkItems.push({ emoji, name, link: link||'https://naver.com', color });
  }
  saveQk();
  renderQk();
  closeQkModal();
}

/* ════════════════════════
   Masonry 레이아웃
════════════════════════ */
function debounce(fn, delay){
  let t; return function(){ clearTimeout(t); t = setTimeout(fn, delay); };
}

function getColCount(){
  const w = window.innerWidth;
  if(w <= 640) return 1;
  if(w <= 900) return 2;
  if(w <= 1100) return 3;
  return 4;
}

function initMasonry(){
  const grid = document.getElementById('masonryGrid');
  if(!grid) return;

  const colCount = getColCount();
  const gap = 8;

  // 기존 아이템 수집 (열 div 제외하고 실제 카드만)
  const allItems = [];
  grid.querySelectorAll(':scope > div > [data-mcol], :scope > [data-mcol]').forEach(i => allItems.push(i));

  // data-mcol 순서대로 정렬
  const items = Array.from(grid.querySelectorAll('[data-mcol]'))
    .sort((a,b) => parseInt(a.dataset.mcol) - parseInt(b.dataset.mcol));

  // grid 비우기
  grid.innerHTML = '';
  grid.style.cssText = `display:flex;gap:${gap}px;align-items:flex-start;width:100%;`;

  // 열 생성
  const cols = [];
  const colHeights = new Array(colCount).fill(0);
  for(let i = 0; i < colCount; i++){
    const col = document.createElement('div');
    col.style.cssText = `display:flex;flex-direction:column;gap:${gap}px;flex:1;min-width:0;`;
    grid.appendChild(col);
    cols.push(col);
  }

  // 아이템 배치
  items.forEach((item, orderIdx) => {
    // 640px 이하 pomo 숨김
    if(item.id === 'pomoCard' && window.innerWidth <= 640){
      item.style.display = 'none';
    } else {
      item.style.display = '';
    }

    // 처음엔 순서대로 배치 (0,1,2,3 → 각 열)
    const targetCol = orderIdx % colCount;
    cols[targetCol].appendChild(item);
  });

  // 한 프레임 뒤에 높이 재측정 후 재배치
  requestAnimationFrame(() => {
    // 아이템 다시 수집
    const placed = items.filter(i => i.style.display !== 'none');

    // grid 비우고 다시 열 만들기
    grid.innerHTML = '';
    const cols2 = [];
    const heights = new Array(colCount).fill(0);
    for(let i = 0; i < colCount; i++){
      const col = document.createElement('div');
      col.style.cssText = `display:flex;flex-direction:column;gap:${gap}px;flex:1;min-width:0;`;
      grid.appendChild(col);
      cols2.push(col);
    }

    placed.forEach(item => {
      // 가장 짧은 열에 배치
      let minIdx = 0;
      for(let i = 1; i < colCount; i++){
        if(heights[i] < heights[minIdx]) minIdx = i;
      }
      cols2[minIdx].appendChild(item);
      heights[minIdx] += item.getBoundingClientRect().height + gap;
    });

    // pomo 숨긴 거 다시 붙이기
    items.filter(i => i.style.display === 'none').forEach(i => cols2[0].appendChild(i));
  });
}

/* ════════════════════════
   런처
════════════════════════ */
function toggleLauncher(n){
  [1,2].forEach(i=>{
    const qr=document.getElementById('lQr'+i);
    const item=document.getElementById('lItem'+i);
    if(i===n){
      const open=qr.style.display!=='none';
      qr.style.display=open?'none':'flex';
      item.style.background=open?'':'var(--db-bg3)';
    } else {
      qr.style.display='none';
      item.style.background='';
    }
  });
}

function updateLauncherQR(n){
  const url=document.getElementById('lUrl'+n).value.trim();
  const box=document.getElementById('lQrImg'+n);
  if(!url){ box.innerHTML='<span style="font-size:10px;color:var(--t3);text-align:center;padding:4px;">URL<br>미설정</span>'; return; }
  // qrcode.js 로 실제 QR 생성
  box.innerHTML='';
  if(typeof QRCode!=='undefined'){
    new QRCode(box,{text:url,width:68,height:68,colorDark:'#000',colorLight:'#fff',correctLevel:QRCode.CorrectLevel.M});
  } else {
    box.innerHTML='<span style="font-size:10px;color:var(--t3);text-align:center;padding:4px;">QR 라이브러리<br>로드 필요</span>';
  }
  localStorage.setItem('launcherUrl'+n, url);
}

function initLauncher(){
  const urls = {
    1: 'https://script.google.com/macros/s/AKfycbzFpvzOwboMhwdlHuCMmCYJPoTyOfAuqBcLjjz6mogVzyPIc68H3GVVtBYrKGYBNkmv/exec',
    2: 'https://여기에자소서URL'
  };
  [1,2].forEach(n=>{
    const box=document.getElementById('lQrImg'+n);
    box.innerHTML='';
    if(typeof QRCode!=='undefined'){
      new QRCode(box,{text:urls[n],width:68,height:68,colorDark:'#000',colorLight:'#fff',correctLevel:QRCode.CorrectLevel.M});
    }
  });
}

let dbInited=false;
function initDB(){
  if(dbInited)return;
  dbInited=true;
  initBlocks.forEach(b=>{b.id=++blockIdCtr;blocks.push(b);});
  buildTT();
  renderBoard();
  highlightCurrentTime();
  scrollTTToNow(true);
  loadQk();
  setInterval(highlightCurrentTime,60000);
  setTimeout(initMasonry, 100);
}

document.addEventListener('DOMContentLoaded',()=>{
  initWx();
  tick();
  updatePlayerVisibility('home');
  initMasonry();
  initCPEvents();
  initLauncher();
  window.addEventListener('resize', debounce(initMasonry, 150));
});
