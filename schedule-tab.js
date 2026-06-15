// ============================================================
//  BrahmaMode — Schedule Tab v4
//  • Daily Habits section (fixed, tick only, +5 pts, no time count)
//  • Task table: serial | work | from→to | total time | pts | tick
//  • Calendar: green box mein total task hours, yellow=partial, red=missed
//  • ALL WORK DONE = all habits + all tasks done → +100 bonus
//  • Points: +5/habit, +10/task, +100 bonus
//  • Stats row: streak, today pts, task time, remaining
//  • Points rule card
//  • Leaderboard: today/streak/points tabs
//  • Top-notch startup-level dark purple UI
// ============================================================
(function () {
  'use strict';

  const TABLE    = 'daily_schedules';
  const PT_TABLE = 'schedule_points';

  function getSB() { return window.sb || window.supabase || null; }

  const pad = n => String(n).padStart(2,'0');
  const fmt = d => `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`;
  const now = () => fmt(new Date());
  const esc = s => (s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');

  // ── User-editable Habits (3 defaults, user can add/delete) ─
  function defaultHabits() {
    return [
      { id:'h_'+Date.now()+'1', name:'Wake Up',      timeFrom:'', timeTo:'', done:false },
      { id:'h_'+Date.now()+'2', name:'Meditation',   timeFrom:'', timeTo:'', done:false },
      { id:'h_'+Date.now()+'3', name:'Book Reading', timeFrom:'', timeTo:'', done:false },
    ];
  }

  function pMin(t) {
    if (!t) return null;
    const [h,m] = t.split(':').map(Number);
    return (isNaN(h)||isNaN(m)) ? null : h*60+m;
  }
  function mStr(m) {
    if (!m||m<=0) return '—';
    const h=Math.floor(m/60), mn=m%60;
    return h&&mn ? `${h}h ${mn}m` : h ? `${h}h` : `${mn}m`;
  }
  function calcTaskTime(tasks) {
    return tasks.reduce((s,t) => {
      if (!t.timeFrom||!t.timeTo) return s;
      const a=pMin(t.timeFrom), b=pMin(t.timeTo);
      return (a!==null&&b!==null&&b>a) ? s+b-a : s;
    }, 0);
  }
  function defaultTasks() {
    return Array.from({length:3},(_,i)=>({id:i+1,serial:i+1,name:'',timeFrom:'',timeTo:'',done:false}));
  }

  function getUID() {
    if (window.currentUser&&window.currentUser.id) return window.currentUser.id;
    try {
      const sb=getSB();
      if (sb) { const s=sb.auth.session?sb.auth.session():null; if(s?.user?.id) return s.user.id; }
    } catch(_) {}
    let u=localStorage.getItem('bm_sched_uid');
    if (!u) { u='u_'+Math.random().toString(36).slice(2,10); localStorage.setItem('bm_sched_uid',u); }
    return u;
  }

  // ── Supabase ─────────────────────────────────────────────
  const LS_KEY = d => `bms_day_${getUID()}_${d}`;

  function lsSave(date, tasks, habits, extra={}) {
    try { localStorage.setItem(LS_KEY(date), JSON.stringify({tasks, habits, ...extra, _ts:Date.now()})); } catch(_) {}
  }

  function lsLoad(date) {
    try { const r=localStorage.getItem(LS_KEY(date)); return r?JSON.parse(r):null; } catch(_) { return null; }
  }

  async function loadDay(date) {
    // Try Supabase first
    try {
      const {data,error}=await getSB().from(TABLE).select('*').eq('user_id',getUID()).eq('date',date).single();
      if (!error&&data) {
        const result={
          tasks:(data.tasks&&data.tasks.length)?data.tasks:defaultTasks(),
          habits:(data.habits&&data.habits.length)?data.habits:defaultHabits(),
          day_completed:data.day_completed||false,
          completed_at:data.completed_at||null,
        };
        lsSave(date,result.tasks,result.habits,{day_completed:result.day_completed,completed_at:result.completed_at});
        return result;
      }
    } catch(_) {}
    // Fallback: localStorage
    const cached=lsLoad(date);
    if (cached&&(cached.tasks?.length||cached.habits?.length)) {
      return {
        tasks:cached.tasks||defaultTasks(),
        habits:cached.habits||defaultHabits(),
        day_completed:cached.day_completed||false,
        completed_at:cached.completed_at||null,
      };
    }
    return {tasks:defaultTasks(),habits:defaultHabits(),day_completed:false,completed_at:null};
  }

  async function saveDay(date,tasks,habits,extra={}) {
    lsSave(date,tasks,habits,extra); // instant local save
    try {
      await getSB().from(TABLE).upsert(
        {user_id:getUID(),date,tasks,habits,updated_at:new Date().toISOString(),...extra},
        {onConflict:'user_id,date'}
      );
    } catch(_) {}
  }

  async function loadMonth(year,month) {
    const from=`${year}-${pad(month+1)}-01`;
    const last=new Date(year,month+1,0).getDate();
    const to=`${year}-${pad(month+1)}-${pad(last)}`;
    try {
      const [schedRes,ptsRes]=await Promise.all([
        getSB().from(TABLE).select('*').eq('user_id',getUID()).gte('date',from).lte('date',to),
        getSB().from(PT_TABLE).select('date,points').eq('user_id',getUID()).gte('date',from).lte('date',to)
      ]);
      const map={};
      if (schedRes.data) schedRes.data.forEach(r=>{
        const t=r.tasks||[], h=r.habits||[];
        const named=t.filter(x=>x.name&&x.name.trim());
        const mins=calcTaskTime(t);
        map[r.date]={
          tasks:t, habits:h,
          allDone: r.day_completed||false,
          anyDone: t.some(x=>x.done)||h.some(x=>x.done),
          namedCount:named.length,
          totalMins:mins, points:0,
        };
      });
      if (ptsRes.data) ptsRes.data.forEach(r=>{
        if (!map[r.date]) map[r.date]={tasks:[],habits:[],allDone:false,anyDone:false,namedCount:0,totalMins:0,points:0};
        map[r.date].points=(map[r.date].points||0)+(r.points||0);
      });
      // localStorage fallback
      try {
        const ls=JSON.parse(localStorage.getItem('bms_done_days')||'{}');
        Object.keys(ls).forEach(ds=>{
          if (ds>=from&&ds<=to) {
            if (!map[ds]) map[ds]={tasks:[],habits:[],allDone:false,anyDone:true,namedCount:1,totalMins:0,points:0};
            map[ds].allDone=true;
            if (!map[ds].points) map[ds].points=ls[ds].pts||0;
          }
        });
      } catch(_) {}
      return map;
    } catch(_) { return {}; }
  }

  async function loadTotalPoints() {
    try {
      const {data}=await getSB().from(PT_TABLE).select('points').eq('user_id',getUID());
      if (!data||!data.length) return 0;
      return data.reduce((s,r)=>s+(r.points||0),0);
    } catch(_) { return parseInt(localStorage.getItem('bms_pts')||'0'); }
  }

  async function addPoints(date,points,reason) {
    try {
      await getSB().from(PT_TABLE).upsert(
        {user_id:getUID(),date,points,reason,created_at:new Date().toISOString()},
        {onConflict:'user_id,date'}
      );
    } catch(_) {
      const cur=parseInt(localStorage.getItem('bms_pts')||'0');
      localStorage.setItem('bms_pts',String(cur+points));
    }
  }

  async function calcStreak() {
    try {
      const {data}=await getSB().from(TABLE).select('date,day_completed').eq('user_id',getUID()).eq('day_completed',true).order('date',{ascending:false}).limit(365);
      if (!data||!data.length) return 0;
      let streak=0, check=new Date();
      const doneSet=new Set(data.map(r=>r.date));
      while (true) {
        const ds=fmt(check);
        if (doneSet.has(ds)) { streak++; }
        else if (ds!==now()) { break; }
        check.setDate(check.getDate()-1);
        if (streak>365) break;
      }
      return streak;
    } catch(_) { return 0; }
  }

  async function autoRedCheck() {
    const yesterday=fmt(new Date(Date.now()-86400000));
    try {
      const {data}=await getSB().from(TABLE).select('day_completed,tasks').eq('user_id',getUID()).eq('date',yesterday).single();
      if (data&&!data.day_completed&&data.tasks&&data.tasks.some(t=>t.name)) {
        await getSB().from(TABLE).upsert(
          {user_id:getUID(),date:yesterday,tasks:data.tasks,day_completed:false,auto_failed:true,updated_at:new Date().toISOString()},
          {onConflict:'user_id,date'}
        );
      }
    } catch(_) {}
  }

  // ── Leaderboard ──────────────────────────────────────────
  async function loadLeaderboard() {
    try {
      const todayStr=now();
      const [ptsRes,streakRes,todayRes,profRes]=await Promise.all([
        getSB().from(PT_TABLE).select('user_id,points'),
        getSB().from(TABLE).select('user_id,date,day_completed').eq('day_completed',true).order('date',{ascending:false}),
        getSB().from(TABLE).select('user_id,day_completed,completed_at').eq('date',todayStr).eq('day_completed',true),
        getSB().from('bct_profiles').select('user_id,name'),
      ]);
      const nameMap={};
      (profRes.data||[]).forEach(r=>{ if(r.name) nameMap[r.user_id]=r.name; });
      const ptMap={};
      (ptsRes.data||[]).forEach(r=>{ ptMap[r.user_id]=(ptMap[r.user_id]||0)+(r.points||0); });
      const streakMap={}, byUser={};
      (streakRes.data||[]).forEach(r=>{ if(!byUser[r.user_id])byUser[r.user_id]=[]; byUser[r.user_id].push(r.date); });
      Object.keys(byUser).forEach(uid=>{
        const dates=[...new Set(byUser[uid])].sort((a,b)=>b.localeCompare(a));
        let st=0, check=todayStr;
        for (let i=0;i<365;i++) {
          if (dates.includes(check)) { st++; check=fmt(new Date(new Date(check+'T00:00:00').getTime()-86400000)); }
          else break;
        }
        streakMap[uid]=st;
      });
      const todayMap={};
      (todayRes.data||[]).forEach(r=>{ todayMap[r.user_id]=r.completed_at||true; });
      const allUIDs=[...new Set([...Object.keys(ptMap),...Object.keys(streakMap)])];
      return allUIDs.map(uid=>({
        uid, name:nameMap[uid]||null, pts:ptMap[uid]||0, streak:streakMap[uid]||0, todayDone:!!todayMap[uid], completedAt:todayMap[uid]||null
      }));
    } catch(_) { return []; }
  }

  // ── State ────────────────────────────────────────────────
  const S={
    date:now(), tasks:[], habits:[],
    dayCompleted:false, completedAt:null,
    calYear:new Date().getFullYear(), calMonth:new Date().getMonth(),
    monthData:{}, totalPoints:0, streak:0, _timer:null,
  };

  function qSave() {
    // localStorage turant save — refresh pe data dikhe
    lsSave(S.date, S.tasks, S.habits, {day_completed: S.dayCompleted, completed_at: S.completedAt});
    clearTimeout(S._timer);
    S._timer=setTimeout(async()=>{
      await saveDay(S.date,S.tasks,S.habits,{day_completed:S.dayCompleted,completed_at:S.completedAt});
      S.monthData=await loadMonth(S.calYear,S.calMonth);
      renderCal(); renderPending();
    },700);
  }

  // ── NAV ──────────────────────────────────────────────────
  function injectNav() {
    if (document.getElementById('bms-nav-tab')) return;
    const nav=document.querySelector('.bottom-nav,.tab-bar,.nav-bar,nav[class*="bottom"],[class*="bottom-nav"],[class*="tab-bar"]')||guessNav();
    if (!nav) return;
    const btn=document.createElement('button');
    btn.id='bms-nav-tab'; btn.className='bms-nav-btn';
    btn.innerHTML=`<svg width="28" height="28" viewBox="0 0 48 48" xmlns="http://www.w3.org/2000/svg">
  <!-- calendar body -->
  <rect x="4" y="8" width="40" height="36" rx="4" fill="#e8eaf6"/>
  <!-- red top -->
  <rect x="4" y="8" width="40" height="14" rx="4" fill="#f44336"/>
  <rect x="4" y="16" width="40" height="6" fill="#f44336"/>
  <!-- rings -->
  <rect x="14" y="4" width="4" height="10" rx="2" fill="#bdbdbd"/>
  <rect x="30" y="4" width="4" height="10" rx="2" fill="#bdbdbd"/>
  <!-- grid dots -->
  <rect x="10" y="26" width="5" height="5" rx="1.5" fill="#3949ab"/>
  <rect x="19" y="26" width="5" height="5" rx="1.5" fill="#3949ab"/>
  <rect x="28" y="26" width="5" height="5" rx="1.5" fill="#3949ab"/>
  <rect x="10" y="35" width="5" height="5" rx="1.5" fill="#3949ab"/>
  <rect x="19" y="35" width="5" height="5" rx="1.5" fill="#3949ab"/>
  <!-- clock circle -->
  <circle cx="35" cy="37" r="10" fill="#29b6f6" stroke="#fff" stroke-width="1.5"/>
  <circle cx="35" cy="37" r="2" fill="#f9a825"/>
  <line x1="35" y1="37" x2="35" y2="30" stroke="#1a237e" stroke-width="2" stroke-linecap="round"/>
  <line x1="35" y1="37" x2="40" y2="37" stroke="#1a237e" stroke-width="2" stroke-linecap="round"/>
</svg><span>Schedule</span>`;
    btn.onclick=activateSchedule;
    // Index 2 pe insert karo (Ranks ke pehle: Home, 5AM, Schedule, Ranks, Community, Profile)
    const navChildren=nav.children;
    if (navChildren.length>=2) nav.insertBefore(btn, navChildren[2]);
    else nav.appendChild(btn);
    nav.addEventListener('click',e=>{ if(e.target.closest('#bms-nav-tab'))return; deactivateSchedule(); });
  }
  function guessNav() {
    const all=[...document.querySelectorAll('nav,[class*="nav"],[class*="tab"]')];
    return all.find(el=>el.children.length>=3&&el.children.length<=7)||null;
  }
  function activateSchedule() {
    document.querySelectorAll('[class*="page"],[id$="-page"],[id$="-section"],main>section,main>div')
      .forEach(el=>{ if(el.id==='bms-page')return; el.dataset.bmsPrev=el.style.display; el.style.display='none'; });
    document.querySelectorAll('[class*="nav-btn"],[class*="tab-btn"],[class*="nav-item"],[class*="nav-link"]').forEach(b=>b.classList.remove('active'));
    document.getElementById('bms-nav-tab')?.classList.add('active');
    const page=document.getElementById('bms-page');
    if (page) { page.style.display=''; page.scrollTo({top:0,behavior:'smooth'}); }
    document._bmsActive=true;
  }
  function deactivateSchedule() {
    if (!document._bmsActive) return;
    const page=document.getElementById('bms-page');
    if (page) page.style.display='none';
    document.querySelectorAll('[data-bms-prev]').forEach(el=>{ el.style.display=el.dataset.bmsPrev||''; delete el.dataset.bmsPrev; });
    document._bmsActive=false;
  }

  // ── PAGE SHELL ───────────────────────────────────────────
  function buildPage() {
    if (document.getElementById('bms-page')) return;
    const page=document.createElement('div');
    page.id='bms-page'; page.style.display='none';
    page.innerHTML=`
    <style>
      #bms-page{position:fixed;inset:0;overflow-y:auto;background:#0a0a14;z-index:100;-webkit-overflow-scrolling:touch;}
      .bms-inner{max-width:640px;margin:0 auto;padding:0 14px 20px;}

      /* Nav */
      .bms-nav-btn{display:flex;flex-direction:column;align-items:center;gap:2px;background:none;border:none;color:rgba(255,255,255,0.45);font-size:0.6rem;font-weight:600;letter-spacing:.04em;cursor:pointer;padding:6px 8px;transition:color .2s;flex:1;}
      .bms-nav-btn svg{opacity:.55;transition:opacity .2s;stroke:currentColor;}
      .bms-nav-btn:hover,.bms-nav-btn.active{color:#7b2fff;}
      .bms-nav-btn.active svg,.bms-nav-btn:hover svg{opacity:1;}

      /* Topbar */
      .bms-topbar{display:flex;align-items:center;justify-content:space-between;padding:14px 0 10px;position:sticky;top:0;z-index:10;background:linear-gradient(180deg,#0a0a14 80%,transparent);}
      .bms-back-btn{display:flex;align-items:center;gap:4px;background:rgba(123,47,255,.15);border:1px solid rgba(123,47,255,.35);border-radius:10px;color:#b39dfd;font-size:.82rem;font-weight:700;padding:7px 12px;cursor:pointer;transition:all .2s;}
      .bms-back-btn:hover{background:rgba(123,47,255,.3);color:#fff;}
      .bms-topbar-title{font-size:.9rem;font-weight:800;color:#fff;letter-spacing:.02em;}
      .bms-pts-chip{background:rgba(123,47,255,.2);border:1px solid rgba(123,47,255,.4);border-radius:999px;color:#b39dfd;font-size:.72rem;font-weight:700;padding:5px 11px;}

      /* Stats row */
      .bms-stats-row{display:flex;gap:8px;margin-bottom:14px;}
      .bms-stat-box{flex:1;background:rgba(123,47,255,.08);border:1px solid rgba(123,47,255,.2);border-radius:14px;display:flex;flex-direction:column;align-items:center;padding:10px 6px;gap:3px;}
      .bms-stat-val{font-size:1.2rem;font-weight:900;color:#fff;line-height:1;}
      .bms-stat-lbl{font-size:.55rem;color:rgba(255,255,255,.38);text-transform:uppercase;letter-spacing:.06em;text-align:center;}

      /* Date badge */
      .bms-datebadge-row{display:flex;align-items:center;gap:10px;margin-bottom:16px;flex-wrap:wrap;}
      .bms-date-inp{background:rgba(123,47,255,.12);border:1px solid rgba(123,47,255,.35);border-radius:10px;color:#fff;padding:8px 12px;font-size:.85rem;outline:none;cursor:pointer;color-scheme:dark;flex:1;min-width:140px;}
      .bms-date-inp:focus{border-color:#7b2fff;box-shadow:0 0 0 3px rgba(123,47,255,.2);}
      .bms-ph-badge{font-size:.72rem;font-weight:700;padding:7px 14px;border-radius:999px;letter-spacing:.04em;white-space:nowrap;}
      .bms-badge-g{background:rgba(0,210,100,.15);color:#00e676;border:1px solid rgba(0,210,100,.4);}
      .bms-badge-y{background:rgba(255,193,7,.15);color:#ffc107;border:1px solid rgba(255,193,7,.4);}
      .bms-badge-p{background:rgba(123,47,255,.18);color:#b39dfd;border:1px solid rgba(123,47,255,.4);}

      /* Section header */
      .bms-section-hdr{display:flex;align-items:center;gap:8px;font-size:.8rem;font-weight:800;color:#fff;letter-spacing:.04em;text-transform:uppercase;margin:18px 0 10px;padding-bottom:8px;border-bottom:1px solid rgba(123,47,255,.25);}
      .bms-section-icon{font-size:1rem;}
      .bms-section-sub{font-size:.65rem;color:#00e676;font-weight:700;margin-left:auto;text-transform:none;letter-spacing:0;}

      /* Habit table */
      .bms-htbl-outer{border-radius:16px;border:1px solid rgba(123,47,255,.22);overflow:hidden;overflow-x:auto;margin-bottom:12px;}
      .bms-htbl{width:100%;border-collapse:collapse;min-width:360px;}
      .bms-htbl .bms-htr{border-bottom:1px solid rgba(255,255,255,.05);transition:background .15s;}
      .bms-htbl .bms-htr:last-child{border-bottom:none;}
      .bms-htbl .bms-htr:hover{background:rgba(123,47,255,.06);}
      .bms-htr-done{background:rgba(0,210,100,.05);}
      .bms-htr-locked{opacity:.75;}
      .bms-htd{padding:7px 7px;vertical-align:middle;}
      .bms-htd-ck{width:34px;text-align:center;padding:6px 3px;}
      .bms-htd-nm{width:100%;}
      .bms-htd-tm{width:68px;}
      .bms-htd-arrow{width:12px;color:rgba(255,255,255,.2);font-size:.72rem;padding:0 1px;text-align:center;}
      .bms-htd-pts{width:34px;font-size:.68rem;color:#a78bfa;font-weight:700;text-align:center;}
      .bms-htd-del{width:28px;text-align:center;padding:6px 3px;}
      .bms-del-btn{width:24px;height:24px;background:none;border:none;color:rgba(255,80,80,.5);font-size:1rem;cursor:pointer;display:flex;align-items:center;justify-content:center;border-radius:6px;transition:all .15s;padding:0;}
      .bms-del-btn:hover{color:#ff5252;background:rgba(255,82,82,.1);}
      .bms-htr-done .bms-inp{color:rgba(255,255,255,.35);}

      /* Points rule card */
      .bms-rule-card{background:rgba(255,255,255,.025);border:1px solid rgba(123,47,255,.2);border-radius:14px;padding:12px 14px;margin-bottom:4px;}
      .bms-rule-title{font-size:.72rem;font-weight:800;color:rgba(255,255,255,.5);text-transform:uppercase;letter-spacing:.07em;margin-bottom:9px;}
      .bms-rule-row{display:flex;align-items:center;gap:8px;padding:4px 0;font-size:.78rem;color:rgba(255,255,255,.6);}
      .bms-rule-dot{width:8px;height:8px;border-radius:50%;flex-shrink:0;}
      .bms-rule-pts{margin-left:auto;font-weight:800;color:#fff;font-size:.8rem;}

      /* Table */
      .bms-table-outer{border-radius:16px;border:1px solid rgba(123,47,255,.22);overflow:hidden;overflow-x:auto;margin-bottom:12px;}
      .bms-table{width:100%;border-collapse:collapse;min-width:400px;}
      .bms-thead{background:rgba(123,47,255,.22);}
      .bms-th{color:rgba(255,255,255,.5);font-weight:700;font-size:.65rem;letter-spacing:.07em;text-transform:uppercase;padding:9px 7px;text-align:left;border-bottom:1px solid rgba(123,47,255,.3);}
      .bms-th-wide{width:100%;}
      .bms-tr{border-bottom:1px solid rgba(255,255,255,.05);transition:background .15s;}
      .bms-tr:last-child{border-bottom:none;}
      .bms-tr:hover{background:rgba(123,47,255,.07);}
      .bms-tr-done{background:rgba(0,210,100,.05);}
      .bms-tr-locked{opacity:.75;}
      .bms-td{padding:7px 7px;vertical-align:middle;}
      .bms-td-ck{width:34px;text-align:center;padding:6px 3px;}
      .bms-td-sn{width:22px;color:rgba(255,255,255,.25);font-size:.72rem;text-align:center;}
      .bms-td-nm{width:100%;}
      .bms-td-tm{width:70px;}
      .bms-td-arrow{width:12px;color:rgba(255,255,255,.2);font-size:.72rem;padding:0 1px;text-align:center;}
      .bms-td-dur{width:54px;font-size:.72rem;color:#a78bfa;font-weight:700;white-space:nowrap;text-align:center;}
      .bms-td-pts{width:34px;font-size:.68rem;color:#00e676;font-weight:700;text-align:center;white-space:nowrap;}

      .bms-ck{width:28px;height:28px;background:none;border:2px solid rgba(123,47,255,.4);border-radius:8px;display:flex;align-items:center;justify-content:center;cursor:pointer;font-size:14px;font-weight:900;color:#00e676;transition:all .15s;padding:0;}
      .bms-ck:hover:not(:disabled){border-color:#7b2fff;background:rgba(123,47,255,.15);transform:scale(1.1);}
      .bms-ck-on{border-color:#00e676;background:rgba(0,210,100,.12);}
      .bms-ck:disabled{cursor:default;}
      .bms-ck-ring{display:block;width:10px;height:10px;border-radius:2px;background:rgba(123,47,255,.3);}

      .bms-inp{background:transparent;border:none;border-bottom:1px solid rgba(255,255,255,.1);color:#fff;font-size:.84rem;padding:3px 2px;width:100%;outline:none;font-family:inherit;transition:border-color .2s;}
      .bms-inp::placeholder{color:rgba(255,255,255,.18);}
      .bms-inp:focus:not(:disabled){border-bottom-color:#7b2fff;}
      .bms-inp:disabled{color:rgba(255,255,255,.3);cursor:default;}
      .bms-inp-tm{color-scheme:dark;font-size:.75rem;width:68px;}
      .bms-tr-done .bms-inp{color:rgba(255,255,255,.35);}

      .bms-add-btn{display:block;width:100%;background:rgba(123,47,255,.1);border:1.5px dashed rgba(123,47,255,.38);border-radius:12px;color:#b39dfd;font-size:.85rem;font-weight:700;padding:10px;cursor:pointer;transition:all .2s;margin-bottom:18px;letter-spacing:.04em;}
      .bms-add-btn:hover{background:rgba(123,47,255,.22);border-color:#7b2fff;color:#fff;}

      /* All Done */
      .bms-alldone-wrap{margin-bottom:22px;text-align:center;}
      .bms-alldone-btn{display:flex;align-items:center;justify-content:center;gap:10px;width:100%;padding:16px 20px;border-radius:16px;border:2px solid;font-size:1rem;font-weight:900;letter-spacing:.06em;cursor:pointer;transition:all .25s;background:rgba(255,255,255,.04);border-color:rgba(255,255,255,.1);color:rgba(255,255,255,.25);}
      .bms-alldone-btn:disabled{cursor:not-allowed;}
      .bms-alldone-ready{background:linear-gradient(135deg,rgba(0,210,100,.25),rgba(0,180,80,.35));border-color:#00e676;color:#00e676;box-shadow:0 0 24px rgba(0,230,118,.35);animation:bms-pulse-green 2s ease-in-out infinite;}
      .bms-alldone-ready:hover{transform:translateY(-2px);box-shadow:0 8px 32px rgba(0,230,118,.5);}
      .bms-alldone-completed{background:linear-gradient(135deg,rgba(0,210,100,.15),rgba(0,180,80,.2));border-color:rgba(0,230,118,.5);color:rgba(0,230,118,.7);cursor:default;}
      .bms-wrap-done{opacity:.8;}
      @keyframes bms-pulse-green{0%,100%{box-shadow:0 0 18px rgba(0,230,118,.3);}50%{box-shadow:0 0 36px rgba(0,230,118,.6);}}
      .bms-alldone-icon{font-size:1.2rem;}
      .bms-alldone-text{flex:1;text-align:left;}
      .bms-alldone-pts{background:rgba(0,210,100,.2);border:1px solid rgba(0,210,100,.4);border-radius:999px;font-size:.75rem;padding:3px 10px;font-weight:800;color:#00e676;}
      .bms-alldone-btn:disabled .bms-alldone-pts{background:rgba(255,255,255,.05);border-color:rgba(255,255,255,.1);color:rgba(255,255,255,.2);}
      .bms-alldone-hint{font-size:.72rem;color:rgba(255,255,255,.35);margin:8px 0 0;}

      /* Divider */
      .bms-divider{display:flex;align-items:center;gap:10px;margin:10px 0 14px;color:rgba(255,255,255,.3);font-size:.7rem;font-weight:700;letter-spacing:.08em;text-transform:uppercase;}
      .bms-divider::before,.bms-divider::after{content:'';flex:1;height:1px;background:linear-gradient(90deg,transparent,rgba(123,47,255,.4),transparent);}

      /* Calendar */
      .bms-cal-card{background:rgba(255,255,255,.025);border:1.5px solid rgba(123,47,255,.22);border-radius:18px;padding:14px 12px;margin-bottom:14px;}
      .bms-cnav{display:flex;align-items:center;justify-content:space-between;margin-bottom:10px;}
      .bms-cml{font-size:.95rem;font-weight:800;color:#fff;}
      .bms-carrow{background:rgba(123,47,255,.18);border:1px solid rgba(123,47,255,.35);border-radius:8px;color:#b39dfd;font-size:1.1rem;width:32px;height:32px;cursor:pointer;transition:all .2s;display:flex;align-items:center;justify-content:center;}
      .bms-carrow:hover{background:rgba(123,47,255,.35);color:#fff;}
      .bms-cleg{display:flex;align-items:center;gap:8px;flex-wrap:wrap;font-size:.65rem;color:rgba(255,255,255,.4);margin-bottom:10px;}
      .bms-cl-dot{display:inline-block;width:8px;height:8px;border-radius:50%;flex-shrink:0;}
      .bms-cl-green{background:#00e676;box-shadow:0 0 5px rgba(0,230,118,.7);}
      .bms-cl-partial{background:#ffc107;}
      .bms-cl-red{background:#ff5252;}
      .bms-cl-today{background:#7b2fff;box-shadow:0 0 5px rgba(123,47,255,.8);}
      .bms-cgrid{display:grid;grid-template-columns:repeat(7,1fr);gap:4px;}
      .bms-chd{font-size:.58rem;color:rgba(255,255,255,.3);text-align:center;font-weight:700;letter-spacing:.05em;padding-bottom:5px;text-transform:uppercase;}
      .bms-cc{aspect-ratio:1;border-radius:9px;display:flex;flex-direction:column;align-items:center;justify-content:center;cursor:pointer;gap:1px;background:rgba(255,255,255,.04);border:1.5px solid transparent;transition:transform .15s,border-color .2s;position:relative;min-width:0;}
      .bms-cc:hover{transform:scale(1.08);border-color:rgba(123,47,255,.5);}
      .bms-cc-empty{background:transparent;cursor:default;pointer-events:none;}
      .bms-cc-green{background:linear-gradient(135deg,#10d97a,#0bbf68);border-color:#10d97a;box-shadow:0 2px 8px rgba(16,217,122,.35);}
      .bms-cc-green .bms-cn{color:#06281a;}
      .bms-cc-partial{background:rgba(255,193,7,.15);border-color:rgba(255,193,7,.35);}
      .bms-cc-red{background:linear-gradient(135deg,#ff5252,#d32f2f);border-color:#ff5252;box-shadow:0 2px 8px rgba(255,82,82,.3);}
      .bms-cc-red .bms-cn{color:#fff;}
      .bms-cc-today{border-color:#7b2fff !important;box-shadow:0 0 10px rgba(123,47,255,.55);}
      .bms-cc-sel:not(.bms-cc-today){border-color:rgba(255,255,255,.65) !important;}
      .bms-cn{font-size:.78rem;font-weight:700;color:#fff;line-height:1;}
      .bms-csub{font-size:.5rem;font-weight:800;line-height:1;margin-top:1px;opacity:.95;color:#06281a;}
      .bms-cc-red .bms-csub{color:rgba(255,255,255,.9);}
      .bms-cdot{width:4px;height:4px;border-radius:50%;background:#ffc107;opacity:.8;}

      /* Pending */
      .bms-pending{background:rgba(255,255,255,.02);border:1px solid rgba(255,80,80,.15);border-radius:16px;padding:12px;margin-bottom:14px;}
      .bms-pend-title{font-size:.72rem;font-weight:700;color:rgba(255,130,130,.8);text-transform:uppercase;letter-spacing:.06em;margin-bottom:10px;}
      .bms-pend-empty{font-size:.85rem;color:rgba(0,230,118,.7);text-align:center;padding:8px;}
      .bms-pend-row{display:flex;align-items:flex-start;gap:10px;padding:8px;border-radius:10px;cursor:pointer;transition:background .15s;margin-bottom:5px;border:1px solid rgba(255,255,255,.04);}
      .bms-pend-row:hover{background:rgba(123,47,255,.1);}
      .bms-pend-date{font-size:.7rem;font-weight:700;color:rgba(255,255,255,.4);white-space:nowrap;min-width:68px;padding-top:2px;}
      .bms-pend-tasks{display:flex;flex-wrap:wrap;gap:5px;}
      .bms-pend-task{font-size:.72rem;background:rgba(255,60,60,.1);border:1px solid rgba(255,60,60,.2);border-radius:6px;padding:2px 7px;color:rgba(255,180,180,.85);}

      /* Leaderboard */
      .bms-lb-card{background:rgba(255,255,255,.025);border:1.5px solid rgba(123,47,255,.22);border-radius:18px;overflow:hidden;margin-bottom:14px;}
      .bms-lb-tabs{display:flex;border-bottom:1px solid rgba(255,255,255,.07);}
      .bms-lb-tab{flex:1;padding:11px 4px;background:none;border:none;color:rgba(255,255,255,.38);font-size:.72rem;font-weight:700;letter-spacing:.04em;cursor:pointer;transition:all .2s;border-right:1px solid rgba(255,255,255,.07);}
      .bms-lb-tab:last-child{border-right:none;}
      .bms-lb-tab:hover{color:#fff;background:rgba(123,47,255,.1);}
      .bms-lb-tab-active{color:#f59e0b;background:rgba(245,158,11,.12) !important;}
      #bms-lb-body{padding:4px 12px 10px;}
      .bms-lb-loading{text-align:center;color:rgba(255,255,255,.3);padding:20px;font-size:.8rem;}
      .bms-lb-empty{text-align:center;color:rgba(255,255,255,.3);padding:20px;font-size:.8rem;font-style:italic;}
      .bms-lb-row{display:flex;align-items:center;gap:10px;padding:9px 4px;border-bottom:1px solid rgba(255,255,255,.04);}
      .bms-lb-row:last-child{border-bottom:none;}
      .bms-lb-me{background:rgba(123,47,255,.1);border-radius:10px;padding:9px 8px;margin:3px 0;}
      .bms-lb-rank{width:26px;text-align:center;font-size:.82rem;font-weight:700;color:rgba(255,255,255,.5);flex-shrink:0;}
      .bms-lb-avatar{width:32px;height:32px;border-radius:50%;flex-shrink:0;background:linear-gradient(135deg,#7b2fff,#a855f7);display:flex;align-items:center;justify-content:center;font-weight:900;font-size:.75rem;color:#fff;}
      .bms-lb-info{flex:1;min-width:0;}
      .bms-lb-name{font-size:.8rem;font-weight:700;color:#fff;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}
      .bms-lb-me .bms-lb-name{color:#f59e0b;}
      .bms-lb-sub{font-size:.65rem;color:rgba(255,255,255,.38);}
      .bms-lb-val{font-size:.9rem;font-weight:800;}
      .bms-lb-green{color:#00e676;}
      .bms-lb-gold{color:#f59e0b;}
      .bms-lb-purple{color:#a78bfa;}

      /* Celebration */
      .bms-celebrate{position:fixed;inset:0;z-index:9999;display:flex;align-items:center;justify-content:center;background:rgba(0,0,0,.65);backdrop-filter:blur(6px);animation:bms-cel-in .3s ease;}
      @keyframes bms-cel-in{from{opacity:0;transform:scale(.8);}to{opacity:1;transform:scale(1);}}
      .bms-cel-box{background:linear-gradient(135deg,#1a0a33,#0d1a0f);border:2px solid #00e676;border-radius:24px;padding:36px 40px;text-align:center;box-shadow:0 0 60px rgba(0,230,118,.4);animation:bms-cel-out 2.8s ease forwards;}
      @keyframes bms-cel-out{0%{opacity:1;}70%{opacity:1;}100%{opacity:0;}}
      .bms-cel-emoji{font-size:3rem;margin-bottom:10px;}
      .bms-cel-title{font-size:1.5rem;font-weight:900;color:#fff;margin-bottom:8px;}
      .bms-cel-pts{font-size:2rem;font-weight:900;color:#00e676;margin-bottom:6px;}
      .bms-cel-sub{font-size:.8rem;color:rgba(255,255,255,.45);}

      @media(max-width:420px){
        .bms-inner{padding:0 10px 16px;}
        .bms-stat-val{font-size:1rem;}
        .bms-inp-tm{width:60px;font-size:.7rem;}
        .bms-cn{font-size:.7rem;}
        .bms-alldone-btn{font-size:.88rem;padding:13px 14px;}
        .bms-habit-label{font-size:.8rem;}
      }
    </style>
    <div class="bms-inner">

      <!-- TOP BAR -->
      <div class="bms-topbar">
        <button class="bms-back-btn" id="bms-back">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><polyline points="15 18 9 12 15 6"/></svg>Back
        </button>
        <span class="bms-topbar-title">📅 Daily Schedule</span>
        <div class="bms-pts-chip" id="bms-pts-chip">⚡ — pts</div>
      </div>

      <!-- STATS ROW -->
      <div class="bms-stats-row">
        <div class="bms-stat-box">
          <span class="bms-stat-val" id="bms-streak-val">0</span>
          <span class="bms-stat-lbl">🔥 Streak</span>
        </div>
        <div class="bms-stat-box">
          <span class="bms-stat-val" id="bms-todaypt-val">0</span>
          <span class="bms-stat-lbl">⚡ Today Pts</span>
        </div>
        <div class="bms-stat-box">
          <span class="bms-stat-val" id="bms-time-val">—</span>
          <span class="bms-stat-lbl">⏱ Task Time</span>
        </div>
        <div class="bms-stat-box">
          <span class="bms-stat-val" id="bms-remain-val">—</span>
          <span class="bms-stat-lbl">📋 Left</span>
        </div>
      </div>

      <!-- DATE + BADGE -->
      <div class="bms-datebadge-row">
        <input type="date" class="bms-date-inp" id="bms-date"/>
        <div class="bms-ph-badge" id="bms-badge">🎯 In Progress</div>
      </div>

      <!-- HABITS SECTION -->
      <div class="bms-section-hdr"><span class="bms-section-icon">⚡</span>Daily Habits<span class="bms-section-sub">+5 pts each · time optional</span></div>
      <div class="bms-htbl-outer" id="bms-htbl"></div>
      <button class="bms-add-btn" id="bms-add-habit">＋ Add Habit</button>

      <!-- POINTS RULE CARD -->
      <div class="bms-rule-card">
        <div class="bms-rule-title">🏆 Points System</div>
        <div class="bms-rule-row"><span class="bms-rule-dot" style="background:#a78bfa"></span><span>Habit tick</span><span class="bms-rule-pts">+5 pts</span></div>
        <div class="bms-rule-row"><span class="bms-rule-dot" style="background:#34d399"></span><span>Task complete</span><span class="bms-rule-pts">+10 pts</span></div>
        <div class="bms-rule-row"><span class="bms-rule-dot" style="background:#fbbf24"></span><span>All habits + tasks done</span><span class="bms-rule-pts">+100 bonus</span></div>
      </div>

      <!-- TASKS SECTION -->
      <div class="bms-section-hdr"><span class="bms-section-icon">📋</span>Today's Tasks<span class="bms-section-sub">+10 pts each</span></div>
      <div class="bms-table-outer" id="bms-tbl"></div>
      <button class="bms-add-btn" id="bms-add">＋ Add Task</button>

      <!-- ALL DONE -->
      <div class="bms-alldone-wrap" id="bms-alldone-wrap">
        <button class="bms-alldone-btn" id="bms-alldone-btn" disabled>
          <span class="bms-alldone-icon">✅</span>
          <span class="bms-alldone-text">ALL WORK DONE</span>
          <span class="bms-alldone-pts" id="bms-alldone-pts">+— pts</span>
        </button>
        <p class="bms-alldone-hint" id="bms-alldone-hint">Complete all habits + tasks to unlock</p>
      </div>

      <!-- CALENDAR -->
      <div class="bms-divider"><span>📆 Schedule Calendar</span></div>
      <div class="bms-cal-card" id="bms-cal"></div>
      <div class="bms-pending" id="bms-pending"></div>

      <!-- LEADERBOARD -->
      <div class="bms-divider"><span>🏆 Leaderboard</span></div>
      <div class="bms-lb-card" id="bms-lb">
        <div class="bms-lb-tabs">
          <button class="bms-lb-tab bms-lb-tab-active" data-lbt="today">🌅 Today</button>
          <button class="bms-lb-tab" data-lbt="streak">🔥 Streak</button>
          <button class="bms-lb-tab" data-lbt="points">⚡ Points</button>
        </div>
        <div id="bms-lb-body"><div class="bms-lb-loading">⏳ Loading...</div></div>
      </div>

      <div style="height:100px"></div>
    </div>`;
    document.body.appendChild(page);

    document.getElementById('bms-back').addEventListener('click',()=>{
      deactivateSchedule();
      const homeBtn=document.querySelector('[data-page="home"],#home-nav,[class*="home"][class*="nav"]');
      if (homeBtn) homeBtn.click();
    });
    document.getElementById('bms-date').addEventListener('change',async e=>{
      S.date=e.target.value;
      const d=await loadDay(S.date);
      S.tasks=d.tasks; S.habits=d.habits; S.dayCompleted=d.day_completed; S.completedAt=d.completed_at;
      renderAll();
    });
    document.getElementById('bms-add-habit').addEventListener('click',()=>{
      if (S.dayCompleted) return;
      S.habits.push({id:'h_'+Date.now(),name:'',timeFrom:'',timeTo:'',done:false});
      qSave(); renderHabits(); updateAllDoneBtn();
    });
    document.getElementById('bms-add').addEventListener('click',()=>{
      S.tasks.push({id:Date.now(),serial:S.tasks.length+1,name:'',timeFrom:'',timeTo:'',done:false});
      qSave(); renderTable(); updateAllDoneBtn();
    });
    document.getElementById('bms-alldone-btn').addEventListener('click',async()=>{
      if (S.dayCompleted) return;
      const namedDone=S.tasks.filter(t=>t.name&&t.name.trim()&&t.done);
      const habDoneCount=S.habits.filter(h=>h.name&&h.name.trim()&&h.done).length;
      const pts=habDoneCount*5+namedDone.length*10+100;
      S.dayCompleted=true; S.completedAt=new Date().toISOString();
      // instant green in calendar
      if (!S.monthData[S.date]) S.monthData[S.date]={tasks:S.tasks,habits:S.habits,allDone:false,anyDone:true,namedCount:namedDone.length,totalMins:calcTaskTime(S.tasks),points:0};
      S.monthData[S.date].allDone=true; S.monthData[S.date].points=pts;
      try { const ls=JSON.parse(localStorage.getItem('bms_done_days')||'{}'); ls[S.date]={pts,at:S.completedAt}; localStorage.setItem('bms_done_days',JSON.stringify(ls)); } catch(_) {}
      renderAll();
      await saveDay(S.date,S.tasks,S.habits,{day_completed:true,completed_at:S.completedAt});
      await addPoints(S.date,pts,`Schedule complete: ${namedDone.length} tasks, ${habDoneCount} habits`);
      S.totalPoints=await loadTotalPoints(); S.streak=await calcStreak();
      S.monthData=await loadMonth(S.calYear,S.calMonth);
      renderAll(); showCelebration(pts);
    });
    // Leaderboard tabs
    document.getElementById('bms-lb').querySelectorAll('.bms-lb-tab').forEach(tab=>{
      tab.addEventListener('click',()=>{
        document.querySelectorAll('.bms-lb-tab').forEach(t=>t.classList.remove('bms-lb-tab-active'));
        tab.classList.add('bms-lb-tab-active');
        renderLeaderboard(tab.dataset.lbt);
      });
    });
  }

  // ── HABITS RENDER ────────────────────────────────────────
  function renderHabits() {
    const el=document.getElementById('bms-htbl'); if (!el) return;
    const locked=S.dayCompleted;
    const rows=S.habits.map((h,i)=>`<tr class="bms-htr ${h.done?'bms-htr-done':''} ${locked?'bms-htr-locked':''}">
      <td class="bms-htd bms-htd-ck">
        <button class="bms-ck ${h.done?'bms-ck-on':''}" data-hi="${i}" ${locked?'disabled':''}>
          ${h.done?'✓':'<span class="bms-ck-ring"></span>'}
        </button>
      </td>
      <td class="bms-htd bms-htd-nm">
        <input class="bms-inp" data-hi="${i}" data-hf="name" value="${esc(h.name)}" placeholder="Habit name…" ${locked?'disabled':''}/>
      </td>
      <td class="bms-htd bms-htd-tm">
        <input class="bms-inp bms-inp-tm" type="time" data-hi="${i}" data-hf="timeFrom" value="${h.timeFrom||''}" ${locked?'disabled':''}/>
      </td>
      <td class="bms-htd bms-htd-arrow">→</td>
      <td class="bms-htd bms-htd-tm">
        <input class="bms-inp bms-inp-tm" type="time" data-hi="${i}" data-hf="timeTo" value="${h.timeTo||''}" ${locked?'disabled':''}/>
      </td>
      <td class="bms-htd bms-htd-pts">${h.done?'✓+5':'＋5'}</td>
      <td class="bms-htd bms-htd-del">
        ${!locked?`<button class="bms-del-btn" data-hi="${i}" title="Delete">×</button>`:''}
      </td>
    </tr>`).join('');

    el.innerHTML=`<table class="bms-htbl">
      <thead><tr style="background:rgba(123,47,255,.22);">
        <th class="bms-th">✓</th>
        <th class="bms-th" style="width:100%">Habit</th>
        <th class="bms-th" colspan="3" style="text-align:center">From → To</th>
        <th class="bms-th">Pts</th>
        <th class="bms-th"></th>
      </tr></thead>
      <tbody>${rows}</tbody>
    </table>`;

    el.querySelectorAll('.bms-ck[data-hi]').forEach(btn=>{
      btn.addEventListener('click',()=>{
        if (S.dayCompleted) return;
        S.habits[+btn.dataset.hi].done=!S.habits[+btn.dataset.hi].done;
        qSave(); renderHabits(); updateAllDoneBtn(); renderStats();
      });
    });
    el.querySelectorAll('.bms-inp[data-hi]').forEach(inp=>{
      inp.addEventListener('input',()=>{
        if (S.dayCompleted) return;
        S.habits[+inp.dataset.hi][inp.dataset.hf]=inp.value;
        qSave(); updateAllDoneBtn();
      });
    });
    el.querySelectorAll('.bms-del-btn[data-hi]').forEach(btn=>{
      btn.addEventListener('click',()=>{
        if (S.dayCompleted) return;
        S.habits.splice(+btn.dataset.hi,1);
        qSave(); renderHabits(); updateAllDoneBtn(); renderStats();
      });
    });
  }

  // ── TABLE RENDER ─────────────────────────────────────────
  function renderTable() {
    const el=document.getElementById('bms-tbl'); if (!el) return;
    const dp=document.getElementById('bms-date'); if (dp) dp.value=S.date;

    const badge=document.getElementById('bms-badge');
    if (badge) {
      if (S.dayCompleted) { badge.textContent='✅ Day Complete'; badge.className='bms-ph-badge bms-badge-g'; }
      else {
        const named=S.tasks.filter(t=>t.name&&t.name.trim());
        const done=named.filter(t=>t.done);
        badge.textContent=done.length>0?'🟡 In Progress':'🎯 Not Started';
        badge.className='bms-ph-badge '+(done.length>0?'bms-badge-y':'bms-badge-p');
      }
    }

    const locked=S.dayCompleted;
    const rows=S.tasks.map((t,i)=>{
      const a=pMin(t.timeFrom), b=pMin(t.timeTo);
      const mins=(a!==null&&b!==null&&b>a)?b-a:0;
      const timeStr=mins>0?mStr(mins):'—';
      const pts=t.name&&t.name.trim()?'+10':'—';
      return `<tr class="bms-tr ${t.done?'bms-tr-done':''} ${locked?'bms-tr-locked':''}">
        <td class="bms-td bms-td-ck">
          <button class="bms-ck ${t.done?'bms-ck-on':''}" data-i="${i}" ${locked?'disabled':''}>
            ${t.done?'✓':'<span class="bms-ck-ring"></span>'}
          </button>
        </td>
        <td class="bms-td bms-td-sn">${i+1}</td>
        <td class="bms-td bms-td-nm">
          <input class="bms-inp" data-i="${i}" data-f="name" value="${esc(t.name)}" placeholder="Task name…" ${locked?'disabled':''}/>
        </td>
        <td class="bms-td bms-td-tm">
          <input class="bms-inp bms-inp-tm" type="time" data-i="${i}" data-f="timeFrom" value="${t.timeFrom||''}" ${locked?'disabled':''}/>
        </td>
        <td class="bms-td bms-td-arrow">→</td>
        <td class="bms-td bms-td-tm">
          <input class="bms-inp bms-inp-tm" type="time" data-i="${i}" data-f="timeTo" value="${t.timeTo||''}" ${locked?'disabled':''}/>
        </td>
        <td class="bms-td bms-td-dur">${timeStr}</td>
        <td class="bms-td bms-td-pts">${pts}</td>
      </tr>`;
    }).join('');

    el.innerHTML=`<table class="bms-table">
      <thead><tr class="bms-thead">
        <th class="bms-th">✓</th>
        <th class="bms-th">#</th>
        <th class="bms-th bms-th-wide">Work</th>
        <th class="bms-th" colspan="3" style="text-align:center">From → To</th>
        <th class="bms-th">Time</th>
        <th class="bms-th">Pts</th>
      </tr></thead>
      <tbody>${rows}</tbody>
    </table>`;

    el.querySelectorAll('.bms-ck').forEach(b=>{
      b.addEventListener('click',()=>{
        if (S.dayCompleted) return;
        S.tasks[+b.dataset.i].done=!S.tasks[+b.dataset.i].done;
        qSave(); renderTable(); renderStats(); updateAllDoneBtn();
      });
    });
    el.querySelectorAll('.bms-inp').forEach(inp=>{
      inp.addEventListener('input',()=>{
        if (S.dayCompleted) return;
        S.tasks[+inp.dataset.i][inp.dataset.f]=inp.value;
        qSave(); renderStats(); updateAllDoneBtn();
        if (inp.dataset.f==='timeTo'||inp.dataset.f==='timeFrom') renderTable();
      });
    });
    updateAllDoneBtn();
  }

  function updateAllDoneBtn() {
    const btn=document.getElementById('bms-alldone-btn');
    const hint=document.getElementById('bms-alldone-hint');
    const ptsEl=document.getElementById('bms-alldone-pts');
    const wrap=document.getElementById('bms-alldone-wrap');
    if (!btn) return;
    const namedHabs=S.habits.filter(h=>h.name&&h.name.trim());
    const namedTasks=S.tasks.filter(t=>t.name&&t.name.trim());
    const allHabsDone=namedHabs.length>0&&namedHabs.every(h=>h.done);
    const allTasksDone=namedTasks.length>=3&&namedTasks.every(t=>t.done);
    const allDone=allHabsDone&&allTasksDone;
    const pts=namedHabs.filter(h=>h.done).length*5+namedTasks.filter(t=>t.done).length*10+100;
    if (ptsEl) ptsEl.textContent=`+${pts} pts`;
    if (S.dayCompleted) {
      btn.disabled=false; btn.className='bms-alldone-btn bms-alldone-completed';
      btn.querySelector('.bms-alldone-text').textContent='🎉 DAY COMPLETED!';
      if (hint) hint.textContent=`Completed at ${S.completedAt?new Date(S.completedAt).toLocaleTimeString('en-IN',{hour:'2-digit',minute:'2-digit'}):'—'}`;
      if (wrap) wrap.classList.add('bms-wrap-done');
    } else if (allDone) {
      btn.disabled=false; btn.className='bms-alldone-btn bms-alldone-ready';
      btn.querySelector('.bms-alldone-text').textContent='ALL WORK DONE';
      if (hint) hint.textContent=`Tap to claim +${pts} points! 🔥`;
      if (wrap) wrap.classList.remove('bms-wrap-done');
    } else {
      btn.disabled=true; btn.className='bms-alldone-btn';
      btn.querySelector('.bms-alldone-text').textContent='ALL WORK DONE';
      const habLeft=namedHabs.filter(h=>!h.done).length;
      const need=Math.max(0,3-namedTasks.length);
      const taskLeft=namedTasks.filter(t=>!t.done).length;
      let msg='';
      if (namedHabs.length===0) msg='Add at least 1 habit';
      else if (habLeft>0) msg+=`${habLeft} habit${habLeft>1?'s':''} pending`;
      if (need>0) msg+=(msg?' · ':'')+`Add ${need} more task${need>1?'s':''}`;
      else if (taskLeft>0) msg+=(msg?' · ':'')+`${taskLeft} task${taskLeft>1?'s':''} remaining`;
      if (hint) hint.textContent=msg||'Complete everything to unlock';
      if (wrap) wrap.classList.remove('bms-wrap-done');
    }
  }

  // ── STATS ────────────────────────────────────────────────
  function renderStats() {
    const namedHabs=S.habits.filter(h=>h.name&&h.name.trim());
    const doneHabs=namedHabs.filter(h=>h.done);
    const namedTasks=S.tasks.filter(t=>t.name&&t.name.trim());
    const doneTasks=namedTasks.filter(t=>t.done);
    const remaining=(namedHabs.length-doneHabs.length)+(namedTasks.length-doneTasks.length);
    const mins=calcTaskTime(S.tasks);
    const todayPts=doneHabs.length*5+doneTasks.length*10+(S.dayCompleted?100:0);
    const re=document.getElementById('bms-remain-val'); if(re)re.textContent=remaining>0?remaining:'✅';
    const te=document.getElementById('bms-time-val'); if(te)te.textContent=mStr(mins)||'—';
    const se=document.getElementById('bms-streak-val'); if(se)se.textContent=S.streak;
    const pe=document.getElementById('bms-pts-chip'); if(pe)pe.textContent=`⚡ ${S.totalPoints} pts`;
    const tp=document.getElementById('bms-todaypt-val'); if(tp)tp.textContent=todayPts;
  }

  // ── CALENDAR ─────────────────────────────────────────────
  const DAYS_S=['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
  const MONS=['January','February','March','April','May','June','July','August','September','October','November','December'];

  function renderCal() {
    const el=document.getElementById('bms-cal'); if (!el) return;
    const {calYear:y,calMonth:m}=S;
    const first=new Date(y,m,1).getDay();
    const total=new Date(y,m+1,0).getDate();
    const todayStr=now();
    let hds=DAYS_S.map(d=>`<div class="bms-chd">${d}</div>`).join('');
    let cells=Array.from({length:first},()=>`<div class="bms-cc bms-cc-empty"></div>`).join('');
    for (let d=1;d<=total;d++) {
      const ds=`${y}-${pad(m+1)}-${pad(d)}`;
      const info=S.monthData[ds];
      const isToday=ds===todayStr, isSel=ds===S.date, isPast=ds<todayStr;
      let cls='bms-cc', sub='';
      if (info?.allDone) {
        cls+=' bms-cc-green';
        // show total task hours in green box
        const hrs=info.totalMins?mStr(info.totalMins):'';
        sub=`<span class="bms-csub">${hrs||('⚡'+(info.points||''))}</span>`;
      } else if (isPast&&info?.namedCount>0) {
        cls+=' bms-cc-red';
        sub=`<span class="bms-csub">Missed</span>`;
      } else if (isToday&&info?.anyDone) {
        cls+=' bms-cc-partial';
        sub=`<span class="bms-cdot"></span>`;
      }
      if (isToday) cls+=' bms-cc-today';
      if (isSel) cls+=' bms-cc-sel';
      cells+=`<div class="${cls}" data-date="${ds}"><span class="bms-cn">${d}</span>${sub}</div>`;
    }
    el.innerHTML=`
      <div class="bms-cnav">
        <button class="bms-carrow" id="bms-cprev">‹</button>
        <span class="bms-cml">${MONS[m]} ${y}</span>
        <button class="bms-carrow" id="bms-cnext">›</button>
      </div>
      <div class="bms-cleg">
        <span class="bms-cl-dot bms-cl-green"></span><span>Done</span>
        <span class="bms-cl-dot bms-cl-partial"></span><span>Partial</span>
        <span class="bms-cl-dot bms-cl-red"></span><span>Missed</span>
        <span class="bms-cl-dot bms-cl-today"></span><span>Today</span>
      </div>
      <div class="bms-cgrid">${hds}${cells}</div>`;
    document.getElementById('bms-cprev').addEventListener('click',async()=>{
      S.calMonth--; if(S.calMonth<0){S.calMonth=11;S.calYear--;}
      S.monthData=await loadMonth(S.calYear,S.calMonth); renderCal(); renderPending();
    });
    document.getElementById('bms-cnext').addEventListener('click',async()=>{
      S.calMonth++; if(S.calMonth>11){S.calMonth=0;S.calYear++;}
      S.monthData=await loadMonth(S.calYear,S.calMonth); renderCal(); renderPending();
    });
    el.querySelectorAll('.bms-cc[data-date]').forEach(cc=>{
      cc.addEventListener('click',async()=>{
        S.date=cc.dataset.date;
        const d=await loadDay(S.date);
        S.tasks=d.tasks; S.habits=d.habits; S.dayCompleted=d.day_completed; S.completedAt=d.completed_at;
        renderAll();
        document.getElementById('bms-page')?.scrollTo({top:0,behavior:'smooth'});
      });
    });
  }

  // ── PENDING ──────────────────────────────────────────────
  function renderPending() {
    const el=document.getElementById('bms-pending'); if(!el)return;
    const {calYear:y,calMonth:m}=S;
    const total=new Date(y,m+1,0).getDate();
    const days=[];
    for (let d=1;d<=total;d++) {
      const ds=`${y}-${pad(m+1)}-${pad(d)}`;
      const info=S.monthData[ds];
      if (info&&!info.allDone) {
        const pend=info.tasks.filter(t=>!t.done&&t.name&&t.name.trim());
        if (pend.length) days.push({ds,pend});
      }
    }
    if (!days.length) { el.innerHTML=`<div class="bms-pend-empty">🎉 No pending tasks this month!</div>`; return; }
    let html=`<div class="bms-pend-title">⚠️ Pending — ${MONS[m]}</div>`;
    days.forEach(({ds,pend})=>{
      const lbl=new Date(ds+'T00:00:00').toLocaleDateString('en-IN',{weekday:'short',day:'numeric',month:'short'});
      html+=`<div class="bms-pend-row" data-date="${ds}">
        <div class="bms-pend-date">${lbl}</div>
        <div class="bms-pend-tasks">${pend.map(t=>`<span class="bms-pend-task">❌ ${esc(t.name)}</span>`).join('')}</div>
      </div>`;
    });
    el.innerHTML=html;
    el.querySelectorAll('.bms-pend-row').forEach(row=>{
      row.addEventListener('click',async()=>{
        S.date=row.dataset.date;
        const d=await loadDay(S.date);
        S.tasks=d.tasks; S.habits=d.habits; S.dayCompleted=d.day_completed; S.completedAt=d.completed_at;
        renderAll();
        document.getElementById('bms-page')?.scrollTo({top:0,behavior:'smooth'});
      });
    });
  }

  // ── LEADERBOARD ──────────────────────────────────────────
  let lbData=[], lbTab='today';
  async function renderLeaderboard(tab) {
    lbTab=tab||lbTab;
    const body=document.getElementById('bms-lb-body'); if(!body)return;
    body.innerHTML='<div class="bms-lb-loading">⏳ Loading...</div>';
    if (!lbData.length) lbData=await loadLeaderboard();
    const myUID=getUID();
    let sorted=[...lbData];
    if (lbTab==='today') sorted=sorted.filter(u=>u.todayDone).sort((a,b)=>(a.completedAt||'').localeCompare(b.completedAt||''));
    else if (lbTab==='streak') sorted=sorted.sort((a,b)=>b.streak-a.streak||b.pts-a.pts);
    else sorted=sorted.sort((a,b)=>b.pts-a.pts||b.streak-a.streak);
    if (!sorted.length) { body.innerHTML='<div class="bms-lb-empty">No data yet — be the first! 💪</div>'; return; }
    const medals=['🥇','🥈','🥉'];
    body.innerHTML=sorted.slice(0,20).map((u,i)=>{
      const isMe=u.uid===myUID;
      const rank=medals[i]||(i+1);
      let val='', sub='';
      if (lbTab==='today') {
        const t=u.completedAt?new Date(u.completedAt).toLocaleTimeString('en-IN',{hour:'2-digit',minute:'2-digit'}):'—';
        val=`<span class="bms-lb-val bms-lb-green">${t}</span>`;
        sub=`+${u.pts} pts`;
      } else if (lbTab==='streak') {
        val=`<span class="bms-lb-val bms-lb-gold">${u.streak}d</span>`;
        sub=`${u.pts} pts`;
      } else {
        val=`<span class="bms-lb-val bms-lb-purple">${u.pts}</span>`;
        sub=`🔥 ${u.streak}d`;
      }
      const myName=window.profile?.name||null;
      const uid8=u.uid.slice(0,8);
      const displayName=isMe?(myName||'You'):(u.name||uid8+'…');
      return `<div class="bms-lb-row ${isMe?'bms-lb-me':''}">
        <div class="bms-lb-rank">${rank}</div>
        <div class="bms-lb-avatar">${(displayName)[0].toUpperCase()}</div>
        <div class="bms-lb-info">
          <div class="bms-lb-name">${isMe?displayName+' (Me)':displayName}${isMe?' 👑':''}</div>
          <div class="bms-lb-sub">${sub}</div>
        </div>
        <div>${val}</div>
      </div>`;
    }).join('');
  }

  // ── CELEBRATION ──────────────────────────────────────────
  function showCelebration(pts) {
    const el=document.createElement('div');
    el.className='bms-celebrate';
    el.innerHTML=`<div class="bms-cel-box">
      <div class="bms-cel-emoji">🎉</div>
      <div class="bms-cel-title">Day Complete!</div>
      <div class="bms-cel-pts">+${pts} Points!</div>
      <div class="bms-cel-sub">Habits + Tasks + 100 Bonus 🔥</div>
    </div>`;
    document.body.appendChild(el);
    setTimeout(()=>el.remove(),3000);
  }

  // ── RENDER ALL ───────────────────────────────────────────
  function renderAll() {
    renderHabits(); renderTable(); renderStats();
    updateAllDoneBtn(); renderCal(); renderPending();
  }

  // ── MIDNIGHT ─────────────────────────────────────────────
  function scheduleMidnight() {
    const n=new Date();
    const ms=new Date(n.getFullYear(),n.getMonth(),n.getDate()+1,0,0,5)-n;
    setTimeout(async()=>{
      await autoRedCheck();
      S.monthData=await loadMonth(S.calYear,S.calMonth);
      renderCal(); renderPending(); scheduleMidnight();
    },ms);
  }

  // ── BOOT ─────────────────────────────────────────────────
  async function waitForAuth(maxMs=5000) {
    // Wait until window.currentUser is set by app's own auth
    const start=Date.now();
    while (!window.currentUser?.id && Date.now()-start<maxMs) {
      await new Promise(r=>setTimeout(r,100));
    }
  }

  async function boot() {
    if (!getSB()) { setTimeout(boot,800); return; }
    await waitForAuth(); // wait for app auth — critical!
    await autoRedCheck();
    injectNav(); buildPage();
    const d=await loadDay(S.date);
    S.tasks=d.tasks; S.habits=d.habits; S.dayCompleted=d.day_completed; S.completedAt=d.completed_at;
    S.monthData=await loadMonth(S.calYear,S.calMonth);
    S.totalPoints=await loadTotalPoints(); S.streak=await calcStreak();
    renderAll();
    await renderLeaderboard('today');
    scheduleMidnight();
  }

  if (document.readyState==='loading') document.addEventListener('DOMContentLoaded',boot);
  else boot();
})();
