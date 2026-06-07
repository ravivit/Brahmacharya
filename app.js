// ============================================================
// CONFIG — apni keys yahan paste karo
// ============================================================
const SUPABASE_URL      = 'https://peoagetztkavmxzkbpgk.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBlb2FnZXR6dGthdm14emticGdrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODAzMzk2OTgsImV4cCI6MjA5NTkxNTY5OH0.KQ3iBjkw3JaMkdu8JVjsKz0tpcTRcjz9gGaFfmcSz1U';

// ============================================================
// CONSTANTS
// ============================================================
const MONTHS       = ['June','July','August','September','October','November','December'];
const MONTH_NUMS   = [5,6,7,8,9,10,11]; // JS month index (0=Jan)
const YEAR         = new Date().getFullYear();
const DAY_NAMES    = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];

const CHALLENGES = [
  { id:'c1',  days:1,  label:'Beej',        icon:'🪙', bracket:'First Spark',       metal:'Copper'   },
  { id:'c3',  days:3,  label:'Arambha',     icon:'🏅', bracket:'Stay Consistent',   metal:'Bronze'   },
  { id:'c7',  days:7,  label:'Tapasvi',     icon:'🥈', bracket:'Discipline Forged', metal:'Silver'   },
  { id:'c15', days:15, label:'Dhira',       icon:'🥇', bracket:'Positive Aura',     metal:'Gold'     },
  { id:'c21', days:21, label:'Vira',        icon:'💎', bracket:'Disciplined Aura',  metal:'Diamond'  },
{ id:'c30', days:30, label:'Ojas',        icon:'✨', bracket:'Powerful Aura',     metal:'Kohinoor' },
  { id:'c50', days:50, label:'Agni',        icon:'🔱', bracket:'Inner Fire',        metal:'Titanium' },
  { id:'c90', days:90, label:'Brahmachari', icon:'👑', bracket:'Powerful Man',      metal:'Crown'    },
];

const MOTIVATIONS = [
  "🔱 Brahmacharya is not suppression — it is transformation of energy into greatness.",
  "💪 Every urge resisted is a brick in the temple of your willpower.",
  "🌟 The man who masters himself masters the world. Stay strong, warrior.",
  "🧠 Your brain is rewiring itself. Each clean day makes you sharper, calmer, more powerful.",
  "⚡ Discipline today is freedom tomorrow. Don't trade your future for a moment of weakness.",
  "🔥 You are not fighting an addiction — you are reclaiming your life force.",
  "🌙 Sleep clean tonight. Wake up powerful tomorrow.",
  "🦁 Lions don't explain themselves to sheep. Stay silent. Stay strong. Keep building.",
  "🎯 Clarity comes from commitment. The further you go, the clearer your vision becomes.",
  "🙏 Every day of Brahmacharya is a prayer to your highest self.",
  "⚔️ The battlefield is your mind. Win there, and you win everywhere.",
  "🌅 Brahmacharya fills you with prana — life force. Guard it like a warrior guards his kingdom.",
  "🧘 Stillness is strength. Peace is power. Your urges are just tests — pass them.",
  "💎 Diamonds are made under pressure. Your restraint is creating something priceless.",
  "🔑 The door to your potential opens only when you stop leaking your energy.",
  "🌿 Nature rewards discipline. Watch your life bloom as you practice Brahmacharya.",
  "👁️ See clearly. Think clearly. Feel deeply. This is what purity gives you.",
  "🏔️ Every mountain is climbed one step at a time. Every streak is built one day at a time.",
  "✨ You are not just quitting a habit. You are becoming a new version of yourself.",
  "🚀 Your energy is your superpower. Guard it. Grow it. Unleash it on your goals."
];

// ============================================================
// STATE
// ============================================================
let sb          = null;
let currentUser = null;   // Supabase auth user
let profile     = null;   // { name, goal, startDate, user_id }
let logs        = {};     // { 'YYYY-MM-DD': 'done'|'missed' }
let triggers    = [];
let streakHistory   = [];
let currentStreak   = 0;
let totalPoints     = 0;
let musicPlaying    = false;
let redemptions     = {};  // { 'YYYY-MM-DD': true } — redeemed days

const today    = new Date(); today.setHours(0,0,0,0);
const todayStr = fmtDate(today);

// ============================================================
// UTILS
// ============================================================
function fmtDate(d) {
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
}
function parseDate(s) {
  const [y,m,d] = s.split('-').map(Number);
  const dt = new Date(y,m-1,d); dt.setHours(0,0,0,0); return dt;
}
function daysFrom(startStr) {
  return Math.floor((today - parseDate(startStr)) / 86400000) + 1;
}
function el(id) { return document.getElementById(id); }
function showToast(msg, dur=3000) {
  const t = el('toast'); t.textContent = msg; t.classList.add('show');
  setTimeout(() => t.classList.remove('show'), dur);
}
function showScreen(id) {
['authScreen','mainScreen','adminScreen','clubScreen','chatScreen'].forEach(s => {
    el(s).style.display = s === id ? 'block' : 'none';
  });
}

// ============================================================
// SUPABASE INIT
// ============================================================
function initSB() {
  try {
    if (window.supabase && window.supabase.createClient) {
      sb = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
      console.log('✅ Supabase ready');
    } else {
      console.warn('Supabase CDN not loaded — offline mode');
    }
  } catch(e) { console.error('Supabase init error:', e); }
}

// Save full app data to localStorage after every successful load
function cacheAppData() {
  try {
    if (profile) localStorage.setItem('bm_profile', JSON.stringify(profile));
    if (Object.keys(logs).length) localStorage.setItem('bm_logs', JSON.stringify(logs));
    if (triggers.length) localStorage.setItem('bm_triggers', JSON.stringify(triggers));
    if (currentUser) localStorage.setItem('bm_user', JSON.stringify({ id: currentUser.id, email: currentUser.email }));
  } catch(e) {}
}

// Load cached app data from localStorage (offline fallback)
function loadCachedAppData() {
  try {
    const u = localStorage.getItem('bm_user');
    const p = localStorage.getItem('bm_profile');
    const l = localStorage.getItem('bm_logs');
    const t = localStorage.getItem('bm_triggers');
    if (u) currentUser = JSON.parse(u);
    if (p) profile = JSON.parse(p);
    if (l) {
      logs = JSON.parse(l);
      redemptions = {};
      Object.entries(logs).forEach(([date, status]) => {
        if (status === 'redeemed') redemptions[date] = true;
      });
    }
    if (t) triggers = JSON.parse(t);
    return !!(currentUser && profile);
  } catch(e) { return false; }
}

// ============================================================
// AUTH FUNCTIONS
// ============================================================
function switchTab(tab) {
  el('loginForm').style.display    = tab==='login'    ? 'block' : 'none';
  el('registerForm').style.display = tab==='register' ? 'block' : 'none';
  el('tabLogin').classList.toggle('active', tab==='login');
  el('tabRegister').classList.toggle('active', tab==='register');
}

async function doLogin() {
  const email = el('loginEmail').value.trim();
  const pass  = el('loginPassword').value;
  el('loginErr').textContent = '';
  if (!email || !pass) { el('loginErr').textContent = '❌ Fill all fields'; return; }
  const btn = el('loginBtn');
  btn.disabled = true; btn.textContent = '⏳ Logging in...';
  try {
    const { data, error } = await sb.auth.signInWithPassword({ email, password: pass });
    if (error) throw error;
    await onLogin(data.user);
  } catch(e) {
    el('loginErr').textContent = '❌ ' + e.message;
  } finally {
    btn.disabled = false; btn.textContent = '🔥 LOGIN';
  }
}

async function doRegister() {
  const name      = el('regName').value.trim();
  const email     = el('regEmail').value.trim();
  const pass      = el('regPassword').value;
  const goal      = el('regGoal').value.trim();
  const startDate = el('regStartDate').value;
  el('registerErr').textContent = '';
  if (!name || !email || !pass || !startDate) { el('registerErr').textContent = '❌ Fill all required fields'; return; }
  if (pass.length < 6) { el('registerErr').textContent = '❌ Password min 6 chars'; return; }
  const btn = el('registerBtn');
  btn.disabled = true; btn.textContent = '⏳ Creating account...';
  try {
    // 1. Create auth user
    const { data, error } = await sb.auth.signUp({ email, password: pass });
    if (error) throw error;
    const user = data.user;
    // 2. Save profile
    const prof = { user_id: user.id, name, goal, startDate, email };
    const { error: pe } = await sb.from('bct_profiles').upsert(prof, { onConflict: 'user_id' });
    if (pe) throw pe;
    // 3. Save empty triggers
    await sb.from('bct_triggers').upsert({ user_id: user.id, triggers: [] }, { onConflict: 'user_id' });
    await onLogin(user);
    showToast(`🔥 Welcome, ${name}! Journey begins!`, 4000);
  } catch(e) {
    el('registerErr').textContent = '❌ ' + e.message;
  } finally {
    btn.disabled = false; btn.textContent = '⚡ START JOURNEY';
  }
}

async function doLogout() {
  await sb.auth.signOut();
  currentUser = null; profile = null; logs = {}; triggers = [];
  showScreen('authScreen');
}



async function forgotPassword() {
  const email = el('loginEmail').value.trim();
  if (!email) { el('loginErr').textContent = '❌ Please enter your email address'; return; }
  const { error } = await sb.auth.resetPasswordForEmail(email, {
    redirectTo: window.location.href
  });
  if (error) { el('loginErr').textContent = '❌ ' + error.message; return; }
  el('loginErr').style.color = '#10b981';
  el('loginErr').textContent = '✅ Password reset link sent — please check your email.';
}

async function onLogin(user) {
  currentUser = user;
  // Load profile
  const { data: prof } = await sb.from('bct_profiles').select('*').eq('user_id', user.id).maybeSingle();
  if (!prof) {
    // Profile not set — show auth to fill details (edge case for email confirm flow)
    showScreen('authScreen');
    return;
  }
  profile = prof;
  // Load logs
  const { data: logRows } = await sb.from('bct_logs').select('*').eq('user_id', user.id);
  logs = {};
  if (logRows) logRows.forEach(r => logs[r.date] = r.status);

  // Derive redemptions from logs (no extra query needed)
  redemptions = {};
  Object.entries(logs).forEach(([date, status]) => {
    if (status === 'redeemed') redemptions[date] = true;
  });

  // Load triggers
  const { data: tRow } = await sb.from('bct_triggers').select('*').eq('user_id', user.id).maybeSingle();
  triggers = tRow && tRow.triggers ? tRow.triggers : [];

  cacheAppData(); // save for offline use
  showScreen('mainScreen');
  renderAll();
}

// ============================================================
// DATA SAVE
// ============================================================
async function saveLog(dateStr, status) {
  logs[dateStr] = status;
  localStorage.setItem('bm_logs', JSON.stringify(logs)); // always save locally
  if (!navigator.onLine || !sb) {
    // Queue for sync later
    const q = JSON.parse(localStorage.getItem('bm_offline_queue') || '[]');
    q.push({ user_id: currentUser.id, date: dateStr, status, ts: Date.now() });
    localStorage.setItem('bm_offline_queue', JSON.stringify(q));
    return;
  }
  try {
    await sb.from('bct_logs').upsert({ user_id: currentUser.id, date: dateStr, status }, { onConflict: 'user_id,date' });
  } catch(e) {
    const q = JSON.parse(localStorage.getItem('bm_offline_queue') || '[]');
    q.push({ user_id: currentUser.id, date: dateStr, status, ts: Date.now() });
    localStorage.setItem('bm_offline_queue', JSON.stringify(q));
  }
}

async function saveTriggers() {
  await sb.from('bct_triggers').upsert({ user_id: currentUser.id, triggers }, { onConflict: 'user_id' });
}

// ============================================================
// COMPUTE STATS
// ============================================================
function computeStats() {
  const doneDays = Object.entries(logs).filter(([,v])=>v==='done'||v==='redeemed').map(([k])=>k).sort();

  // Current streak — walk back from today (redeemed days count as done)
  currentStreak = 0;
  const chk = new Date(today);
  while (true) {
    const ds = fmtDate(chk);
    if (logs[ds] === 'done' || logs[ds] === 'redeemed' || redemptions[ds]) {
      currentStreak++; chk.setDate(chk.getDate()-1);
    } else break;
  }

  // All streaks history
  streakHistory = [];
  if (doneDays.length > 0) {
    let sStart = doneDays[0], sLen = 1;
    for (let i=1; i<doneDays.length; i++) {
      const diff = (parseDate(doneDays[i]) - parseDate(doneDays[i-1])) / 86400000;
      if (diff === 1) { sLen++; }
      else { streakHistory.push({ start:sStart, end:doneDays[i-1], length:sLen }); sStart=doneDays[i]; sLen=1; }
    }
    streakHistory.push({ start:sStart, end:doneDays[doneDays.length-1], length:sLen });
  }

  // Points — with level multiplier bonuses
  totalPoints = 0;
  let run = 0;
  const allDates = [];
  if (profile && profile.startDate) {
    let d = parseDate(profile.startDate);
    while (d <= today) { allDates.push(fmtDate(d)); d.setDate(d.getDate()+1); }
  }

  // Milestone bonuses: { days: multiplier }
  const MILESTONES = { 3:1, 7:2, 15:3, 21:4, 30:5, 90:6 };

  allDates.forEach(ds => {
    if (logs[ds] === 'done' || redemptions[ds]) {
      run++;
      totalPoints += 10;
      // Milestone bonus
      if (MILESTONES[run] !== undefined) {
        totalPoints += run * 10 * MILESTONES[run];
      }
    } else if (logs[ds] === 'missed') { run = 0; }
  });

  // Deduct 500 pts for each streak redemption used
  const redemptionCount = Object.keys(redemptions).length;
  totalPoints = Math.max(0, totalPoints - redemptionCount * 500);
}

// ============================================================
// RENDER — HEADER
// ============================================================
function renderHeader() {
  if (!profile) return;
  el('warriorName').textContent  = profile.name;
  el('warriorGoal').textContent  = profile.goal || 'Stay strong, warrior!';
  el('avatarEl').textContent     = profile.name.charAt(0).toUpperCase();
  el('headerStreak').textContent = currentStreak;
  el('headerPoints').textContent = totalPoints;
if(el('headerDay')) el('headerDay').textContent = profile.startDate ? Math.max(1, daysFrom(profile.startDate)) : 1;
if(el('headerBest')) el('headerBest').textContent = streakHistory.length ? Math.max(...streakHistory.map(s=>s.length)) : 0;
}

// ============================================================
// RENDER — TODAY
// ============================================================
function renderToday() {
  const dayNames = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];
  el('todayDate').textContent = `${dayNames[today.getDay()]}, ${today.getDate()} ${today.toLocaleString('default',{month:'long'})} ${today.getFullYear()}`;
  const status = logs[todayStr];
  const bD = el('btnDone'), bM = el('btnMissed');
  if (status === 'done') {
    el('todayStatus').textContent = '✅ Done — You stayed strong today!';
    el('todayStatus').style.color = '#10b981';
    bD.disabled = bM.disabled = true;
  } else if (status === 'missed') {
    el('todayStatus').textContent = '💀 Missed — Get back up tomorrow!';
    el('todayStatus').style.color = '#ef4444';
    bD.disabled = bM.disabled = true;
  } else {
    el('todayStatus').textContent = '⏳ Pending — Check in before you sleep';
    el('todayStatus').style.color = '#f59e0b';
    bD.disabled = bM.disabled = false;
  }
}

// ============================================================
// RENDER — TRIGGERS
// ============================================================
function renderTriggers() {
  const list = el('triggersList');
  list.innerHTML = '';
  if (!triggers.length) {
    list.innerHTML = '<span style="color:var(--muted);font-size:.85rem;font-style:italic;">No triggers yet. Identify what tempts you!</span>';
    return;
  }
  triggers.forEach((t,i) => {
    const tag = document.createElement('div');
    tag.className = 'trigger-tag';
    tag.innerHTML = `⚠️ ${t} <button onclick="removeTrigger(${i})">✕</button>`;
    list.appendChild(tag);
  });
}

// ============================================================
// RENDER — STREAK HISTORY
// ============================================================
function renderStreakHistory() {
  const c = el('streakHistory'); c.innerHTML = '';
  if (!streakHistory.length) { c.innerHTML = '<span class="streak-empty">No streaks yet — start today! 💪</span>'; return; }
  [...streakHistory].reverse().forEach(s => {
    const b = document.createElement('div'); b.className = 'streak-badge';
    const fmt = d => `${d.getDate()}/${d.getMonth()+1}`;
    b.textContent = `🔥 ${s.length} day${s.length>1?'s':''} — ${fmt(parseDate(s.start))} to ${fmt(parseDate(s.end))}`;
    c.appendChild(b);
  });
}

// ============================================================
// RENDER — CHALLENGES
// ============================================================
function renderChallenges() {
  const grid = el('challengesGrid'); grid.innerHTML = '';
  CHALLENGES.forEach(ch => {
    const completed = currentStreak >= ch.days || streakHistory.some(s=>s.length>=ch.days);
    const active    = currentStreak > 0 && currentStreak < ch.days;
    const progress  = Math.min(100,(currentStreak/ch.days)*100);
    const metalColors = {
      'Copper':'#b87333','Bronze':'#cd7f32','Silver':'#c0c0c0',
      'Gold':'#f59e0b','Diamond':'#a5f3fc','Kohinoor':'#c084fc','Crown':'#fcd34d'
    };
    const metalColor = metalColors[ch.metal] || '#fff';
    const card = document.createElement('div');
    card.className = `challenge-card ${completed?'completed':''} ${active?'active':''}`;
    card.innerHTML = `
      <div class="challenge-icon">${ch.icon}</div>
      <div class="challenge-name">${ch.label}</div>
      <div class="challenge-bracket">(${ch.bracket})</div>
      <div class="challenge-metal" style="color:${metalColor}">— ${ch.metal} —</div>
      <div class="challenge-days">Day ${ch.days}</div>
      <div class="challenge-progress"><div class="challenge-bar" style="width:${completed?100:progress}%"></div></div>
      <div class="challenge-status">${completed?'✅ Unlocked!':active?`${currentStreak}/${ch.days} days`:'🔒 Locked'}</div>`;
    grid.appendChild(card);
  });
}

// ============================================================
// RENDER — CALENDAR (THE MAIN FIX!)
// ============================================================
// Calendar state — current viewed month
let calViewYear  = new Date().getFullYear();
let calViewMonth = new Date().getMonth(); // 0-based

function calPrevMonth() {
  calViewMonth--;
  if (calViewMonth < 0) { calViewMonth = 11; calViewYear--; }
  renderCalendar();
}
window.calPrevMonth = calPrevMonth;

function calNextMonth() {
  calViewMonth++;
  if (calViewMonth > 11) { calViewMonth = 0; calViewYear++; }
  renderCalendar();
}
window.calNextMonth = calNextMonth;

function renderCalendar() {
  const grid = el('calendarGrid');
  if (!grid) return;
  grid.innerHTML = '';

  const mIdx      = calViewMonth;
  const yr        = calViewYear;
  const monthName = new Date(yr, mIdx, 1).toLocaleString('en-IN', { month: 'long' });
  const daysInMon = new Date(yr, mIdx+1, 0).getDate();
  const firstDay  = new Date(yr, mIdx, 1).getDay();

  // Update nav title
  const navTitle = document.getElementById('calNavTitle');
  if (navTitle) navTitle.textContent = `${monthName} ${yr}`;

  // Disable prev if before June 2026 (start)
  // Allow navigation freely

  const block = document.createElement('div');
  block.className = 'month-block';

  // Month heading
  const mHead = document.createElement('div');
  mHead.className = 'month-name';
  mHead.textContent = `${monthName} ${yr}`;
  block.appendChild(mHead);

  // Day-of-week headers
  const hRow = document.createElement('div');
  hRow.className = 'month-days-header';
  DAY_NAMES.forEach(dn => {
    const h = document.createElement('div');
    h.className = 'day-header'; h.textContent = dn; hRow.appendChild(h);
  });
  block.appendChild(hRow);

  // Days grid
  const dGrid = document.createElement('div');
  dGrid.className = 'month-days';

  // Empty leading cells
  for (let e=0; e<firstDay; e++) {
    const emp = document.createElement('div');
    emp.className = 'day-cell empty'; dGrid.appendChild(emp);
  }

  for (let d=1; d<=daysInMon; d++) {
    const dateObj = new Date(yr, mIdx, d);
    dateObj.setHours(0,0,0,0);
    const ds      = fmtDate(dateObj);
    const isToday  = ds === todayStr;
    const isFuture = dateObj > today;
    const isPast   = dateObj < today;
    const status   = logs[ds];

    const cell = document.createElement('div');
    let cls = 'day-cell';
    if (isToday) {
      cls += ' today';
      if (status === 'done') cls += ' done';
      else if (status === 'missed') cls += ' missed';
      else if (status === 'redeemed' || redemptions[ds]) cls += ' redeemed';
    } else if (status === 'redeemed' || redemptions[ds]) {
      cls += ' redeemed';
    } else if (status === 'done') {
      cls += ' done';
    } else if (status === 'missed') {
      cls += ' missed';
    } else if (isFuture) {
      cls += ' future';
    } else if (isPast) {
      cls += ' past-no-log';
    }

    cell.className = cls;
    cell.innerHTML = `
      <span class="day-num">${d}</span>
      <span class="day-name-small">${DAY_NAMES[dateObj.getDay()]}</span>
      <span class="day-dot"></span>`;
    cell.title = `${d} ${monthName} ${yr}${status?' — '+status.toUpperCase():''}`;
    dGrid.appendChild(cell);
  }

  block.appendChild(dGrid);
  grid.appendChild(block);
}

// ============================================================
// RENDER — MOTIVATION
// ============================================================
function renderMotivation() {
  const c = el('motivationTicker'); c.innerHTML = '';
  [...MOTIVATIONS].sort(()=>Math.random()-.5).slice(0,5).forEach(line => {
    const d = document.createElement('div');
    d.className = 'mot-line'; d.textContent = line; c.appendChild(d);
  });
}

// ============================================================
// RENDER ALL
// ============================================================
function renderAll() {
  computeStats();
  renderHeader();
  renderToday();
  renderChallenges();
  renderCalendar();
  renderMotivation();
}

// ============================================================
// CHECK IN
// ============================================================
async function checkIn(status) {
  if (logs[todayStr]) return;
  await saveLog(todayStr, status);
  if (status === 'done') {
    computeStats();
    triggerConfetti();
    showCheckinPopup();
  } else {
    showToast('💀 Logged. Tomorrow is a new battle. Rise again!', 4000);
  }
  renderAll();
}

// ============================================================
// STREAK POPUP — Leetcode style
// ============================================================
async function showCheckinPopup() {
  // Remove any existing popup
  const existing = document.getElementById('streakPopupOverlay');
  if (existing) existing.remove();

  const MILESTONES      = {3:'🏅',7:'🥈',15:'🥇',21:'💎',30:'✨',50:'🔱',90:'👑'};
  const MILESTONE_NAMES = {3:'Arambha',7:'Tapasvi',15:'Dhira',21:'Vira',30:'Ojas',50:'Agni',90:'Brahmachari'};
  const MILESTONE_METAL = {3:'Bronze',7:'Silver',15:'Gold',21:'Diamond',30:'Kohinoor',50:'Titanium',90:'Crown'};
  const MILESTONE_BONUS = {3:30,7:140,15:450,21:840,30:1500,50:2500,90:4860};
  const MILESTONE_BRACKET = {3:'Stay Consistent',7:'Discipline Forged',15:'Positive Aura',21:'Disciplined Aura',30:'Powerful Aura',50:'Inner Fire',90:'Powerful Man'};

  const isMilestone = currentStreak in MILESTONES;
  const ms = isMilestone ? {
    icon: MILESTONES[currentStreak],
    name: MILESTONE_NAMES[currentStreak],
    metal: MILESTONE_METAL[currentStreak],
    bonus: MILESTONE_BONUS[currentStreak],
    bracket: MILESTONE_BRACKET[currentStreak]
  } : null;

  // Fetch current rank
  let currentRank = '—';
  try {
    if (sb && navigator.onLine) {
      const [{ data: profiles }, { data: allLogs }] = await Promise.all([
        sb.from('bct_profiles').select('user_id,startDate'),
        sb.from('bct_logs').select('user_id,date,status')
      ]);
      if (profiles && allLogs) {
        const logsByUser = {};
        allLogs.forEach(r => {
          if (!logsByUser[r.user_id]) logsByUser[r.user_id] = {};
          logsByUser[r.user_id][r.date] = r.status;
        });
        const ranked = profiles
          .map(p => ({ uid: p.user_id, pts: computeUserStats(p, logsByUser[p.user_id] || {}).totalPoints }))
          .sort((a, b) => b.pts - a.pts);
        const idx = ranked.findIndex(r => r.uid === currentUser.id);
        if (idx >= 0) currentRank = `#${idx + 1}`;
      }
    }
  } catch(e) {}

  const quote = MOTIVATIONS[Math.floor(Math.random() * MOTIVATIONS.length)];
  const dayNames = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];
  const dateLabel = `${dayNames[today.getDay()]}, ${today.getDate()} ${today.toLocaleString('default',{month:'long'})} ${today.getFullYear()}`;
  const bestStreak = streakHistory.length ? Math.max(...streakHistory.map(s => s.length)) : currentStreak;

  // ── Coin SVG (normal day) ──────────────────────────────────
  const coinHTML = `
    <div class="sp-coin-wrap">
      <div class="sp-coin">
        <svg viewBox="0 0 100 100" width="100" height="100">
          <defs>
            <radialGradient id="cg" cx="40%" cy="35%">
              <stop offset="0%" stop-color="#fde68a"/>
              <stop offset="60%" stop-color="#f59e0b"/>
              <stop offset="100%" stop-color="#92400e"/>
            </radialGradient>
            <filter id="cglow">
              <feGaussianBlur stdDeviation="3" result="blur"/>
              <feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
            </filter>
          </defs>
          <circle cx="50" cy="50" r="46" fill="#92400e"/>
          <circle cx="50" cy="50" r="42" fill="url(#cg)" filter="url(#cglow)"/>
          <text x="50" y="57" text-anchor="middle" font-size="32" font-weight="900" fill="#92400e" font-family="serif">🔱</text>
          <circle cx="72" cy="28" r="5" fill="rgba(255,255,255,0.5)"/>
        </svg>
      </div>
      <div class="sp-pts-today">+10 pts earned today</div>
    </div>`;

  // ── Medal (milestone day) ──────────────────────────────────
  const medalHTML = `
    <div class="sp-medal-wrap">
      <div class="sp-medal-icon">${ms?.icon}</div>
      <div class="sp-medal-name">${ms?.name}</div>
      <div class="sp-medal-metal">— ${ms?.metal} —</div>
      <div class="sp-medal-bracket">${ms?.bracket}</div>
      <div class="sp-medal-bonus">🎉 +${ms?.bonus} BONUS POINTS UNLOCKED!</div>
    </div>`;

  const overlay = document.createElement('div');
  overlay.id = 'streakPopupOverlay';
  overlay.className = 'sp-overlay';

  overlay.innerHTML = `
    <div class="sp-card">

      <!-- ✕ close -->
      <button class="sp-close" onclick="document.getElementById('streakPopupOverlay').remove()">✕</button>

      <!-- Header row -->
      <div class="sp-header">
        <div class="sp-check">✓</div>
        <span class="sp-title">Brahmacharya Streak Maintained!</span>
      </div>

      <!-- Big streak number -->
      <div class="sp-streak-row">
        Completion Streak: <span class="sp-streak-num">${currentStreak}</span> Day${currentStreak > 1 ? 's' : ''}
      </div>
      <div class="sp-date">${dateLabel}</div>

      <!-- Motivation quote -->
      <div class="sp-quote">${quote}</div>

      <!-- Coin or Medal -->
      ${isMilestone ? medalHTML : coinHTML}

      <!-- Points table -->
      <div class="sp-pts-table">
        <div class="sp-pts-row">
          <span>🪙 Today's Coins</span>
          <span class="sp-gold">+10 pts</span>
        </div>
        ${isMilestone ? `<div class="sp-pts-row">
          <span>🏆 Milestone Bonus (Day ${currentStreak})</span>
          <span class="sp-green">+${ms.bonus} pts</span>
        </div>` : ''}
        <div class="sp-pts-divider"></div>
        <div class="sp-pts-row">
          <span>⚡ Total Points</span>
          <span class="sp-purple sp-bold">${totalPoints} pts</span>
        </div>
        <div class="sp-pts-row">
          <span>🏅 Best Streak</span>
          <span class="sp-gold sp-bold">${bestStreak} days</span>
        </div>
        <div class="sp-pts-row">
          <span>📊 Your Rank</span>
          <span class="sp-gold sp-bold">${currentRank}</span>
        </div>
      </div>

      <!-- CTA button -->
      <button class="sp-btn" onclick="document.getElementById('streakPopupOverlay').remove()">
        ⚔️ KEEP GOING, WARRIOR
      </button>

    </div>`;

  document.body.appendChild(overlay);
  // Close on backdrop click
  overlay.addEventListener('click', e => { if (e.target === overlay) overlay.remove(); });
}

// ============================================================
// STREAK REDEMPTION — 500 pts = 1 missed day recover
// ============================================================
async function redeemStreak() {
  // Find the most recent missed day (yesterday or before)
  const missedDays = Object.entries(logs)
    .filter(([,v]) => v === 'missed')
    .map(([k]) => k)
    .sort()
    .reverse();

  if (!missedDays.length) { showToast('❌ No missed day to redeem!'); return; }

  const targetDay = missedDays[0]; // most recent missed

  // Already redeemed?
  if (redemptions[targetDay]) { showToast('❌ Already redeemed this day!'); return; }

  computeStats(); // ensure totalPoints is fresh
  if (totalPoints < 500) {
    showToast(`❌ Need 500 pts! You have ${totalPoints} pts.`); return;
  }

  if (!confirm(`Spend 500 points to recover ${targetDay}? Your streak will continue!`)) return;

  // Save as redeemed in logs
  await sb.from('bct_logs').upsert(
    { user_id: currentUser.id, date: targetDay, status: 'redeemed' },
    { onConflict: 'user_id,date' }
  );
  logs[targetDay] = 'redeemed';
  redemptions[targetDay] = true;

  showToast('🔄 Streak recovered! 500 pts spent. Day marked gold ✨', 4000);
  renderAll();
}
function triggerConfetti() {
  for (let i=0; i<35; i++) {
    setTimeout(()=>{
      const p = document.createElement('div');
      p.style.cssText=`position:fixed;left:${Math.random()*100}vw;top:${Math.random()*60+10}vh;width:8px;height:8px;background:${['#a855f7','#f59e0b','#10b981','#c084fc','#fcd34d'][Math.floor(Math.random()*5)]};border-radius:50%;pointer-events:none;z-index:9999;animation:confettiFall 1s ease-out forwards;`;
      document.body.appendChild(p);
      setTimeout(()=>p.remove(),1100);
    }, i*40);
  }
}

// ============================================================
// TRIGGERS
// ============================================================
window.removeTrigger = async function(idx) {
  triggers.splice(idx,1);
  await saveTriggers();
  renderTriggers();
};

// ============================================================
// PARTICLES
// ============================================================
function initParticles() {
  const c = el('particles');
  for (let i=0;i<20;i++){
    const p = document.createElement('div');
    p.className='particle';
    const sz = Math.random()*4+2;
    p.style.cssText=`width:${sz}px;height:${sz}px;left:${Math.random()*100}%;animation-duration:${Math.random()*15+10}s;animation-delay:${Math.random()*10}s;background:${Math.random()>.5?'var(--purple-bright)':'var(--gold)'};`;
    c.appendChild(p);
  }
}

// ============================================================
// MUSIC
// ============================================================
function toggleMusic() {
  const a = el('bgMusic'), btn = el('musicToggle');
  if (musicPlaying) {
    a.pause(); btn.textContent='🎵'; btn.classList.remove('playing'); musicPlaying=false;
  } else {
    a.volume=0.25; a.play().catch(()=>{});
    btn.textContent='🔇'; btn.classList.add('playing'); musicPlaying=true;
  }
}

// ============================================================
// ADMIN DASHBOARD
// ============================================================
async function showAdmin() {
  showScreen('adminScreen');
  el('allUsersTable').innerHTML = '<p class="loading-text">⏳ Loading warriors...</p>';
  el('leaderboardPts').innerHTML = '';
  el('leaderboardStreak').innerHTML = '';
  el('adminStats').innerHTML = '';

  try {
    // Fetch all profiles
    const { data: profiles, error } = await sb.from('bct_profiles').select('*');
    if (error) throw error;

    // Fetch all logs
    const { data: allLogs } = await sb.from('bct_logs').select('*');

    // Group logs by user
    const logsByUser = {};
    if (allLogs) allLogs.forEach(r => {
      if (!logsByUser[r.user_id]) logsByUser[r.user_id] = {};
      logsByUser[r.user_id][r.date] = r.status;
    });

    // Compute stats per user
    const warriors = profiles.map(p => {
      const uLogs = logsByUser[p.user_id] || {};
      const stats = computeUserStats(p, uLogs);
      return { ...p, ...stats, uLogs };
    });

    // Sort by points for leaderboard
    const byPts    = [...warriors].sort((a,b)=>b.totalPoints-a.totalPoints);
    const byStreak = [...warriors].sort((a,b)=>b.currentStreak-a.currentStreak);

    // Admin stat cards
    const totalDoneLogs = Object.values(logsByUser).reduce((acc,ul)=>acc+Object.values(ul).filter(v=>v==='done').length,0);
    el('adminStats').innerHTML = `
      <div class="admin-stat-card"><span class="admin-stat-num">${warriors.length}</span><span class="admin-stat-label">Total Warriors</span></div>
      <div class="admin-stat-card"><span class="admin-stat-num">${byStreak[0]?.currentStreak||0}</span><span class="admin-stat-label">Highest Streak</span></div>
      <div class="admin-stat-card"><span class="admin-stat-num">${byPts[0]?.totalPoints||0}</span><span class="admin-stat-label">Top Points</span></div>
      <div class="admin-stat-card"><span class="admin-stat-num">${totalDoneLogs}</span><span class="admin-stat-label">Total Done Days</span></div>
    `;

    // Leaderboard — Points
    renderLeaderboard('leaderboardPts', byPts, w=>`${w.totalPoints} pts`, w=>`${w.currentStreak} day streak`);
    // Leaderboard — Streak
    renderLeaderboard('leaderboardStreak', byStreak, w=>`${w.currentStreak} days`, w=>`${w.totalPoints} pts total`);

    // All users table
    renderAllUsersTable(warriors);

  } catch(e) {
    el('allUsersTable').innerHTML = `<p class="loading-text">❌ Error: ${e.message}</p>`;
  }
}

function computeUserStats(prof, uLogs) {
  // Current streak
  let currentStreak = 0;
  const chk = new Date(today);
  while (true) {
    const ds = fmtDate(chk);
    if (uLogs[ds]==='done'){currentStreak++;chk.setDate(chk.getDate()-1);}
    else break;
  }

  // Best streak (all time)
  const doneDays = Object.entries(uLogs).filter(([,v])=>v==='done').map(([k])=>k).sort();
  let bestStreak=0, runLen=0;
  for(let i=0;i<doneDays.length;i++){
    if(i===0||(parseDate(doneDays[i])-parseDate(doneDays[i-1]))/86400000!==1){runLen=1;}
    else runLen++;
    if(runLen>bestStreak)bestStreak=runLen;
  }

  // Total done / missed
  const totalDone   = Object.values(uLogs).filter(v=>v==='done').length;
  const totalMissed = Object.values(uLogs).filter(v=>v==='missed').length;

  // Points — with level multiplier bonuses
  let totalPoints=0, run=0;
  const MILESTONES = { 3:1, 7:2, 15:3, 21:4, 30:5, 90:6 };
  const allDates=[];
  if(prof.startDate){
    let d=parseDate(prof.startDate);
    while(d<=today){allDates.push(fmtDate(d));d.setDate(d.getDate()+1);}
  }
  allDates.forEach(ds=>{
    if(uLogs[ds]==='done'){
      run++;
      totalPoints+=10;
      if(MILESTONES[run]!==undefined) totalPoints += run*10*MILESTONES[run];
    }else if(uLogs[ds]==='missed'){run=0;}
  });

  // Last active
  const allLogged = Object.keys(uLogs).sort().reverse();
  const lastActive = allLogged[0] || null;

  return { currentStreak, bestStreak, totalDone, totalMissed, totalPoints, lastActive };
}

function renderLeaderboard(containerId, warriors, valFn, subFn) {
  const c = el(containerId); c.innerHTML='';
  if(!warriors.length){c.innerHTML='<p class="loading-text">No warriors yet</p>';return;}
  warriors.slice(0,10).forEach((w,i)=>{
    const row = document.createElement('div');
    const rankClass = i===0?'top1':i===1?'top2':i===2?'top3':'';
    row.className = `lb-row ${rankClass}`;
  const medal = i===0?'🥇':i===1?'🥈':i===2?'🥉':`#${i+1}`;
    const _badges=[{days:90,icon:'👑',label:'Brahmachari',metal:'Crown',bracket:'Powerful Man'},{days:30,icon:'✨',label:'Ojas',metal:'Kohinoor',bracket:'Powerful Aura'},{days:21,icon:'💎',label:'Vira',metal:'Diamond',bracket:'Disciplined Aura'},{days:15,icon:'🥇',label:'Dhira',metal:'Gold',bracket:'Positive Aura'},{days:7,icon:'🥈',label:'Tapasvi',metal:'Silver',bracket:'Discipline Forged'},{days:3,icon:'🏅',label:'Arambha',metal:'Bronze',bracket:'Stay Consistent'},{days:1,icon:'🪙',label:'Beej',metal:'Copper',bracket:'First Spark'}];
    const _best=_badges.find(b=>w.bestStreak>=b.days);
    const _badgeHtml=_best?`<div class="lb-badge">${_best.icon} ${_best.label} — ${_best.metal} <span style="color:var(--purple-glow)">(${_best.bracket})</span></div><div class="lb-badge" style="color:var(--muted)">🏆 Best Streak: ${w.bestStreak} days</div>`:'';
    row.innerHTML = `
      <div class="lb-rank">${medal}</div>
      <div class="lb-avatar">${w.name.charAt(0).toUpperCase()}</div>
      <div class="lb-info">
        <div class="lb-name">${w.name}</div>
        ${_badgeHtml}
      </div>
      <div>
        <div class="lb-val">${valFn(w)}</div>
        <div class="lb-sub">${subFn(w)}</div>
      </div>`;
    c.appendChild(row);
  });
}

function renderAllUsersTable(warriors) {
  const c = el('allUsersTable');
  if (!warriors.length) { c.innerHTML='<p class="loading-text">No warriors yet</p>'; return; }

  const rows = warriors.map((w,i) => {
    const isActive = w.currentStreak > 0;
    const dayNum   = w.startDate ? Math.max(1,daysFrom(w.startDate)) : '?';
    const lastA    = w.lastActive ? w.lastActive.split('-').reverse().join('/') : 'Never';
    return `
      <tr>
        <td><span class="status-dot ${isActive?'active':'inactive'}"></span>${w.name}</td>
        <td style="color:var(--muted);font-size:.8rem"></td>
        <td style="font-family:var(--font-d);color:var(--purple-glow)">${w.currentStreak}🔥</td>
        <td style="font-family:var(--font-d);color:var(--gold)">${w.bestStreak}</td>
        <td style="font-family:var(--font-d)">${w.totalPoints}</td>
        <td><span class="tag-green">${w.totalDone} ✅</span></td>
        <td><span class="tag-red">${w.totalMissed} 💀</span></td>
        <td style="color:var(--muted);font-size:.8rem">Day ${dayNum}</td>
        <td style="color:var(--muted);font-size:.8rem">${lastA}</td>
      </tr>`;
  }).join('');

  c.innerHTML = `
    <table class="users-table">
      <thead><tr>
        <th>Warrior</th><th>Email</th><th>Streak</th><th>Best</th>
        <th>Points</th><th>Done</th><th>Missed</th><th>Journey</th><th>Last Active</th>
      </tr></thead>
      <tbody>${rows}</tbody>
    </table>`;
}



// ============================================================
// INIT
// ============================================================
async function init() {
  initSB();
  initParticles();

  if (!sb) {
    // Offline — try cached data
    if (loadCachedAppData()) {
      showScreen('mainScreen');
      renderAll();
      showToast('📵 Offline mode — data from last session', 4000);
    } else {
      el('loginErr').textContent = '❌ No internet & no cached session. Please connect once to login.';
    }
    return;
  }

  // Auto-login — session browser mein saved rahega
  const { data: { session } } = await sb.auth.getSession();
  if (session && session.user) {
    await onLogin(session.user);
  } else {
    showScreen('authScreen');
    el('regStartDate').value = todayStr;
  }

  // Auth state listener — token refresh hone par bhi logged in rahe
  sb.auth.onAuthStateChange(async (event, session) => {
    if (event === 'SIGNED_IN' && session && session.user && !currentUser) {
      await onLogin(session.user);
    } else if (event === 'SIGNED_OUT') {
      currentUser = null; profile = null; logs = {}; triggers = [];
      showScreen('authScreen');
    } else if (event === 'TOKEN_REFRESHED' && session && session.user) {
      currentUser = session.user;
    }
  });

  // Auth listeners
  el('loginBtn').addEventListener('click', doLogin);
  el('registerBtn').addEventListener('click', doRegister);
  el('logoutBtn').addEventListener('click', doLogout);
  el('loginPassword').addEventListener('keydown', e=>{ if(e.key==='Enter') doLogin(); });
  el('regStartDate').value = todayStr;

  // Check-in
  el('btnDone').addEventListener('click', ()=>checkIn('done'));
  el('btnMissed').addEventListener('click', ()=>{
    if(confirm('Sure? This will break your streak.')) checkIn('missed');
  });

  // Triggers (optional — if elements exist)
  if(el('addTriggerBtn')) {
    el('addTriggerBtn').addEventListener('click', async()=>{
      const val = el('triggerInput').value.trim();
      if(!val) return;
      if(triggers.includes(val)){showToast('Already added!');return;}
      triggers.push(val);
      await saveTriggers();
      el('triggerInput').value='';
      showToast(`⚠️ Trigger: "${val}"`);
    });
    el('triggerInput').addEventListener('keydown',e=>{if(e.key==='Enter')el('addTriggerBtn').click();});
  }

  // Music
  el('musicToggle').addEventListener('click', toggleMusic);

  // Motivation refresh
  setInterval(renderMotivation, 30000);
}

document.addEventListener('DOMContentLoaded', ()=>setTimeout(async()=>{ await init(); if(navigator.onLine) flushOfflineQueue(); },150));

// (global exports at end of file)






// ============================================================
// 5AM CLUB MODULE
// ============================================================

const CLUB_ZOOM_LINK = 'https://meet.google.com/qcm-njtw-cyq'; // <-- apna link daal

// ---- Supabase table: club_checkins
// columns: id, user_id, checkin_date (date), checkin_time (text HH:MM), points (int)

let clubActiveTab = 'streak';

function showClub() {
  showScreen('clubScreen');
  document.getElementById('zoomLink').href = CLUB_ZOOM_LINK;
  initClubClock();
  loadClubData();
}

function showMain() {
  showScreen('mainScreen');
}

// Live clock
let clubClockInterval = null;
function initClubClock() {
  if (clubClockInterval) clearInterval(clubClockInterval);
  updateClubClock();
  clubClockInterval = setInterval(updateClubClock, 1000);
}

function updateClubClock() {
  const now = new Date();
  const totalSecs = now.getHours() * 3600 + now.getMinutes() * 60 + now.getSeconds();
  const openSecs  = 5 * 3600;  // 5:00 AM
  const closeSecs = 6 * 3600;  // 6:00 AM

  const timeEl   = document.getElementById('clubTime');
  const statusEl = document.getElementById('clubWindowStatus');

  function fmt(secs) {
    const h = Math.floor(secs / 3600);
    const m = Math.floor((secs % 3600) / 60);
    const s = secs % 60;
    return h > 0
      ? `${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`
      : `${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`;
  }

  if (totalSecs < openSecs) {
    const diff = openSecs - totalSecs;
    if (timeEl) timeEl.textContent = `⏳ Opens in ${fmt(diff)}`;
    if (statusEl) statusEl.textContent = 'Window opens at 5:00 AM';
  } else if (totalSecs < closeSecs) {
    const remaining = closeSecs - totalSecs;
    const lateSecs  = totalSecs - openSecs;
    const pts = Math.max(0, 60 - Math.floor(lateSecs / 60));
    if (timeEl) timeEl.textContent = `🟢 Closes in ${fmt(remaining)}`;
    if (statusEl) statusEl.textContent = lateSecs < 60
      ? `✅ Window Open! Check in for full 60 pts!`
      : `⏱ ${Math.floor(lateSecs / 60)} min late — ${pts} pts available`;
  } else {
    const nextOpen = (24 * 3600) - totalSecs + openSecs;
    if (timeEl) timeEl.textContent = `🔒 Opens in ${fmt(nextOpen)}`;
    if (statusEl) statusEl.textContent = 'Window closed — opens again at 5:00 AM';
  }

  const totalMins = Math.floor(totalSecs / 60);
  updateClubButtons(totalMins, openSecs / 60, closeSecs / 60);
}

async function updateClubButtons(totalMins, openMins, closeMins) {
  const joinBtn   = document.getElementById('clubJoinBtn');
  const wakeBtn   = document.getElementById('clubWakeupBtn');
  if (!joinBtn) return;

  const todayStr    = getTodayStr();
  const alreadyDone = await hasClubCheckinToday(todayStr);

  // ── ATTENDANCE BUTTON ──────────────────────────────────────
  if (alreadyDone) {
    joinBtn.textContent = '✅ Attendance Done!';
    joinBtn.className   = 'btn-club-join done-state';
    joinBtn.disabled    = true;
  } else if (totalMins >= openMins && totalMins < closeMins) {
    joinBtn.textContent = '🌅 ATTENDANCE';
    joinBtn.className   = 'btn-club-join active-window';
    joinBtn.disabled    = false;
  } else {
    joinBtn.textContent = '🔒 ATTENDANCE — Opens 5 AM';
    joinBtn.className   = 'btn-club-join';
    joinBtn.disabled    = true;
  }

  // ── WAKEUP BUTTON ─────────────────────────────────────────
  if (!wakeBtn) return;
  const wakeKey  = 'bm_wakeup_' + todayStr;
  const wakeData = localStorage.getItem(wakeKey);

  if (wakeData) {
    // Already marked wakeup manually
    const { time, under6 } = JSON.parse(wakeData);
    wakeBtn.textContent = `⏰ Woke up at ${time}`;
    wakeBtn.disabled    = true;
    wakeBtn.classList.remove('wakeup-done-green','wakeup-done-red');
    wakeBtn.classList.add(under6 ? 'wakeup-done-green' : 'wakeup-done-red');
    wakeBtn.style.animation = 'none';
  } else if (alreadyDone) {
    // Attended 5AM → auto-mark wakeup as done too
    wakeBtn.textContent = '⏰ Woke up — Auto marked ✅';
    wakeBtn.disabled    = true;
    wakeBtn.classList.remove('wakeup-done-green','wakeup-done-red');
    wakeBtn.classList.add('wakeup-done-green');
    wakeBtn.style.animation = 'none';
  } else {
    wakeBtn.textContent = '⏰ WAKE UP';
    wakeBtn.disabled    = false;
    wakeBtn.classList.remove('wakeup-done-green','wakeup-done-red');
    wakeBtn.style.animation = '';
  }
}

async function hasClubCheckinToday(dateStr) {
  if (!currentUser) return false;
  const { data } = await sb
    .from('club_checkins')
    .select('id')
    .eq('user_id', currentUser.id)
    .eq('checkin_date', dateStr)
    .maybeSingle();
  return !!data;
}

async function clubCheckIn() {
  if (!currentUser) return;
  const now = new Date();
  const h = now.getHours(), m = now.getMinutes();
  const totalMins = h * 60 + m;
  const openMins  = 5 * 60;  // 5:00 AM
  const closeMins = 6 * 60;  // 6:00 AM

  if (totalMins < openMins || totalMins >= closeMins) {
    showToast('⏰ Window closed! Come at 5:00 AM'); return;
  }

  const late   = Math.max(0, totalMins - openMins);
  const points = Math.max(0, 60 - late);
  const timeStr = `${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}`;
  const dateStr = getTodayStr();

  const offlineKey = `bm_club_${dateStr}`;
  const alreadyLocal = localStorage.getItem(offlineKey);
  if (alreadyLocal) { showToast('✅ Already checked in today!'); return; }

  if (navigator.onLine && sb) {
    const already = await hasClubCheckinToday(dateStr);
    if (already) { showToast('✅ Already checked in today!'); return; }
  }

  const joinBtn = document.getElementById('clubJoinBtn');
  if (joinBtn) { joinBtn.disabled = true; joinBtn.textContent = '⏳ Saving...'; }

  localStorage.setItem(offlineKey, JSON.stringify({ time: timeStr, points }));

  if (!navigator.onLine || !sb) {
    const q = JSON.parse(localStorage.getItem('bm_club_queue') || '[]');
    q.push({ user_id: currentUser.id, checkin_date: dateStr, checkin_time: timeStr, points });
    localStorage.setItem('bm_club_queue', JSON.stringify(q));
    showToast(`📵 Offline — attendance saved! Syncs when online (+${points} pts)`, 4000);
    if (joinBtn) { joinBtn.className = 'btn-club-join done-state'; joinBtn.disabled = true; joinBtn.textContent = '✅ Attendance Done!'; }
    setTimeout(() => { window.open(CLUB_ZOOM_LINK, '_blank'); }, 800);
    return;
  }

  const { error } = await sb.from('club_checkins').insert({
    user_id: currentUser.id,
    checkin_date: dateStr,
    checkin_time: timeStr,
    points: points
  });

  if (error) {
    showToast('❌ Error saving — try again');
    if (joinBtn) { joinBtn.disabled = false; joinBtn.textContent = '✅ ATTENDANCE'; }
    return;
  }

  showToast(`✅ Attendance at ${timeStr} — +${points} pts!`, 4000);
  if (joinBtn) { joinBtn.className = 'btn-club-join done-state'; joinBtn.disabled = true; joinBtn.textContent = '✅ Attendance Done!'; }
  loadClubData();
  setTimeout(() => { window.open(CLUB_ZOOM_LINK, '_blank'); }, 800);
}

async function loadClubData() {
  if (!currentUser || !sb || !navigator.onLine) return;
  await Promise.all([
    loadMyClubHistory(),
    loadClubLeaderboard()
  ]);
}

async function loadMyClubHistory() {
  if (!sb || !navigator.onLine) return;
  const { data } = await sb
    .from('club_checkins')
    .select('checkin_date, checkin_time, points')
    .eq('user_id', currentUser.id)
    .order('checkin_date', { ascending: false })
    .limit(60);

  // Compute streak
  const dates = (data || []).map(r => r.checkin_date).sort((a,b) => b.localeCompare(a));
  let streak = 0;
  const today = getTodayStr();
  let check = today;
  for (let i = 0; i < 100; i++) {
    if (dates.includes(check)) {
      streak++;
      check = offsetDate(check, -1);
    } else { break; }
  }

  const streakEl = document.getElementById('clubStreak');
  if (streakEl) streakEl.textContent = streak;

  // 5AM Club total points (sum of all check-in points)
  const clubTotalPts = (data || []).reduce((sum, r) => sum + (r.points || 0), 0);
  const clubTotalEl  = document.getElementById('clubTotalPts');
  if (clubTotalEl) clubTotalEl.textContent = clubTotalPts;

  // 5AM Club best streak (longest consecutive days)
  const allDates = [...new Set((data || []).map(r => r.checkin_date))].sort();
  let bestStreak = 0, runStreak = 0;
  for (let i = 0; i < allDates.length; i++) {
    if (i === 0) { runStreak = 1; }
    else {
      const diff = (new Date(allDates[i]) - new Date(allDates[i-1])) / 86400000;
      runStreak = diff === 1 ? runStreak + 1 : 1;
    }
    if (runStreak > bestStreak) bestStreak = runStreak;
  }
  const clubBestEl = document.getElementById('clubBestStreak');
  if (clubBestEl) clubBestEl.textContent = bestStreak;

  // Today's points
  const todayRec = (data || []).find(r => r.checkin_date === today);
  const ptsEl = document.getElementById('clubPtsToday');
  if (ptsEl) ptsEl.textContent = todayRec ? `${todayRec.points} pts` : '—';

  // Build checkin map: date -> time
  window._clubCheckinMap = {};
  (data || []).forEach(r => { window._clubCheckinMap[r.checkin_date] = r.checkin_time; });

  // Render wakeup calendar
  renderClubWakeupCalendar();

  // History chips
  const grid = document.getElementById('clubMyHistory');
  if (!grid) return;
  grid.innerHTML = '';
  (data || []).forEach(r => {
    const chip = document.createElement('div');
    chip.className = 'club-hist-chip present';
    chip.innerHTML = `🌅 ${formatDateShort(r.checkin_date)} <span style="color:var(--gold)">${r.checkin_time}</span> <strong>+${r.points}</strong>`;
    grid.appendChild(chip);
  });
  if (!data || data.length === 0) {
    grid.innerHTML = '<p style="color:var(--muted);font-style:italic">No check-ins yet — see you at 5AM! 🌅</p>';
  }
}

async function loadClubLeaderboard() {
  if (!sb || !navigator.onLine) return;
  const { data } = await sb
    .from('club_checkins')
    .select('user_id, checkin_date, checkin_time, points');

  if (!data) return;

  // Group by user
  const users = {};
  data.forEach(r => {
    if (!users[r.user_id]) users[r.user_id] = { checkins: [] };
    users[r.user_id].checkins.push(r);
  });

  // Get names
 // Get names
  const { data: profiles } = await sb
    .from('bct_profiles')
    .select('user_id, name');
  const nameMap = {};
  (profiles || []).forEach(p => { nameMap[p.user_id] = p.name; });

  const today = getTodayStr();

  // Build rows
  const rows = Object.entries(users).map(([uid, u]) => {
    const dates = [...new Set(u.checkins.map(c => c.checkin_date))].sort((a,b) => b.localeCompare(a));
    // streak
    let streak = 0, check = today;
    for (let i = 0; i < 200; i++) {
      if (dates.includes(check)) { streak++; check = offsetDate(check, -1); }
      else break;
    }
    // total points
    const totalPts = u.checkins.reduce((s, c) => s + (c.points || 0), 0);
    // today's time
    const todayRec = u.checkins.find(c => c.checkin_date === today);
    const todayTime = todayRec ? todayRec.checkin_time : null;
    const todayPts  = todayRec ? todayRec.points : 0;

    return { uid, name: nameMap[uid] || 'Warrior', streak, totalPts, todayTime, todayPts };
  });

  renderClubLeaderboard(rows);
}

function switchClubTab(tab) {
  clubActiveTab = tab;
  document.getElementById('tabLbStreak').classList.toggle('active', tab === 'streak');
  document.getElementById('tabLbPts').classList.toggle('active', tab === 'pts');
  document.getElementById('tabLbTime').classList.toggle('active', tab === 'time');

  // Re-render with existing data — reload
  loadClubLeaderboard();
}

function renderClubLeaderboard(rows) {
  const container = document.getElementById('clubLeaderboard');
  if (!container) return;
  container.innerHTML = '';

  let sorted;
  if (clubActiveTab === 'streak') {
    sorted = [...rows].sort((a,b) => b.streak - a.streak || b.totalPts - a.totalPts);
  } else if (clubActiveTab === 'pts') {
    sorted = [...rows].sort((a,b) => b.totalPts - a.totalPts || b.streak - a.streak);
  } else {
    // Earliest today — only those who checked in today
    sorted = [...rows]
      .filter(r => r.todayTime)
      .sort((a,b) => a.todayTime.localeCompare(b.todayTime));
    if (sorted.length === 0) {
      container.innerHTML = '<p style="color:var(--muted);padding:1rem;font-style:italic">No one has checked in today yet 👀</p>';
      return;
    }
  }

  sorted.forEach((r, i) => {
    const rankClass = i === 0 ? 'top1' : i === 1 ? 'top2' : i === 2 ? 'top3' : '';
    const rankEmoji = i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `${i+1}`;
    const initial   = (r.name || 'W')[0].toUpperCase();

    let rightTop, rightSub;
    if (clubActiveTab === 'streak') {
      rightTop = `${r.streak} days`;
      rightSub = `${r.totalPts} pts total`;
    } else if (clubActiveTab === 'pts') {
      rightTop = `${r.totalPts} pts`;
      rightSub = `${r.streak} day streak`;
    } else {
      rightTop = r.todayTime || '—';
      rightSub = `+${r.todayPts} pts today`;
    }

    const row = document.createElement('div');
    row.className = `lb-row ${rankClass}`;
    row.innerHTML = `
      <div class="lb-rank">${rankEmoji}</div>
      <div class="lb-avatar">${initial}</div>
      <div class="lb-info">
        <div class="lb-name">${r.name}</div>
        <div class="lb-club-pts">${r.uid === currentUser?.id ? '(You)' : ''}</div>
      </div>
      <div style="text-align:right">
        <div class="lb-club-time">${rightTop}</div>
        <div class="lb-club-pts">${rightSub}</div>
      </div>`;
    container.appendChild(row);
  });
}

// ---- Helpers ----
function getTodayStr() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
}

function offsetDate(dateStr, days) {
  const d = new Date(dateStr);
  d.setDate(d.getDate() + days);
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
}

function formatDateShort(dateStr) {
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-IN', { day:'numeric', month:'short' });
}



// ============================================================
// BROTHERHOOD CHAT MODULE v2
// ============================================================

const ADMIN_ID = 'YOUR_SUPABASE_USER_ID_HERE'; // apna ID daal
const SENDER_COLORS = ['sender-color-0','sender-color-1','sender-color-2','sender-color-3','sender-color-4','sender-color-5','sender-color-6','sender-color-7'];
const senderColorMap = {};

function getSenderColor(userId) {
  if (!senderColorMap[userId]) {
    const keys = Object.keys(senderColorMap);
    senderColorMap[userId] = SENDER_COLORS[keys.length % SENDER_COLORS.length];
  }
  return senderColorMap[userId];
}

let currentChatTab = 'group';
let dmWithUserId = null;
let dmWithUserName = null;
let groupChatSub = null;
let dmChatSub = null;
let lastMsgDate = null;

function showChat() {
  showScreen('chatScreen');
  currentChatTab = null; // force reload
  switchChatTab('group');
}

function switchChatTab(tab) {
  currentChatTab = tab;
  document.getElementById('tabGroup').classList.toggle('active', tab === 'group');
  document.getElementById('tabDM').classList.toggle('active', tab === 'dm');

  const gp = document.getElementById('groupChatPanel');
  const dp = document.getElementById('dmPanel');
  if (gp) gp.style.display = tab === 'group' ? 'flex' : 'none';
  if (dp) dp.style.display = tab === 'dm' ? 'flex' : 'none';

  if (tab === 'group') {
    loadGroupMessages();
    subscribeGroupChat();
  }
  if (tab === 'dm') {
    loadDMUsers();
  }
}

// ---- DATE DIVIDER ----
function maybeAddDateDivider(box, dateStr) {
  if (dateStr !== lastMsgDate) {
    lastMsgDate = dateStr;
    const div = document.createElement('div');
    div.className = 'chat-date-divider';
    const d = new Date(dateStr);
    div.textContent = d.toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' });
    box.appendChild(div);
  }
}

// ---- GROUP CHAT ----
async function loadGroupMessages() {
  lastMsgDate = null;
  const { data } = await sb
    .from('chat_messages')
    .select('*')
    .order('created_at', { ascending: true })
    .limit(100);

  const box = document.getElementById('chatMessages');
  if (!box) return;
  box.innerHTML = '';

  // Pinned
  const pinned = (data || []).find(m => m.is_pinned);
  const pinnedEl = document.getElementById('chatPinned');
  const pinnedTxt = document.getElementById('pinnedText');
  if (pinned && pinnedEl && pinnedTxt) {
    pinnedEl.style.display = 'flex';
    pinnedTxt.textContent = `${pinned.user_name}: ${pinned.message}`;
  } else if (pinnedEl) {
    pinnedEl.style.display = 'none';
  }

  (data || []).forEach(m => renderGroupBubble(m, box, false));
  box.scrollTop = box.scrollHeight;

  // Auto delete 24hr old non-pinned
  const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  sb.from('chat_messages').delete().lt('created_at', cutoff).eq('is_pinned', false).then(() => {});

  // Check unread DMs for dot
  checkUnreadDMs();
}

function renderGroupBubble(m, box, animate = true) {
  const isMine = m.user_id === currentUser?.id;
  const isAdmin = currentUser?.id === ADMIN_ID;
  const time = new Date(m.created_at).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
  const dateStr = m.created_at.split('T')[0];

  maybeAddDateDivider(box, dateStr);

  const colorClass = getSenderColor(m.user_id);
  const initial = (m.user_name || 'W')[0].toUpperCase();

const wrap = document.createElement('div');
  wrap.className = `chat-msg-wrap ${isMine ? 'mine' : 'theirs'}`;
  wrap.setAttribute('data-id', m.id);
  if (animate) wrap.style.animation = 'bubblePop .2s ease';

  let contentHtml = '';
  if (m.image_url) {
    contentHtml = `<img src="${m.image_url}" class="chat-img-preview" onclick="window.open('${m.image_url}','_blank')" />`;
  }
  if (m.message) {
    contentHtml += `<div>${m.message}</div>`;
  }

  const pinBtn = isAdmin
    ? `<button class="chat-pin-btn" onclick="pinMessage('${m.id}',${m.is_pinned})" title="${m.is_pinned ? 'Unpin' : 'Pin'}">📌</button>`
    : '';

  wrap.innerHTML = `
    <div class="bubble-avatar">${initial}</div>
    <div class="chat-bubble ${m.is_pinned ? 'pinned-msg' : ''}">
      ${!isMine ? `<div class="chat-sender ${colorClass}">${m.user_name}</div>` : ''}
      ${contentHtml}
      <div class="chat-bubble-meta">
        <span class="chat-time">${time}</span>
        ${isMine ? `<span class="chat-tick">✓✓</span>` : ''}
        ${pinBtn}
      </div>
    </div>`;

  box.appendChild(wrap);
}

function subscribeGroupChat() {
  if (groupChatSub) { sb.removeChannel(groupChatSub); groupChatSub = null; }
  groupChatSub = sb
    .channel('group-chat-v2')
    .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'chat_messages' }, payload => {
      const box = document.getElementById('chatMessages');
      if (!box || currentChatTab !== 'group') return;
      const m = payload.new;
      // Skip if already rendered optimistically (own message)
      if (box.querySelector(`[data-id="${m.id}"]`)) return;
      renderGroupBubble(m, box, true);
      box.scrollTop = box.scrollHeight;
    })
    .subscribe();
}

async function sendGroupMessage() {
  if (!sb || !navigator.onLine) { showToast("📵 Offline — chat unavailable"); return; }
  const input = document.getElementById('chatInput');
  const msg = input?.value?.trim();
  if (!msg || !currentUser) return;
  const name = document.getElementById('warriorName')?.textContent || 'Warrior';
  input.value = '';

  // Optimistic render — show immediately without waiting for DB
  const box = document.getElementById('chatMessages');
  const tempMsg = {
    id: 'temp-' + Date.now(),
    user_id: currentUser.id,
    user_name: name,
    message: msg,
    is_pinned: false,
    created_at: new Date().toISOString(),
    _temp: true
  };
  if (box) { renderGroupBubble(tempMsg, box, true); box.scrollTop = box.scrollHeight; }

  const { data: inserted } = await sb.from('chat_messages').insert({
    user_id: currentUser.id,
    user_name: name,
    message: msg,
    is_pinned: false
  }).select().single();

  // Replace temp with real (update id so subscription skips duplicate)
  if (inserted && box) {
    const tempEl = box.querySelector(`[data-id="${tempMsg.id}"]`);
    if (tempEl) tempEl.setAttribute('data-id', inserted.id);
  }
}

async function sendGroupImage(input) {
  if (!input.files || !input.files[0] || !currentUser) return;
  const file = input.files[0];
  const ext = file.name.split('.').pop();
  const path = `group/${currentUser.id}_${Date.now()}.${ext}`;
  showToast('📤 Uploading...');

  const { error: upErr } = await sb.storage.from('chat-images').upload(path, file);
  if (upErr) { showToast('❌ Upload failed'); return; }

  const { data: urlData } = sb.storage.from('chat-images').getPublicUrl(path);
  const name = document.getElementById('warriorName')?.textContent || 'Warrior';

  await sb.from('chat_messages').insert({
    user_id: currentUser.id,
    user_name: name,
    message: '',
    image_url: urlData.publicUrl,
    is_pinned: false
  });
  input.value = '';
  showToast('✅ Image sent!');
}

async function pinMessage(msgId, currentlyPinned) {
  if (currentUser?.id !== ADMIN_ID) { showToast('❌ Only admin can pin'); return; }
  await sb.from('chat_messages').update({ is_pinned: false }).eq('is_pinned', true);
  if (!currentlyPinned) {
    await sb.from('chat_messages').update({ is_pinned: true }).eq('id', msgId);
    showToast('📌 Pinned!');
  } else {
    showToast('📌 Unpinned!');
  }
  loadGroupMessages();
}

// ---- DM ----
async function loadDMUsers() {
  const { data } = await sb.from('bct_profiles').select('user_id, name');
  const list = document.getElementById('dmUsersList');
  if (!list) return;
  list.innerHTML = '';

  const others = (data || []).filter(u => u.user_id !== currentUser?.id);
  if (!others.length) {
    list.innerHTML = '<p style="color:var(--muted);font-style:italic;padding:.5rem">No other warriors yet</p>';
    return;
  }

  const { data: unread } = await sb
    .from('dm_messages')
    .select('sender_id, message')
    .eq('receiver_id', currentUser.id)
    .eq('is_read', false);

  const unreadMap = {};
  const previewMap = {};
  (unread || []).forEach(r => {
    unreadMap[r.sender_id] = (unreadMap[r.sender_id] || 0) + 1;
    previewMap[r.sender_id] = r.message;
  });

  others.forEach(u => {
    const row = document.createElement('div');
    row.className = 'dm-user-row';
    const cnt = unreadMap[u.user_id] || 0;
    const preview = previewMap[u.user_id] || 'Tap to chat';
    row.innerHTML = `
      <div class="dm-user-avatar">${u.name[0].toUpperCase()}</div>
      <div class="dm-user-info">
        <div class="dm-user-name">${u.name}</div>
        <div class="dm-user-preview">${preview}</div>
      </div>
      ${cnt > 0 ? `<div class="dm-unread">${cnt}</div>` : ''}`;
    row.onclick = () => openDMWith(u.user_id, u.name);
    list.appendChild(row);
  });
}

async function openDMWith(userId, userName) {
  dmWithUserId = userId;
  dmWithUserName = userName;
  lastMsgDate = null;

  document.getElementById('dmUserList').style.display = 'none';
  const convo = document.getElementById('dmConversation');
  convo.style.display = 'flex';
  convo.style.flexDirection = 'column';
  convo.style.flex = '1';
  convo.style.overflow = 'hidden';

  const initial = userName[0].toUpperCase();
  document.getElementById('dmWithAvatar').textContent = initial;
  document.getElementById('dmWithName').textContent = userName;

  await sb.from('dm_messages')
    .update({ is_read: true })
    .eq('sender_id', userId)
    .eq('receiver_id', currentUser.id);

  loadDMMessages();
  subscribeDMChat();
  checkUnreadDMs();
}

function closeDMConvo() {
  dmWithUserId = null;
  dmWithUserName = null;
  document.getElementById('dmConversation').style.display = 'none';
  document.getElementById('dmUserList').style.display = 'block';
  if (dmChatSub) { sb.removeChannel(dmChatSub); dmChatSub = null; }
  loadDMUsers();
}

async function loadDMMessages() {
  lastMsgDate = null;
  const { data } = await sb
    .from('dm_messages')
    .select('*')
    .or(`and(sender_id.eq.${currentUser.id},receiver_id.eq.${dmWithUserId}),and(sender_id.eq.${dmWithUserId},receiver_id.eq.${currentUser.id})`)
    .order('created_at', { ascending: true })
    .limit(100);

  const box = document.getElementById('dmMessages');
  if (!box) return;
  box.innerHTML = '';
  (data || []).forEach(m => renderDMBubble(m, box, false));
  box.scrollTop = box.scrollHeight;
}

function renderDMBubble(m, box, animate = true) {
  const isMine = m.sender_id === currentUser?.id;
  const time = new Date(m.created_at).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
  const dateStr = m.created_at.split('T')[0];

  maybeAddDateDivider(box, dateStr);

  const wrap = document.createElement('div');
  wrap.className = `chat-msg-wrap ${isMine ? 'mine' : 'theirs'}`;
  wrap.setAttribute('data-id', m.id);

  const initial = isMine
    ? (document.getElementById('warriorName')?.textContent || 'W')[0].toUpperCase()
    : (dmWithUserName || 'W')[0].toUpperCase();

  let contentHtml = '';
  if (m.image_url) {
    contentHtml = `<img src="${m.image_url}" class="chat-img-preview" onclick="window.open('${m.image_url}','_blank')" />`;
  }
  if (m.message) contentHtml += `<div>${m.message}</div>`;

  wrap.innerHTML = `
    <div class="bubble-avatar">${initial}</div>
    <div class="chat-bubble">
      ${contentHtml}
      <div class="chat-bubble-meta">
        <span class="chat-time">${time}</span>
        ${isMine ? `<span class="chat-tick ${m.is_read ? 'read' : ''}">✓✓</span>` : ''}
      </div>
    </div>`;

  box.appendChild(wrap);
}

function subscribeDMChat() {
  if (dmChatSub) { sb.removeChannel(dmChatSub); dmChatSub = null; }
  dmChatSub = sb
    .channel('dm-' + currentUser.id + '-' + (dmWithUserId || ''))
    .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'dm_messages' }, payload => {
      const m = payload.new;
      const relevant =
        (m.sender_id === currentUser.id && m.receiver_id === dmWithUserId) ||
        (m.sender_id === dmWithUserId && m.receiver_id === currentUser.id);
      if (!relevant) return;
      const box = document.getElementById('dmMessages');
      if (!box) return;
      // Skip own optimistic message already shown
      if (box.querySelector(`[data-id="${m.id}"]`)) return;
      renderDMBubble(m, box, true);
      box.scrollTop = box.scrollHeight;
      // Mark as read if receiver is me
      if (m.receiver_id === currentUser.id) {
        sb.from('dm_messages').update({ is_read: true }).eq('id', m.id).then(() => {});
      }
    })
    .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'dm_messages' }, payload => {
      // Green tick — update is_read on existing bubble
      const m = payload.new;
      if (m.sender_id !== currentUser.id) return;
      const box = document.getElementById('dmMessages');
      if (!box) return;
      const el = box.querySelector(`[data-id="${m.id}"] .chat-tick`);
      if (el && m.is_read) { el.classList.add('read'); el.style.color = '#22c55e'; }
    })
    .subscribe();
}

async function sendDM() {
  if (!sb || !navigator.onLine) { showToast("📵 Offline — chat unavailable"); return; }
  const input = document.getElementById('dmInput');
  const msg = input?.value?.trim();
  if (!msg || !currentUser || !dmWithUserId) return;
  const name = document.getElementById('warriorName')?.textContent || 'Warrior';
  input.value = '';

  // Optimistic render
  const box = document.getElementById('dmMessages');
  const tempMsg = {
    id: 'temp-' + Date.now(),
    sender_id: currentUser.id,
    receiver_id: dmWithUserId,
    sender_name: name,
    message: msg,
    is_read: false,
    created_at: new Date().toISOString(),
    _temp: true
  };
  if (box) { renderDMBubble(tempMsg, box, true); box.scrollTop = box.scrollHeight; }

  const { data: inserted } = await sb.from('dm_messages').insert({
    sender_id: currentUser.id,
    receiver_id: dmWithUserId,
    sender_name: name,
    message: msg,
    is_read: false
  }).select().single();

  // Replace temp id
  if (inserted && box) {
    const tempEl = box.querySelector(`[data-id="${tempMsg.id}"]`);
    if (tempEl) tempEl.setAttribute('data-id', inserted.id);
  }
}

async function sendDMImage(input) {
  if (!input.files || !input.files[0] || !currentUser || !dmWithUserId) return;
  const file = input.files[0];
  const ext = file.name.split('.').pop();
  const path = `dm/${currentUser.id}_${Date.now()}.${ext}`;
  showToast('📤 Uploading...');

  const { error: upErr } = await sb.storage.from('chat-images').upload(path, file);
  if (upErr) { showToast('❌ Upload failed'); return; }

  const { data: urlData } = sb.storage.from('chat-images').getPublicUrl(path);
  const name = document.getElementById('warriorName')?.textContent || 'Warrior';

  await sb.from('dm_messages').insert({
    sender_id: currentUser.id,
    receiver_id: dmWithUserId,
    sender_name: name,
    message: '',
    image_url: urlData.publicUrl,
    is_read: false
  });
  input.value = '';
  showToast('✅ Image sent!');
}

async function checkUnreadDMs() {
  if (!currentUser) return;
  const { data } = await sb
    .from('dm_messages')
    .select('id')
    .eq('receiver_id', currentUser.id)
    .eq('is_read', false);
  const dot = document.getElementById('chatUnreadDot');
  if (dot) dot.style.display = (data && data.length > 0) ? 'block' : 'none';
}

// Enter key
document.addEventListener('keydown', e => {
  if (e.key !== 'Enter') return;
  const active = document.activeElement;
  if (active?.id === 'chatInput') sendGroupMessage();
  if (active?.id === 'dmInput') sendDM();
});
// ============================================================
// GLOBAL WINDOW EXPORTS (must be at end — all functions defined above)
// ============================================================
window.showClub        = function(){ showScreen('clubScreen'); if(document.getElementById('zoomLink')) document.getElementById('zoomLink').href=CLUB_ZOOM_LINK; initClubClock(); loadClubData(); };
window.showChat        = showChat;
window.switchClubTab   = function(t){ clubActiveTab=t; loadClubLeaderboard(); };
window.clubCheckIn     = clubCheckIn;
window.sendGroupMessage= sendGroupMessage;
window.sendDM          = sendDM;
window.switchDMTab     = typeof switchDMTab !== 'undefined' ? switchDMTab : function(){};
window.showAdmin     = showAdmin;
window.showMain      = function(){ showScreen('mainScreen'); };
window.switchTab     = switchTab;
window.checkIn       = checkIn;
window.redeemStreak  = redeemStreak;
window.toggleMusic   = toggleMusic;
window.forgotPassword= forgotPassword;

// ── Offline queue flush ───────────────────────────────────────
async function flushOfflineQueue() {
  if (!sb || !currentUser) return;
  let synced = 0;
  // Streak check-ins
  try {
    const q = JSON.parse(localStorage.getItem('bm_offline_queue') || '[]');
    const mine = q.filter(r => r.user_id === currentUser.id);
    for (const r of mine) {
      await sb.from('bct_logs').upsert({ user_id: r.user_id, date: r.date, status: r.status }, { onConflict: 'user_id,date' });
      synced++;
    }
    if (mine.length) localStorage.removeItem('bm_offline_queue');
  } catch(e) {}
  // 5AM club check-ins
  try {
    const cq = JSON.parse(localStorage.getItem('bm_club_queue') || '[]');
    const cmine = cq.filter(r => r.user_id === currentUser.id);
    for (const r of cmine) {
      await sb.from('club_checkins').insert({ user_id: r.user_id, checkin_date: r.checkin_date, checkin_time: r.checkin_time, points: r.points });
      synced++;
    }
    if (cmine.length) localStorage.removeItem('bm_club_queue');
  } catch(e) {}
  if (synced) showToast(`✅ ${synced} offline record${synced>1?'s':''} synced!`);
}

// Auto-flush when back online
window.addEventListener('online', async () => {
  showToast('🌐 Back online — syncing...', 2000);
  await flushOfflineQueue();
});

// SW message for background sync
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.addEventListener('message', e => {
    if (e.data && e.data.type === 'FLUSH_OFFLINE_QUEUE') flushOfflineQueue();
  });
}

// ============================================================
// WAKEUP BUTTON + CALENDAR
// ============================================================

window.markWakeup = function() {
  const now    = new Date();
  const h      = now.getHours();
  const m      = now.getMinutes();
  const time   = `${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}`;
  const under6 = (h < 6);
  const dateStr = getTodayStr();
  const wakeKey = 'bm_wakeup_' + dateStr;

  if (localStorage.getItem(wakeKey)) { showToast('✅ Already marked today!'); return; }

  localStorage.setItem(wakeKey, JSON.stringify({ time, under6 }));

  const wakeBtn = document.getElementById('clubWakeupBtn');
  if (wakeBtn) {
    wakeBtn.textContent = `⏰ Woke up at ${time}`;
    wakeBtn.disabled    = true;
    wakeBtn.classList.remove('wakeup-done-green','wakeup-done-red');
    wakeBtn.classList.add(under6 ? 'wakeup-done-green' : 'wakeup-done-red');
    wakeBtn.style.animation = 'none';
  }

  showToast(under6
    ? `✅ Wakeup at ${time} — Before 6AM! 🔥 Green day!`
    : `⏰ Wakeup at ${time} — After 6AM`, 3500);

  renderClubWakeupCalendar();
};

// ── Calendar state ─────────────────────────────────────────────
let clubCalYear  = new Date().getFullYear();
let clubCalMonth = new Date().getMonth();

window.clubCalPrev = function() {
  clubCalMonth--;
  if (clubCalMonth < 0) { clubCalMonth = 11; clubCalYear--; }
  renderClubWakeupCalendar();
};
window.clubCalNext = function() {
  clubCalMonth++;
  if (clubCalMonth > 11) { clubCalMonth = 0; clubCalYear++; }
  renderClubWakeupCalendar();
};

function renderClubWakeupCalendar() {
  const cal     = document.getElementById('clubWakeupCal');
  const titleEl = document.getElementById('clubCalTitle');
  if (!cal) return;

  const MONTHS = ['January','February','March','April','May','June',
                  'July','August','September','October','November','December'];
  if (titleEl) titleEl.textContent = `${MONTHS[clubCalMonth]} ${clubCalYear}`;

  const todayStr   = getTodayStr();
  const checkinMap = window._clubCheckinMap || {};

  // Read all wakeup entries from localStorage
  const wakeupMap = {};
  for (let i = 0; i < localStorage.length; i++) {
    const k = localStorage.key(i);
    if (k && k.startsWith('bm_wakeup_')) {
      const ds = k.replace('bm_wakeup_', '');
      try { wakeupMap[ds] = JSON.parse(localStorage.getItem(k)); } catch(e) {}
    }
  }

  const firstDay    = new Date(clubCalYear, clubCalMonth, 1).getDay();
  const daysInMonth = new Date(clubCalYear, clubCalMonth + 1, 0).getDate();

  cal.innerHTML = '';

  // Empty leading cells
  for (let i = 0; i < firstDay; i++) {
    const e = document.createElement('div');
    e.className = 'club-wakeup-day cwd-empty';
    cal.appendChild(e);
  }

  for (let d = 1; d <= daysInMonth; d++) {
    const ds   = `${clubCalYear}-${String(clubCalMonth+1).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
    const cell = document.createElement('div');
    cell.className = 'club-wakeup-day';
    if (ds === todayStr) cell.classList.add('cwd-today');

    let timeLabel = '';
    let colored   = false;

    // Wakeup button data takes priority
    if (wakeupMap[ds]) {
      const { time, under6 } = wakeupMap[ds];
      timeLabel = time;
      cell.classList.add(under6 ? 'cwd-green' : 'cwd-red');
      colored = true;
    }

    // Fallback: club attendance time
    if (!colored && checkinMap[ds]) {
      const t    = checkinMap[ds];
      const hh   = parseInt(t.split(':')[0]);
      timeLabel  = t;
      cell.classList.add(hh < 6 ? 'cwd-green' : 'cwd-red');
    }

    // Date on top, time below
    cell.innerHTML = `<span class="cwd-num">${d}</span>${timeLabel ? `<span class="cwd-time">${timeLabel}</span>` : ''}`;
    cal.appendChild(cell);
  }
}

// Init wakeup button state on club screen load
const _origShowClub = window.showClub;
window.showClub = function() {
  if (typeof _origShowClub === 'function') _origShowClub();
  // Reset cal to current month
  clubCalYear  = new Date().getFullYear();
  clubCalMonth = new Date().getMonth();
  // Set wakeup button state
  const wakeBtn = document.getElementById('clubWakeupBtn');
  if (wakeBtn) {
    const wakeData = localStorage.getItem('bm_wakeup_' + getTodayStr());
    if (wakeData) {
      const { time, under6 } = JSON.parse(wakeData);
      wakeBtn.textContent = `⏰ Woke up at ${time}`;
      wakeBtn.disabled    = true;
      wakeBtn.classList.add(under6 ? 'wakeup-done-green' : 'wakeup-done-red');
      wakeBtn.style.animation = 'none';
    } else {
      wakeBtn.textContent = '⏰ WAKE UP';
      wakeBtn.disabled    = false;
    }
  }
};
