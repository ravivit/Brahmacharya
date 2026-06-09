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
let bestStreak      = 0;
let totalPoints     = 0;
let musicPlaying    = false;
let redemptions     = {};  // { 'YYYY-MM-DD': true } — redeemed days
let isGuestMode     = false; // Guest / Explore mode flag

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
      sb = window.sb = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
    storage: window.localStorage
  }
});      console.log('✅ Supabase ready');
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
    injectNotifBell();

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
   
    if (!data.user) throw new Error('Registration failed. Try again.');
if (data.user.identities && data.user.identities.length === 0) throw new Error('Email already registered. Please login.');
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

// ============================================================
// GUEST / EXPLORE MODE
// ============================================================
function enterGuestMode() {
  isGuestMode = true;
  const d12ago = fmtDate(new Date(today.getTime() - 12 * 86400000));
  profile = {
    user_id: 'guest',
    name: 'Warrior (Guest)',
    goal: 'Exploring BrahmaMode — Login to save real data!',
    startDate: d12ago,
    email: 'guest@brahmamode.space'
  };
  logs = {};
  for (let i = 12; i >= 1; i--) {
    const d = new Date(today.getTime() - i * 86400000);
    const ds = fmtDate(d);
    if (i === 5 || i === 9) logs[ds] = 'missed';
    else logs[ds] = 'done';
  }
  redemptions = {};
  window._guestMode = true;
  showScreen('mainScreen');
  renderAll();
  initClubClock();
  // Hide notif bell for guest
  setTimeout(() => {
    const bell = document.getElementById('bmBell');
    if (bell) bell.style.display = 'none';
  }, 600);
  setTimeout(() => {
    showToast('👁️ Explore Mode — Login to save your real progress!', 5000);
  }, 900);
  // Show guest banner strip
  const banner = document.createElement('div');
  banner.id = 'guestBanner';
  banner.style.cssText = 'position:fixed;bottom:72px;left:0;right:0;z-index:998;background:linear-gradient(90deg,rgba(123,47,255,.9),rgba(168,85,247,.9));padding:8px 16px;display:flex;align-items:center;justify-content:space-between;backdrop-filter:blur(10px);';
  banner.innerHTML = '<span style="font-family:var(--font-b);font-size:.78rem;color:#fff;font-weight:600;">👁️ Explore Mode — Data is not saved</span><button onclick="document.getElementById(\'guestBanner\').remove();showScreen(\'authScreen\');isGuestMode=false;" style="background:rgba(255,255,255,.2);border:1px solid rgba(255,255,255,.3);border-radius:20px;color:#fff;padding:4px 12px;font-family:var(--font-b);font-size:.75rem;font-weight:700;cursor:pointer;">Login Free</button>';
  document.body.appendChild(banner);
}

function guestBlock(featureName) {
  if (!isGuestMode) return false;
  const old = document.getElementById('guestBlockOverlay');
  if (old) old.remove();
  const ov = document.createElement('div');
  ov.id = 'guestBlockOverlay';
  ov.style.cssText = 'position:fixed;inset:0;z-index:9999;background:rgba(0,0,0,.75);backdrop-filter:blur(8px);display:flex;align-items:center;justify-content:center;padding:1rem;';
  ov.innerHTML = `<div style="background:linear-gradient(145deg,#0f0020,#1a0035);border:1px solid rgba(168,85,247,.45);border-radius:24px;padding:2rem 1.5rem;max-width:340px;width:100%;text-align:center;animation:v2FadeUp .3s ease">
      <div style="font-size:2.5rem;margin-bottom:.75rem;">🔐</div>
      <div style="font-family:var(--font-d);font-size:1rem;font-weight:700;color:#fff;margin-bottom:.5rem;letter-spacing:1px;">Login Required</div>
      <p style="font-size:.83rem;color:rgba(255,255,255,.6);margin-bottom:1.5rem;line-height:1.6;"><strong style="color:#c084fc">${featureName || 'This feature'}</strong> saves your data to Supabase.<br>Create a free account — takes 30 seconds!</p>
      <button onclick="document.getElementById('guestBlockOverlay').remove();showScreen('authScreen');isGuestMode=false;const b=document.getElementById('guestBanner');if(b)b.remove();"
        style="width:100%;padding:.9rem;background:linear-gradient(135deg,#7b2fff,#5b21b6);border:none;border-radius:12px;color:#fff;font-family:var(--font-d);font-size:.9rem;font-weight:700;letter-spacing:1.5px;cursor:pointer;margin-bottom:.75rem;box-shadow:0 4px 20px rgba(123,47,255,.5);">
        🔥 LOGIN / REGISTER — FREE
      </button>
      <button onclick="document.getElementById('guestBlockOverlay').remove()"
        style="width:100%;padding:.75rem;background:rgba(255,255,255,.06);border:1px solid rgba(255,255,255,.12);border-radius:12px;color:rgba(255,255,255,.65);font-family:var(--font-b);font-size:.88rem;cursor:pointer;">
        Continue Exploring
      </button></div>`;
  ov.addEventListener('click', e => { if (e.target === ov) ov.remove(); });
  document.body.appendChild(ov);
  return true;
}


async function onLogin(user) {
  isGuestMode = false;
  window._guestMode = false;
  // Remove guest UI if present
  const gb = document.getElementById('guestBanner');
  if (gb) gb.remove();
  currentUser = window.currentUser = user;
  // Load profile
  const { data: prof } = await sb.from('bct_profiles').select('*').eq('user_id', user.id).maybeSingle();
  if (!prof) {
    // Profile not set — show auth to fill details (edge case for email confirm flow)
    showScreen('authScreen');
    return;
  }
 profile = window.profile = prof;
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
  if(navigator.onLine) {
    loadHomeFeed();
    loadClubData();
  }
  initClubClock();
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
  bestStreak = streakHistory.length ? Math.max(...streakHistory.map(s=>s.length)) : currentStreak;

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
if(el('headerBest')) el('headerBest').textContent = bestStreak;
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

function renderCalendar(gridId) {
  const grid = document.getElementById(gridId||'calendarGrid');
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
  renderCalendar('calendarGrid2');
  renderMotivation();
  renderAnalytics();
  if(navigator.onLine) renderLbPreview();
  if(typeof syncJourneyTab==='function') syncJourneyTab();
  if(typeof syncProfileTab==='function') syncProfileTab();
}

function renderAnalytics() {
  const cleanDays = Object.values(logs).filter(v => v === 'done' || v === 'redeemed').length;
  const totalDays = Object.keys(logs).length;
  const rate = totalDays > 0 ? Math.round((cleanDays / totalDays) * 100) : 0;
  const goal = Math.max(bestStreak, currentStreak, 90);

  if (el('anaStreak')) el('anaStreak').textContent = currentStreak;
  if (el('anaBest')) el('anaBest').textContent = bestStreak;
  if (el('anaRate')) el('anaRate').textContent = rate + '%';
  if (el('anaClean')) el('anaClean').textContent = cleanDays;
  if (el('anaStreakBar')) el('anaStreakBar').style.width = Math.min(100, (currentStreak / goal) * 100) + '%';
  if (el('anaBestBar')) el('anaBestBar').style.width = Math.min(100, (bestStreak / goal) * 100) + '%';
  if (el('anaRateBar')) el('anaRateBar').style.width = rate + '%';
  if (el('anaCleanBar')) el('anaCleanBar').style.width = Math.min(100, (cleanDays / Math.max(totalDays, 1)) * 100) + '%';
}

async function renderLbPreview() {
  const preview = el('v2LbPreview');
  if (!preview || !sb || !navigator.onLine) return;
  try {
    const [{ data: profiles }, { data: allLogs }] = await Promise.all([
      sb.from('bct_profiles').select('user_id, name, startDate'),
      sb.from('bct_logs').select('user_id, date, status')
    ]);
    if (!profiles) return;
    const logsByUser = {};
    (allLogs || []).forEach(r => {
      if (!logsByUser[r.user_id]) logsByUser[r.user_id] = {};
      logsByUser[r.user_id][r.date] = r.status;
    });
    const warriors = profiles.map(p => {
      const s = computeUserStats(p, logsByUser[p.user_id] || {});
      return { name: p.name, pts: s.totalPoints, streak: s.currentStreak, uid: p.user_id };
    }).sort((a, b) => b.pts - a.pts || b.streak - a.streak).slice(0, 5);

    if (!warriors.length) {
      preview.innerHTML = '<div class="v2-lb-loading">No warriors yet</div>';
      return;
    }
    preview.innerHTML = warriors.map((w, i) => {
      const isMe = currentUser && w.uid === currentUser.id;
      const medal = i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `${i + 1}`;
      const topClass = i === 0 ? 'top1' : i === 1 ? 'top2' : i === 2 ? 'top3' : '';
      return `<div class="v2-lb-item ${topClass}">
        <span class="v2-lb-medal">${medal}</span>
        <span class="v2-lb-avatar">${(w.name || 'W')[0].toUpperCase()}</span>
        <div class="v2-lb-info">
          <div class="v2-lb-name">${w.name}${isMe ? ' (You)' : ''}</div>
          <div class="v2-lb-sub">🔥 ${w.streak} day streak</div>
        </div>
        <span class="v2-lb-pts">${w.pts} pts</span>
      </div>`;
    }).join('');
  } catch (e) { console.error('renderLbPreview:', e); }
}

// ============================================================
// CHECK IN
// ============================================================
async function checkIn(status) {
  if (guestBlock('Daily Check-In')) return;
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
  if (guestBlock('Streak Redemption')) return;
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
// ── Meditation Tracks (MP3 — same as live site) ───────────────
const MEDITATION_TRACKS = [
  { name:'Om Namah Shivaya',       label:'Shiva Mantra • Meditation',      icon:'🔱', file:'music.mp3' },
  { name:'Om Chanting 108',        label:'Sacred Om • Deep Focus',         icon:'🕉️', file:'music.mp3' },
  { name:'Gayatri Mantra',         label:'Vedic Chant • Morning Sadhana',  icon:'☀️', file:'music.mp3' },
  { name:'Mahamrityunjaya',        label:'Healing Mantra • Protection',    icon:'🙏', file:'music.mp3' },
  { name:'Brahmacharya Meditation',label:'Silence & Focus • Ojas',         icon:'🧘', file:'music.mp3' },
  { name:'Hanuman Chalisa',        label:'Devotional • Strength',          icon:'🏔️', file:'music.mp3' },
  { name:'Morning Raga',           label:'Classical • Sunrise 5–7 AM',     icon:'🌅', file:'music.mp3' },
];
let currentTrackIdx = 0;
let musicBarInterval = null;

function initMusicPlayer() {
  const audio = el('bgMusic');
  const playBtn = el('musicPlayBtn');
  const prevBtn = el('musicPrevBtn');
  const nextBtn = el('musicNextBtn');
  if (!audio || !playBtn) return;

  function updatePlayBtn() {
    const playing = !audio.paused;
    playBtn.textContent = playing ? '⏸' : '▶';
    playBtn.classList.toggle('playing', playing);
    musicPlaying = playing;
    const toggle = el('musicToggle');
    if (toggle) {
      toggle.textContent = playing ? '🔇' : '🎵';
      toggle.classList.toggle('playing', playing);
    }
  }

  function playTrack(i, autoplay = true) {
    currentTrackIdx = i;
    const t = MEDITATION_TRACKS[i];
    if (el('musicTrackName')) el('musicTrackName').textContent = t.name;
    if (el('musicTrackType')) el('musicTrackType').textContent = t.label;
    if (el('musicArt')) el('musicArt').textContent = t.icon;
    audio.src = t.file;
    audio.volume = 0.25;
    if (autoplay) audio.play().catch(() => showToast('⚠️ Tap play to start music'));
    updatePlayBtn();
    renderMusicTrackList();
    startMusicBar();
  }

  playBtn.addEventListener('click', () => {
    if (audio.paused) {
      if (!audio.src) playTrack(currentTrackIdx);
      else audio.play().catch(() => showToast('⚠️ Music unavailable'));
    } else {
      audio.pause();
    }
    updatePlayBtn();
    renderMusicTrackList();
  });

  if (prevBtn) prevBtn.addEventListener('click', () => playTrack((currentTrackIdx - 1 + MEDITATION_TRACKS.length) % MEDITATION_TRACKS.length));
  if (nextBtn) nextBtn.addEventListener('click', () => playTrack((currentTrackIdx + 1) % MEDITATION_TRACKS.length));

  audio.addEventListener('ended', () => playTrack((currentTrackIdx + 1) % MEDITATION_TRACKS.length));
  audio.addEventListener('play', updatePlayBtn);
  audio.addEventListener('pause', updatePlayBtn);

  updateTrackDisplay();
  renderMusicTrackList();
}

function startMusicBar() {
  const bar = el('v2MusicBar');
  const audio = el('bgMusic');
  if (!bar || !audio) return;
  if (musicBarInterval) clearInterval(musicBarInterval);
  musicBarInterval = setInterval(() => {
    if (audio.duration) bar.style.width = (audio.currentTime / audio.duration * 100) + '%';
  }, 500);
}

function updateTrackDisplay() {
  const t = MEDITATION_TRACKS[currentTrackIdx];
  if (el('musicTrackName')) el('musicTrackName').textContent = t.name;
  if (el('musicTrackType')) el('musicTrackType').textContent = t.label;
  if (el('musicArt')) el('musicArt').textContent = t.icon;
}

function renderMusicTrackList() {
  const list = el('musicTrackList');
  const audio = el('bgMusic');
  if (!list) return;
  list.innerHTML = '';
  MEDITATION_TRACKS.forEach((t, i) => {
    const row = document.createElement('div');
    const playing = audio && !audio.paused && i === currentTrackIdx;
    row.className = 'music-track' + (i === currentTrackIdx ? ' active' : '');
    row.innerHTML = `<span class="music-track-num">${playing ? '▶' : i + 1}</span><span class="music-track-name">${t.icon} ${t.name}</span><span class="music-track-dur">${t.label.split('•')[0].trim()}</span>`;
    row.onclick = () => {
      currentTrackIdx = i;
      const a = el('bgMusic');
      if (a) { a.src = t.file; a.volume = 0.25; a.play().catch(() => {}); startMusicBar(); }
      updateTrackDisplay();
      renderMusicTrackList();
    };
    list.appendChild(row);
  });
}

function toggleMusic() {
  const audio = el('bgMusic');
  const btn = el('musicToggle');
  if (!audio) { showToast('⏳ Music player loading…'); return; }
  if (musicPlaying) {
    audio.pause();
    if (btn) { btn.textContent = '🎵'; btn.classList.remove('playing'); }
    musicPlaying = false;
  } else {
    if (!audio.src) audio.src = MEDITATION_TRACKS[currentTrackIdx].file;
    audio.volume = 0.25;
    audio.play().catch(() => {});
    if (btn) { btn.textContent = '🔇'; btn.classList.add('playing'); }
    musicPlaying = true;
    startMusicBar();
  }
  const pb = el('musicPlayBtn');
  if (pb) pb.textContent = musicPlaying ? '⏸' : '▶';
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
      initClubClock();
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
    injectNotifBell();
  } else {
    showScreen('authScreen');
    el('regStartDate').value = todayStr;
  }

  // Auth state listener — token refresh hone par bhi logged in rahe
  sb.auth.onAuthStateChange(async (event, session) => {
    if (event === 'SIGNED_IN' && session && session.user && !currentUser) {
      await onLogin(session.user);
      injectNotifBell();   

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
      if (guestBlock('Trigger Tracking')) return;
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
  if(el('musicToggle')) el('musicToggle').addEventListener('click', toggleMusic);
  // Init new YouTube music player if controls exist
  if(el('musicPlayBtn')) initMusicPlayer();

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

function setClubText(ids, text) {
  ids.forEach(id => { const e = document.getElementById(id); if (e) e.textContent = text; });
}

function updateClubClock() {
  const now = new Date(new Date().toLocaleString('en-US', {timeZone: 'Asia/Kolkata'}));
  const totalSecs = now.getHours() * 3600 + now.getMinutes() * 60 + now.getSeconds();
  const openSecs  = 5 * 3600;  // 5:00 AM
  const closeSecs = 6 * 3600;  // 6:00 AM

  function fmt(secs) {
    const h = Math.floor(secs / 3600);
    const m = Math.floor((secs % 3600) / 60);
    const s = secs % 60;
    return h > 0
      ? `${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`
      : `${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`;
  }

  const earlySecs = 4 * 3600; // 4:00 AM
  let timeText, statusText;
  if (totalSecs < earlySecs) {
    timeText = `Opens in ${fmt(earlySecs - totalSecs)}`;
    statusText = 'Window closed – opens again at 4:00 AM';
  } else if (totalSecs < openSecs) {
    // Early Bird window: 4AM–5AM
    const earlyRemain = openSecs - totalSecs;
    timeText = `Early Bird — ${fmt(earlyRemain)} left`;
    statusText = '⭐ Early Bird Window! 60 pts — Mark attendance now!';
  } else if (totalSecs < closeSecs) {
    const remaining = closeSecs - totalSecs;
    const lateSecs  = totalSecs - openSecs;
    const pts = Math.max(1, 60 - Math.floor(lateSecs / 60));
    timeText = `Closes in ${fmt(remaining)}`;
    statusText = lateSecs < 60
      ? '✅ Window Open! Check in for full 60 pts!'
      : `⏱ ${Math.floor(lateSecs / 60)} min late — ${pts} pts available`;
  } else {
    timeText = `Opens in ${fmt((24 * 3600) - totalSecs + earlySecs)}`;
    statusText = 'Window closed – opens again at 4:00 AM';
  }

  setClubText(['clubTime', 'clubTimeNew'], timeText);
  setClubText(['clubWindowStatus', 'clubWindowStatusNew'], statusText);

  const totalMins = Math.floor(totalSecs / 60);
 updateClubButtons(totalMins, openSecs / 60, closeSecs / 60);

}

function applyJoinBtnState(btn, alreadyDone, totalMins, openMins, closeMins, isNew) {
  if (!btn) return;
  const baseClass = isNew ? 'club-attendance-btn' : 'btn-club-join';
  const inWindow  = (totalMins >= openMins && totalMins < closeMins);
  // Live points calculation (4AM=60, 5AM=60, 5:01+ decreasing, 4AM-5AM = Early Bird 60pts)
  const earlyBird = (totalMins >= 4 * 60 && totalMins < openMins);
  const lateMins  = Math.max(0, totalMins - openMins);
  let pts;
  if (earlyBird) pts = 60;
  else if (inWindow) pts = Math.max(1, 60 - lateMins);
  else pts = null;

  if (alreadyDone) {
    btn.textContent = '✅ Attendance Done!';
    btn.className = `${baseClass} done-state`;
    btn.disabled = true;
  } else {
    // Always enabled — green if in window or early bird, red text if outside
    if (inWindow || earlyBird) {
      btn.textContent = pts !== null ? `🌅 ATTENDANCE — ${pts} pts` : '🌅 ATTENDANCE';
      btn.className = `${baseClass} active-window`;
    } else {
      btn.textContent = '⏰ WAKEUP ATTENDANCE';
      btn.className = `${baseClass} outside-window`;
    }
    btn.disabled = false; // always enabled
  }
}

function applyWakeBtnState(btn, wakeData, alreadyDone) {
  if (!btn) return;
  const noteEl = document.getElementById('clubWakeupNoteNew');
  if (wakeData) {
    const { time, under6 } = JSON.parse(wakeData);
    btn.textContent = `⏰ Woke up at ${time}`;
    btn.disabled = true;
    btn.classList.remove('wakeup-done-green', 'wakeup-done-red', 'wakeup-blink');
    btn.classList.add(under6 ? 'wakeup-done-green' : 'wakeup-done-red');
    btn.style.animation = 'none';
    if (noteEl) { noteEl.style.display = 'flex'; noteEl.textContent = under6 ? '⏰ Woke up – Before 6AM ✅' : '⏰ Woke up – After 6AM ❌'; }
  } else if (alreadyDone) {
    btn.textContent = '⏰ Woke up — Auto marked ✅';
    btn.disabled = true;
    btn.classList.remove('wakeup-done-green', 'wakeup-done-red', 'wakeup-blink');
    btn.classList.add('wakeup-done-green');
    btn.style.animation = 'none';
    if (noteEl) { noteEl.style.display = 'flex'; noteEl.textContent = '⏰ Woke up – Auto marked ✅'; }
  } else {
    btn.textContent = '⏰ WAKEUP ATTENDANCE';
    btn.disabled = false;
    btn.classList.remove('wakeup-done-green', 'wakeup-done-red', 'wakeup-blink');
    btn.classList.add('wakeup-blink');
    btn.style.animation = '';
    if (noteEl) noteEl.style.display = 'none';
  }
}

async function updateClubButtons(totalMins, openMins, closeMins) {
  const joinBtn   = document.getElementById('clubJoinBtn');
  const joinBtnNew = document.getElementById('clubJoinBtnNew');
  const wakeBtn   = document.getElementById('clubWakeupBtn');
  const wakeBtnNew = document.getElementById('clubWakeupBtnNew');
  if (!joinBtn && !joinBtnNew) return;

  const todayStr    = getTodayStr();
  const alreadyDone = await hasClubCheckinToday(todayStr);
  const wakeKey  = 'bm_wakeup_' + todayStr;
  const wakeData = localStorage.getItem(wakeKey);

  applyJoinBtnState(joinBtn, alreadyDone, totalMins, openMins, closeMins, false);
  applyJoinBtnState(joinBtnNew, alreadyDone, totalMins, openMins, closeMins, true);
  applyWakeBtnState(wakeBtn, wakeData, alreadyDone);
  applyWakeBtnState(wakeBtnNew, wakeData, alreadyDone);
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
  if (guestBlock('5AM Club Attendance')) return;
  if (!currentUser) return;
 const now = new Date(new Date().toLocaleString('en-US', {timeZone: 'Asia/Kolkata'}));
  const h = now.getHours(), m = now.getMinutes();
  const totalMins = h * 60 + m;
  const openMins  = 5 * 60;  // 5:00 AM
  const closeMins = 6 * 60;  // 6:00 AM
  const earlyBird = (totalMins >= 4 * 60 && totalMins < openMins);
  const inWindow  = (totalMins >= openMins && totalMins < closeMins);

  // Points logic: 4AM-5AM = 60 pts (Early Bird), 5AM sharp = 60, 5:01-5:59 = 60-mins, 6AM+ = 0
  let points;
  if (earlyBird) {
    points = 60; // ⭐ Early Bird — same as 5AM
  } else if (inWindow) {
    const lateMins = totalMins - openMins;
    points = Math.max(1, 60 - lateMins);
  } else {
    points = 0; // outside window — still save the wakeup, 0 pts
  }
  const timeStr = `${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}`;
  const dateStr = getTodayStr();

  const offlineKey = `bm_club_${dateStr}`;
  const alreadyLocal = localStorage.getItem(offlineKey);
  if (alreadyLocal) { showToast('✅ Already checked in today!'); return; }

  if (navigator.onLine && sb) {
    const already = await hasClubCheckinToday(dateStr);
    if (already) { showToast('✅ Already checked in today!'); return; }
  }

  ['clubJoinBtn', 'clubJoinBtnNew'].forEach(id => {
    const btn = document.getElementById(id);
    if (btn) { btn.disabled = true; btn.textContent = '⏳ Saving...'; }
  });

  localStorage.setItem(offlineKey, JSON.stringify({ time: timeStr, points }));

  if (!navigator.onLine || !sb) {
    const q = JSON.parse(localStorage.getItem('bm_club_queue') || '[]');
    q.push({ user_id: currentUser.id, checkin_date: dateStr, checkin_time: timeStr, points });
    localStorage.setItem('bm_club_queue', JSON.stringify(q));
    showToast(`📵 Offline — attendance saved! Syncs when online (+${points} pts)`, 4000);
    applyJoinBtnState(document.getElementById('clubJoinBtn'), true, 0, 0, 0, false);
    applyJoinBtnState(document.getElementById('clubJoinBtnNew'), true, 0, 0, 0, true);
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
    updateClubClock();
    return;
  }

  showToast(`✅ Attendance at ${timeStr} — +${points} pts!`, 4000);
  applyJoinBtnState(document.getElementById('clubJoinBtn'), true, totalMins, openMins, closeMins, false);
  applyJoinBtnState(document.getElementById('clubJoinBtnNew'), true, totalMins, openMins, closeMins, true);
  applyWakeBtnState(document.getElementById('clubWakeupBtn'), null, true);
  applyWakeBtnState(document.getElementById('clubWakeupBtnNew'), null, true);
  loadClubData();
  setTimeout(() => { window.open(CLUB_ZOOM_LINK, '_blank'); }, 800);
}

async function loadClubData() {
  if (!currentUser) return;
  if (!sb || !navigator.onLine) {
    // Load from localStorage cache when offline
    loadClubDataFromCache();
    return;
  }
  await Promise.all([
    loadMyClubHistory(),
    loadClubLeaderboard()
  ]);
}

function loadClubDataFromCache() {
  const _upd = (id, val) => { const e = document.getElementById(id); if(e) e.textContent = val; };
  // Read all club checkins from localStorage
  const checkinMap = {};
  for (let i = 0; i < localStorage.length; i++) {
    const k = localStorage.key(i);
    if (k && k.startsWith('bm_club_')) {
      const ds = k.replace('bm_club_', '');
      try { const v = JSON.parse(localStorage.getItem(k)); checkinMap[ds] = v; } catch(e) {}
    }
  }
  const dates = Object.keys(checkinMap).sort((a,b) => b.localeCompare(a));
  // Compute streak
  let streak = 0;
  const todayD = getTodayStr();
  let check = todayD;
  for (let i = 0; i < 100; i++) {
    if (checkinMap[check]) { streak++; check = offsetDate(check, -1); } else { break; }
  }
  window._clubStreak = streak;
  _upd('clubStreak', streak); _upd('clubStreakNew', streak);
  // Total pts
  const clubTotalPts = Object.values(checkinMap).reduce((s,v) => s + (v.points||0), 0);
  window._clubTotalPts = clubTotalPts;
  _upd('clubTotalPts', clubTotalPts); _upd('clubTotalPtsNew', clubTotalPts);
  // Today pts
  const todayRec = checkinMap[todayD];
  window._clubPtsToday = todayRec ? todayRec.points : null;
  const todayPtsText = todayRec ? `${todayRec.points} pts` : '—';
  _upd('clubPtsToday', todayPtsText); _upd('clubPtsTodayNew', todayPtsText);
  // Best streak
  const allDates = [...new Set(dates)].sort();
  let clubBest = 0, runStreak = 0;
  for (let i = 0; i < allDates.length; i++) {
    if (i === 0) { runStreak = 1; } else {
      const diff = (new Date(allDates[i]) - new Date(allDates[i-1])) / 86400000;
      runStreak = diff === 1 ? runStreak + 1 : 1;
    }
    if (runStreak > clubBest) clubBest = runStreak;
  }
  window._clubBestStreak = clubBest;
  _upd('clubBestStreak', clubBest); _upd('clubBestStreakNew', clubBest);
  // Build checkin time map for calendar
  window._clubCheckinMap = {};
  Object.keys(checkinMap).forEach(ds => { window._clubCheckinMap[ds] = checkinMap[ds].time; });
  renderClubWakeupCalendar();
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

  window._clubStreak = streak;
  // Update BOTH legacy hidden elements AND new visible elements
  const _upd = (id, val) => { const e = document.getElementById(id); if(e) e.textContent = val; };
  _upd('clubStreak', streak);
  _upd('clubStreakNew', streak);

  // 5AM Club total points
  const clubTotalPts = (data || []).reduce((sum, r) => sum + (r.points || 0), 0);
  window._clubTotalPts = clubTotalPts;
  _upd('clubTotalPts', clubTotalPts);
  _upd('clubTotalPtsNew', clubTotalPts);

  // 5AM Club best streak
  const allDates = [...new Set((data || []).map(r => r.checkin_date))].sort();
  let clubBest = 0, runStreak = 0;
  for (let i = 0; i < allDates.length; i++) {
    if (i === 0) { runStreak = 1; }
    else {
      const diff = (new Date(allDates[i]) - new Date(allDates[i-1])) / 86400000;
      runStreak = diff === 1 ? runStreak + 1 : 1;
    }
    if (runStreak > clubBest) clubBest = runStreak;
  }
  window._clubBestStreak = clubBest;
  _upd('clubBestStreak', clubBest);
  _upd('clubBestStreakNew', clubBest);

  // Today's points
  const todayRec = (data || []).find(r => r.checkin_date === today);
  window._clubPtsToday = todayRec ? todayRec.points : null;
  const todayPtsText = todayRec ? `${todayRec.points} pts` : '—';
  _upd('clubPtsToday', todayPtsText);
  _upd('clubPtsTodayNew', todayPtsText);

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
  [
    ['tabLbStreak', 'tabLbStreakNew', 'streak'],
    ['tabLbPts', 'tabLbPtsNew', 'pts'],
    ['tabLbTime', 'tabLbTimeNew', 'time']
  ].forEach(([legacyId, newId, key]) => {
    [legacyId, newId].forEach(id => {
      const btn = document.getElementById(id);
      if (btn) btn.classList.toggle('active', key === tab);
    });
  });
  loadClubLeaderboard();
}

function renderClubLeaderboard(rows) {
  const containers = ['clubLeaderboard', 'clubLeaderboardNew'].map(id => document.getElementById(id)).filter(Boolean);
  if (!containers.length) return;
  containers.forEach(c => { c.innerHTML = ''; });

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
      containers.forEach(c => { c.innerHTML = '<p style="color:var(--muted);padding:1rem;font-style:italic">No one has checked in today yet 👀</p>'; });
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

    const rowHtml = `
      <div class="lb-row ${rankClass}">
      <div class="lb-rank">${rankEmoji}</div>
      <div class="lb-avatar">${initial}</div>
      <div class="lb-info">
        <div class="lb-name">${r.name}</div>
        <div class="lb-club-pts">${r.uid === currentUser?.id ? '(You)' : ''}</div>
      </div>
      <div style="text-align:right">
        <div class="lb-club-time">${rightTop}</div>
        <div class="lb-club-pts">${rightSub}</div>
      </div></div>`;
    containers.forEach(c => { c.insertAdjacentHTML('beforeend', rowHtml); });
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
  convo.style.position = "ewltive "

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
window.showClub        = function(){ bnav('club'); if(document.getElementById('zoomLink')) document.getElementById('zoomLink').href=CLUB_ZOOM_LINK; if(document.getElementById('zoomLinkNew')) document.getElementById('zoomLinkNew').href=CLUB_ZOOM_LINK; initClubClock(); loadClubData(); };
window.showChat        = showChat;
window.switchClubTab   = switchClubTab;
window.loadClubData    = loadClubData;
window.initClubClock   = initClubClock;
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

  ['clubWakeupBtn', 'clubWakeupBtnNew'].forEach(id => {
    const wakeBtn = document.getElementById(id);
    if (!wakeBtn) return;
    wakeBtn.textContent = `⏰ Woke up at ${time}`;
    wakeBtn.disabled = true;
    wakeBtn.classList.remove('wakeup-done-green', 'wakeup-done-red');
    wakeBtn.classList.add(under6 ? 'wakeup-done-green' : 'wakeup-done-red');
    wakeBtn.style.animation = 'none';
  });
  const noteEl = document.getElementById('clubWakeupNoteNew');
  if (noteEl) {
    noteEl.style.display = 'flex';
    noteEl.textContent = under6 ? '⏰ Woke up – Before 6AM ✅' : '⏰ Woke up – After 6AM ❌';
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
  const calNew  = document.getElementById('clubWakeupCalNew');
  const titleEl = document.getElementById('clubCalTitle');
  const titleNew= document.getElementById('clubCalTitleNew');
  if (!cal && !calNew) return;

  const MONTHS = ['January','February','March','April','May','June',
                  'July','August','September','October','November','December'];
  const titleTxt = `${MONTHS[clubCalMonth]} ${clubCalYear}`;
  if (titleEl)  titleEl.textContent  = titleTxt;
  if (titleNew) titleNew.textContent = titleTxt;

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

  if(cal)    cal.innerHTML    = '';
  if(calNew) calNew.innerHTML = '';

  // Empty leading cells
  for (let i = 0; i < firstDay; i++) {
    const e = document.createElement('div');
    e.className = 'club-wakeup-day cwd-empty';
    if(cal)    cal.appendChild(e);
    if(calNew) calNew.appendChild(e.cloneNode(true));
  }

  for (let d = 1; d <= daysInMonth; d++) {
    const ds   = `${clubCalYear}-${String(clubCalMonth+1).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
    const cell = document.createElement('div');
    cell.className = 'club-wakeup-day';
    if (ds === todayStr) cell.classList.add('cwd-today');

    let timeLabel = '';
    let colored   = false;

    // Wakeup button localStorage data takes priority
    if (wakeupMap[ds]) {
      const { time, under6 } = wakeupMap[ds];
      timeLabel = time;
      cell.classList.add(under6 ? 'cwd-green' : 'cwd-red');
      colored = true;
    }

    // Fallback: Supabase club checkin time
    if (!colored && checkinMap[ds]) {
      const t    = checkinMap[ds];
      const hh   = parseInt(t.split(':')[0]);
      const mm   = parseInt(t.split(':')[1] || '0');
      timeLabel  = t;
      // Before 6AM = green, at or after 6AM = red
      cell.classList.add((hh < 6) ? 'cwd-green' : 'cwd-red');
      colored = true;
    }

    // Future date — leave empty/default
    const cellDate = new Date(clubCalYear, clubCalMonth, d);
    const now = new Date();
    now.setHours(0,0,0,0);
    if (!colored && cellDate < now) {
      // Past day with no checkin — show as missed (slightly different shade but no color)
    }

    // Date on top, time below
    cell.innerHTML = `<span class="cwd-num">${d}</span>${timeLabel ? `<span class="cwd-time">${timeLabel}</span>` : ''}`;
    if(cal)    cal.appendChild(cell);
    if(calNew) calNew.appendChild(cell.cloneNode(true));
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



// ============================================================
// BRAHMA LEADERBOARD — REAL DATA
// ============================================================
async function renderBrahmaLb() {
  if (!sb || !navigator.onLine) {
    const pod = document.getElementById('brahmaPodium');
    const list = document.getElementById('brahmaLbList');
    if (pod) pod.innerHTML = '<div style="text-align:center;color:var(--muted);padding:20px">📵 Offline</div>';
    if (list) list.innerHTML = '';
    return;
  }
  try {
    const [{ data: profiles }, { data: allLogs }] = await Promise.all([
      sb.from('bct_profiles').select('user_id, name, startDate'),
      sb.from('bct_logs').select('user_id, date, status')
    ]);
    if (!profiles) return;
    const logsByUser = {};
    (allLogs || []).forEach(r => {
      if (!logsByUser[r.user_id]) logsByUser[r.user_id] = {};
      logsByUser[r.user_id][r.date] = r.status;
    });
    const warriors = profiles.map(p => {
      const s = computeUserStats(p, logsByUser[p.user_id] || {});
      return { ...p, ...s };
    }).sort((a, b) => b.totalPoints - a.totalPoints || b.currentStreak - a.currentStreak);
    // Podium
    const podEl = document.getElementById('brahmaPodium');
    if (podEl && warriors.length) {
      const top3 = warriors.slice(0, 3);
      const order = [top3[1], top3[0], top3[2]];
      const slots = ['second','first','third'];
      const heights = ['52px','72px','40px'];
      podEl.innerHTML = order.map((w, i) => {
        if (!w) return '';
        const isMe = currentUser && w.user_id === currentUser.id;
        return `<div class="podium-slot ${slots[i]}">
          <div class="podium-avatar-wrap">${slots[i]==='first'?'<div class="podium-crown">👑</div>':''}
            <div class="podium-avatar${isMe?' is-me':''}">${(w.name||'W')[0].toUpperCase()}</div></div>
          <div class="podium-name">${w.name}${isMe?' (You)':''}</div>
          <div class="podium-streak">🔥 ${w.currentStreak} Day</div>
          <div class="podium-pts"${slots[i]==='first'?' style="color:var(--gold)"':''}>${w.totalPoints.toLocaleString()} pts</div>
          <div class="podium-block" style="height:${heights[i]}"><span class="podium-block-num">${slots[i]==='second'?2:slots[i]==='first'?1:3}</span></div>
        </div>`;
      }).join('');
    }
    // List
    const listEl = document.getElementById('brahmaLbList');
    if (listEl) {
      const BADGES = [{days:90,icon:'👑'},{days:30,icon:'✨'},{days:21,icon:'💎'},{days:15,icon:'🥇'},{days:7,icon:'🥈'},{days:3,icon:'🏅'},{days:1,icon:'🪙'}];
      listEl.innerHTML = warriors.slice(3,20).map((w, i) => {
        const isMe = currentUser && w.user_id === currentUser.id;
        const badge = BADGES.find(b => w.bestStreak >= b.days);
        return `<div class="lb-new-row${isMe?' is-me':''}">
          <div class="lb-new-rank">${i+4}</div>
          <div class="lb-new-av">${(w.name||'W')[0].toUpperCase()}</div>
          <div class="lb-new-info"><div class="lb-new-name">${w.name}${isMe?' (You)':''}</div>
            <div class="lb-new-sub">${badge?badge.icon+' ':''}${w.currentStreak} Day Streak</div></div>
          <div class="lb-new-right"><div class="lb-new-pts">${w.totalPoints.toLocaleString()} pts</div></div>
        </div>`;
      }).join('');
    }
  } catch(e) { console.error('renderBrahmaLb:', e); }
}
window.renderBrahmaLb = renderBrahmaLb;

// ============================================================
// 5AM CLUB LEADERBOARD — REAL DATA
// ============================================================
async function renderClubLbNew() {
  const podEl = document.getElementById('clubLbPodiumNew');
  const listEl = document.getElementById('clubLbListNew');
  if (!podEl || !sb || !navigator.onLine) return;
  try {
    const [{ data: profiles }, { data: checkins }] = await Promise.all([
      sb.from('bct_profiles').select('user_id, name'),
      sb.from('club_checkins').select('user_id, checkin_time, checkin_date, points')
    ]);
    if (!profiles || !checkins) return;
    const nameMap = {};
    profiles.forEach(p => { nameMap[p.user_id] = p.name; });
    // Aggregate by user: total points, today checkin
    const todayStr = new Date().toISOString().split('T')[0];
    const userMap = {};
    checkins.forEach(c => {
      if (!userMap[c.user_id]) userMap[c.user_id] = { totalPts: 0, todayTime: null, name: nameMap[c.user_id]||'Warrior' };
      userMap[c.user_id].totalPts += (c.points || 0);
      if (c.checkin_date === todayStr) userMap[c.user_id].todayTime = c.checkin_time;
    });
    const warriors = Object.entries(userMap).map(([uid, d]) => ({ uid, ...d }))
      .sort((a, b) => b.totalPts - a.totalPts);
    if (!warriors.length) {
      podEl.innerHTML = '<div style="text-align:center;color:var(--muted);padding:20px;font-style:italic">No 5AM check-ins yet</div>';
      return;
    }
    const top3 = warriors.slice(0, 3);
    const order = [top3[1], top3[0], top3[2]];
    const slots = ['second','first','third'];
    podEl.innerHTML = order.map((w, i) => {
      if (!w) return '';
      const isMe = currentUser && w.uid === currentUser.id;
      const timeStr = w.todayTime ? new Date('1970-01-01T'+w.todayTime).toLocaleTimeString('en-IN',{hour:'2-digit',minute:'2-digit'}) : '—';
      return `<div class="clb-slot ${slots[i]}">
        <div class="clb-av-wrap">${slots[i]==='first'?'<div class="clb-crown">🥇</div>':''}
          <div class="clb-av">${(w.name||'W')[0].toUpperCase()}</div></div>
        <div class="clb-name">${w.name}${isMe?' (You)':''}</div>
        <div class="clb-time">${timeStr}</div>
        <div class="clb-pts">${w.totalPts} pts total</div>
        <div class="clb-block"><span class="clb-block-num">${slots[i]==='second'?2:slots[i]==='first'?1:3}</span></div>
      </div>`;
    }).join('');
    if (listEl) {
      listEl.innerHTML = warriors.slice(3,15).map((w, i) => {
        const isMe = currentUser && w.uid === currentUser.id;
        const timeStr = w.todayTime ? new Date('1970-01-01T'+w.todayTime).toLocaleTimeString('en-IN',{hour:'2-digit',minute:'2-digit'}) : '—';
        return `<div class="club-lb-row${isMe?' is-me':''}">
          <div class="club-lb-row-rank">${i+4}</div>
          <div class="club-lb-row-av">${(w.name||'W')[0].toUpperCase()}</div>
          <div class="club-lb-row-info"><div class="club-lb-row-name">${w.name}${isMe?' (You)':''}</div><div class="club-lb-row-time">${timeStr}</div></div>
          <div class="club-lb-row-right"><div class="club-lb-row-pts">${w.totalPts} pts</div></div>
        </div>`;
      }).join('');
    }
  } catch(e) { console.error('renderClubLbNew:', e); }
}
window.renderClubLbNew = renderClubLbNew;

// ============================================================
// COMMUNITY — REAL CHAT + MEMBERS
// ============================================================
let commChatSub = null;
async function loadCommunityFeed() {
  if (!sb || !navigator.onLine) return;
  const feed = document.getElementById('commFeed');
  if (!feed) return;
  const { data } = await sb.from('chat_messages').select('*').order('created_at',{ascending:true}).limit(80);
  feed.innerHTML = '';
  if (!data || !data.length) {
    feed.innerHTML = '<div style="text-align:center;color:var(--muted);padding:40px 20px;font-style:italic">No messages yet. Be the first! ⚔️</div>';
    return;
  }
  let lastDate = null;
  data.forEach(m => {
    const ds = m.created_at.split('T')[0];
    if (ds !== lastDate) {
      lastDate = ds;
      const div = document.createElement('div');
      div.className = 'chat-date-divider';
      div.textContent = new Date(ds).toLocaleDateString('en-IN',{day:'numeric',month:'long',year:'numeric'});
      feed.appendChild(div);
    }
    const isMine = currentUser && m.user_id === currentUser.id;
    const time = new Date(m.created_at).toLocaleTimeString('en-IN',{hour:'2-digit',minute:'2-digit'});
    const wrap = document.createElement('div');
    wrap.className = `chat-msg-wrap ${isMine?'mine':'theirs'}`;
    wrap.setAttribute('data-id', m.id);
    let html = m.image_url ? `<img src="${m.image_url}" class="chat-img-preview" />` : '';
    if (m.message) html += `<div>${m.message}</div>`;
    wrap.innerHTML = `<div class="bubble-avatar">${(m.user_name||'W')[0].toUpperCase()}</div>
      <div class="chat-bubble">${!isMine?`<div class="chat-sender">${m.user_name}</div>`:''}${html}
        <div class="chat-bubble-meta"><span class="chat-time">${time}</span>${isMine?'<span class="chat-tick">✓✓</span>':''}</div></div>`;
    feed.appendChild(wrap);
  });
  feed.scrollTop = feed.scrollHeight;
  if (commChatSub) { sb.removeChannel(commChatSub); commChatSub = null; }
  commChatSub = sb.channel('comm-v2')
    .on('postgres_changes',{event:'INSERT',schema:'public',table:'chat_messages'}, payload => {
      const f = document.getElementById('commFeed'); if (!f) return;
      const m = payload.new;
      if (f.querySelector(`[data-id="${m.id}"]`)) return;
      const isMine = currentUser && m.user_id === currentUser.id;
      const time = new Date(m.created_at).toLocaleTimeString('en-IN',{hour:'2-digit',minute:'2-digit'});
      const wrap = document.createElement('div');
      wrap.className = `chat-msg-wrap ${isMine?'mine':'theirs'}`;
      wrap.setAttribute('data-id', m.id);
      let html = m.image_url ? `<img src="${m.image_url}" class="chat-img-preview" />` : '';
      if (m.message) html += `<div>${m.message}</div>`;
      wrap.innerHTML = `<div class="bubble-avatar">${(m.user_name||'W')[0].toUpperCase()}</div>
        <div class="chat-bubble">${!isMine?`<div class="chat-sender">${m.user_name}</div>`:''}${html}
          <div class="chat-bubble-meta"><span class="chat-time">${time}</span>${isMine?'<span class="chat-tick">✓✓</span>':''}</div></div>`;
      f.appendChild(wrap);
      f.scrollTop = f.scrollHeight;
    }).subscribe();
}
window.loadCommunityFeed = loadCommunityFeed;

async function sendCommMessage() {
  if (guestBlock('Community Chat')) return;
  if (!sb || !navigator.onLine) { showToast('📵 Offline'); return; }
  const inp = document.getElementById('commChatInput');
  const msg = inp?.value?.trim();
  if (!msg || !currentUser) return;
  const name = profile?.name || 'Warrior';
  inp.value = '';
  const feed = document.getElementById('commFeed');
  const tempId = 'temp-' + Date.now();
  if (feed) {
    const wrap = document.createElement('div');
    wrap.className = 'chat-msg-wrap mine';
    wrap.setAttribute('data-id', tempId);
    const time = new Date().toLocaleTimeString('en-IN',{hour:'2-digit',minute:'2-digit'});
    wrap.innerHTML = `<div class="bubble-avatar">${(name[0]||'W').toUpperCase()}</div>
      <div class="chat-bubble"><div>${msg}</div>
        <div class="chat-bubble-meta"><span class="chat-time">${time}</span><span class="chat-tick">✓✓</span></div></div>`;
    feed.appendChild(wrap);
    feed.scrollTop = feed.scrollHeight;
  }
  const { data: ins } = await sb.from('chat_messages').insert({ user_id:currentUser.id, user_name:name, message:msg, is_pinned:false }).select().single();
  if (ins && feed) { const t = feed.querySelector(`[data-id="${tempId}"]`); if(t) t.setAttribute('data-id', ins.id); }
}
window.sendCommMessage = sendCommMessage;

async function loadCommunityMembers() {
  const list = document.getElementById('commMembersList');
  if (!list || !sb || !navigator.onLine) return;
  list.innerHTML = '<div style="color:var(--muted);padding:20px;text-align:center">⏳ Loading warriors...</div>';
  const [{ data: profiles }, { data: allLogs }] = await Promise.all([
    sb.from('bct_profiles').select('user_id, name, startDate'),
    sb.from('bct_logs').select('user_id, date, status')
  ]);
  if (!profiles) return;
  const logsByUser = {};
  (allLogs || []).forEach(r => { if(!logsByUser[r.user_id]) logsByUser[r.user_id]={}; logsByUser[r.user_id][r.date]=r.status; });
  const BADGES = [{days:90,icon:'👑',label:'BRAHMACHARI'},{days:30,icon:'✨',label:'OJAS'},{days:21,icon:'💎',label:'VIRA'},{days:15,icon:'🥇',label:'DHIRA'},{days:7,icon:'🥈',label:'TAPASVI'},{days:3,icon:'🏅',label:'ARAMBHA'},{days:1,icon:'🪙',label:'BEGINNER'}];
  const warriors = profiles.map(p => ({...p,...computeUserStats(p,logsByUser[p.user_id]||{})}))
    .sort((a,b) => b.currentStreak - a.currentStreak);
  list.innerHTML = warriors.map(w => {
    const isMe = currentUser && w.user_id === currentUser.id;
    const badge = BADGES.find(b => w.currentStreak >= b.days);
    const active = w.currentStreak > 0;
    return `<div class="comm-member-row">
      <div class="comm-member-av" style="${isMe?'border:2px solid var(--gold)':''}">${(w.name||'W')[0].toUpperCase()}</div>
      <div class="comm-member-info">
        <div class="comm-member-name">${w.name}${isMe?' (You)':''}</div>
        <div class="comm-member-streak">🔥 ${w.currentStreak} Day Streak${badge?' • '+badge.icon+' '+badge.label:''}</div>
      </div>
      <div style="width:8px;height:8px;border-radius:50%;background:${active?'#10b981':'#6b7280'};flex-shrink:0;box-shadow:${active?'0 0 6px #10b981':'none'}"></div>
    </div>`;
  }).join('');
}
window.loadCommunityMembers = loadCommunityMembers;

// ============================================================
// HOME FEED — REAL RECENT ACTIVITY
// ============================================================
async function loadHomeFeed() {
  const feedEl = document.getElementById('v2CommunityFeed');
  if (!feedEl || !sb || !navigator.onLine) return;
  const { data: recent } = await sb.from('bct_logs').select('user_id, date, status').eq('status','done').order('date',{ascending:false}).limit(20);
  if (!recent || !recent.length) return;
  const { data: profiles } = await sb.from('bct_profiles').select('user_id, name').in('user_id',[...new Set(recent.map(r=>r.user_id))]);
  const nameMap = {}; (profiles||[]).forEach(p => { nameMap[p.user_id] = p.name; });
  const COLORS = ['linear-gradient(135deg,var(--purple),#1d0040)','linear-gradient(135deg,#10b981,#059669)','linear-gradient(135deg,#f59e0b,#d97706)','linear-gradient(135deg,#3b82f6,#1d4ed8)','linear-gradient(135deg,#ec4899,#be185d)'];
  const now = new Date();
  feedEl.innerHTML = recent.slice(0,5).map((r,i) => {
    const name = nameMap[r.user_id]||'Warrior';
    const isMe = currentUser && r.user_id === currentUser.id;
    const d = Math.floor((now - new Date(r.date)) / 86400000);
    const t = d===0?'Today':d===1?'Yesterday':`${d} days ago`;
    return `<div class="v2-feed-item">
      <div class="v2-feed-avatar" style="background:${COLORS[i%COLORS.length]}">${(name[0]||'W').toUpperCase()}</div>
      <div class="v2-feed-text"><span class="v2-feed-name">${name}${isMe?' (You)':''}</span> checked in strong! 🔥<div class="v2-feed-time">${t}</div></div>
    </div>`;
  }).join('');
}
window.loadHomeFeed = loadHomeFeed;

// ============================================================
// JOURNEY GRAPH — REAL DATA
// ============================================================
function renderJourneyGraph() {
  const lineEl = document.getElementById('jrnGraphLine');
  const fillEl = document.getElementById('jrnGraphFill');
  const dotEl  = document.getElementById('jrnGraphDot');
  if (!lineEl || !fillEl) return;
  const days = [];
  for (let i=29; i>=0; i--) {
    const d = new Date(today); d.setDate(d.getDate()-i);
    const ds = fmtDate(d);
    days.push({ d, val: (logs[ds]==='done'||logs[ds]==='redeemed') ? 1 : 0 });
  }
  let run = 0;
  const vals = days.map(({val}) => { run = val ? run+1 : 0; return run; });
  const maxVal = Math.max(...vals, 1);
  const W=320, H=90, pL=20, pR=10, pT=8, pB=15;
  const stepX = (W-pL-pR)/(vals.length-1);
  const pts = vals.map((v,i) => ({ x: pL+i*stepX, y: pT+(H-pT-pB)*(1-v/maxVal) }));
  const line = pts.map((p,i) => `${i===0?'M':'L'}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ');
  lineEl.setAttribute('d', line);
  fillEl.setAttribute('d', line+` L${pts[pts.length-1].x.toFixed(1)},${H-pB} L${pL},${H-pB} Z`);
  if (dotEl) { dotEl.setAttribute('cx',pts[pts.length-1].x.toFixed(1)); dotEl.setAttribute('cy',pts[pts.length-1].y.toFixed(1)); }
  const lc = document.querySelector('.jrn-graph-labels');
  if (lc) {
    const spans = lc.querySelectorAll('.jrn-graph-label');
    [0,6,12,18,24,29].forEach((di,i) => { if(spans[i]) spans[i].textContent = days[di].d.toLocaleDateString('en-IN',{day:'numeric',month:'short'}); });
  }
}
window.renderJourneyGraph = renderJourneyGraph;

// ============================================================
// PROFILE BADGES — REAL DATA
// ============================================================
function renderProfileBadges() {
  const CHAL = [
    {days:1,label:'Beej',icon:'🪙',metal:'Copper',mc:'#b87333'},
    {days:3,label:'Arambha',icon:'🏅',metal:'Bronze',mc:'#cd7f32'},
    {days:7,label:'Tapasvi',icon:'🥈',metal:'Silver',mc:'#c0c0c0'},
    {days:15,label:'Dhira',icon:'🥇',metal:'Gold',mc:'var(--gold)'},
    {days:21,label:'Vira',icon:'💎',metal:'Diamond',mc:'#a5f3fc'},
    {days:30,label:'Ojas',icon:'✨',metal:'Kohinoor',mc:'var(--purple3)'},
    {days:50,label:'Agni',icon:'🔱',metal:'Titanium',mc:'#94a3b8'},
    {days:90,label:'Brahmachari',icon:'👑',metal:'Crown',mc:'var(--gold2)'},
  ];
  const html = CHAL.map(ch => {
    const unlocked = currentStreak >= ch.days;
    const prog = Math.min(100, Math.round((currentStreak/ch.days)*100));
    const cls = unlocked?'unlocked':currentStreak>0?'in-progress':'locked';
    return `<div class="badge-card ${cls}">
      ${unlocked?'<div class="badge-unlock-check">✓</div>':''}
      <div class="badge-icon">${ch.icon}</div>
      <div class="badge-name">${ch.label}</div>
      <div class="badge-day">Day ${ch.days}</div>
      <div class="badge-metal" style="color:${ch.mc}">— ${ch.metal} —</div>
      <div class="badge-prog-bar"><div class="badge-prog-fill" style="width:${unlocked?100:prog}%"></div></div>
      <div class="badge-status">${unlocked?'✅ Unlocked!':currentStreak>0?currentStreak+'/'+ch.days+' days':'🔒 Locked'}</div>
    </div>`;
  }).join('');
  ['profileBadgesGrid','badgesMainGrid'].forEach(id => { const g=document.getElementById(id); if(g) g.innerHTML=html; });
}
window.renderProfileBadges = renderProfileBadges;

// ============================================================
// GROUP COUNTS — REAL MEMBER COUNT
// ============================================================
async function loadGroupCounts() {
  if (!sb || !navigator.onLine) return;
  try {
    const { count } = await sb.from('bct_profiles').select('*', { count: 'exact', head: true });
    const total = count || 0;
    // Main group = all members
    const g1 = document.getElementById('groupCountMain');
    if (g1) g1.textContent = total + '+';
    // 5AM club = members with any club checkin
    const { count: c5am } = await sb.from('club_checkins').select('user_id', { count: 'exact', head: true });
    const g2 = document.getElementById('groupCount5am');
    if (g2) g2.textContent = (c5am || 0) + '+';
    // Others = proportional estimates based on real total
    const g3 = document.getElementById('groupCountMed');
    if (g3) g3.textContent = Math.floor(total * 0.6) + '+';
    const g4 = document.getElementById('groupCountDev');
    if (g4) g4.textContent = Math.floor(total * 0.4) + '+';
  } catch(e) { console.error('loadGroupCounts:', e); }
}
window.loadGroupCounts = loadGroupCounts;







/* ================================================================
   BrahmaMode PATCH v3.1 — FIXED
   app.js ke BILKUL BAAD add karo, index.html ke bhi inline script 
   ke BAAD load hona chahiye.
   
   index.html mein ye line add karo app.js script ke BAAD:
   <script src="brahmamode_patch_v2.js"></script>
   (defer mat lagao — synchronous load karo taaki DOM ready ho)
   ================================================================ */

(function() {
'use strict';

/* ================================================================
   PART A: COMMUNITY GROUPS — Real Data + Per-Group Chat
   ================================================================ */

const BM_GROUPS = [
  { id:'brotherhood', name:'Brotherhood Warriors',   icon:'⚔️',  desc:'Main group',        badge:'LIVE',    bc:'var(--purple2)', bg:'rgba(123,47,255,.15)' },
  { id:'5am',         name:'5AM Club Warriors',       icon:'🌅',  desc:'Rise together',     badge:'EARLY',   bc:'var(--gold)',    bg:'rgba(245,158,11,.12)' },
  { id:'meditation',  name:'Meditation Circle',       icon:'🧘',  desc:'Daily practice',    badge:'ACTIVE',  bc:'var(--green2)', bg:'rgba(16,185,129,.1)'  },
  { id:'knowledge',   name:'Knowledge Seekers',       icon:'📚',  desc:'Shastras & wisdom', badge:'STUDY',   bc:'var(--blue)',   bg:'rgba(59,130,246,.1)'  },
  { id:'physical',    name:'Physical Discipline',     icon:'🏋️', desc:'Fitness & strength',badge:'FITNESS', bc:'var(--purple3)',bg:'rgba(168,85,247,.12)' },
  { id:'premanand',   name:'Premanand Ji Followers',  icon:'🙏',  desc:'Devotion & satsang',badge:'SATSANG', bc:'#f472b6',       bg:'rgba(244,114,182,.1)' },
];

// Override the existing switchCommunityTab — wait until DOM+scripts are fully loaded
function patchCommunityTab() {
  // Grab the ORIGINAL function defined in inline script
  const _orig = window.switchCommunityTab;
  window.switchCommunityTab = function(tab) {
    // Call original to handle CSS class toggling and panel show/hide
    if (typeof _orig === 'function') _orig(tab);
    // Our additions
    if (tab === 'groups') {
      setTimeout(renderRealGroupsList, 50);
    }
  };
}

async function renderRealGroupsList() {
  const listDiv = document.querySelector('#commPanelGroups .comm-groups-list');
  if (!listDiv) return;

  listDiv.innerHTML = '<div style="padding:20px;text-align:center;color:var(--muted);font-style:italic;font-size:.8rem">⏳ Loading groups...</div>';

  // Get member counts + my groups
  let memberCounts = {}, myGroups = new Set();
  const sbRef = window.sb;
  const cu = window.currentUser;

  if (sbRef) {
    try {
      const { data: allM } = await sbRef.from('group_members').select('group_id');
      (allM || []).forEach(r => { memberCounts[r.group_id] = (memberCounts[r.group_id] || 0) + 1; });
      if (cu) {
        const { data: myM } = await sbRef.from('group_members').select('group_id').eq('user_id', cu.id);
        (myM || []).forEach(r => myGroups.add(r.group_id));
      }
    } catch(e) { console.warn('group fetch err', e); }
  }

  listDiv.innerHTML = '';
  BM_GROUPS.forEach(g => {
    const count = memberCounts[g.id] || 0;
    const joined = myGroups.has(g.id);
    const row = document.createElement('div');
    row.className = 'comm-group-row';
    row.style.cursor = 'pointer';
    row.innerHTML = `
      <div class="comm-group-icon" style="background:${g.bg};border:1px solid rgba(255,255,255,.12);">${g.icon}</div>
      <div class="comm-group-info" style="flex:1">
        <div class="comm-group-name">${g.name}</div>
        <div class="comm-group-sub">${g.desc} • <b id="gc2_${g.id}">${count}</b> members</div>
      </div>
      <div style="display:flex;align-items:center;gap:8px;">
        ${joined ? '<span style="font-size:.55rem;color:var(--green);">●</span>' : ''}
        <div class="comm-group-badge" style="color:${g.bc};border-color:${g.bc}44;background:${g.bc}18;">${g.badge}</div>
      </div>`;
    row.onclick = () => showGroupOptions(g, joined);
    listDiv.appendChild(row);
  });
}

window.showGroupOptions = function(group, isJoined) {
  removeEl('bmGModal');
  const modal = mk('div', {
    id: 'bmGModal',
    style: 'position:fixed;inset:0;z-index:9999;display:flex;flex-direction:column;justify-content:flex-end;'
  });
  const joinedBtn = isJoined
    ? `<button onclick="bmOpenGroupChat('${group.id}','${group.name}','${group.icon}')" style="${btnStyle('purple')}margin-bottom:10px;">💬 Open Chat</button>
       <button onclick="bmViewMembers('${group.id}','${group.name}')" style="${btnStyle('ghost')}margin-bottom:10px;">👥 View Members</button>
       <button onclick="bmLeaveGroup('${group.id}')" style="${btnStyle('red')}margin-bottom:10px;">🚪 Leave Group</button>`
    : `<button onclick="bmJoinGroup('${group.id}','${group.name}','${group.icon}')" style="${btnStyle('purple')}margin-bottom:10px;">⚔️ Join Group</button>`;

  modal.innerHTML = `
    <div onclick="removeEl('bmGModal')" style="position:absolute;inset:0;background:rgba(0,0,0,.65);backdrop-filter:blur(4px);"></div>
    <div style="position:relative;background:#111118;border-radius:24px 24px 0 0;padding:24px 20px 32px;border-top:1px solid rgba(255,255,255,.1);">
      <div style="width:36px;height:4px;border-radius:2px;background:rgba(255,255,255,.18);margin:0 auto 18px;"></div>
      <div style="display:flex;align-items:center;gap:14px;margin-bottom:18px;">
        <div style="width:52px;height:52px;border-radius:16px;background:${group.bg};border:1px solid rgba(255,255,255,.12);display:flex;align-items:center;justify-content:center;font-size:1.6rem;">${group.icon}</div>
        <div>
          <div style="font-family:var(--font-d);font-size:1rem;font-weight:700;color:#fff;">${group.name}</div>
          <div id="gmCount" style="font-size:.75rem;color:var(--muted);margin-top:3px;">⏳ Loading...</div>
        </div>
      </div>
      <div id="gmAvatars" style="display:flex;margin-bottom:18px;min-height:36px;"></div>
      ${joinedBtn}
      <button onclick="removeEl('bmGModal')" style="${btnStyle('ghost')}">Cancel</button>
    </div>`;
  document.body.appendChild(modal);
  loadGModalMeta(group.id);
};

async function loadGModalMeta(gid) {
  const sbRef = window.sb; if (!sbRef) return;
  try {
    const { data: members } = await sbRef.from('group_members').select('user_id').eq('group_id', gid);
    const cnt = (members||[]).length;
    const el = document.getElementById('gmCount');
    if (el) el.textContent = `👥 ${cnt} member${cnt!==1?'s':''}`;
    if (members && members.length) {
      const { data: profs } = await sbRef.from('bct_profiles').select('user_id,name').in('user_id', members.slice(0,7).map(m=>m.user_id));
      const av = document.getElementById('gmAvatars');
      if (av && profs) {
        av.innerHTML = profs.map((p,i)=>
          `<div style="width:32px;height:32px;border-radius:50%;background:linear-gradient(135deg,var(--purple),#a855f7);display:flex;align-items:center;justify-content:center;font-weight:900;font-size:.7rem;border:2px solid #111118;margin-left:${i?'-8px':'0'};z-index:${10-i};">${(p.name||'W')[0].toUpperCase()}</div>`
        ).join('') + (cnt>7?`<div style="padding:0 8px;font-size:.68rem;color:var(--muted);display:flex;align-items:center;">+${cnt-7}</div>`:'');
      }
    }
  } catch(e){}
}

window.bmJoinGroup = async function(gid, gname, gicon) {
  const sbRef = window.sb; const cu = window.currentUser;
  if (!cu || !sbRef) { showToast('❌ Not logged in'); return; }
  try {
    await sbRef.from('group_members').upsert({ user_id:cu.id, group_id:gid }, { onConflict:'user_id,group_id' });
    removeEl('bmGModal');
    showToast('✅ Joined '+gname+'!');
    renderRealGroupsList();
    setTimeout(() => bmOpenGroupChat(gid, gname, gicon), 300);
  } catch(e) { showToast('❌ '+e.message); }
};

window.bmLeaveGroup = async function(gid) {
  const sbRef = window.sb; const cu = window.currentUser;
  if (!cu || !sbRef) return;
  try {
    await sbRef.from('group_members').delete().eq('user_id',cu.id).eq('group_id',gid);
    removeEl('bmGModal');
    showToast('🚪 Left group');
    renderRealGroupsList();
  } catch(e) { showToast('❌ '+e.message); }
};

/* ---- Per-Group Chat ---- */
let activeGid = null, gcSub = null, gcLastDate = null;

window.bmOpenGroupChat = function(gid, gname, gicon) {
  removeEl('bmGModal');
  activeGid = gid; gcLastDate = null;

  let scr = document.getElementById('bmGCScr');
  if (!scr) {
    scr = mk('div', {
      id:'bmGCScr',
      style:'position:fixed;inset:0;z-index:9990;background:var(--bg);display:flex;flex-direction:column;'
    });
    scr.innerHTML = `
      <div style="display:flex;align-items:center;gap:12px;padding:max(14px,env(safe-area-inset-top)) 16px 12px;background:rgba(11,11,15,.97);border-bottom:1px solid rgba(255,255,255,.08);flex-shrink:0;">
        <button onclick="bmCloseGC()" style="background:none;border:none;color:#fff;font-size:1.5rem;cursor:pointer;line-height:1;padding:2px 6px 2px 0;">←</button>
        <div id="gcIcon" style="width:38px;height:38px;border-radius:12px;display:flex;align-items:center;justify-content:center;font-size:1.3rem;background:rgba(123,47,255,.2);">⚔️</div>
        <div style="flex:1;min-width:0;">
          <div id="gcTitle" style="font-family:var(--font-d);font-size:.9rem;font-weight:700;color:#fff;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">Group</div>
          <div id="gcMC" style="font-size:.65rem;color:var(--muted);">...</div>
        </div>
        <button onclick="bmViewMembers(activeGid,document.getElementById('gcTitle').textContent)" style="background:rgba(255,255,255,.07);border:1px solid rgba(255,255,255,.1);border-radius:8px;color:#fff;font-size:.68rem;font-family:var(--font-b);font-weight:700;padding:5px 10px;cursor:pointer;white-space:nowrap;">👥 Members</button>
      </div>
      <div id="gcMsgs" style="flex:1;overflow-y:auto;padding:14px 14px 6px;"></div>
      <div style="display:flex;align-items:center;gap:8px;padding:10px 14px;padding-bottom:max(10px,env(safe-area-inset-bottom));background:rgba(11,11,15,.97);border-top:1px solid rgba(255,255,255,.08);flex-shrink:0;">
        <label style="cursor:pointer;font-size:1.25rem;padding:4px 6px;color:rgba(255,255,255,.6);">📷<input id="gcImg" type="file" accept="image/*" style="display:none" onchange="bmSendGCImg(this)"/></label>
        <input id="gcIn" type="text" placeholder="Message..." maxlength="500"
          style="flex:1;background:rgba(255,255,255,.08);border:1px solid rgba(255,255,255,.12);border-radius:22px;color:#fff;font-family:var(--font-b);font-size:.88rem;padding:10px 16px;outline:none;"
          onkeydown="if(event.key==='Enter')bmSendGCMsg()"/>
        <button onclick="bmSendGCMsg()" style="width:38px;height:38px;border-radius:50%;background:linear-gradient(135deg,var(--purple),#a855f7);border:none;color:#fff;font-size:1.1rem;cursor:pointer;flex-shrink:0;display:flex;align-items:center;justify-content:center;">➤</button>
      </div>`;
    document.body.appendChild(scr);
  }
  document.getElementById('gcIcon').textContent = gicon;
  document.getElementById('gcTitle').textContent = gname;
  scr.style.display = 'flex';

  loadGCMsgs(gid);
  subGC(gid);
  // Member count
  const sbRef = window.sb;
  if (sbRef) sbRef.from('group_members').select('*',{count:'exact',head:true}).eq('group_id',gid).then(({count})=>{
    const el=document.getElementById('gcMC'); if(el) el.textContent=(count||0)+' members';
  });
};

window.bmCloseGC = function() {
  const s = document.getElementById('bmGCScr');
  if (s) s.style.display = 'none';
  if (gcSub) { try { window.sb.removeChannel(gcSub); } catch(e){} gcSub = null; }
  activeGid = null;
};

async function loadGCMsgs(gid) {
  const box = document.getElementById('gcMsgs'); if (!box) return;
  const sbRef = window.sb; if (!sbRef) return;
  box.innerHTML = '<div style="text-align:center;color:var(--muted);padding:30px;font-size:.8rem;font-style:italic;">⏳ Loading...</div>';
  gcLastDate = null;
  const { data } = await sbRef.from('group_messages').select('*').eq('group_id',gid).order('created_at',{ascending:true}).limit(100);
  box.innerHTML = '';
  if (!data || !data.length) {
    box.innerHTML = '<div style="text-align:center;color:var(--muted);padding:40px 20px;font-style:italic;font-size:.82rem;">🌟 Koi message nahi yet.<br>Pehla bolo, warrior!</div>';
    return;
  }
  data.forEach(m => addGCBubble(m, box));
  box.scrollTop = box.scrollHeight;
}

function addGCBubble(m, box) {
  const cu = window.currentUser;
  const isMine = cu && m.user_id === cu.id;
  const time = new Date(m.created_at).toLocaleTimeString('en-IN',{hour:'2-digit',minute:'2-digit'});
  const ds = m.created_at.split('T')[0];
  if (ds !== gcLastDate) {
    gcLastDate = ds;
    const div = document.createElement('div');
    div.style.cssText = 'text-align:center;font-size:.62rem;color:var(--muted);margin:10px 0;';
    div.textContent = new Date(ds).toLocaleDateString('en-IN',{day:'numeric',month:'long'});
    box.appendChild(div);
  }
  const wrap = document.createElement('div');
  wrap.setAttribute('data-id', m.id);
  wrap.style.cssText = `display:flex;flex-direction:${isMine?'row-reverse':'row'};align-items:flex-end;gap:8px;margin-bottom:8px;`;
  let content = m.image_url ? `<img src="${m.image_url}" style="max-width:190px;border-radius:10px;display:block;margin-bottom:2px;" onclick="window.open('${m.image_url}','_blank')"/>` : '';
  if (m.message) content += `<div style="font-size:.88rem;line-height:1.4;word-break:break-word;">${m.message}</div>`;
  const bubBg = isMine ? 'linear-gradient(135deg,#6d28d9,#7c3aed)' : 'rgba(255,255,255,.09)';
  const bubR = isMine ? '18px 18px 4px 18px' : '18px 18px 18px 4px';
  wrap.innerHTML = `
    <div style="width:28px;height:28px;border-radius:50%;background:linear-gradient(135deg,var(--purple),#a855f7);display:flex;align-items:center;justify-content:center;font-weight:900;font-size:.65rem;flex-shrink:0;">${(m.user_name||'W')[0].toUpperCase()}</div>
    <div style="max-width:74%;background:${bubBg};border-radius:${bubR};padding:9px 12px;">
      ${!isMine?`<div style="font-size:.62rem;color:var(--purple3);font-weight:700;margin-bottom:3px;">${m.user_name||'Warrior'}</div>`:''}
      ${content}
      <div style="display:flex;align-items:center;justify-content:flex-end;gap:3px;margin-top:3px;">
        <span style="font-size:.58rem;color:rgba(255,255,255,.35);">${time}</span>
        ${isMine?'<span style="font-size:.62rem;color:var(--green);">✓✓</span>':''}
      </div>
    </div>`;
  box.appendChild(wrap);
}

function subGC(gid) {
  const sbRef = window.sb; if (!sbRef) return;
  if (gcSub) { try { sbRef.removeChannel(gcSub); } catch(e){} gcSub = null; }
  gcSub = sbRef.channel('gc-' + gid)
    .on('postgres_changes',{event:'INSERT',schema:'public',table:'group_messages',filter:'group_id=eq.'+gid}, payload => {
      const box = document.getElementById('gcMsgs'); if (!box) return;
      const m = payload.new;
      if (box.querySelector('[data-id="'+m.id+'"]')) return;
      addGCBubble(m, box);
      box.scrollTop = box.scrollHeight;
      // Notification if chat hidden
      const scr = document.getElementById('bmGCScr');
      if (!scr || scr.style.display === 'none') {
        bmAddNotif('group_msg','💬 '+m.user_name, (m.message||'').slice(0,60)||'📷 Photo');
      }
    }).subscribe();
}

window.bmSendGCMsg = async function() {
  const sbRef = window.sb; const cu = window.currentUser;
  if (!sbRef || !activeGid || !cu) return;
  const inp = document.getElementById('gcIn');
  const msg = inp?.value?.trim(); if (!msg) return;
  inp.value = '';
  const name = window.profile?.name || 'Warrior';
  const box = document.getElementById('gcMsgs');
  const tempId = 'tmp-' + Date.now();
  const tempM = { id:tempId, group_id:activeGid, user_id:cu.id, user_name:name, message:msg, image_url:null, created_at:new Date().toISOString() };
  if (box) { addGCBubble(tempM, box); box.scrollTop = box.scrollHeight; }
  const { data:ins } = await sbRef.from('group_messages').insert({ group_id:activeGid, user_id:cu.id, user_name:name, message:msg }).select().single();
  if (ins && box) { const t=box.querySelector('[data-id="'+tempId+'"]'); if(t) t.setAttribute('data-id',ins.id); }
};

window.bmSendGCImg = async function(input) {
  const sbRef = window.sb; const cu = window.currentUser;
  if (!input.files || !input.files[0] || !cu || !activeGid) return;
  const file = input.files[0];
  const ext = file.name.split('.').pop();
  const path = `group/${activeGid}/${cu.id}_${Date.now()}.${ext}`;
  if (typeof showToast==='function') showToast('📤 Uploading...');
  const { error } = await sbRef.storage.from('chat-images').upload(path, file);
  if (error) { if (typeof showToast==='function') showToast('❌ Upload failed'); return; }
  const { data:urlData } = sbRef.storage.from('chat-images').getPublicUrl(path);
  const name = window.profile?.name || 'Warrior';
  await sbRef.from('group_messages').insert({ group_id:activeGid, user_id:cu.id, user_name:name, message:'', image_url:urlData.publicUrl });
  input.value = '';
  if (typeof showToast==='function') showToast('✅ Photo sent!');
};

/* ---- Members Screen ---- */
window.bmViewMembers = async function(gid, gname) {
  removeEl('bmGModal');
  let scr = document.getElementById('bmMemScr');
  if (!scr) {
    scr = mk('div',{id:'bmMemScr',style:'position:fixed;inset:0;z-index:9991;background:var(--bg);overflow-y:auto;'});
    document.body.appendChild(scr);
  }
  scr.style.display='block';
  scr.innerHTML=`
    <div style="position:sticky;top:0;z-index:5;padding:max(14px,env(safe-area-inset-top)) 16px 12px;background:rgba(11,11,15,.97);border-bottom:1px solid rgba(255,255,255,.08);display:flex;align-items:center;gap:12px;">
      <button onclick="document.getElementById('bmMemScr').style.display='none'" style="background:none;border:none;color:#fff;font-size:1.5rem;cursor:pointer;line-height:1;">←</button>
      <div style="font-family:var(--font-d);font-size:.88rem;font-weight:700;color:#fff;">👥 ${gname} — Members</div>
    </div>
    <div id="bmMemList" style="padding:16px;"><div style="text-align:center;color:var(--muted);padding:30px;font-style:italic;">⏳ Loading...</div></div>
    <div style="height:20px;"></div>`;

  const sbRef = window.sb; if (!sbRef) return;
  const { data:members } = await sbRef.from('group_members').select('user_id').eq('group_id',gid);
  if (!members || !members.length) {
    document.getElementById('bmMemList').innerHTML='<div style="text-align:center;color:var(--muted);padding:30px;font-style:italic;">No members yet</div>';
    return;
  }
  const [{ data:profiles },{ data:allLogs }] = await Promise.all([
    sbRef.from('bct_profiles').select('user_id,name,startDate').in('user_id',members.map(m=>m.user_id)),
    sbRef.from('bct_logs').select('user_id,date,status')
  ]);
  const lbu = {};
  (allLogs||[]).forEach(r=>{ if(!lbu[r.user_id]) lbu[r.user_id]={}; lbu[r.user_id][r.date]=r.status; });
  const BDGS=[{d:90,i:'👑'},{d:30,i:'✨'},{d:21,i:'💎'},{d:15,i:'🥇'},{d:7,i:'🥈'},{d:3,i:'🏅'},{d:1,i:'🪙'}];
  const cu = window.currentUser;
  const warriors = (profiles||[]).map(p=>{
    const s = typeof computeUserStats==='function' ? computeUserStats(p,lbu[p.user_id]||{}) : {currentStreak:0,totalPoints:0,bestStreak:0};
    return {...p,...s};
  }).sort((a,b)=>b.currentStreak-a.currentStreak);

  document.getElementById('bmMemList').innerHTML = warriors.map(w=>{
    const isMe = cu && w.user_id===cu.id;
    const bdg = BDGS.find(b=>w.currentStreak>=b.d);
    return `<div style="display:flex;align-items:center;gap:12px;padding:12px;background:${isMe?'rgba(123,47,255,.1)':'rgba(255,255,255,.03)'};border:1px solid ${isMe?'rgba(168,85,247,.25)':'rgba(255,255,255,.06)'};border-radius:14px;margin-bottom:8px;">
      <div style="width:42px;height:42px;border-radius:50%;background:linear-gradient(135deg,var(--purple),#a855f7);display:flex;align-items:center;justify-content:center;font-weight:900;font-size:.9rem;flex-shrink:0;">${(w.name||'W')[0].toUpperCase()}</div>
      <div style="flex:1;min-width:0;">
        <div style="font-family:var(--font-d);font-size:.82rem;font-weight:700;color:${isMe?'var(--gold)':'#fff'};white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${w.name}${isMe?' (You)':''}</div>
        <div style="font-size:.68rem;color:var(--muted);margin-top:2px;">🔥 ${w.currentStreak} days ${bdg?bdg.i:''}</div>
      </div>
      <div style="text-align:right;flex-shrink:0;">
        <div style="font-size:.75rem;color:var(--gold);font-weight:700;">⚡${w.totalPoints}</div>
        <div style="font-size:.6rem;color:${w.currentStreak>0?'var(--green)':'var(--muted)'};">${w.currentStreak>0?'● Active':'○ Resting'}</div>
      </div>
      ${!isMe?`<button onclick="bmDMFrom('${w.user_id}','${w.name}')" style="background:rgba(123,47,255,.2);border:1px solid rgba(168,85,247,.3);border-radius:8px;color:var(--purple3);font-size:.65rem;font-family:var(--font-b);font-weight:700;padding:5px 8px;cursor:pointer;flex-shrink:0;">💬 DM</button>`:''}
    </div>`;
  }).join('');
};

window.bmDMFrom = function(uid, uname) {
  document.getElementById('bmMemScr').style.display='none';
  if (typeof showScreen==='function') showScreen('chatScreen');
  setTimeout(()=>{ if(typeof openDMWith==='function') openDMWith(uid,uname); },300);
};

/* ================================================================
   PART B: NOTIFICATION BELL
   ================================================================ */
let bmNotifs = [];
let bmUnread = 0;

function injectNotifBell() {
  if (document.getElementById('bmBell')) return;
  if (window._guestMode) { setTimeout(injectNotifBell, 1000); return; } // No notif bell in guest mode
  const bell = document.createElement('button');
  bell.id = 'bmBell';
  bell.onclick = bmOpenNotifs;
  bell.style.cssText = 'position:fixed;top:max(14px,env(safe-area-inset-top));right:14px;z-index:9000;width:40px;height:40px;border-radius:50%;background:rgba(17,17,24,.9);border:1px solid rgba(255,255,255,.12);color:#fff;font-size:1rem;cursor:pointer;backdrop-filter:blur(10px);box-shadow:0 2px 16px rgba(0,0,0,.5);display:flex;align-items:center;justify-content:center;';
  bell.innerHTML = '🔔<span id="bmBellDot" style="display:none;position:absolute;top:4px;right:4px;min-width:10px;height:10px;background:#ef4444;border-radius:5px;border:2px solid #111118;font-size:.5rem;color:#fff;display:none;align-items:center;justify-content:center;padding:0 2px;"></span>';
  document.body.appendChild(bell);
}

window.bmAddNotif = function(type, title, body) {
  bmNotifs.unshift({ type, title, body, read:false, time:new Date() });
  bmUnread++;
  updBellDot();
  // Save to DB
  const sbRef=window.sb; const cu=window.currentUser;
  if (sbRef&&navigator.onLine&&cu) {
    sbRef.from('notifications').insert({user_id:cu.id,type,title,body,is_read:false}).then(()=>{});
  }
};

function updBellDot() {
  const dot = document.getElementById('bmBellDot');
  if (!dot) return;
  if (bmUnread > 0) {
    dot.style.display = 'flex';
    dot.textContent = bmUnread > 9 ? '9+' : String(bmUnread);
  } else {
    dot.style.display = 'none';
  }
}

window.bmOpenNotifs = async function() {
  bmUnread = 0; updBellDot();
  bmNotifs.forEach(n=>n.read=true);
  // Load from DB
  const sbRef=window.sb; const cu=window.currentUser;
  if (sbRef&&navigator.onLine&&cu) {
    try {
      await sbRef.from('notifications').update({is_read:true}).eq('user_id',cu.id).eq('is_read',false);
      const {data} = await sbRef.from('notifications').select('*').eq('user_id',cu.id).order('created_at',{ascending:false}).limit(40);
      if (data) bmNotifs = data.map(n=>({type:n.type,title:n.title,body:n.body,read:true,time:new Date(n.created_at)}));
    } catch(e){}
  }

  removeEl('bmNPanel');
  const panel = mk('div',{id:'bmNPanel',style:'position:fixed;inset:0;z-index:9995;display:flex;flex-direction:column;justify-content:flex-end;'});
  const ICONS = {group_msg:'💬',daily_winner:'🏆',weekly_winner:'⭐',monthly_top:'🌟','5am_winner':'🌅',streak:'🔥',default:'🔔'};
  
  const items = bmNotifs.length
    ? bmNotifs.slice(0,30).map(n=>`
        <div style="display:flex;align-items:flex-start;gap:12px;padding:14px 16px;border-bottom:1px solid rgba(255,255,255,.05);">
          <div style="width:36px;height:36px;border-radius:10px;background:rgba(123,47,255,.15);border:1px solid rgba(168,85,247,.2);display:flex;align-items:center;justify-content:center;font-size:1rem;flex-shrink:0;">${ICONS[n.type]||ICONS.default}</div>
          <div style="flex:1;min-width:0;">
            <div style="font-size:.8rem;font-weight:700;color:#fff;line-height:1.3;">${n.title}</div>
            <div style="font-size:.72rem;color:rgba(255,255,255,.55);margin-top:2px;line-height:1.3;word-break:break-word;">${n.body}</div>
            <div style="font-size:.62rem;color:var(--muted);margin-top:4px;">${getAgo(n.time)}</div>
          </div>
        </div>`).join('')
    : '<div style="text-align:center;padding:40px 20px;color:var(--muted);font-style:italic;font-size:.82rem;">🔔No Notifications Yet<br><span style="font-size:.72rem;">Community updates will appear here</span></div>';

  panel.innerHTML = `
    <div onclick="removeEl('bmNPanel')" style="position:absolute;inset:0;background:rgba(0,0,0,.6);backdrop-filter:blur(4px);"></div>
    <div style="position:relative;background:#111118;border-radius:24px 24px 0 0;max-height:78vh;display:flex;flex-direction:column;border-top:1px solid rgba(255,255,255,.1);">
      <div style="padding:20px 20px 0;display:flex;align-items:center;justify-content:space-between;flex-shrink:0;">
        <div style="font-family:var(--font-d);font-size:1rem;font-weight:700;color:#fff;letter-spacing:.5px;">🔔 Notifications</div>
        <button onclick="removeEl('bmNPanel')" style="background:rgba(255,255,255,.07);border:1px solid rgba(255,255,255,.1);border-radius:8px;color:#fff;font-size:.72rem;padding:5px 12px;cursor:pointer;font-family:var(--font-b);">Close ✕</button>
      </div>
      <div style="flex:1;overflow-y:auto;margin-top:12px;">${items}</div>
    </div>`;
  document.body.appendChild(panel);
};

function getAgo(date) {
  const d = Math.floor((Date.now()-new Date(date).getTime())/60000);
  if (d<1) return 'Abhi abhi';
  if (d<60) return d+'m pehle';
  const h=Math.floor(d/60); if(h<24) return h+'h pehle';
  return Math.floor(h/24)+'d pehle';
}

/* ================================================================
   PART C: 5AM Club Tab — Leaderboard Table
   ================================================================ */

function inject5amLbTable() {
  // Find the club tab wrapper
  const clubTab = document.getElementById('tab-club');
  if (!clubTab || document.getElementById('c5amlb')) return;

  const wrapper = clubTab.querySelector('[style*="max-width"]') || clubTab.firstElementChild;
  if (!wrapper) return;

  const sec = document.createElement('div');
  sec.id = 'c5amlb';
  sec.innerHTML = `
    <div style="margin:0 16px 80px;background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.08);border-radius:var(--radius);overflow:hidden;">
      <div style="padding:14px 16px 10px;display:flex;align-items:center;justify-content:space-between;">
        <div style="font-family:var(--font-d);font-size:.78rem;font-weight:700;color:#fff;letter-spacing:1px;text-transform:uppercase;">🌅 5AM Warriors</div>
        
      </div>
      <div style="display:flex;margin:0 16px 10px;border-radius:8px;overflow:hidden;border:1px solid rgba(255,255,255,.08);">
        <button id="bm5t0" class="bm5tab active" onclick="bm5amSwitch('today')" style="flex:1;padding:7px 2px;background:rgba(245,158,11,.18);border:none;color:var(--gold);font-family:var(--font-b);font-weight:700;font-size:.68rem;cursor:pointer;border-right:1px solid rgba(255,255,255,.08);">Today</button>
        <button id="bm5t1" class="bm5tab" onclick="bm5amSwitch('streak')" style="flex:1;padding:7px 2px;background:rgba(255,255,255,.04);border:none;color:var(--muted);font-family:var(--font-b);font-weight:700;font-size:.68rem;cursor:pointer;border-right:1px solid rgba(255,255,255,.08);">Streak</button>
        <button id="bm5t2" class="bm5tab" onclick="bm5amSwitch('pts')" style="flex:1;padding:7px 2px;background:rgba(255,255,255,.04);border:none;color:var(--muted);font-family:var(--font-b);font-weight:700;font-size:.68rem;cursor:pointer;">Points</button>
      </div>
      <div id="bm5body" style="padding:0 16px 14px;">
        <div style="text-align:center;color:var(--muted);padding:18px;font-size:.78rem;">⏳ Loading...</div>
      </div>
    </div>`;
  wrapper.appendChild(sec);
  setTimeout(()=>window.bm5amLoad(), 300);
}

let bm5tab = 'today';

window.bm5amSwitch = function(t) {
  bm5tab = t;
  ['bm5t0','bm5t1','bm5t2'].forEach((id,i)=>{
    const b=document.getElementById(id); if(!b) return;
    const active=['today','streak','pts'][i]===t;
    b.style.background = active?'rgba(245,158,11,.18)':'rgba(255,255,255,.04)';
    b.style.color = active?'var(--gold)':'var(--muted)';
  });
  bm5amLoad();
};

window.bm5amLoad = async function() {
  const body = document.getElementById('bm5body'); if (!body) return;
  const sbRef=window.sb;
  if (!sbRef) { setTimeout(()=>window.bm5amLoad(), 800); return; }
  body.innerHTML='<div style="text-align:center;color:var(--muted);padding:16px;font-size:.78rem;">⏳ Loading...</div>';
  try {
    const today=getTodayStr();
    const [{data:profs},{data:chks}]=await Promise.all([
      sbRef.from('bct_profiles').select('user_id,name'),
      sbRef.from('club_checkins').select('user_id,checkin_date,checkin_time,points')
    ]);
    const nm={}; (profs||[]).forEach(p=>{nm[p.user_id]=p.name;});
    const um={};
    (chks||[]).forEach(c=>{
      if(!um[c.user_id]) um[c.user_id]={name:nm[c.user_id]||'Warrior',uid:c.user_id,pts:0,ttime:null,tpts:0,dates:[]};
      um[c.user_id].pts+=(c.points||0);
      um[c.user_id].dates.push(c.checkin_date);
      if(c.checkin_date===today){um[c.user_id].ttime=c.checkin_time;um[c.user_id].tpts=c.points||0;}
    });
    // Compute streaks
    const ws=Object.values(um).map(u=>{
      const sd=[...new Set(u.dates)].sort((a,b)=>b.localeCompare(a));
      let st=0,ch=today;
      for(let i=0;i<365;i++){if(sd.includes(ch)){st++;ch=offsetDate(ch,-1);}else break;}
      return {...u,streak:st};
    });
    let sorted;
    if(bm5tab==='today'){
      sorted=ws.filter(w=>w.ttime).sort((a,b)=>a.ttime.localeCompare(b.ttime));
      if(!sorted.length){body.innerHTML='<div style="text-align:center;color:var(--muted);padding:20px;font-style:italic;font-size:.78rem;">👀 Aaj abhi koi nahi aaya<br><span style="font-size:.68rem;">Window opens at 5AM</span></div>';return;}
    } else if(bm5tab==='streak'){
      sorted=ws.sort((a,b)=>b.streak-a.streak||b.pts-a.pts);
    } else {
      sorted=ws.sort((a,b)=>b.pts-a.pts||b.streak-a.streak);
    }
    const RE=['🥇','🥈','🥉'];
    const cu=window.currentUser;
    let html='';
    sorted.slice(0,20).forEach((w,i)=>{
      const isMe=cu&&w.uid===cu.id;
      const rank=RE[i]||(i+1);
      const tStr=w.ttime?new Date('1970-01-01T'+w.ttime).toLocaleTimeString('en-IN',{hour:'2-digit',minute:'2-digit'}):'—';
      let mv,ms;
      if(bm5tab==='today'){mv=`<span style="color:var(--green2);font-weight:700;font-size:.82rem;">${tStr}</span>`;ms=`+${w.tpts}pts`;}
      else if(bm5tab==='streak'){mv=`<span style="color:var(--gold);font-weight:700;">${w.streak}d</span>`;ms=tStr!=='—'?'🌅 '+tStr:'';}
      else{mv=`<span style="color:var(--purple3);font-weight:700;">${w.pts}</span>`;ms='🔥'+w.streak+'d';}
      html+=`<div style="display:flex;align-items:center;gap:10px;padding:8px 0;border-bottom:1px solid rgba(255,255,255,.04);${isMe?'background:rgba(123,47,255,.08);border-radius:8px;padding:8px 6px;margin:2px 0;':''}">
        <div style="width:24px;text-align:center;font-size:.8rem;font-weight:700;">${rank}</div>
        <div style="width:30px;height:30px;border-radius:50%;background:linear-gradient(135deg,var(--purple),#a855f7);display:flex;align-items:center;justify-content:center;font-weight:900;font-size:.7rem;flex-shrink:0;">${(w.name||'W')[0].toUpperCase()}</div>
        <div style="flex:1;min-width:0;">
          <div style="font-size:.78rem;font-weight:700;color:${isMe?'var(--gold)':'#fff'};white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${w.name}${isMe?' (You)':''}</div>
          <div style="font-size:.62rem;color:var(--muted);">${ms}</div>
        </div>
        <div style="text-align:right;flex-shrink:0;">${mv}</div>
      </div>`;
    });
    if(!sorted.length) html='<div style="text-align:center;color:var(--muted);padding:16px;font-size:.78rem;">No data yet</div>';
    body.innerHTML=html;
  } catch(e){
    console.error('bm5amLoad',e);
    body.innerHTML='<div style="color:#ef4444;padding:14px;font-size:.78rem;">❌ Error: '+e.message+'</div>';
  }
};

/* ================================================================
   UTILS
   ================================================================ */
function mk(tag, attrs) {
  const el = document.createElement(tag);
  if (attrs) Object.entries(attrs).forEach(([k,v])=>el.setAttribute(k,v));
  return el;
}
window.removeEl = function(id) { const e=document.getElementById(id); if(e) e.remove(); };
function btnStyle(type) {
  const base='width:100%;padding:13px;border-radius:13px;font-family:var(--font-b);font-size:.86rem;font-weight:700;cursor:pointer;';
  if(type==='purple') return base+'background:linear-gradient(135deg,var(--purple),#a855f7);border:none;color:#fff;';
  if(type==='ghost') return base+'background:rgba(255,255,255,.06);border:1px solid rgba(255,255,255,.1);color:#fff;';
  if(type==='red') return base+'background:rgba(239,68,68,.08);border:1px solid rgba(239,68,68,.2);color:#ef4444;';
  return base;
}

/* ================================================================
   INIT — wait for app.js to finish loading
   ================================================================ */
function bmInit() {
  patchCommunityTab();
  inject5amLbTable();

  // Patch bnav to trigger 5am lb load
  const _ob = window.bnav;
  if (typeof _ob==='function') {
    window.bnav = function(tab) {
      _ob(tab);
      if(tab==='club') setTimeout(bm5amLoad, 500);
    };
  }

  // Load initial unread count from DB
  const sbRef=window.sb; const cu=window.currentUser;
  if (sbRef&&cu&&navigator.onLine) {
    sbRef.from('notifications').select('id',{count:'exact',head:true}).eq('user_id',cu.id).eq('is_read',false).then(({count})=>{
      bmUnread=count||0; updBellDot();
    });
    // Subscribe real-time notifs
    sbRef.channel('notif-'+cu.id)
      .on('postgres_changes',{event:'INSERT',schema:'public',table:'notifications',filter:'user_id=eq.'+cu.id}, payload=>{
        const n=payload.new;
        bmNotifs.unshift({type:n.type,title:n.title,body:n.body,read:false,time:new Date(n.created_at)});
        bmUnread++; updBellDot();
      }).subscribe();

    // Daily winner check
    const ck='bm_win_'+getTodayStr();
    if (!localStorage.getItem(ck)) {
      setTimeout(async()=>{
        try {
          const today=getTodayStr();
          const {data:c5}=await sbRef.from('club_checkins').select('user_id,checkin_time,points').eq('checkin_date',today).order('checkin_time',{ascending:true}).limit(1);
          if(c5&&c5.length&&c5[0].user_id!==cu.id){
            const {data:p}=await sbRef.from('bct_profiles').select('name').eq('user_id',c5[0].user_id).maybeSingle();
            if(p) bmAddNotif('5am_winner','🌅 5AM Winner Today!', (p.name||'Warrior')+' woke up at '+c5[0].checkin_time+' — '+c5[0].points+' pts');
          }
          localStorage.setItem(ck,'1');
        } catch(e){}
      }, 3000);
    }
  }

  console.log('✅ BrahmaMode Patch v3.1 ready');
}

// Run after full page load (scripts + DOM)
if (document.readyState === 'complete') {
  setTimeout(bmInit, 500);
} else {
  window.addEventListener('load', () => setTimeout(bmInit, 500));
}

})(); // end IIFE
