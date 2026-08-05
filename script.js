// =========================================================================
// DATA LAYER
// Google Sheets (via a Google Apps Script Web App) is the database. Every
// read goes through syncAll(), every write goes through api(action, payload)
// followed by a syncAll() so every screen always reflects the sheet.
//
// SETUP: deploy google-apps-script/Code.gs as a Web App (see SETUP.md),
// then paste the resulting /exec URL into API_BASE_URL below. Leaving it
// blank runs the app on local in-memory demo data instead (nothing is
// persisted) — that's the original prototype behavior, kept as a safe
// fallback so the UI is still fully explorable with zero setup.
// =========================================================================
const API_BASE_URL = 'https://script.google.com/macros/s/AKfycbwKwEu3jjwqjF6ajomsAMIbL1Rxwr-J8qgT_qpq3FJFZprDnAx0VpGFTK-7H-mIWWK0/exec';
const USE_REMOTE = !!API_BASE_URL;

/** Call one Apps Script action. Body is sent as text/plain (not
 *  application/json) specifically because Apps Script can't answer a CORS
 *  preflight request — text/plain is a "simple" content-type, so the
 *  browser skips the preflight and the JSON response comes back readable. */
async function api(action, payload) {
  const res = await fetch(API_BASE_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'text/plain;charset=utf-8' },
    body: JSON.stringify({ action, payload: payload || {} }),
  });
  const json = await res.json();
  if (!json.ok) throw new Error(json.error || 'Request to Google Sheets failed.');
  return json.data;
}

// ================= In-memory "database" (offline / no-setup fallback) =================
let offices = [ { id:1, name:'Head Office', lat:37.7955, lng:-122.3937, radius:100 } ];

let employees = [
  { id:1, code:'EMP-0001', name:'Akshaya Shivraman',  email:'zywinmedia@gmail.com',  password:'Admin@123',    role:'Founder & CEO',    department:'Administration', officeId:1 },
  { id:2, code:'EMP-0002', name:'BERNESH', email:'bernesh2003@gmail.com', password:'Bernesh@123', role:'employee', department:'Video Editor', officeId:1 },
  { id:3, code:'EMP-0003', name:'KATHIRVEL',    email:'kathirvel.zywinmedia@gmail.com',    password:'Kathir@123', role:'employee', department:'Graphic Designer', officeId:1 },
  { id:4, code:'EMP-0004', name:'ALAGU RANGARAJAN',    email:'alagurangarajanmaiyyappan@gmail.com',   password:'Alagu@123', role:'employee', department:'SEO', officeId:1 },
];

const todayStr = () => new Date().toISOString().slice(0,10);

let attendance = [
  { id:1, employeeId:3, date: todayStr(), checkIn: setTimeToday(8,52), checkOut: null, mode:'office', location:null },
  { id:2, employeeId:4, date: todayStr(), checkIn: setTimeToday(9,20), checkOut: null, mode:'office', location:null },
];
function setTimeToday(h,m){ const d = new Date(); d.setHours(h,m,0,0); return d.toISOString(); }

let leaveRequests = [
  { id:1, employeeId:3, type:'Casual Leave', from:'2026-08-10', to:'2026-08-10', reason:'Personal work', status:'pending' },
  { id:2, employeeId:2, type:'Sick Leave', from:'2026-07-28', to:'2026-07-29', reason:'Fever', status:'approved' },
  { id:3, employeeId:2, type:'Work From Home', from: todayStr(), to: todayStr(), reason:'Home internet setup, working remotely', status:'approved' },
];
let nextLeaveId = 4;

// ================= Deliverables (Daily Tasks + EOD Reports) =================
let dailyTasks = [
  { id:1, employeeId:2, task:'Investigate and patch the login redirect loop after SSO.', date: todayStr(), status:'pending' },
  { id:2, employeeId:2, task:'Write onboarding docs for the new hires.', date:'2026-08-01', status:'completed' },
];
let nextTaskId = 3;

let eodReports = [
  { id:1, employeeId:2, date: todayStr(), workCompleted:'Reviewed PRs, fixed login redirect bug.', pendingTasks:'Write tests for the fix.' },
];
let nextEodId = 2;
let nextEmployeeId = 5;

// ================= Finance Tracker (Business Expenses + Client Income) =================
const EXPENSE_CATEGORIES = ['Office Rent','Utilities','Employee Salary','Software & Tools','Marketing','Equipment','Water Refill','WiFi Bill','Travel','Miscellaneous','Other'];
const PAID_BY_OPTIONS = ['Cash','UPI','Bank Transfer','Card'];
const PAYMENT_STATUS_OPTIONS = ['Received','Pending'];

let businessExpenses = [
  { id:1, date:'2026-07-01', category:'Office Rent', paidTo:'Landlord', description:'July office space rent', amount:8000, paidBy:'Bank Transfer' },
  { id:2, date:'2026-07-02', category:'Water Refill', paidTo:'Aqua Suppliers', description:'2 cans water refill', amount:300, paidBy:'Cash' },
  { id:3, date:'2026-07-05', category:'Employee Salary', paidTo:'Priya (Designer)', description:'July salary', amount:15000, paidBy:'Bank Transfer' },
  { id:4, date:'2026-07-05', category:'WiFi Bill', paidTo:'ACT Fibernet', description:'Monthly internet bill', amount:1200, paidBy:'UPI' },
];
let nextExpenseId = 5;

let clientIncome = [
  { id:1, date:'2026-07-03', client:'Bright Dental Co.', workService:'SEO + Content (July)', amount:6000, paymentStatus:'Received', notes:'Paid on time' },
  { id:2, date:'2026-07-10', client:'Riverstone Law', workService:'Website content package', amount:4500, paymentStatus:'Received', notes:'' },
  { id:3, date:'2026-07-15', client:'Urban Fitness Studio', workService:'Social media management', amount:5000, paymentStatus:'Pending', notes:'Follow up on 20th' },
];
let nextIncomeId = 4;

let holidays = [
  { name:'Company Foundation Day', date:'2026-09-15' },
  { name:'Thanksgiving', date:'2026-11-27' },
  { name:'Winter Break', date:'2026-12-25' },
];
let announcements = [
  'Q3 payslips will be uploaded by Friday — check the Payslips tab.',
  'Office Wi-Fi maintenance this Saturday, 9–11 AM.',
];

// ================= Remote sync (Google Sheets mode only) =================
// Sheet cells always come back from Apps Script as strings — these coerce
// ids/numbers back to the shapes the render code already expects, so every
// existing render function keeps working unchanged.
function normalizeEmployee(e){ return { ...e, id:Number(e.id), officeId:Number(e.officeId) }; }
function normalizeOffice(o){ return { ...o, id:Number(o.id), lat:Number(o.lat), lng:Number(o.lng), radius:Number(o.radius) }; }
function normalizeAttendance(a){ return { ...a, id:Number(a.id), employeeId:Number(a.employeeId),
  // Sheets can hand the "date" column back as a full timestamp (e.g. if it
  // auto-converted the "yyyy-MM-dd" string into a real Date cell and a
  // timezone shift crept in on export). Always collapse it to the plain
  // yyyy-MM-dd prefix so `a.date === todayStr()` in myAttendanceToday()
  // keeps matching no matter what shape the backend returns. This is the
  // single source of truth every dashboard component (time clock badge,
  // check-in/out buttons, attendance summary) reads from, so fixing it
  // here keeps all of them in sync.
  date: String(a.date || '').slice(0, 10),
  checkOut: a.checkOut || null,
  location: (a.lat !== '' && a.lat != null && a.lat !== undefined) ? { lat:Number(a.lat), lng:Number(a.lng) } : null }; }
function normalizeLeave(l){ return { ...l, id:Number(l.id), employeeId:Number(l.employeeId) }; }
function normalizeTask(t){ return { ...t, id:Number(t.id), employeeId:Number(t.employeeId) }; }
function normalizeEod(r){ return { ...r, id:Number(r.id), employeeId:Number(r.employeeId) }; }
function normalizeExpense(x){ return { ...x, id:Number(x.id), amount:Number(x.amount) }; }
function normalizeIncome(x){ return { ...x, id:Number(x.id), amount:Number(x.amount) }; }

/** Re-fetch everything from the Sheet and replace local state with it.
 *  Called once at startup and after every write, so every dashboard is
 *  always showing what's actually in Google Sheets. No-op in offline mode. */
async function syncAll() {
  if (!USE_REMOTE) return;
  const data = await api('getAllData');
  employees = (data.employees || []).map(normalizeEmployee);
  offices = (data.offices || []).map(normalizeOffice);
  attendance = (data.attendance || []).map(normalizeAttendance);
  leaveRequests = (data.leaveRequests || []).map(normalizeLeave);
  dailyTasks = (data.dailyTasks || []).map(normalizeTask);
  eodReports = (data.eodReports || []).map(normalizeEod);
  businessExpenses = (data.expenses || []).map(normalizeExpense);
  clientIncome = (data.income || []).map(normalizeIncome);
  holidays = data.holidays && data.holidays.length ? data.holidays : holidays;
  announcements = data.announcements && data.announcements.length ? data.announcements : announcements;
}

/** Shared write helper: run the remote action + resync (Sheets mode) or
 *  the local fallback (offline mode), surface errors, then re-render. */
async function mutate(actionName, payload, localFn, msgEl) {
  try {
    if (USE_REMOTE) {
      await api(actionName, payload);
      await syncAll();
    } else {
      localFn();
    }
    renderApp();
  } catch (err) {
    console.error(err);
    if (msgEl) msgEl.innerHTML = `<div class="msg msg-err">Couldn't save to Google Sheets — ${err.message}</div>`;
  }
}

// ================= State =================
let currentUser = null;
let currentPage = 'dashboard';
// True while a check-in/check-out request is in flight. Read by
// renderEmployeeDashboard() to disable both buttons instantly (no waiting
// on the network round trip) and to block a second click from firing a
// duplicate request while the first is still pending.
let attendanceBusy = false;

// ================= Helpers =================
function haversine(lat1, lng1, lat2, lng2) {
  const R = 6371000;
  const toRad = d => d * Math.PI / 180;
  const dLat = toRad(lat2 - lat1), dLng = toRad(lng2 - lng1);
  const a = Math.sin(dLat/2)**2 + Math.cos(toRad(lat1))*Math.cos(toRad(lat2))*Math.sin(dLng/2)**2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
}
function officeFor(user){ return offices.find(o => o.id === user.officeId); }
function myAttendanceToday(user){ return attendance.find(a => a.employeeId === user.id && a.date === todayStr()); }
function hoursBetween(a,b){ return (new Date(b) - new Date(a)) / 3600000; }
function formatDuration(a,b){
  // Exact elapsed time between two ISO timestamps, shown as mins under an hour and "Xh Ym" beyond that.
  const totalMinutes = Math.round((new Date(b) - new Date(a)) / 60000);
  if (totalMinutes < 60) return `${totalMinutes} min${totalMinutes === 1 ? '' : 's'}`;
  const h = Math.floor(totalMinutes / 60);
  const m = totalMinutes % 60;
  return m === 0 ? `${h}h` : `${h}h ${m}m`;
}
function fmtTime(iso){ return iso ? new Date(iso).toLocaleTimeString([], {hour:'2-digit',minute:'2-digit'}) : '—'; }
function fmtDate(iso){ return iso ? new Date(iso).toLocaleDateString([], {month:'short',day:'numeric',year:'numeric'}) : '—'; }
// Live "Working Hours" counter shown in the Time Clock card: hh/mm/ss elapsed
// between an ISO check-in timestamp and a given point in time (now, while
// still checked in, or the check-out timestamp once the session is closed).
function formatElapsedHMS(checkInIso, toDate){
  const totalSeconds = Math.max(0, Math.floor((toDate - new Date(checkInIso)) / 1000));
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = totalSeconds % 60;
  const pad = n => String(n).padStart(2, '0');
  return `${pad(h)}h ${pad(m)}m ${pad(s)}s`;
}
function hasApprovedWfhToday(user){
  const today = todayStr();
  return leaveRequests.some(l => l.employeeId === user.id && l.type === 'Work From Home' && l.status === 'approved' && l.from <= today && today <= l.to);
}

// ================= Clock =================
function tick() {
  const now = new Date();
  const time = now.toLocaleTimeString([], { hour:'2-digit', minute:'2-digit', second:'2-digit' });
  const date = now.toLocaleDateString([], { weekday:'long', year:'numeric', month:'long', day:'numeric' });
  const hc = document.getElementById('hero-clock'); if (hc) { hc.textContent = time; document.getElementById('hero-date').textContent = date; }
  const ec = document.getElementById('emp-clock');
  if (ec) { ec.textContent = time; document.getElementById('emp-date').textContent = now.toLocaleDateString([], {weekday:'long', month:'short', day:'numeric'}); }

  // Working Hours: keep ticking every second from the actual stored
  // check-in timestamp, so it stays correct even after a page refresh.
  // Once checked out, data-checkout is set and the element already holds
  // the final, frozen duration rendered at check-out time — stop touching it.
  const wh = document.getElementById('working-hours');
  if (wh && wh.dataset.checkin && !wh.dataset.checkout) {
    wh.textContent = formatElapsedHMS(wh.dataset.checkin, now);
  }
}
setInterval(tick, 1000); tick();

// ================= Password visibility toggle =================
function togglePassword() {
  const input = document.getElementById('login-password');
  const btn = document.getElementById('password-toggle');
  const showing = input.type === 'text';
  input.type = showing ? 'password' : 'text';
  btn.textContent = showing ? '👁' : '🙈';
  btn.setAttribute('aria-label', showing ? 'Show password' : 'Hide password');
}

// ================= Auth =================
// Credentials are checked server-side (Apps Script 'login' action) in
// Sheets mode, so passwords never sit in a client-side array that a user
// could inspect — only the matched, password-stripped user comes back.
async function doLogin() {
  const email = document.getElementById('login-email').value.trim().toLowerCase();
  const pass = document.getElementById('login-password').value;
  const msgEl = document.getElementById('login-msg');
  const btn = document.querySelector('#login-screen .btn-purple');
  if (btn) btn.disabled = true;
  msgEl.innerHTML = USE_REMOTE ? '<div class="msg" style="background:var(--purple-tint);color:var(--purple-dark);">Checking Google Sheets…</div>' : '';
  try {
    let found;
    if (USE_REMOTE) {
      found = await api('login', { email, password: pass });
      if (found) await syncAll();
    } else {
      found = employees.find(e => e.email.toLowerCase() === email && e.password === pass);
    }
    if (!found) { msgEl.innerHTML = '<div class="msg msg-err">Invalid email or password.</div>'; return; }
    msgEl.innerHTML = '';
    currentUser = found;
    currentPage = 'dashboard';
    window.__workMode = 'office';
    document.getElementById('login-screen').style.display = 'none';
    document.getElementById('app-screen').style.display = 'block';
    renderApp();
  } catch (err) {
    console.error(err);
    msgEl.innerHTML = `<div class="msg msg-err">Couldn't reach Google Sheets — ${err.message}</div>`;
  } finally {
    if (btn) btn.disabled = false;
  }
}
function doLogout() {
  currentUser = null;
  document.getElementById('app-screen').style.display = 'none';
  document.getElementById('login-screen').style.display = 'grid';
  document.getElementById('login-msg').innerHTML = '';
}

// ================= Nav =================
const NAV = {
  admin: [ ['dashboard','▦','Dashboard'], ['employees','👥','Employees'], ['leave','📋','Leave Approvals',()=>leaveRequests.filter(l=>l.status==='pending').length], ['wfh','🏠','WFH Requests',()=>leaveRequests.filter(l=>l.status==='pending' && l.type==='Work From Home').length], ['deliverables','🗂','Deliverables'], ['finance','💰','Finance Tracker'], ['office','⚙','Office Settings'] ],
  employee: [ ['dashboard','▦','Dashboard'], ['leave','📅','Leave'], ['deliverables','🗂','Deliverables'] ],
};

function renderApp() {
  document.getElementById('sidebar-role').textContent = currentUser.role === 'admin' ? 'Admin Console' : 'Employee Portal';
  document.getElementById('user-name').textContent = currentUser.name;
  document.getElementById('user-code').textContent = currentUser.code;

  const navEl = document.getElementById('nav-list');
  navEl.innerHTML = NAV[currentUser.role === 'admin' ? 'admin' : 'employee'].map(([key,icon,label,countFn]) => {
    const count = countFn ? countFn() : 0;
    return `<div class="nav-item ${currentPage===key?'active':''}" onclick="setPage('${key}')">
      <span>${icon}</span>${label}${count ? `<span class="nav-badge">${count}</span>` : ''}
    </div>`;
  }).join('');

  document.getElementById('content').innerHTML =
    currentUser.role === 'admin' ? renderAdminPage() : renderEmployeePage();

  const syncEl = document.getElementById('sync-status');
  syncEl.textContent = USE_REMOTE
    ? '🟢 Connected to Google Sheets — data is read and saved live'
    : '⚪ Running on local demo data — set API_BASE_URL to connect Google Sheets (see SETUP.md)';
}
function setPage(key) { currentPage = key; renderApp(); closeSidebar(); }
function toggleSidebar() { document.getElementById('sidebar').classList.toggle('open'); document.getElementById('sidebar-overlay').classList.toggle('show'); }
function closeSidebar() { document.getElementById('sidebar').classList.remove('open'); document.getElementById('sidebar-overlay').classList.remove('show'); }

// ================= Admin pages =================
function renderAdminPage() {
  if (currentPage === 'employees') return renderEmployeesTable();
  if (currentPage === 'leave') return renderLeaveApprovals();
  if (currentPage === 'wfh') return renderWfhRequests();
  if (currentPage === 'deliverables') return renderAdminDeliverables();
  if (currentPage === 'finance') return renderFinanceTracker();
  if (currentPage === 'office') return renderOfficeSettings();
  return renderAdminDashboard();
}

// --- Admin: Dashboard (live stats + today's attendance) ---
function renderAdminDashboard() {
  const today = todayStr();
  const emps = employees.filter(e => e.role === 'employee');
  const presentToday = attendance.filter(a => a.date === today).length;
  const onLeaveToday = leaveRequests.filter(l => l.status === 'approved' && l.from <= today && today <= l.to).length;
  const absentToday = Math.max(emps.length - presentToday - onLeaveToday, 0);
  const lateArrivals = attendance.filter(a => a.date === today && new Date(a.checkIn).getHours()*60+new Date(a.checkIn).getMinutes() > 9*60+15).length;
  const underHours = attendance.filter(a => a.date === today && a.checkOut && hoursBetween(a.checkIn,a.checkOut) < 8).length;
  const pendingLeave = leaveRequests.filter(l => l.status === 'pending').length;

  const stats = [
    ['Total Employees', emps.length, '👥', 'tone-ink'],
    ['Present Today', presentToday, '✔', 'tone-purple'],
    ['Absent Today', absentToday, '✖', 'tone-coral'],
    ['On Leave Today', onLeaveToday, '🌴', 'tone-purple'],
    ['Late Arrivals', lateArrivals, '⏰', 'tone-coral'],
    ['Under 8 Hours', underHours, '⏳', 'tone-coral'],
    ['Pending Leave Requests', pendingLeave, '📋', 'tone-ink'],
  ];
  return `
    <h1 class="page-title">Admin Dashboard</h1>
    <p class="page-sub">Live — computed from the attendance records in this session.</p>
    <div class="stat-grid">
      ${stats.map(([label,value,icon,tone]) => `
        <div class="card stat-card"><div><p class="label">${label}</p><p class="stat-value">${value}</p></div><div class="icon-box ${tone}">${icon}</div></div>`).join('')}
    </div>
    <div class="card">
      <p class="label">Today's attendance</p>
      <div class="table-scroll">
      <table><thead><tr><th>Employee</th><th>Department</th><th>Mode</th><th>Check In</th><th>Check Out</th></tr></thead><tbody>
        ${attendance.filter(a=>a.date===today).map(a => {
          const e = employees.find(x=>x.id===a.employeeId);
          const modeLabel = a.mode === 'wfh' ? '🏠 WFH' : '🏢 Office';
          return `<tr><td>${e.name}</td><td>${e.department}</td><td>${modeLabel}</td><td>${fmtTime(a.checkIn)}</td><td>${fmtTime(a.checkOut)}</td></tr>`;
        }).join('') || '<tr><td colspan="5" class="placeholder">No one has checked in yet today.</td></tr>'}
      </tbody></table>
      </div>
    </div>
  `;
}

// --- Admin: Employees (list, add, remove) ---
function renderEmployeesTable() {
  return `
    <h1 class="page-title">Employees</h1>
    <p class="page-sub">${employees.length} people across ${new Set(employees.map(e=>e.department)).size} departments.</p>
    <div class="two-col">
      <div class="card">
        <div class="table-scroll">
        <table><thead><tr><th>Code</th><th>Name</th><th>Department</th><th>Role</th><th></th></tr></thead><tbody>
          ${employees.map(e => `<tr><td class="mono">${e.code}</td><td>${e.name}</td><td>${e.department}</td><td style="text-transform:capitalize">${e.role}</td>
            <td>${e.id === currentUser.id ? '' : `<button class="btn btn-outline" style="padding:5px 9px;font-size:11px;" onclick="removeEmployee(${e.id})">Remove</button>`}</td></tr>`).join('')}
        </tbody></table>
        </div>
      </div>
      <div class="card">
        <p class="label">Add employee</p>
        <div class="field"><label>Full name</label><input id="new-emp-name" /></div>
        <div class="field"><label>Email</label><input id="new-emp-email" type="email" /></div>
        <div class="field"><label>Password</label><input id="new-emp-password" value="Employee@123" /></div>
        <div class="form-row">
          <div class="field"><label>Department</label><input id="new-emp-dept" value="Engineering" /></div>
          <div class="field"><label>Role</label>
            <select id="new-emp-role"><option value="employee">Employee</option><option value="admin">Admin</option></select>
          </div>
        </div>
        <div id="new-emp-msg"></div>
        <button class="btn btn-purple" onclick="addEmployee()">Add employee</button>
      </div>
    </div>
  `;
}
async function addEmployee() {
  const name = document.getElementById('new-emp-name').value.trim();
  const email = document.getElementById('new-emp-email').value.trim().toLowerCase();
  const password = document.getElementById('new-emp-password').value;
  const department = document.getElementById('new-emp-dept').value.trim() || 'General';
  const role = document.getElementById('new-emp-role').value;
  const msgEl = document.getElementById('new-emp-msg');
  if (!name || !email || !password) { msgEl.innerHTML = '<div class="msg msg-err">Name, email, and password are required.</div>'; return; }
  if (employees.some(e => e.email.toLowerCase() === email)) { msgEl.innerHTML = '<div class="msg msg-err">That email is already in use.</div>'; return; }
  const id = nextEmployeeId++;
  const code = 'EMP-' + String(id).padStart(4, '0');
  await mutate('addEmployee',
    { id, code, name, email, password, role, department, officeId: 1, actorCode: currentUser.code, actorName: currentUser.name },
    () => { employees.push({ id, code, name, email, password, role, department, officeId: 1 }); },
    msgEl);
}
async function removeEmployee(id) {
  const emp = employees.find(e => e.id === id);
  if (!emp) return;
  if (!confirm(`Remove ${emp.name} (${emp.code})? Their attendance and leave history will stay in the sheet log.`)) return;
  await mutate('removeEmployee', { id },
    () => { employees.splice(employees.findIndex(e => e.id === id), 1); });
}

// --- Admin: Leave Approvals (all leave types, approve/reject) ---
function renderLeaveApprovals() {
  const rows = leaveRequests.map(l => {
    const e = employees.find(x=>x.id===l.employeeId);
    const badge = l.status === 'pending' ? 'badge-pending' : l.status === 'approved' ? 'badge-approved' : 'badge-rejected';
    const actions = l.status === 'pending'
      ? `<button class="btn btn-purple" style="padding:6px 10px;font-size:11px;" onclick="decideLeave(${l.id},'approved')">Approve</button>
         <button class="btn btn-outline" style="padding:6px 10px;font-size:11px;margin-left:6px;" onclick="decideLeave(${l.id},'rejected')">Reject</button>`
      : '';
    return `<tr><td>${e.name}</td><td>${l.type}</td><td>${l.from} → ${l.to}</td><td>${l.reason}</td>
      <td><span class="badge ${badge}">${l.status}</span></td><td>${actions}</td></tr>`;
  }).join('');
  return `
    <h1 class="page-title">Leave Approvals</h1>
    <p class="page-sub">Approve or reject — updates the employee's own status immediately.</p>
    <div class="card">
      <div class="table-scroll">
      <table><thead><tr><th>Employee</th><th>Type</th><th>Dates</th><th>Reason</th><th>Status</th><th></th></tr></thead>
      <tbody>${rows}</tbody></table>
      </div>
    </div>
  `;
}
async function decideLeave(id, status) {
  const l = leaveRequests.find(x => x.id === id);
  if (!l) return;
  await mutate('decideLeave', { id, status, actorCode: currentUser.code, actorName: currentUser.name },
    () => { l.status = status; });
}

// --- Admin: WFH Requests (approvals + GPS captured on WFH check-in) ---
function renderWfhRequests() {
  const wfh = leaveRequests.filter(l => l.type === 'Work From Home');
  const rows = wfh.map(l => {
    const e = employees.find(x=>x.id===l.employeeId);
    const badge = l.status === 'pending' ? 'badge-pending' : l.status === 'approved' ? 'badge-approved' : 'badge-rejected';
    const actions = l.status === 'pending'
      ? `<button class="btn btn-purple" style="padding:6px 10px;font-size:11px;" onclick="decideLeave(${l.id},'approved')">Approve</button>
         <button class="btn btn-outline" style="padding:6px 10px;font-size:11px;margin-left:6px;" onclick="decideLeave(${l.id},'rejected')">Reject</button>`
      : '';
    return `<tr><td>${e.name}</td><td>${l.from} → ${l.to}</td><td>${l.reason}</td>
      <td><span class="badge ${badge}">${l.status}</span></td><td>${actions}</td></tr>`;
  }).join('');

  const wfhCheckins = attendance.filter(a => a.mode === 'wfh');
  const locRows = wfhCheckins.map(a => {
    const e = employees.find(x=>x.id===a.employeeId);
    const loc = a.location ? `${a.location.lat.toFixed(4)}, ${a.location.lng.toFixed(4)}` : '—';
    return `<tr><td>${e ? e.name : '—'}</td><td>${a.date}</td><td>${fmtTime(a.checkIn)}</td><td class="mono">${loc}</td></tr>`;
  }).join('');

  return `
    <h1 class="page-title">WFH Requests</h1>
    <p class="page-sub">Approve or reject Work From Home requests, and see the GPS location captured when employees mark WFH attendance.</p>
    <div class="card">
      <p class="label">Requests</p>
      <div class="table-scroll">
      <table><thead><tr><th>Employee</th><th>Dates</th><th>Reason</th><th>Status</th><th></th></tr></thead>
      <tbody>${rows || '<tr><td colspan="5" class="placeholder">No WFH requests yet.</td></tr>'}</tbody></table>
      </div>
    </div>
    <div class="card">
      <p class="label">📍 WFH attendance — GPS captured</p>
      <div class="table-scroll">
      <table><thead><tr><th>Employee</th><th>Date</th><th>Check In</th><th>Location (lat, lng)</th></tr></thead>
      <tbody>${locRows || '<tr><td colspan="4" class="placeholder">No WFH attendance marked yet.</td></tr>'}</tbody></table>
      </div>
    </div>
  `;
}

// --- Admin: Deliverables (read-only view of all daily tasks + EOD reports) ---
function renderAdminDeliverables() {
  const taskRows = dailyTasks.slice().reverse().map(t => {
    const e = employees.find(x=>x.id===t.employeeId);
    const badge = t.status === 'completed' ? 'badge-approved' : 'badge-pending';
    return `<tr><td>${e ? e.name : '—'}</td><td>${t.date}</td><td>${t.task}</td><td><span class="badge ${badge}">${t.status}</span></td></tr>`;
  }).join('');
  const eodRows = eodReports.slice().reverse().map(r => {
    const e = employees.find(x=>x.id===r.employeeId);
    return `<tr><td>${e ? e.name : '—'}</td><td>${r.date}</td><td>${r.workCompleted}</td><td>${r.pendingTasks}</td></tr>`;
  }).join('');
  return `
    <h1 class="page-title">Deliverables</h1>
    <p class="page-sub">Daily tasks and end-of-day reports submitted across the team.</p>
    <div class="card">
      <p class="label">📝 Daily tasks</p>
      <div class="table-scroll">
      <table><thead><tr><th>Employee</th><th>Date</th><th>Task</th><th>Status</th></tr></thead>
      <tbody>${taskRows || '<tr><td colspan="4" class="placeholder">No tasks submitted yet.</td></tr>'}</tbody></table>
      </div>
    </div>
    <div class="card">
      <p class="label">📄 EOD reports</p>
      <div class="table-scroll">
      <table><thead><tr><th>Employee</th><th>Date</th><th>Work completed</th><th>Pending tasks</th></tr></thead>
      <tbody>${eodRows || '<tr><td colspan="4" class="placeholder">No EOD reports submitted yet.</td></tr>'}</tbody></table>
      </div>
    </div>
  `;
}

// --- Admin: Office Settings (geofence lat/lng/radius) ---
function renderOfficeSettings() {
  const o = offices[0];
  return `
    <h1 class="page-title">Office Settings</h1>
    <p class="page-sub">Changes here affect the geofence check employees hit immediately.</p>
    <div class="card" style="max-width:420px;">
      <div class="field"><label>Office name</label><input id="office-name" value="${o.name}" /></div>
      <div class="form-row">
        <div class="field"><label>Latitude</label><input id="office-lat" type="number" step="any" value="${o.lat}" /></div>
        <div class="field"><label>Longitude</label><input id="office-lng" type="number" step="any" value="${o.lng}" /></div>
      </div>
      <div class="field"><label>Radius (meters)</label><input id="office-radius" type="number" value="${o.radius}" /></div>
      <div id="office-msg"></div>
      <button class="btn btn-purple" onclick="saveOffice()">Save changes</button>
    </div>
  `;
}
async function saveOffice() {
  const o = offices[0];
  const msgEl = document.getElementById('office-msg');
  const name = document.getElementById('office-name').value;
  const lat = parseFloat(document.getElementById('office-lat').value);
  const lng = parseFloat(document.getElementById('office-lng').value);
  const radius = parseFloat(document.getElementById('office-radius').value);
  await mutate('updateOffice', { id: o.id, name, lat, lng, radius },
    () => { o.name = name; o.lat = lat; o.lng = lng; o.radius = radius; },
    msgEl);
  const el = document.getElementById('office-msg');
  if (el && !el.innerHTML) el.innerHTML = '<div class="msg msg-ok">Saved. Employees checking in now use these coordinates.</div>';
}

// --- Admin: Finance Tracker (Business Expenses + Client Income + P&L) ---
function financeMonth() { return window.__financeMonth || todayStr().slice(0,7); }
function inMonth(dateStr, month) { return (dateStr || '').slice(0,7) === month; }
function fmtMoney(n) { return '₹' + Number(n || 0).toLocaleString('en-IN'); }

function onFinanceMonthChange() {
  window.__financeMonth = document.getElementById('finance-month').value;
  renderApp();
}

function renderFinanceTracker() {
  const month = financeMonth();
  const monthExpenses = businessExpenses.filter(x => inMonth(x.date, month));
  const monthIncome = clientIncome.filter(x => inMonth(x.date, month));

  const totalExpenses = monthExpenses.reduce((s,x) => s + Number(x.amount||0), 0);
  const totalReceived = monthIncome.filter(x => x.paymentStatus === 'Received').reduce((s,x) => s + Number(x.amount||0), 0);
  const totalPending = monthIncome.filter(x => x.paymentStatus === 'Pending').reduce((s,x) => s + Number(x.amount||0), 0);
  const profit = totalReceived - totalExpenses;
  const margin = totalReceived > 0 ? (profit / totalReceived * 100) : (totalExpenses > 0 ? -100 : 0);

  const byCategory = {};
  monthExpenses.forEach(x => { byCategory[x.category] = (byCategory[x.category] || 0) + Number(x.amount||0); });
  const categoryRows = Object.entries(byCategory).sort((a,b) => b[1]-a[1])
    .map(([cat,total]) => `<tr><td>${cat}</td><td>${fmtMoney(total)}</td></tr>`).join('');

  const expenseRows = monthExpenses.slice().reverse().map(x => `
    <tr><td>${x.date}</td><td>${x.category}</td><td>${x.paidTo}</td><td>${x.description}</td><td>${fmtMoney(x.amount)}</td><td>${x.paidBy}</td>
      <td><button class="btn btn-outline" style="padding:4px 8px;font-size:10px;" onclick="removeExpense(${x.id})">✕</button></td></tr>`).join('');

  const incomeRows = monthIncome.slice().reverse().map(x => `
    <tr><td>${x.date}</td><td>${x.client}</td><td>${x.workService}</td><td>${fmtMoney(x.amount)}</td>
      <td><span class="badge ${x.paymentStatus==='Received'?'badge-approved':'badge-pending'}">${x.paymentStatus}</span></td><td>${x.notes||''}</td>
      <td><button class="btn btn-outline" style="padding:4px 8px;font-size:10px;" onclick="removeIncome(${x.id})">✕</button></td></tr>`).join('');

  return `
    <h1 class="page-title">Finance Tracker</h1>
    <p class="page-sub">Business expenses, client income, and profit &amp; loss — synced with the connected sheet.</p>

    <div class="card" style="max-width:220px;">
      <label>Month</label>
      <input id="finance-month" type="month" value="${month}" onchange="onFinanceMonthChange()" />
    </div>

    <div class="stat-grid">
      <div class="card stat-card"><div><p class="label">Income Received</p><p class="stat-value" style="color:var(--emerald)">${fmtMoney(totalReceived)}</p></div><div class="icon-box tone-purple">💵</div></div>
      <div class="card stat-card"><div><p class="label">Income Pending</p><p class="stat-value" style="color:#B92834">${fmtMoney(totalPending)}</p></div><div class="icon-box tone-coral">⏳</div></div>
      <div class="card stat-card"><div><p class="label">Total Expenses</p><p class="stat-value">${fmtMoney(totalExpenses)}</p></div><div class="icon-box tone-ink">🧾</div></div>
      <div class="card stat-card"><div><p class="label">Profit / (Loss)</p><p class="stat-value" style="color:${profit>=0?'var(--emerald)':'#B92834'}">${profit<0?'('+fmtMoney(Math.abs(profit))+')':fmtMoney(profit)}</p><p class="label" style="margin-top:4px;">${margin.toFixed(1)}% margin</p></div><div class="icon-box ${profit>=0?'tone-purple':'tone-coral'}">📈</div></div>
    </div>

    <div class="two-col">
      <div class="card">
        <p class="label">📝 Add business expense</p>
        <div class="form-row">
          <div class="field"><label>Date</label><input id="exp-date" type="date" value="${todayStr()}" /></div>
          <div class="field"><label>Category</label>
            <select id="exp-category">${EXPENSE_CATEGORIES.map(c=>`<option>${c}</option>`).join('')}</select>
          </div>
        </div>
        <div class="field"><label>Paid To / For</label><input id="exp-paidto" /></div>
        <div class="field"><label>Description</label><input id="exp-description" /></div>
        <div class="form-row">
          <div class="field"><label>Amount (₹)</label><input id="exp-amount" type="number" step="any" /></div>
          <div class="field"><label>Paid By</label>
            <select id="exp-paidby">${PAID_BY_OPTIONS.map(p=>`<option>${p}</option>`).join('')}</select>
          </div>
        </div>
        <div id="exp-msg"></div>
        <button class="btn btn-purple" onclick="addExpense()">Add expense</button>
      </div>
      <div class="card">
        <p class="label">📊 Expense breakdown — ${month}</p>
        <div class="table-scroll">
        <table><thead><tr><th>Category</th><th>Total</th></tr></thead>
        <tbody>${categoryRows || '<tr><td colspan="2" class="placeholder">No expenses logged for this month.</td></tr>'}</tbody></table>
        </div>
      </div>
    </div>

    <div class="card">
      <p class="label">🧾 Business expenses — ${month}</p>
      <div class="table-scroll">
      <table><thead><tr><th>Date</th><th>Category</th><th>Paid To/For</th><th>Description</th><th>Amount</th><th>Paid By</th><th></th></tr></thead>
      <tbody>${expenseRows || '<tr><td colspan="7" class="placeholder">No expenses logged for this month.</td></tr>'}</tbody></table>
      </div>
    </div>

    <div class="two-col">
      <div class="card">
        <p class="label">💵 Add client income</p>
        <div class="form-row">
          <div class="field"><label>Date</label><input id="inc-date" type="date" value="${todayStr()}" /></div>
          <div class="field"><label>Payment Status</label>
            <select id="inc-status">${PAYMENT_STATUS_OPTIONS.map(s=>`<option>${s}</option>`).join('')}</select>
          </div>
        </div>
        <div class="field"><label>Client</label><input id="inc-client" /></div>
        <div class="field"><label>Work / Service</label><input id="inc-work" /></div>
        <div class="form-row">
          <div class="field"><label>Amount (₹)</label><input id="inc-amount" type="number" step="any" /></div>
          <div class="field"><label>Notes</label><input id="inc-notes" /></div>
        </div>
        <div id="inc-msg"></div>
        <button class="btn btn-purple" onclick="addIncome()">Add income</button>
      </div>
      <div class="card">
        <p class="label">💵 Client income — ${month}</p>
        <div class="table-scroll">
        <table><thead><tr><th>Date</th><th>Client</th><th>Work/Service</th><th>Amount</th><th>Status</th><th>Notes</th><th></th></tr></thead>
        <tbody>${incomeRows || '<tr><td colspan="7" class="placeholder">No income logged for this month.</td></tr>'}</tbody></table>
        </div>
      </div>
    </div>
  `;
}

async function addExpense() {
  const date = document.getElementById('exp-date').value;
  const category = document.getElementById('exp-category').value;
  const paidTo = document.getElementById('exp-paidto').value.trim();
  const description = document.getElementById('exp-description').value.trim();
  const amount = parseFloat(document.getElementById('exp-amount').value);
  const paidBy = document.getElementById('exp-paidby').value;
  const msgEl = document.getElementById('exp-msg');
  if (!date || !paidTo || isNaN(amount) || amount <= 0) { msgEl.innerHTML = '<div class="msg msg-err">Date, Paid To/For, and a valid amount are required.</div>'; return; }
  await mutate('addExpense',
    { date, category, paidTo, description, amount, paidBy, actorCode: currentUser.code, actorName: currentUser.name },
    () => { businessExpenses.push({ id: nextExpenseId++, date, category, paidTo, description, amount, paidBy }); },
    msgEl);
}
async function removeExpense(id) {
  if (!confirm('Remove this expense entry?')) return;
  await mutate('removeExpense', { id },
    () => { businessExpenses.splice(businessExpenses.findIndex(x => x.id === id), 1); });
}

async function addIncome() {
  const date = document.getElementById('inc-date').value;
  const client = document.getElementById('inc-client').value.trim();
  const workService = document.getElementById('inc-work').value.trim();
  const amount = parseFloat(document.getElementById('inc-amount').value);
  const paymentStatus = document.getElementById('inc-status').value;
  const notes = document.getElementById('inc-notes').value.trim();
  const msgEl = document.getElementById('inc-msg');
  if (!date || !client || isNaN(amount) || amount <= 0) { msgEl.innerHTML = '<div class="msg msg-err">Date, Client, and a valid amount are required.</div>'; return; }
  await mutate('addIncome',
    { date, client, workService, amount, paymentStatus, notes, actorCode: currentUser.code, actorName: currentUser.name },
    () => { clientIncome.push({ id: nextIncomeId++, date, client, workService, amount, paymentStatus, notes }); },
    msgEl);
}
async function removeIncome(id) {
  if (!confirm('Remove this income entry?')) return;
  await mutate('removeIncome', { id },
    () => { clientIncome.splice(clientIncome.findIndex(x => x.id === id), 1); });
}

// ================= Employee pages =================
function renderEmployeePage() {
  if (currentPage === 'leave') return renderMyLeave();
  if (currentPage === 'deliverables') return renderDeliverables();
  return renderEmployeeDashboard();
}

// --- Employee: Dashboard (time clock, WFH mode, attendance summary) ---
function renderEmployeeDashboard() {
  const office = officeFor(currentUser);
  const rec = myAttendanceToday(currentUser);
  const status = !rec ? 'Not Checked In' : !rec.checkOut ? (rec.mode === 'wfh' ? 'Present (WFH)' : 'Present') : 'Checked Out';
  const badgeClass = status.startsWith('Present') ? 'badge-approved' : status === 'Checked Out' ? 'badge-none' : 'badge-none';
  const mode = window.__workMode || 'office';
  const canWfh = hasApprovedWfhToday(currentUser);

  const myAttendance = attendance.filter(a => a.employeeId === currentUser.id);
  const complete = myAttendance.filter(a => a.checkOut && hoursBetween(a.checkIn,a.checkOut) >= 8).length;
  const incomplete = myAttendance.filter(a => a.checkOut && hoursBetween(a.checkIn,a.checkOut) < 8).length;
  const pendingLeave = leaveRequests.filter(l => l.employeeId === currentUser.id && l.status === 'pending').length;

  const myLeaves = leaveRequests.filter(l => l.employeeId === currentUser.id).slice(-3);
  const myAttendanceHistory = myAttendance.slice().reverse().slice(0, 8);

  return `
    <h1 class="page-title">Welcome back, ${currentUser.name.split(' ')[0]}</h1>
    <p class="page-sub">Office: ${office.name} — geofence ${office.radius}m radius.</p>
    <div class="two-col" style="margin-bottom:20px;">
      <div class="card">
        <p class="label">Time clock</p>

        <div style="margin-top:10px;">
          <p class="label" style="margin-bottom:4px;">Current Time</p>
          <p class="clock-time mono" id="emp-clock">--:--:--</p>
          <p class="clock-date" id="emp-date"></p>
        </div>

        <div style="margin-top:16px;">
          <p class="label" style="margin-bottom:4px;">Status</p>
          <span class="badge ${badgeClass}" id="status-badge">${status}</span>
        </div>

        ${rec ? `
        <div style="margin-top:16px;">
          <p class="label" style="margin-bottom:4px;">Working Hours</p>
          <p class="clock-time mono" id="working-hours" data-checkin="${rec.checkIn}" data-checkout="${rec.checkOut || ''}">${formatElapsedHMS(rec.checkIn, rec.checkOut ? new Date(rec.checkOut) : new Date())}</p>
        </div>
        ` : ''}

        <div class="field" style="margin-top:14px;">
          <label>Work mode</label>
          <select id="work-mode" onchange="onWorkModeChange()">
            <option value="office" ${mode==='office'?'selected':''}>🏢 Office</option>
            <option value="wfh" ${mode==='wfh'?'selected':''}>🏠 Work From Home</option>
          </select>
        </div>

        ${mode === 'wfh' && !canWfh ? `
          <div class="msg msg-err">You don't have an approved Work From Home request for today. Submit one from the Leave page — an admin needs to approve it before WFH attendance can be marked.</div>
        ` : ''}

        <div class="form-row" style="margin-top:6px;">
          <div class="field"><label>Latitude</label><input id="my-lat" type="number" step="any" value="${mode==='wfh' ? '' : office.lat}" /></div>
          <div class="field"><label>Longitude</label><input id="my-lng" type="number" step="any" value="${mode==='wfh' ? '' : office.lng}" /></div>
        </div>
        <button class="btn btn-outline" style="width:100%;margin-bottom:10px;" onclick="useMyLocation()">📍 Use my real GPS location</button>
        <div style="display:flex; gap:10px;">
          <button class="btn btn-purple" id="checkin-btn" style="flex:1" onclick="checkIn()" ${rec || attendanceBusy || (mode==='wfh' && !canWfh) ? 'disabled' : ''}>${attendanceBusy && !rec ? 'Checking in…' : 'Check In'}</button>
          <button class="btn btn-outline" id="checkout-btn" style="flex:1" onclick="checkOut()" ${(!rec || rec.checkOut || attendanceBusy) ? 'disabled' : ''}>${attendanceBusy && rec && !rec.checkOut ? 'Checking out…' : 'Check Out'}</button>
        </div>
        <div id="attendance-msg"></div>
        <p style="font-size:11px;color:rgba(46,18,69,.35);margin-top:10px;">
          ${mode === 'wfh'
            ? 'WFH mode: your GPS location is captured and stored with your check-in for the admin to see — no office geofence is enforced.'
            : `The office is set to ${office.lat.toFixed(4)}, ${office.lng.toFixed(4)}. The fields above default to those coordinates so check-in succeeds out of the box — edit them (or use your real GPS) to test the geofence for real.`}
        </p>
      </div>

      <div class="card">
        <p class="label">This month</p>
        <div class="stat-grid stat-grid-3">
          <div class="card stat-card" style="background:var(--emerald-tint);border:none;box-shadow:none;padding:14px;"><div><p class="stat-value" style="color:var(--emerald)">${complete}</p><p class="label" style="color:var(--emerald)">Complete Days</p></div></div>
          <div class="card stat-card" style="background:var(--coral-tint);border:none;box-shadow:none;padding:14px;"><div><p class="stat-value" style="color:#B92834">${incomplete}</p><p class="label" style="color:#B92834">Incomplete Days</p></div></div>
          <div class="card stat-card" style="background:var(--purple-tint);border:none;box-shadow:none;padding:14px;"><div><p class="stat-value" style="color:var(--purple)">${pendingLeave}</p><p class="label" style="color:var(--purple)">Pending Leave</p></div></div>
        </div>
        <p class="label">Recent leave requests</p>
        ${myLeaves.map(l => `<div class="row"><div><p class="row-title">${l.type}</p><p class="row-sub">${l.from} → ${l.to}</p></div><span class="badge ${l.status==='approved'?'badge-approved':l.status==='pending'?'badge-pending':'badge-rejected'}">${l.status}</span></div>`).join('') || '<p class="placeholder">No leave requests yet.</p>'}
      </div>
    </div>

    <div class="two-col">
      <div class="card">
        <p class="label">🗓 Attendance summary</p>
        <div class="table-scroll">
        <table><thead><tr><th>Date</th><th>Check-In</th><th>Check-Out</th><th>Total Hours</th></tr></thead><tbody>
          ${myAttendanceHistory.map(a => {
            const hrs = a.checkOut ? formatDuration(a.checkIn, a.checkOut) : '—';
            return `<tr><td>${a.date}${a.mode==='wfh' ? ' <span class="badge badge-none" style="font-size:9px;">WFH</span>' : ''}</td><td>${fmtTime(a.checkIn)}</td><td>${fmtTime(a.checkOut)}</td><td>${hrs}</td></tr>`;
          }).join('') || '<tr><td colspan="4" class="placeholder">No attendance records yet.</td></tr>'}
        </tbody></table>
        </div>
      </div>
      <div class="card">
        <p class="label">📣 Announcements</p>
        ${announcements.map(a => `<p style="font-size:14px;color:rgba(46,18,69,.7);">${a}</p>`).join('')}
      </div>
    </div>
  `;
}

function onWorkModeChange() {
  window.__workMode = document.getElementById('work-mode').value;
  renderApp();
}

function useMyLocation() {
  const msgEl = document.getElementById('attendance-msg');
  if (!navigator.geolocation) { msgEl.innerHTML = '<div class="msg msg-err">Geolocation isn\'t available in this browser.</div>'; return; }
  navigator.geolocation.getCurrentPosition(
    pos => {
      document.getElementById('my-lat').value = pos.coords.latitude;
      document.getElementById('my-lng').value = pos.coords.longitude;
      msgEl.innerHTML = '<div class="msg msg-ok">Location captured.</div>';
    },
    err => { msgEl.innerHTML = `<div class="msg msg-err">Couldn't get your location (${err.message}). Type coordinates manually instead.</div>`; }
  );
}

// --- Attendance Summary: Check In / Check Out (office geofence or WFH+GPS) ---
async function checkIn() {
  // Guard against duplicate submissions: if a check-in is already in
  // flight (or one somehow slipped through, e.g. a stale double-click),
  // bail out instead of firing a second request.
  if (attendanceBusy || myAttendanceToday(currentUser)) return;

  const office = officeFor(currentUser);
  const mode = document.getElementById('work-mode').value;
  const lat = parseFloat(document.getElementById('my-lat').value);
  const lng = parseFloat(document.getElementById('my-lng').value);
  const msgEl = document.getElementById('attendance-msg');

  if (mode === 'wfh') {
    if (!hasApprovedWfhToday(currentUser)) {
      msgEl.innerHTML = '<div class="msg msg-err">No approved Work From Home request for today — ask an admin to approve one first.</div>';
      return;
    }
    if (isNaN(lat) || isNaN(lng)) {
      msgEl.innerHTML = '<div class="msg msg-err">Capture your GPS location (or enter it manually) before checking in.</div>';
      return;
    }
    const checkInTime = new Date().toISOString();
    const date = todayStr();
    attendanceBusy = true;
    renderApp(); // instantly disable both buttons while the request is in flight
    const freshMsgEl = document.getElementById('attendance-msg');
    if (freshMsgEl) freshMsgEl.innerHTML = `<div class="msg msg-ok">Checked in from home — GPS location (${lat.toFixed(4)}, ${lng.toFixed(4)}) recorded for the admin.</div>`;
    try {
      await mutate('checkIn',
        { employeeId: currentUser.id, employeeCode: currentUser.code, employeeName: currentUser.name, date, checkIn: checkInTime, mode: 'wfh', lat, lng },
        () => { attendance.push({ id: attendance.length + 1, employeeId: currentUser.id, date, checkIn: checkInTime, checkOut: null, mode: 'wfh', location: { lat, lng } }); },
        freshMsgEl);
    } finally {
      attendanceBusy = false;
      renderApp(); // re-render once more so a failed request re-enables Check In
    }
    return;
  }

  const dist = haversine(lat, lng, office.lat, office.lng);
  if (dist > office.radius) {
    msgEl.innerHTML = `<div class="msg msg-err">Outside office premises — you're ${Math.round(dist)}m away, allowed radius is ${office.radius}m.</div>`;
    return;
  }
  const checkInTime = new Date().toISOString();
  const date = todayStr();
  attendanceBusy = true;
  renderApp(); // instantly disable both buttons while the request is in flight
  const freshMsgEl = document.getElementById('attendance-msg');
  if (freshMsgEl) freshMsgEl.innerHTML = `<div class="msg msg-ok">Checked in — ${Math.round(dist)}m from office, within range.</div>`;
  try {
    await mutate('checkIn',
      { employeeId: currentUser.id, employeeCode: currentUser.code, employeeName: currentUser.name, date, checkIn: checkInTime, mode: 'office', lat, lng, distanceMeters: Math.round(dist) },
      () => { attendance.push({ id: attendance.length + 1, employeeId: currentUser.id, date, checkIn: checkInTime, checkOut: null, mode: 'office', location: { lat, lng } }); },
      freshMsgEl);
  } finally {
    attendanceBusy = false;
    renderApp(); // re-render once more so a failed request re-enables Check In
  }
}
async function checkOut() {
  const rec = myAttendanceToday(currentUser);
  if (!rec || rec.checkOut || attendanceBusy) return;
  const checkOutTime = new Date().toISOString();
  const hoursWorked = Math.round(hoursBetween(rec.checkIn, checkOutTime) * 100) / 100;
  attendanceBusy = true;
  renderApp(); // instantly disable both buttons while the request is in flight
  try {
    await mutate('checkOut',
      { employeeId: currentUser.id, employeeCode: currentUser.code, employeeName: currentUser.name, date: rec.date, checkOut: checkOutTime, hoursWorked },
      () => { rec.checkOut = checkOutTime; });
  } finally {
    attendanceBusy = false;
    renderApp(); // re-render once more so a failed request re-enables Check Out
  }
}

// --- Employee: Leave Module (submit request, view own history) ---
function renderMyLeave() {
  const myLeaves = leaveRequests.filter(l => l.employeeId === currentUser.id);
  return `
    <h1 class="page-title">Leave</h1>
    <p class="page-sub">Submit a request — it lands in the admin's approval queue immediately.</p>
    <div class="two-col">
      <div class="card">
        <p class="label">New request</p>
        <div class="field"><label>Type</label>
          <select id="leave-type"><option>Casual Leave</option><option>Sick Leave</option><option>Work From Home</option></select>
        </div>
        <div class="form-row">
          <div class="field"><label>From</label><input id="leave-from" type="date" /></div>
          <div class="field"><label>To</label><input id="leave-to" type="date" /></div>
        </div>
        <div class="field"><label>Reason</label><textarea id="leave-reason" rows="3"></textarea></div>
        <div id="leave-msg"></div>
        <button class="btn btn-purple" onclick="submitLeave()">Submit request</button>
      </div>
      <div class="card">
        <p class="label">Your requests</p>
        ${myLeaves.map(l => `<div class="row"><div><p class="row-title">${l.type}</p><p class="row-sub">${l.from} → ${l.to} — ${l.reason}</p></div><span class="badge ${l.status==='approved'?'badge-approved':l.status==='pending'?'badge-pending':'badge-rejected'}">${l.status}</span></div>`).join('') || '<p class="placeholder">No requests yet.</p>'}
      </div>
    </div>
  `;
}
async function submitLeave() {
  const type = document.getElementById('leave-type').value;
  const from = document.getElementById('leave-from').value;
  const to = document.getElementById('leave-to').value;
  const reason = document.getElementById('leave-reason').value.trim() || '—';
  const msgEl = document.getElementById('leave-msg');
  if (!from || !to) { msgEl.innerHTML = '<div class="msg msg-err">Pick both dates.</div>'; return; }
  if (to < from) { msgEl.innerHTML = '<div class="msg msg-err">"To" date can\'t be before "From" date.</div>'; return; }
  await mutate('submitLeave',
    { employeeId: currentUser.id, employeeCode: currentUser.code, employeeName: currentUser.name, type, from, to, reason },
    () => { leaveRequests.push({ id: nextLeaveId++, employeeId: currentUser.id, type, from, to, reason, status: 'pending' }); },
    msgEl);
}

// ================= Deliverables (Employee) =================
function renderDeliverables() {
  const myPendingTasks = dailyTasks
    .filter(t => t.employeeId === currentUser.id && t.status !== 'completed')
    .slice()
    .sort((a, b) => a.date < b.date ? -1 : a.date > b.date ? 1 : a.id - b.id); // oldest pending first
  const myEods = eodReports.filter(r => r.employeeId === currentUser.id).slice().reverse();
  return `
    <h1 class="page-title">Deliverables</h1>
    <p class="page-sub">Log your daily tasks and submit your end-of-day report.</p>
    <div class="two-col">
      <div class="card">
        <p class="label">📝 Add daily task</p>
        <div class="field"><label>Task</label><textarea id="task-description" rows="3"></textarea></div>
        <div class="field"><label>Date</label><input id="task-date" type="date" value="${todayStr()}" /></div>
        <div id="task-msg"></div>
        <button class="btn btn-purple" onclick="submitDailyTask()">Add task</button>
      </div>
      <div class="card">
        <p class="label">Your tasks <span style="font-weight:400;text-transform:none;color:rgba(46,18,69,.4);">— pending only</span></p>
        ${myPendingTasks.map(t => `<div class="row"><div><p class="row-title">${t.task}</p><p class="row-sub">${t.date}</p></div>
          <button class="btn btn-outline" style="padding:5px 9px;font-size:11px;" onclick="markTaskComplete(${t.id})">Mark done</button></div>`).join('') || '<p class="placeholder">No pending tasks — you\'re all caught up.</p>'}
      </div>
    </div>

    <div class="two-col" style="margin-top:20px;">
      <div class="card">
        <p class="label">📄 Submit EOD report</p>
        <div class="field"><label>Date</label><input id="eod-date" type="date" value="${todayStr()}" /></div>
        <div class="field"><label>Work completed</label><textarea id="eod-completed" rows="3"></textarea></div>
        <div class="field"><label>Pending tasks</label><textarea id="eod-pending" rows="3"></textarea></div>
        <div id="eod-msg"></div>
        <button class="btn btn-purple" onclick="submitEodReport()">Submit EOD report</button>
      </div>
      <div class="card">
        <p class="label">Your EOD reports</p>
        ${myEods.map(r => `<div class="eod-entry"><p class="eod-date">${r.date}</p><p class="eod-line"><b>Done:</b> ${r.workCompleted}</p><p class="eod-line"><b>Pending:</b> ${r.pendingTasks}</p></div>`).join('') || '<p class="placeholder">No EOD reports submitted yet.</p>'}
      </div>
    </div>
  `;
}

async function submitDailyTask() {
  const task = document.getElementById('task-description').value.trim();
  const date = document.getElementById('task-date').value;
  const msgEl = document.getElementById('task-msg');
  if (!task || !date) { msgEl.innerHTML = '<div class="msg msg-err">Task and date are required.</div>'; return; }
  await mutate('addDailyTask',
    { employeeId: currentUser.id, employeeCode: currentUser.code, employeeName: currentUser.name, task, date },
    () => { dailyTasks.push({ id: nextTaskId++, employeeId: currentUser.id, task, date, status: 'pending' }); },
    msgEl);
}

async function markTaskComplete(id) {
  const t = dailyTasks.find(x => x.id === id);
  if (!t) return;
  await mutate('completeDailyTask', { id },
    () => { t.status = 'completed'; });
}

async function submitEodReport() {
  const date = document.getElementById('eod-date').value;
  const workCompleted = document.getElementById('eod-completed').value.trim();
  const pendingTasks = document.getElementById('eod-pending').value.trim() || '—';
  const msgEl = document.getElementById('eod-msg');
  if (!date || !workCompleted) { msgEl.innerHTML = '<div class="msg msg-err">Date and work completed are required.</div>'; return; }
  await mutate('submitEodReport',
    { employeeId: currentUser.id, employeeCode: currentUser.code, employeeName: currentUser.name, date, workCompleted, pendingTasks },
    () => { eodReports.push({ id: nextEodId++, employeeId: currentUser.id, date, workCompleted, pendingTasks }); },
    msgEl);
}
