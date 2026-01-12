/* لعبة عبور الطريق — مشروع جاهز لرفع GitHub Pages
   تصميم وبرمجة: سلمان الجنيدي (حسب طلب المستخدم)
*/
(() => {
  'use strict';

  // ---------- Utilities ----------
  const $ = (sel) => document.querySelector(sel);
  const $$ = (sel) => [...document.querySelectorAll(sel)];

  const AR_DIGITS = '٠١٢٣٤٥٦٧٨٩';
  const toArabic = (num) => String(num).split('').map(ch => {
    if (ch === '-') return '−';
    const d = ch.charCodeAt(0) - 48;
    return (d >= 0 && d <= 9) ? AR_DIGITS[d] : ch;
  }).join('');

  const rand = (a, b) => a + Math.random() * (b - a);
  const randi = (a, b) => Math.floor(rand(a, b + 1));
  const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];

  function shuffle(arr){
    for(let i = arr.length - 1; i > 0; i--){
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  }

  // ---------- Simple audio (no copyrighted files) ----------
  let soundOn = true;
  let audioCtx = null;

  function beep(freq=440, dur=0.08, type='sine', gain=0.04){
    if(!soundOn) return;
    try{
      audioCtx = audioCtx || new (window.AudioContext || window.webkitAudioContext)();
      const o = audioCtx.createOscillator();
      const g = audioCtx.createGain();
      o.type = type;
      o.frequency.value = freq;
      g.gain.value = gain;
      o.connect(g);
      g.connect(audioCtx.destination);
      o.start();
      o.stop(audioCtx.currentTime + dur);
    }catch(e){}
  }

  function sfxGood(){ beep(784, 0.08, 'triangle', 0.05); setTimeout(()=>beep(988,0.09,'triangle',0.05), 70); }
  function sfxBad(){ beep(220, 0.13, 'sawtooth', 0.05); setTimeout(()=>beep(196,0.13,'sawtooth',0.05), 90); }
  function sfxStep(){ beep(660, 0.03, 'square', 0.02); }
  function sfxHit(){ beep(120, 0.08, 'sine', 0.06); }

  // ---------- DOM ----------
  const menuEl = $('#menu');
  const gameCardEl = $('#gameCard');
  const hudEl = $('#hud');
  const howBtn = $('#howBtn');
  const howPanel = $('#howPanel');
  const startBtn = $('#startBtn');
  const modeHint = $('#modeHint');
  const diffHint = $('#diffHint');

  const installBtn = $('#installBtn');
  const soundBtn = $('#soundBtn');
  const pauseBtn = $('#pauseBtn');

  const levelTxt = $('#levelTxt');
  const scoreTxt = $('#scoreTxt');
  const timeTxt = $('#timeTxt');
  const lifeTxt = $('#lifeTxt');

  const modal = $('#modal');
  const closeModalBtn = $('#closeModal');
  const qTimerEl = $('#qTimer');
  const qLevelEl = $('#qLevel');
  const qPromptEl = $('#qPrompt');
  const qVisualEl = $('#qVisual');
  const qOptionsEl = $('#qOptions');
  const qHintEl = $('#qHint');

  const pauseModal = $('#pause');
  const resumeBtn = $('#resumeBtn');
  const restartBtn = $('#restartBtn');
  const backMenuBtn = $('#backMenuBtn');

  // Touch controls
  $$('.tbtn').forEach(btn => {
    btn.addEventListener('pointerdown', (e) => {
      e.preventDefault();
      const mv = btn.dataset.move;
      if(mv === 'tap'){ move(0, -1); return; }
      if(mv === 'up') move(0, -1);
      if(mv === 'down') move(0, +1);
      if(mv === 'left') move(-1, 0);
      if(mv === 'right') move(+1, 0);
    }, {passive:false});
  });

  // ---------- PWA ----------
  if('serviceWorker' in navigator){
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('./sw.js').catch(()=>{});
    });
  }

  let deferredPrompt = null;
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredPrompt = e;
    installBtn.hidden = false;
  });

  installBtn.addEventListener('click', async () => {
    if(!deferredPrompt) return;
    deferredPrompt.prompt();
    await deferredPrompt.userChoice;
    deferredPrompt = null;
    installBtn.hidden = true;
  });

  // ---------- Settings state ----------
  const SETTINGS = {
    mode: 'primary', // primary | upper
    diff: 'easy',    // easy | mid | pro
    char: 'rabbit',  // rabbit | chicken | goat | horse
  };

  function updateHints(){
    if(SETTINGS.mode === 'primary'){
      modeHint.textContent = 'جمع وطرح للأعداد من ٠ إلى ١٠ مع تمثيل بصري.';
    }else{
      modeHint.textContent = 'ضرب للأعداد من ٠ إلى ١٠ + قسمة (ناتج رقم واحد) — اختيارات.';
    }

    if(SETTINGS.diff === 'easy'){
      diffHint.textContent = 'مدة السؤال: ٣٠ ثانية · فرص الإنقاذ: ٣';
    }else if(SETTINGS.diff === 'mid'){
      diffHint.textContent = 'مدة السؤال: ٢٠ ثانية · فرص الإنقاذ: ٢';
    }else{
      diffHint.textContent = 'مدة السؤال: ١٠ ثوانٍ · فرص الإنقاذ: ١';
    }
  }

  $$('.segbtn').forEach(btn => {
    btn.addEventListener('click', () => {
      const mode = btn.dataset.mode;
      const diff = btn.dataset.diff;
      if(mode){
        $$('.segbtn[data-mode]').forEach(b => b.classList.toggle('active', b === btn));
        SETTINGS.mode = mode;
      }
      if(diff){
        $$('.segbtn[data-diff]').forEach(b => b.classList.toggle('active', b === btn));
        SETTINGS.diff = diff;
      }
      updateHints();
    });
  });

  $$('.char').forEach(btn => {
    btn.addEventListener('click', () => {
      $$('.char').forEach(b => b.classList.toggle('active', b === btn));
      SETTINGS.char = btn.dataset.char;
    });
  });

  howBtn.addEventListener('click', () => {
    howPanel.hidden = !howPanel.hidden;
    if(!howPanel.hidden) howPanel.open = true;
  });

  soundBtn.addEventListener('click', () => {
    soundOn = !soundOn;
    soundBtn.textContent = soundOn ? '🔊' : '🔇';
    if(soundOn) beep(880, 0.06, 'triangle', 0.04);
  });

  // ---------- Canvas / Game core ----------
  const canvas = $('#game');
  const ctx = canvas.getContext('2d');

  // World is grid-based
  const TILE = 64;            // logical tile size
  const COLS = 9;             // grid width
  const ROWS_VISIBLE = 14;    // visible rows on screen
  const W = COLS * TILE;
  const H = ROWS_VISIBLE * TILE;

  // Make canvas resolution crisp
  function resizeCanvas(){
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    canvas.width = Math.floor(W * dpr);
    canvas.height = Math.floor(H * dpr);
    canvas.style.width = W + 'px';
    canvas.style.height = H + 'px';
    ctx.setTransform(dpr,0,0,dpr,0,0);
  }
  resizeCanvas();
  window.addEventListener('resize', resizeCanvas);

  const EMOJI = {
    rabbit: '🐇',
    chicken: '🐓',
    goat: '🐐',
    horse: '🐎'
  };

  const vehicleColors = ['#6ee7ff', '#8b5cf6', '#f59e0b', '#22c55e', '#ef4444'];

  function shade(hex, amt){
    // amt: -1..+1
    const m = hex.replace('#','').trim();
    const n = parseInt(m.length===3 ? m.split('').map(c=>c+c).join('') : m, 16);
    const r = (n >> 16) & 255;
    const g = (n >> 8) & 255;
    const b = n & 255;
    const k = Math.max(-1, Math.min(1, amt));
    const t = k < 0 ? 0 : 255;
    const p = Math.abs(k);
    const rr = Math.round((t - r)*p + r);
    const gg = Math.round((t - g)*p + g);
    const bb = Math.round((t - b)*p + b);
    return `rgb(${rr},${gg},${bb})`;
  }


  // ---------- Vehicle sprites (SVG) ----------
  // بدل المستطيلات: نولد رسومات SVG كرتونية بسيطة وناعمة ونرسمها على الـCanvas
  const SPRITES = {};
  const SPRITE_KEYS = [];

  function svgToDataUri(svg){
    return 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg);
  }

  function makeVehicleSVG(kind, color){
    // Sprites SVG كرتونية نظيفة (تتجه لليمين افتراضياً) — بدون ظلال.
    // نُظهر اتجاه الحركة بوضوح (مصابيح أمامية/خلفية + مقدمة/مؤخرة).
    const stroke = 'rgba(0,0,0,.22)';
    const body = color || '#6ee7ff';
    const body2 = shade(body, -0.18);
    const highlight = shade(body, +0.22);
    const win = 'rgba(240,248,255,.78)';
    const wheel = '#141826';
    const rim = 'rgba(255,255,255,.22)';
    const light = 'rgba(255,210,90,.95)';
    const tail = 'rgba(255,90,90,.95)';

    if(kind === 'car'){
      return `
<svg xmlns="http://www.w3.org/2000/svg" width="240" height="84" viewBox="0 0 240 84">
  <!-- shadowless ground line -->
  <rect x="24" y="44" width="170" height="24" rx="12" fill="${body}" stroke="${stroke}" stroke-width="3"/>
  <!-- hood + nose -->
  <path d="M182 44 Q210 46 218 56 Q210 66 182 68 Z" fill="${body2}" stroke="${stroke}" stroke-width="3" />
  <!-- roof -->
  <path d="M74 44 Q92 26 126 26 Q152 26 168 44 Z" fill="${highlight}" stroke="${stroke}" stroke-width="3"/>
  <!-- windows -->
  <path d="M90 44 Q104 32 126 32 Q146 32 156 44 Z" fill="${win}" opacity=".92"/>
  <path d="M128 44 Q142 34 156 34 Q162 34 166 44 Z" fill="${win}" opacity=".86"/>
  <!-- door line -->
  <path d="M116 46 V66" stroke="rgba(0,0,0,.18)" stroke-width="3" />
  <!-- lights: front (right) + back (left) -->
  <rect x="214" y="54" width="10" height="10" rx="4" fill="${light}" opacity=".95"/>
  <rect x="22" y="54" width="10" height="10" rx="4" fill="${tail}" opacity=".92"/>
  <!-- wheels -->
  <g>
    <circle cx="70" cy="70" r="12" fill="${wheel}"/><circle cx="70" cy="70" r="5" fill="${rim}"/>
    <circle cx="170" cy="70" r="12" fill="${wheel}"/><circle cx="170" cy="70" r="5" fill="${rim}"/>
  </g>
</svg>`;
    }

    if(kind === 'truck'){
      return `
<svg xmlns="http://www.w3.org/2000/svg" width="280" height="84" viewBox="0 0 280 84">
  <!-- cargo -->
  <rect x="22" y="34" width="160" height="34" rx="12" fill="${body}" stroke="${stroke}" stroke-width="3"/>
  <rect x="34" y="42" width="42" height="6" rx="3" fill="${highlight}" opacity=".55"/>
  <rect x="34" y="52" width="52" height="6" rx="3" fill="${highlight}" opacity=".38"/>
  <!-- cab (front to the right) -->
  <path d="M178 68 V38 Q178 30 188 30 H236 Q252 30 258 44 L268 60 Q270 64 268 68 Z"
        fill="${body2}" stroke="${stroke}" stroke-width="3"/>
  <path d="M200 40 H234 Q240 40 244 46 V56 H200 Z" fill="${win}" opacity=".9"/>
  <!-- bumper -->
  <rect x="258" y="58" width="14" height="12" rx="5" fill="rgba(0,0,0,.18)"/>
  <!-- lights -->
  <rect x="270" y="54" width="8" height="10" rx="4" fill="${light}" opacity=".95"/>
  <rect x="18" y="54" width="8" height="10" rx="4" fill="${tail}" opacity=".92"/>
  <!-- wheels -->
  <g>
    <circle cx="72" cy="72" r="12" fill="${wheel}"/><circle cx="72" cy="72" r="5" fill="${rim}"/>
    <circle cx="148" cy="72" r="12" fill="${wheel}"/><circle cx="148" cy="72" r="5" fill="${rim}"/>
    <circle cx="238" cy="72" r="12" fill="${wheel}"/><circle cx="238" cy="72" r="5" fill="${rim}"/>
  </g>
</svg>`;
    }

    // bike (scooter-like)
    return `
<svg xmlns="http://www.w3.org/2000/svg" width="220" height="84" viewBox="0 0 220 84">
  <circle cx="64" cy="70" r="12" fill="${wheel}"/><circle cx="64" cy="70" r="5" fill="${rim}"/>
  <circle cx="160" cy="70" r="12" fill="${wheel}"/><circle cx="160" cy="70" r="5" fill="${rim}"/>
  <path d="M78 68 H146" stroke="${body}" stroke-width="10" stroke-linecap="round"/>
  <path d="M110 58 Q124 46 142 46" stroke="${highlight}" stroke-width="8" stroke-linecap="round"/>
  <path d="M142 46 H170" stroke="${body}" stroke-width="8" stroke-linecap="round"/>
  <path d="M170 46 V38" stroke="${body2}" stroke-width="6" stroke-linecap="round"/>
  <rect x="166" y="34" width="18" height="6" rx="3" fill="${body2}"/>
  <!-- headlight -->
  <rect x="186" y="52" width="8" height="8" rx="3" fill="${light}" opacity=".95"/>
  <!-- taillight -->
  <rect x="28" y="52" width="8" height="8" rx="3" fill="${tail}" opacity=".92"/>
</svg>`;
  }


function initVehicleSprites(){
    for(const kind of ['car','truck','bike']){
      for(const color of vehicleColors){
        const key = `${kind}_${color}`;
        SPRITE_KEYS.push(key);
        const img = new Image();
        img.src = svgToDataUri(makeVehicleSVG(kind, color));
        SPRITES[key] = img;
      }
    }
  }

  initVehicleSprites();

  // ---------- Animal sprites (full body, لطيفة وأكثر احترافية من الإيموجي) ----------
  const ANIMAL_SPRITES = {};
  function makeAnimalSVG(name){
    const outline = 'rgba(0,0,0,.18)';
    if(name === 'rabbit'){
      return `
<svg xmlns="http://www.w3.org/2000/svg" width="96" height="96" viewBox="0 0 96 96">
  <ellipse cx="44" cy="60" rx="22" ry="18" fill="#F4F7FF" stroke="${outline}" stroke-width="3"/>
  <circle cx="62" cy="50" r="14" fill="#F4F7FF" stroke="${outline}" stroke-width="3"/>
  <ellipse cx="70" cy="34" rx="6" ry="16" fill="#F4F7FF" stroke="${outline}" stroke-width="3"/>
  <ellipse cx="58" cy="34" rx="6" ry="16" fill="#F4F7FF" stroke="${outline}" stroke-width="3"/>
  <circle cx="66" cy="50" r="2.4" fill="#111827"/>
  <circle cx="58" cy="50" r="2.4" fill="#111827"/>
  <path d="M61 55 q1 4 6 0" stroke="#ef4444" stroke-width="3" stroke-linecap="round" fill="none"/>
  <circle cx="30" cy="62" r="4" fill="#E5E7EB"/>
</svg>`;
    }
    if(name === 'chicken'){
      return `
<svg xmlns="http://www.w3.org/2000/svg" width="96" height="96" viewBox="0 0 96 96">
  <ellipse cx="46" cy="58" rx="22" ry="20" fill="#FFF7ED" stroke="${outline}" stroke-width="3"/>
  <circle cx="62" cy="48" r="14" fill="#FFF7ED" stroke="${outline}" stroke-width="3"/>
  <path d="M70 50 L82 56 L70 62 Z" fill="#F59E0B" stroke="${outline}" stroke-width="3"/>
  <path d="M58 34 q4-8 10 0 q-6 2-10 0" fill="#ef4444" stroke="${outline}" stroke-width="3" stroke-linejoin="round"/>
  <circle cx="66" cy="48" r="2.4" fill="#111827"/>
  <circle cx="58" cy="48" r="2.4" fill="#111827"/>
  <path d="M40 74 q6 6 12 0" stroke="#ef4444" stroke-width="4" stroke-linecap="round" fill="none"/>
</svg>`;
    }
    if(name === 'goat'){
      return `
<svg xmlns="http://www.w3.org/2000/svg" width="96" height="96" viewBox="0 0 96 96">
  <ellipse cx="44" cy="60" rx="24" ry="18" fill="#F3F4F6" stroke="${outline}" stroke-width="3"/>
  <circle cx="64" cy="52" r="14" fill="#F3F4F6" stroke="${outline}" stroke-width="3"/>
  <path d="M56 40 q-6-10 -14 0" stroke="#9CA3AF" stroke-width="5" stroke-linecap="round" fill="none"/>
  <path d="M72 40 q6-10 14 0" stroke="#9CA3AF" stroke-width="5" stroke-linecap="round" fill="none"/>
  <path d="M60 62 q4 10 8 0" stroke="#9CA3AF" stroke-width="4" stroke-linecap="round" fill="none"/>
  <circle cx="68" cy="52" r="2.4" fill="#111827"/>
  <circle cx="60" cy="52" r="2.4" fill="#111827"/>
</svg>`;
    }
    // horse
    return `
<svg xmlns="http://www.w3.org/2000/svg" width="96" height="96" viewBox="0 0 96 96">
  <ellipse cx="42" cy="62" rx="24" ry="16" fill="#E7E5E4" stroke="${outline}" stroke-width="3"/>
  <path d="M58 64 V44 q0-14 14-16 q8 0 10 8 q-2 10-10 12 v16 z" fill="#E7E5E4" stroke="${outline}" stroke-width="3" stroke-linejoin="round"/>
  <path d="M70 28 q-8 10 -12 18" stroke="#6B7280" stroke-width="6" stroke-linecap="round"/>
  <circle cx="78" cy="42" r="2.4" fill="#111827"/>
  <circle cx="72" cy="42" r="2.4" fill="#111827"/>
  <path d="M80 50 q-2 6 -8 0" stroke="#ef4444" stroke-width="3" stroke-linecap="round" fill="none"/>
</svg>`;
  }

  function initAnimalSprites(){
    for(const k of Object.keys(EMOJI)){
      const img = new Image();
      img.src = svgToDataUri(makeAnimalSVG(k));
      ANIMAL_SPRITES[k] = img;
    }
  }
  initAnimalSprites();


  const DIFF = {
    easy: { qTime: 30, lives: Infinity, speedMul: 0.95 },
    mid:  { qTime: 20, lives: Infinity, speedMul: 1.10 },
    pro:  { qTime: 10, lives: Infinity, speedMul: 1.30 }
  };

  // Game State
  let running = false;
  let paused = false;

  let level = 1;
  let score = 0;
  let lives = Infinity;
  let invUntil = 0;

  // visual feedback
  let shake = 0;
  let flashMsg = null;

  let player = { gx: 4, gy: 13, x: 4*TILE, y: 13*TILE, wobble: 0 };
  let lanes = [];  // each lane: {type, dir, speed, y, entities[]}
  let cameraY = 0;

  // swipe
  let touchStart = null;
  canvas.addEventListener('pointerdown', (e) => {
    touchStart = {x:e.clientX, y:e.clientY};
  });
  canvas.addEventListener('pointerup', (e) => {
    if(!touchStart) return;
    const dx = e.clientX - touchStart.x;
    const dy = e.clientY - touchStart.y;
    touchStart = null;
    const adx = Math.abs(dx), ady = Math.abs(dy);
    if(Math.max(adx, ady) < 18){ move(0, -1); return; } // tap = up
    if(adx > ady){
      move(dx > 0 ? +1 : -1, 0);
    }else{
      move(0, dy > 0 ? +1 : -1);
    }
  });

  // keyboard
  window.addEventListener('keydown', (e) => {
    if(!running) return;
    if(modal.hidden === false || pauseModal.hidden === false) return;
    const k = e.key.toLowerCase();
    if(k === 'arrowup' || k === 'w') move(0, -1);
    if(k === 'arrowdown' || k === 's') move(0, +1);
    if(k === 'arrowleft' || k === 'a') move(-1, 0);
    if(k === 'arrowright' || k === 'd') move(+1, 0);
    if(k === 'escape') togglePause();
  });

  pauseBtn.addEventListener('click', togglePause);
  resumeBtn.addEventListener('click', () => { setPause(false); });
  restartBtn.addEventListener('click', () => { restartRun(); setPause(false); });
  backMenuBtn.addEventListener('click', () => { backToMenu(); });

  function togglePause(){
    if(!running) return;
    setPause(!paused);
  }
  function setPause(v){
    paused = v;
    pauseModal.hidden = !v;
    if(v){
      beep(330, 0.06, 'triangle', 0.04);
    }else{
      beep(660, 0.05, 'triangle', 0.04);
      lastTime = performance.now();
      requestAnimationFrame(loop);
    }
  }

  function backToMenu(){
    running = false;
    paused = false;
    pauseModal.hidden = true;
    hudEl.hidden = true;
    gameCardEl.hidden = true;
    menuEl.hidden = false;
    closeQuestion(true);
    document.body.classList.remove('ingame');
  }

  function resetWorld(){
    level = 1;
    score = 0;
    lives = DIFF[SETTINGS.diff].lives;
    invUntil = 0;

    player.gx = 4;
    player.gy = 13;
    player.x = player.gx * TILE;
    player.y = player.gy * TILE;
    cameraY = 0;

    lanes = [];
    // start: bottom safe + some lanes + top safe
    buildLevel(1);
  }

  function buildLevel(lvl){
  // إعادة بناء العالم لكل مستوى: يبدأ سهل ثم يتدرج بذكاء
  lanes = [];

  const includeRail = lvl >= 4 && (lvl % 2 === 0); // مسار قطار من مستوى ٤ وأعلى بشكل متناوب
  const roadCount = 3 + Math.min(7, Math.floor((lvl - 1) / 2)); // ٣..١٠ مسارات فعّالة

  let y = 0;
  lanes.push({ type:'safe', y, entities:[] }); y++;

  // في المستويات الأولى نضيف مسارات آمنة بين الطريق لتسهيل العبور
  const chunkSize = (lvl <= 3) ? 2 : (lvl <= 6 ? 3 : roadCount);

  const railIndex = includeRail ? Math.floor(roadCount * 0.6) : -1;

  let placed = 0;
  while(placed < roadCount){
    const take = Math.min(chunkSize, roadCount - placed);
    for(let i=0;i<take;i++){
      const idx = placed + i;
      if(idx === railIndex){
        lanes.push(makeRailLane(y, lvl)); y++;
      }else{
        lanes.push(makeRoadLane(y, lvl)); y++;
      }
    }
    placed += take;

    if(placed < roadCount && lvl <= 6){
      lanes.push({ type:'safe', y, entities:[] }); y++;
    }
  }

  lanes.push({ type:'safe', y, entities:[] }); y++;

  // reset player: يبدأ من الأسفل
  player.gx = 4;
  player.gy = lanes.length - 1;
  player.x = player.gx * TILE;
  player.y = player.gy * TILE;

  cameraY = Math.max(0, (lanes.length - ROWS_VISIBLE) * TILE);

  updateHUD();
}

function makeRoadLane(y, lvl){
  const dir = Math.random() < 0.5 ? -1 : +1;

  // سرعة أقل في البداية وتزيد تدريجياً
  const speedBase = 55 + lvl * 9 + rand(0, 20);
  const speed = speedBase * DIFF[SETTINGS.diff].speedMul * (Math.random() < 0.12 ? 1.15 : 1);

  // كثافة منخفضة جداً في البداية ثم تتزايد (بدون مبالغة)
  let density = (lvl <= 3) ? 1 : (lvl <= 5 ? 2 : (lvl <= 8 ? 3 : 4)); // تدرّج واضح

  const kindsBag = ['car','car','car','truck','bike']; // وزن أكبر للسيارات

  const minGap = (lvl <= 3) ? 170 : (lvl <= 6 ? 130 : 90); // مسافة أمان + تخفيف البداية
  let entities = [];
  let gap = minGap;

  while(true){
    entities = [];

    for(let i=0;i<density;i++){
      const kind = pick(kindsBag);

      // أحجام محسنة وثابتة (تساعد على منع التداخل)
      let w;
      if(kind === 'truck') w = TILE * 2.25;
      else if(kind === 'bike') w = TILE * 1.20;
      else w = TILE * 1.65;

      const color = pick(vehicleColors);

      entities.push({ kind, x: 0, w, color, horn: Math.random()<0.06 });
    }

    const totalW = entities.reduce((s,v)=>s+v.w,0);
    gap = (W - totalW) / Math.max(1, density);
    if(!isFinite(gap)) gap = minGap;

    // إذا كانت المسافة غير كافية نقلل عدد المركبات
    if(gap < minGap && density > 1){
      density -= 1;
      continue;
    }
    gap = Math.max(minGap, gap);

    // توزيع مرتب بدون تداخل: ابدأ كل المركبات خارج الشاشة من جهة الدخول
    const totalSpan = totalW + gap * (entities.length + 1);
    let x;
    if(dir > 0){
      // تدخل من اليسار (قريباً من الحافة في المستويات الأولى حتى لا تكون البداية سهلة جداً)
      const off = (lvl <= 4) ? rand(10, 60) : rand(80, 220);
      x = -totalSpan - off;
    }else{
      // تدخل من اليمين
      const off = (lvl <= 4) ? rand(10, 60) : rand(80, 220);
      x = W + off;
    }
    for(const v of entities){
      v.x = x;
      x += v.w + gap;
    }

    break;
  }

  return { type:'road', y, dir, speed, gap, entities };
}

function makeRailLane(y, lvl){
    const dir = Math.random() < 0.5 ? -1 : +1;
    const speed = (220 + lvl*18) * DIFF[SETTINGS.diff].speedMul;
    const gap = 3.8 + Math.random()*2.2; // seconds
    const warn = 1.2; // seconds before train
    return { type:'rail', y, dir, speed, entities: [], train: null, t: 0, gap, warn, warning:false };
  }

  function updateHUD(){
    levelTxt.textContent = toArabic(level);
    scoreTxt.textContent = toArabic(score);
    let lifeLabel;
    if(lives === Infinity){
      lifeLabel = '∞';
    }else{
      lifeLabel = ('♥'.repeat(lives) || '—');
    }
    lifeTxt.textContent = lifeLabel;
  }

  function formatTime(t){
    if(!isFinite(t)) return '—';
    return toArabic(Math.max(0, Math.ceil(t)));
  }

  // Movement
  function move(dx, dy){
    if(!running || paused) return;
    if(modal.hidden === false || pauseModal.hidden === false) return;

    const nx = player.gx + dx;
    const ny = player.gy + dy;
    if(nx < 0 || nx >= COLS) return;
    if(ny < 0 || ny >= lanes.length) return;

    player.gx = nx;
    player.gy = ny;
    player.x = nx * TILE;
    player.y = ny * TILE;
    player.wobble = 1;

    // scoring: moving upward (towards y=0) gives points
    if(dy === -1){
      score += 1;
    }
    sfxStep();
    updateHUD();

    // if reached top safe (gy===0), level up
    if(player.gy === 0){
      level += 1;
      score += 10;
      buildLevel(level);
      beep(880, 0.06, 'triangle', 0.05);
    }

    // keep camera centered
    const py = player.y;
    const target = py - (ROWS_VISIBLE-3)*TILE;
    cameraY = Math.max(0, Math.min(target, (lanes.length* TILE) - H));
  }

  // ---------- Collision ----------
  function playerRect(){
    // صندوق تصادم أدق (أصغر) ليطابق شكل الشخصية الحقيقي
    const pad = 18;
    return {
      x: player.x + pad,
      y: player.y + pad,
      w: TILE - pad*2,
      h: TILE - pad*2
    };
  }

  function intersects(a,b){
    return a.x < b.x+b.w && a.x+a.w > b.x && a.y < b.y+b.h && a.y+a.h > b.y;
  }

  function checkCollision(now){
    if(qActive) return false;
    if(now < invUntil) return false;
    const lane = lanes[player.gy];
    if(!lane) return false;
    const pr = playerRect();
    if(lane.type === 'road'){
      for(const v of lane.entities){
        // صندوق تصادم للمركبات أصغر من الرسم (لتفادي الاصطدام قبل اللمس)
        const padX = Math.min(28, Math.max(14, v.w * 0.12));
        const vr = {
          x: v.x + padX,
          y: lane.y*TILE + TILE*0.24,
          w: Math.max(8, v.w - padX*2),
          h: TILE*0.52
        };
        if(intersects(pr, vr)) return true;
      }
    }
    if(lane.type === 'rail' && lane.train){
      const t = lane.train;
      const padX = 30;
      const vr = {
        x: t.x + padX,
        y: lane.y*TILE + TILE*0.25,
        w: Math.max(10, t.w - padX*2),
        h: TILE*0.50
      };
      if(intersects(pr, vr)) return true;
    }
    return false;
  }

  // ---------- Question System ----------
  let qActive = false;
  let qLeft = 0;
  let qInterval = null;
  let qCorrect = null;

  function openQuestion(){
    if(qActive) return;
    qActive = true;
    modal.hidden = false;
    qLevelEl.textContent = toArabic(level);

    const {qTime} = DIFF[SETTINGS.diff];
    qLeft = qTime;
    qTimerEl.textContent = formatTime(qLeft);

    const q = generateQuestion();
    qCorrect = q.correct;

    qPromptEl.textContent = q.prompt;
    renderVisual(q.visual);

    qOptionsEl.innerHTML = '';
    q.options.forEach((opt) => {
      const b = document.createElement('button');
      b.className = 'opt';
      b.textContent = opt.label;
      b.addEventListener('click', () => answer(opt.value));
      qOptionsEl.appendChild(b);
    });

    qHintEl.textContent = 'اختر الإجابة الصحيحة قبل انتهاء الوقت.';

    qInterval = setInterval(() => {
      qLeft -= 1;
      qTimerEl.textContent = formatTime(qLeft);
      if(qLeft <= 3 && qLeft > 0) beep(880, 0.03, 'square', 0.03);
      if(qLeft <= 0){
        clearInterval(qInterval);
        qInterval = null;
        failByTimeout();
      }
    }, 1000);
  }

  function closeQuestion(force=false){
    if(!qActive && !force) return;
    qActive = false;
    modal.hidden = true;
    qOptionsEl.innerHTML = '';
    qVisualEl.innerHTML = '';
    if(qInterval){ clearInterval(qInterval); qInterval = null; }
  }

  closeModalBtn.addEventListener('click', () => {
    // لا نسمح بإغلاق السؤال للهروب — لكن نعطيه خيار العودة للقائمة في الإيقاف.
    beep(220, 0.05, 'sine', 0.03);
  });

  function answer(val){
    if(!qActive) return;
    const ok = val === qCorrect;

    // mark buttons
    [...qOptionsEl.children].forEach(btn => {
      const isThis = btn.textContent === String(val) || btn.textContent === String(val).split('').join('');
      // We compare by value using dataset? Simpler: add classes based on click result only
    });

    if(ok){
      sfxGood();
      succeed();
    }else{
      sfxBad();
      fail();
    }
  }

  function failByTimeout(){
    qHintEl.textContent = 'انتهى الوقت ⏱️';
    sfxBad();
    setTimeout(()=>{ closeQuestion(); restartAttempt('انتهى الوقت ⏱️ — تبدأ من جديد'); }, 350);
  }

  function succeed(){
    // إجابة صحيحة: نكمل مباشرة (الأسئلة غير محدودة)
    updateHUD();

    // Small invincibility + push player back one tile (safer)
    invUntil = performance.now() + 1500;
    player.gy = Math.min(lanes.length-1, player.gy + 1);
    player.y = player.gy * TILE;

    closeQuestion();
  }

  function fail(){
    closeQuestion();
    restartAttempt('إجابة خاطئة ❌ — تبدأ من جديد');
  }

  function renderVisual(visual){
    qVisualEl.innerHTML = '';
    if(!visual) return;
    if(visual.type === 'dots'){
      const {a, b, crossed} = visual;
      const total = a + b;
      for(let i=0;i<total;i++){
        const d = document.createElement('div');
        d.className = 'dot';
        if(crossed && i >= (a - crossed) && i < a) d.classList.add('cross');
        qVisualEl.appendChild(d);
      }
    }else{
      qVisualEl.textContent = '';
    }
  }

  function generateQuestion(){
    if(SETTINGS.mode === 'primary'){
      return genPrimaryQuestion();
    }
    return genUpperQuestion();
  }

  function genPrimaryQuestion(){
    // within 0..10 only
    const kind = Math.random() < 0.52 ? 'add' : 'sub';

    if(kind === 'add'){
      const a = randi(0, 10);
      const b = randi(0, 10 - a);
      const ans = a + b;
      const options = buildOptions(ans, 0, 10);
      return {
        prompt: `${toArabic(a)} + ${toArabic(b)} = ؟`,
        correct: toArabic(ans),
        options,
        visual: {type:'dots', a, b, crossed:0}
      };
    }else{
      const a = randi(0, 10);
      const b = randi(0, a);
      const ans = a - b;
      const options = buildOptions(ans, 0, 10);
      return {
        prompt: `${toArabic(a)} − ${toArabic(b)} = ؟`,
        correct: toArabic(ans),
        options,
        visual: {type:'dots', a, b:0, crossed:b}
      };
    }
  }

  function genUpperQuestion(){
    // mix multiplication & division; difficulty increases with level by biasing division and higher factors
    const divBias = Math.min(0.65, 0.25 + (level-1)*0.04);
    const kind = Math.random() < divBias ? 'div' : 'mul';

    if(kind === 'mul'){
      // favor higher numbers as level grows
      const hi = Math.min(10, 4 + Math.floor(level/2));
      const a = randi(0, 10);
      const b = randi(0, hi);
      const ans = a * b;
      const options = buildOptions(ans, 0, 100, true);
      return {
        prompt: `${toArabic(a)} × ${toArabic(b)} = ؟`,
        correct: toArabic(ans),
        options,
        visual: null
      };
    }else{
      // division with single-digit divisor and single-digit quotient
      const divisor = randi(1, 9);
      const quotient = randi(0, 9);
      const dividend = divisor * quotient;
      const ans = quotient;
      const options = buildOptions(ans, 0, 9);
      return {
        prompt: `${toArabic(dividend)} ÷ ${toArabic(divisor)} = ؟`,
        correct: toArabic(ans),
        options,
        visual: null
      };
    }
  }

  function buildOptions(ans, min, max, allowLarge=false){
    // returns 4 options objects: {label,value} with Arabic digits labels/values as Arabic strings
    const set = new Set();
    set.add(ans);

    const tries = 40;
    for(let i=0;i<tries && set.size < 4;i++){
      let d;
      // create distractors near answer
      if(Math.random() < 0.7){
        d = ans + randi(-4, 4);
      }else{
        d = randi(min, max);
      }
      d = Math.max(min, Math.min(max, d));
      set.add(d);
    }
    // if still not enough, fill randomly
    while(set.size < 4){
      set.add(randi(min, max));
    }

    const options = [...set].slice(0,4);
    shuffle(options);

    return options.map(v => ({ label: toArabic(v), value: toArabic(v) }));
  }

  // ---------- Game Over ----------
  function restartAttempt(reasonText){
    // يبدأ من جديد داخل نفس الإعدادات بدون الرجوع للقائمة
    running = true;
    paused = false;
    hudEl.hidden = false;

    resetWorld();

    shake = 14;
    flashMsg = reasonText ? { text: reasonText, until: performance.now() + 900 } : null;
  }

  function gameOver(){
    running = false;
    paused = false;
    hudEl.hidden = true;
    // small overlay message on canvas
    drawFrame(performance.now(), true);
    setTimeout(() => {
      // return to menu
      backToMenu();
    }, 900);
  }

  // ---------- Start / Restart ----------
  startBtn.addEventListener('click', () => {
    startRun();
  });

  function startRun(){
    document.body.classList.add('ingame');
    // تأكد من عدم وجود تمرير على الجوال
    window.scrollTo(0,0);
    menuEl.hidden = true;
    gameCardEl.hidden = false;
    hudEl.hidden = false;

    resetWorld();
    running = true;
    paused = false;
    lastTime = performance.now();
    requestAnimationFrame(loop);
  }

  function restartRun(){
    resetWorld();
    running = true;
    paused = false;
    lastTime = performance.now();
    requestAnimationFrame(loop);
  }

  // ---------- Update loop ----------
  let lastTime = 0;

  function loop(now){
    if(!running || paused) return;

    const dt = Math.min(0.033, (now - lastTime) / 1000);
    lastTime = now;

    update(dt, now);
    drawFrame(now);

    requestAnimationFrame(loop);
  }

  function update(dt, now){
    // move vehicles
    for(const lane of lanes){
      if(lane.type === 'road'){
  for(const v of lane.entities){
    v.x += lane.dir * lane.speed * dt;

    // إعادة دخول بدون عشوائية (تمنع تداخل 2-3 سيارات فوق بعض)
    const offLeft = (v.x + v.w) < -80;
    const offRight = v.x > (W + 80);

    if(lane.dir < 0 && offLeft){
      // خرج من اليسار → يرجع من خارج الشاشة يمينًا بعد أبعد مركبة (يمنع الظهور من منتصف الطريق)
      let rightMost = -Infinity;
      for(const o of lane.entities){
        if(o === v) continue;
        rightMost = Math.max(rightMost, o.x + o.w);
      }
      // اجعل نقطة الدخول دائماً خارج الشاشة
      const base = Math.max(isFinite(rightMost) ? rightMost : W, W);
      v.x = base + (lane.gap || 72) + rand(40, 140);
    }

    if(lane.dir > 0 && offRight){
      // خرج من اليمين → يرجع من خارج الشاشة يسارًا قبل أقرب مركبة
      let leftMost = Infinity;
      for(const o of lane.entities){
        if(o === v) continue;
        leftMost = Math.min(leftMost, o.x);
      }
      const base = Math.min(isFinite(leftMost) ? leftMost : 0, 0);
      v.x = base - v.w - (lane.gap || 72) - rand(40, 140);
    }
  }
}else if(lane.type === 'rail'){
        lane.t += dt;
        if(!lane.train){
          // warning window
          if(lane.t > lane.gap - lane.warn && lane.t < lane.gap){
            lane.warning = true;
          }else{
            lane.warning = false;
          }
          if(lane.t >= lane.gap){
            // spawn train
            lane.warning = false;
            lane.t = 0;
            const w = TILE * 6.2;
            const x = lane.dir < 0 ? W + 20 : -w - 20;
            lane.train = { x, w };
            if(soundOn) beep(180, 0.12, 'sawtooth', 0.03);
          }
        }else{
          lane.train.x += lane.dir * lane.speed * dt;
          if(lane.dir < 0 && lane.train.x + lane.train.w < -60) lane.train = null;
          if(lane.dir > 0 && lane.train.x > W + 60) lane.train = null;
        }
      }
    }

    // wobble decay
    player.wobble *= 0.86;

    // collision
    const hit = checkCollision(now);
    if(hit){
      sfxHit();
      openQuestion();
      // if question is open, game continues but we stop updates via qActive? We'll simply pause collisions while modal open.
      invUntil = now + 10; // small delay
    }

    // time HUD: show remaining question time when active, else show dash
    timeTxt.textContent = qActive ? formatTime(qLeft) : '—';
    updateHUD();
  }

  // ---------- Drawing ----------
  function drawPlayerSprite(px, py, now){
  const inv = now < invUntil;
  const bob = Math.sin((now/140) + player.wobble*6) * 2;

  ctx.save();
  // وميض عند الحماية
  if(inv && (Math.floor(now/120) % 2 === 0)) ctx.globalAlpha = 0.55;

  const img = ANIMAL_SPRITES[SETTINGS.char];
  const size = TILE * 0.86; // أكبر وأوضح
  const ox = px + (TILE - size)/2;
  const oy = py + (TILE - size)/2 + bob;

  if(img && img.complete && img.naturalWidth){
    ctx.drawImage(img, ox, oy, size, size);
  }else{
    // fallback: emoji
    ctx.font = '46px system-ui, "Apple Color Emoji", "Segoe UI Emoji"';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(EMOJI[SETTINGS.char] || '🐇', px + TILE/2, py + TILE/2 + bob);
  }
  ctx.restore();
}


  function drawFlashMessage(now){
    if(!flashMsg) return;
    if(now > flashMsg.until){ flashMsg = null; return; }
    ctx.save();
    ctx.globalAlpha = 0.92;
    ctx.fillStyle = 'rgba(11,16,32,.65)';
    roundRect(W/2 - 220, 90, 440, 56, 18, true, false);
    ctx.fillStyle = 'rgba(234,240,255,.95)';
    ctx.font = '700 18px ' + getUIFont();
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(flashMsg.text, W/2, 118);
    ctx.restore();
  }


  function drawFrame(now, showGameOver=false){
    ctx.clearRect(0,0,W,H);

    ctx.save();
    if(shake > 0){
      const sx = (Math.random()-0.5)*shake;
      const sy = (Math.random()-0.5)*shake;
      ctx.translate(sx, sy);
      shake *= 0.86;
      if(shake < 0.3) shake = 0;
    }

    // Background
    ctx.fillStyle = '#0a0e1d';
    ctx.fillRect(0,0,W,H);

    // grid offset by camera
    const firstRow = Math.floor(cameraY / TILE);
    const offsetY = -(cameraY % TILE);

    for(let r=0; r<ROWS_VISIBLE+1; r++){
      const worldRow = firstRow + r;
      const y = offsetY + r*TILE;

      const lane = lanes[worldRow];
      if(!lane) continue;

      drawLane(lane, y, now);
    }

    // Draw player
    const px = player.x;
    const py = player.y - cameraY;

    // player sprite
    drawPlayerSprite(px, py, now);

    // top gradient overlay
    const g = ctx.createLinearGradient(0,0,0,140);
    g.addColorStop(0,'rgba(11,16,32,.65)');
    g.addColorStop(1,'rgba(11,16,32,0)');
    ctx.fillStyle = g;
    ctx.fillRect(0,0,W,140);

    // game over banner
    if(showGameOver){
      ctx.fillStyle = 'rgba(0,0,0,.55)';
      ctx.fillRect(0,0,W,H);
      ctx.fillStyle = '#eaf0ff';
      ctx.font = '900 34px ' + getUIFont();
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('انتهت المحاولة', W/2, H/2 - 10);
      ctx.font = '700 18px ' + getUIFont();
      ctx.fillStyle = 'rgba(234,240,255,.85)';
      ctx.fillText('ستعود للقائمة…', W/2, H/2 + 26);
    }
  
    drawFlashMessage(now);
    ctx.restore();
}

  function drawLane(lane, screenY, now){
    if(lane.type === 'safe'){
      // grass/safe zone
      ctx.fillStyle = '#0f2a1f';
      ctx.fillRect(0, screenY, W, TILE);

      // subtle pattern
      ctx.fillStyle = 'rgba(34,197,94,.10)';
      for(let i=0;i<COLS;i++){
        ctx.fillRect(i*TILE + ((i%2)*8), screenY + 8, 10, 10);
      }
      // border
      ctx.fillStyle = 'rgba(255,255,255,.06)';
      ctx.fillRect(0, screenY, W, 1);
      return;
    }

    if(lane.type === 'road'){
      ctx.fillStyle = '#1a2238';
      ctx.fillRect(0, screenY, W, TILE);

      // dashed lines
      ctx.strokeStyle = 'rgba(255,255,255,.16)';
      ctx.lineWidth = 3;
      ctx.setLineDash([16, 16]);
      ctx.beginPath();
      ctx.moveTo(0, screenY + TILE/2);
      ctx.lineTo(W, screenY + TILE/2);
      ctx.stroke();
      ctx.setLineDash([]);

      // vehicles
      for(const v of lane.entities){
        drawVehicle(v, screenY, lane.dir);
      }

      // border
      ctx.fillStyle = 'rgba(255,255,255,.06)';
      ctx.fillRect(0, screenY, W, 1);
      return;
    }

    if(lane.type === 'rail'){
      ctx.fillStyle = '#1b1b2a';
      ctx.fillRect(0, screenY, W, TILE);

      // rails
      ctx.fillStyle = 'rgba(234,240,255,.16)';
      ctx.fillRect(0, screenY + TILE*0.28, W, 4);
      ctx.fillRect(0, screenY + TILE*0.68, W, 4);

      // sleepers
      ctx.fillStyle = 'rgba(245,158,11,.15)';
      for(let x=0; x<W; x+=28){
        ctx.fillRect(x, screenY + TILE*0.32, 10, TILE*0.36);
      }

      // warning
      if(lane.warning){
        const pulse = 0.5 + 0.5*Math.sin(now/120);
        ctx.fillStyle = `rgba(239,68,68,${0.18 + 0.22*pulse})`;
        ctx.fillRect(0, screenY, W, TILE);
        // indicator light
        ctx.fillStyle = 'rgba(239,68,68,.9)';
        ctx.beginPath();
        ctx.arc(W-22, screenY+22, 8 + 3*pulse, 0, Math.PI*2);
        ctx.fill();
      }

      // train
      if(lane.train){
        const t = lane.train;

        // قطار أوضح وأجمل (مع مقدمة/مصابيح) بدون ظلال
        const h = TILE*0.66;
        const yy = screenY + TILE*0.17;
        const x = t.x;
        const w = t.w;

        ctx.save();
        ctx.translate(x + w/2, yy + h/2);
        // القطار يتجه مع الحركة: افتراضيًا لليمين، نقلب عند الحركة لليسار
        if(lane.dir < 0) ctx.scale(-1, 1);

        const bx = -w/2, by = -h/2;

        // body
        ctx.fillStyle = 'rgba(110,231,255,.22)';
        roundRect(bx, by+6, w, h-12, 18, true, false);

        // lower stripe
        ctx.fillStyle = 'rgba(0,0,0,.12)';
        roundRect(bx, by+h-22, w, 14, 10, true, false);

        // locomotive nose (front-right)
        ctx.fillStyle = 'rgba(110,231,255,.30)';
        ctx.beginPath();
        ctx.moveTo(bx+w-2, by+14);
        ctx.quadraticCurveTo(bx+w+22, by+h/2, bx+w-2, by+h-14);
        ctx.closePath();
        ctx.fill();

        // windows
        ctx.fillStyle = 'rgba(234,240,255,.32)';
        for(let i=0;i<7;i++){
          roundRect(bx + 22 + i*38, by + 16, 24, 18, 7, true, false);
        }

        // lights (front)
        ctx.fillStyle = 'rgba(255,210,90,.9)';
        roundRect(bx+w-12, by+h/2-8, 10, 16, 6, true, false);

        // tail light (back)
        ctx.fillStyle = 'rgba(255,90,90,.85)';
        roundRect(bx+2, by+h/2-6, 8, 12, 5, true, false);

        // wheels dots
        ctx.fillStyle = 'rgba(0,0,0,.20)';
        for(let i=0;i<8;i++){
          ctx.beginPath();
          ctx.arc(bx+18+i*40, by+h-10, 4, 0, Math.PI*2);
          ctx.fill();
        }

        ctx.restore();
      }

      // border
      ctx.fillStyle = 'rgba(255,255,255,.06)';
      ctx.fillRect(0, screenY, W, 1);
      return;
    }
  }

  function drawVehicle(v, y, dir){
  const h = TILE*0.66;
  const yy = y + TILE*0.17;
  const x = v.x;
  const w = v.w;

  // حاول أولاً رسم sprite جاهز (أجمل بكثير من المستطيلات)
  const key = `${v.kind}_${v.color}`;
  const img = SPRITES[key];

  if(img && img.complete && img.naturalWidth){
    ctx.save();
    ctx.translate(x + w/2, yy + h/2);
    // الإيموجي الأصلية تتجه غالباً لليمين؛ نقلب فقط عند الحركة لليسار
    if(dir < 0) ctx.scale(-1, 1);
    ctx.drawImage(img, -w/2, -h/2, w, h);
    ctx.restore();
    return;
  }

  // fallback (في حال لم تُحمّل الصور بعد)
  const bodyGrad = ctx.createLinearGradient(x, yy, x + w, yy);
  const c1 = shade(v.color, dir > 0 ? -0.18 : 0.10);
  const c2 = shade(v.color, dir > 0 ? 0.18 : -0.10);
  bodyGrad.addColorStop(0, c1);
  bodyGrad.addColorStop(1, c2);
  ctx.fillStyle = bodyGrad;

  roundRect(x, yy + 4, w, h - 8, 20, true, false);

  // wheels
  const wheelY = yy + h - 10;
  const r = v.kind === 'bike' ? 12 : 14;
  const w1 = x + 22;
  const w2 = x + w - 22;

  ctx.fillStyle = 'rgba(0,0,0,.55)';
  ctx.beginPath();
  ctx.arc(w1, wheelY, r, 0, Math.PI*2);
  ctx.arc(w2, wheelY, r, 0, Math.PI*2);
  ctx.fill();
}

function roundRect(x, y, w, h, r, fill, stroke){
    const rr = Math.min(r, w/2, h/2);
    ctx.beginPath();
    ctx.moveTo(x+rr, y);
    ctx.arcTo(x+w, y, x+w, y+h, rr);
    ctx.arcTo(x+w, y+h, x, y+h, rr);
    ctx.arcTo(x, y+h, x, y, rr);
    ctx.arcTo(x, y, x+w, y, rr);
    ctx.closePath();
    if(fill) ctx.fill();
    if(stroke) ctx.stroke();
  }

  function getUIFont(){
    return 'ui-sans-serif, system-ui, -apple-system, Segoe UI, Tahoma, Arial, "Noto Kufi Arabic", "Noto Sans Arabic", sans-serif';
  }
  function getEmojiFont(){
    return '"Apple Color Emoji","Segoe UI Emoji","Noto Color Emoji",' + getUIFont();
  }

  // ---------- Public behavior when question modal is open ----------
  // Prevent scrolling/zoom while playing
  document.addEventListener('touchmove', (e) => {
    if(running) e.preventDefault();
  }, {passive:false});

  // Start with hints
  updateHints();
})();
