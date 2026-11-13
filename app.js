'use strict';
/* দোকান খাতা — মোবাইল ব্যাংকিং ও রিচার্জ দোকানের হিসাবের খাতা।
   সব ডেটা শুধু এই ডিভাইসের localStorage-এ থাকে। */

const KEY = 'dokan-khata-v1';
const MONTHS = ['জানুয়ারি','ফেব্রুয়ারি','মার্চ','এপ্রিল','মে','জুন','জুলাই','আগস্ট','সেপ্টেম্বর','অক্টোবর','নভেম্বর','ডিসেম্বর'];
const CATS = ['দোকান ভাড়া','বিদ্যুৎ বিল','চা-নাস্তা','যাতায়াত','কর্মচারী বেতন','ইন্টারনেট/মোবাইল','অন্যান্য'];

// types: কোন ধরনের অ্যাকাউন্টে হয় | com: কমিশন রেটের ঘর | num: কাস্টমার নম্বর | due: বাকিতে দেওয়া যায় | cust: কাস্টমার লাগবেই
const KIND = {
  cashin:  {n:'ক্যাশ ইন', ic:'↗', types:['mfs'], com:'rIn', num:1, due:1, hint:'কাস্টমার নগদ টাকা দিল, আপনি তার নম্বরে টাকা পাঠালেন। ব্যালেন্স কমবে, ক্যাশ বাড়বে।'},
  cashout: {n:'ক্যাশ আউট', ic:'↙', types:['mfs'], com:'rOut', num:1, hint:'কাস্টমার আপনার নম্বরে টাকা পাঠাল, আপনি নগদ টাকা দিলেন। ব্যালেন্স বাড়বে, ক্যাশ কমবে।'},
  recharge:{n:'রিচার্জ', ic:'⚡', types:['telecom'], com:'rIn', num:1, due:1, hint:'কাস্টমারের নম্বরে লোড দিলেন। লোড ব্যালেন্স কমবে, ক্যাশ বাড়বে।'},
  expense: {n:'খরচ', ic:'−', hint:'দোকানের খরচ ক্যাশ থেকে বাদ যাবে এবং লাভ থেকে কমবে।'},
  buy:     {n:'ব্যালেন্স কেনা', ic:'⇩', types:['mfs','telecom'], hint:'ডিলার/ডিএসও থেকে ব্যালেন্স নিলেন, নগদ টাকা দিলেন। ব্যালেন্স বাড়বে, ক্যাশ কমবে।'},
  sell:    {n:'ব্যালেন্স ফেরত', ic:'⇧', types:['mfs','telecom'], hint:'ডিলার/ডিএসওকে ব্যালেন্স দিলেন, নগদ টাকা পেলেন। ব্যালেন্স কমবে, ক্যাশ বাড়বে।'},
  duepay:  {n:'বাকি আদায়', ic:'✓', cust:1, hint:'কাস্টমার বাকির টাকা দিল। ক্যাশ বাড়বে, তার বাকি কমবে।'},
  duegive: {n:'নগদ বাকি দেওয়া', ic:'⏳', cust:1, hint:'কাউকে নগদ টাকা ধার/বাকি দিলেন। ক্যাশ কমবে, তার বাকি বাড়বে।'},
  income:  {n:'অন্যান্য আয়', ic:'+', hint:'অন্য কোনো আয় (যেমন বাড়তি সার্ভিস চার্জ)। ক্যাশ ও লাভ দুটোই বাড়বে।'},
  capin:   {n:'মূলধন যোগ', ic:'＋', hint:'ব্যবসায় নিজের টাকা ঢোকালেন। ক্যাশ বাড়বে।'},
  capout:  {n:'মালিকের উত্তোলন', ic:'⤴', hint:'ব্যবসা থেকে নিজের জন্য টাকা নিলেন। ক্যাশ কমবে।'},
  adjust:  {n:'ব্যালেন্স সমন্বয়', ic:'≈'}
};

const DEFAULT_ACCOUNTS = [
  {id:'cash', name:'ক্যাশ (নগদ টাকা)', type:'cash', color:'#0f766e', open:0},
  {id:'bkash', name:'বিকাশ', type:'mfs', color:'#e2136e', open:0, rIn:4.1, rOut:4.1},
  {id:'nagad', name:'নগদ', type:'mfs', color:'#ec6d1d', open:0, rIn:4.1, rOut:4.1},
  {id:'rocket', name:'রকেট', type:'mfs', color:'#8c3494', open:0, rIn:4.1, rOut:4.1},
  {id:'upay', name:'উপায়', type:'mfs', color:'#c79a00', open:0, rIn:4, rOut:4},
  {id:'gp', name:'গ্রামীণফোন', type:'telecom', color:'#1a8fd6', open:0, rIn:27.5},
  {id:'robi', name:'রবি', type:'telecom', color:'#d91e2a', open:0, rIn:27.5},
  {id:'airtel', name:'এয়ারটেল', type:'telecom', color:'#9f1239', open:0, rIn:27.5},
  {id:'bl', name:'বাংলালিংক', type:'telecom', color:'#f08a00', open:0, rIn:27.5},
  {id:'tt', name:'টেলিটক', type:'telecom', color:'#4d9a2a', open:0, rIn:27.5}
];

/* ---------- ছোট সহায়ক ---------- */
const $ = (s, r = document) => r.querySelector(s);
const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const bn = s => String(s).replace(/\d/g, d => '০১২৩৪৫৬৭৮৯'[d]);
const num = s => {
  const t = String(s ?? '').replace(/[০-৯]/g, d => '০১২৩৪৫৬৭৮৯'.indexOf(d)).replace(/[^\d.\-]/g, '');
  const n = parseFloat(t);
  return isFinite(n) ? n : 0;
};
const r2 = n => Math.round(n * 100) / 100;
const money = n => {
  n = r2(n) || 0;
  return (n < 0 ? '−' : '') + '৳' + bn(Math.abs(n).toLocaleString('en-IN', {maximumFractionDigits: 2}));
};
const ymd = d => d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
const today = () => ymd(new Date());
const addDays = (s, n) => { const d = new Date(s + 'T12:00:00'); d.setDate(d.getDate() + n); return ymd(d); };
const fdate = s => { const [y, m, d] = s.split('-'); return bn(+d) + ' ' + MONTHS[m - 1] + ' ' + bn(y); };
const ftime = t => { const d = new Date(t); let h = d.getHours(); const ap = h < 12 ? 'AM' : 'PM'; h = h % 12 || 12; return bn(h + ':' + String(d.getMinutes()).padStart(2, '0')) + ' ' + ap; };
const sum = a => a.reduce((s, v) => s + v, 0);

let toastT;
function toast(msg) {
  const el = $('#toast'); el.textContent = msg; el.classList.add('show');
  clearTimeout(toastT); toastT = setTimeout(() => el.classList.remove('show'), 2400);
}

/* ---------- ডেটা ---------- */
let db = load();
function load() {
  try {
    const d = JSON.parse(localStorage.getItem(KEY));
    if (d && Array.isArray(d.accounts) && Array.isArray(d.tx)) {
      d.customers = d.customers || []; d.settings = d.settings || {};
      return d;
    }
  } catch (e) { /* নতুন করে শুরু */ }
  return {v: 1, accounts: JSON.parse(JSON.stringify(DEFAULT_ACCOUNTS)), tx: [], customers: [], settings: {shop: '', setup: false}};
}
function save() {
  try { localStorage.setItem(KEY, JSON.stringify(db)); }
  catch (e) { alert('ডেটা সেভ করা যায়নি! ফোনের জায়গা খালি আছে কি না দেখুন এবং ব্যাকআপ নিন।'); }
}
const acc = id => db.accounts.find(a => a.id === id);
const cust = id => db.customers.find(c => c.id === id);
const accName = id => acc(id)?.name || 'মুছে ফেলা অ্যাকাউন্ট';
const custName = id => cust(id)?.name || 'অজানা কাস্টমার';

// একটি লেনদেনে কোথায় কত যোগ-বিয়োগ হয়
function fx(x) {
  const a = x.amt, d = x.due || 0, c = x.com || 0;
  switch (x.kind) {
    case 'cashin': case 'recharge': return {acc: -a, cash: a - d, due: d, profit: c};
    case 'cashout': return {acc: a, cash: -a, due: 0, profit: c};
    case 'buy': return {acc: a, cash: -a, due: 0, profit: 0};
    case 'sell': return {acc: -a, cash: a, due: 0, profit: 0};
    case 'expense': return {acc: 0, cash: -a, due: 0, profit: -a};
    case 'income': return {acc: 0, cash: a, due: 0, profit: a};
    case 'capin': return {acc: 0, cash: a, due: 0, profit: 0};
    case 'capout': return {acc: 0, cash: -a, due: 0, profit: 0};
    case 'duepay': return {acc: 0, cash: a, due: -a, profit: 0};
    case 'duegive': return {acc: 0, cash: -a, due: a, profit: 0};
    case 'adjust': return x.acc === 'cash' ? {acc: 0, cash: a, due: 0, profit: 0} : {acc: a, cash: 0, due: 0, profit: 0};
  }
  return {acc: 0, cash: 0, due: 0, profit: 0};
}
function compute(list = db.tx) {
  const bal = {}, due = {};
  db.accounts.forEach(a => bal[a.id] = +a.open || 0);
  db.customers.forEach(c => due[c.id] = 0);
  for (const x of list) {
    const e = fx(x);
    bal.cash += e.cash;
    if (x.acc && x.acc !== 'cash' && x.acc in bal) bal[x.acc] += e.acc;
    if (x.cust && e.due) due[x.cust] = (due[x.cust] || 0) + e.due;
  }
  for (const k in bal) bal[k] = r2(bal[k]);
  for (const k in due) due[k] = r2(due[k]);
  return {bal, due};
}
const sorted = list => list.slice().sort((a, b) => a.d < b.d ? 1 : a.d > b.d ? -1 : b.t - a.t);

/* ---------- ভিউ ---------- */
let V = {name: 'home'};
let L = {range: 'today', from: today(), to: today(), acc: '', q: ''};   // খাতার ফিল্টার
let R = {range: 'today', from: today(), to: today()};                   // রিপোর্টের ফিল্টার

function go(name, arg) { V = {name, arg}; render(); window.scrollTo(0, 0); }
function render() {
  if (!db.settings.setup) V = {name: 'setup'};
  const views = {home: vHome, list: vList, due: vDue, more: vMore, report: vReport, recon: vRecon, accounts: vAccounts, customer: vCustomer, setup: vSetup};
  $('#app').innerHTML = (views[V.name] || vHome)();
  $('#nav').hidden = V.name === 'setup';
  const tab = {report: 'more', recon: 'more', accounts: 'more', customer: 'due'}[V.name] || V.name;
  document.querySelectorAll('#nav [data-v]').forEach(b => b.classList.toggle('on', b.dataset.v === tab));
}
const head = (title, sub, back) => `<div class="top">${back ? `<button class="back" data-a="go" data-v="${back}" aria-label="পেছনে">←</button>` : ''}
  <h1>${esc(title)}${sub ? `<small>${esc(sub)}</small>` : ''}</h1></div>`;

function txRow(x) {
  const k = KIND[x.kind] || {n: x.kind, ic: '?'};
  const a = x.acc ? acc(x.acc) : null;
  const e = fx(x);
  let title = k.n + (a && a.type !== 'cash' ? ' · ' + a.name : x.kind === 'adjust' ? ' · ' + accName(x.acc) : '');
  if (x.kind === 'expense' && x.cat) title = 'খরচ · ' + x.cat;
  const bits = [];
  if (x.num) bits.push(x.num);
  if (x.cust) bits.push(custName(x.cust) + (x.due ? ' (বাকি ' + money(x.due) + ')' : ''));
  if (x.note) bits.push(x.note);
  bits.push(ftime(x.t));
  const amt = x.kind === 'adjust' ? (x.amt > 0 ? '+' : '') + money(x.amt) : money(x.amt);
  return `<button class="tx" data-a="edit" data-id="${x.id}">
    <span class="dot" style="--c:${a ? a.color : '#64748b'}">${k.ic}</span>
    <span class="m"><span class="t">${esc(title)}</span><span class="s">${esc(bits.join(' · '))}</span></span>
    <span class="r"><b>${amt}</b>${e.profit > 0 && x.kind !== 'income' ? `<small>লাভ ${money(e.profit)}</small>` : ''}</span>
  </button>`;
}
function txGroups(list) {
  if (!list.length) return '<div class="empty">কোনো লেনদেন নেই</div>';
  let html = '', cur = '';
  const byDay = {};
  list.forEach(x => (byDay[x.d] = byDay[x.d] || []).push(x));
  for (const x of list) {
    if (x.d !== cur) {
      cur = x.d;
      html += `<div class="day"><span>${fdate(cur)}</span><span>লাভ ${money(sum(byDay[cur].map(y => fx(y).profit)))}</span></div>`;
    }
    html += txRow(x);
  }
  return html;
}
const accCard = (a, bal, wide) => `<button class="acc ${wide ? 'wide' : ''}" style="--c:${a.color}" data-a="accTap" data-id="${a.id}">
  <div class="n">${esc(a.name)}</div><div class="b ${bal < 0 ? 'neg' : ''}">${money(bal)}</div></button>`;

function vHome() {
  const {bal, due} = compute();
  const totalDue = sum(Object.values(due));
  const total = sum(Object.values(bal)) + totalDue;
  const t = today(), tt = sorted(db.tx.filter(x => x.d === t));
  const profit = sum(tt.map(x => fx(x).profit));
  const by = type => db.accounts.filter(a => a.type === type);
  const lastB = db.settings.lastBackup || 0;
  const needBackup = db.tx.length >= 20 && Date.now() - lastB > 7 * 864e5;
  return `${head(db.settings.shop || 'দোকান খাতা', fdate(t))}
  <div class="hero">
    <div class="lbl">মোট সম্পদ (ক্যাশ + ব্যালেন্স + পাওনা বাকি)</div>
    <div class="big">${money(total)}</div>
    <div class="row">
      <div>আজকের লাভ<b>${money(profit)}</b></div>
      <div>আজকের লেনদেন<b>${bn(tt.length)} টি</b></div>
      <div>পাওনা বাকি<b>${money(totalDue)}</b></div>
    </div>
  </div>
  <div class="quick">
    <button data-a="new" data-kind="cashin"><span>📤</span>ক্যাশ ইন</button>
    <button data-a="new" data-kind="cashout"><span>📥</span>ক্যাশ আউট</button>
    <button data-a="new" data-kind="recharge"><span>⚡</span>রিচার্জ</button>
    <button data-a="new" data-kind="expense"><span>🧾</span>খরচ</button>
  </div>
  ${needBackup ? `<div class="note">অনেক দিন ব্যাকআপ নেওয়া হয়নি। ফোন নষ্ট হলে বা ব্রাউজারের ডেটা মুছে গেলে হিসাব হারিয়ে যাবে — <b>আরও → ব্যাকআপ</b> থেকে ফাইল সেভ করে রাখুন।</div>` : ''}
  <div class="sec"><h2>ক্যাশ</h2><button data-a="go" data-v="recon">হিসাব মিলান</button></div>
  <div class="grid">${by('cash').map(a => accCard(a, bal[a.id], true)).join('')}</div>
  <div class="sec"><h2>মোবাইল ব্যাংকিং</h2></div>
  <div class="grid">${by('mfs').map(a => accCard(a, bal[a.id])).join('')}</div>
  <div class="sec"><h2>রিচার্জ / লোড ব্যালেন্স</h2></div>
  <div class="grid">${by('telecom').map(a => accCard(a, bal[a.id])).join('')}</div>
  <div class="sec"><h2>আজকের লেনদেন</h2><button data-a="go" data-v="list">সব দেখুন</button></div>
  <div class="card">${tt.length ? tt.slice(0, 8).map(txRow).join('') : '<div class="empty">আজ এখনো কোনো লেনদেন লেখা হয়নি।<br>নিচের <b>+</b> বোতাম চেপে শুরু করুন।</div>'}</div>`;
}

function rangeOf(s) {
  const t = today();
  if (s.range === 'today') return [t, t];
  if (s.range === 'yest') { const y = addDays(t, -1); return [y, y]; }
  if (s.range === 'week') return [addDays(t, -6), t];
  if (s.range === 'month') return [t.slice(0, 8) + '01', t];
  if (s.range === 'all') return ['0000-00-00', '9999-99-99'];
  return [s.from <= s.to ? s.from : s.to, s.from <= s.to ? s.to : s.from];
}
function rangeChips(s, which) {
  const opts = [['today', 'আজ'], ['yest', 'গতকাল'], ['week', '৭ দিন'], ['month', 'এই মাস'], ['all', 'সব'], ['custom', 'তারিখ বাছুন']];
  return `<div class="chips">${opts.map(([v, n]) => `<button class="chip ${s.range === v ? 'on' : ''}" data-a="range" data-w="${which}" data-r="${v}">${n}</button>`).join('')}</div>
  ${s.range === 'custom' ? `<div class="two"><input type="date" data-c="date" data-w="${which}" data-k="from" value="${s.from}" aria-label="শুরুর তারিখ"><input type="date" data-c="date" data-w="${which}" data-k="to" value="${s.to}" aria-label="শেষ তারিখ"></div>` : ''}`;
}
function listBody() {
  const [f, t] = rangeOf(L), q = L.q.trim().toLowerCase();
  const list = sorted(db.tx.filter(x => x.d >= f && x.d <= t && (!L.acc || x.acc === L.acc || (L.acc === 'cash' && !x.acc)) &&
    (!q || [x.num, x.note, x.cat, x.cust && custName(x.cust), KIND[x.kind]?.n, String(x.amt)].some(v => v && String(v).toLowerCase().includes(q)))));
  const profit = sum(list.map(x => fx(x).profit));
  return `<div class="sum" style="margin:10px 0">
      <div><small>লেনদেন</small><b>${bn(list.length)} টি</b></div>
      <div><small>নিট লাভ</small><b class="${profit < 0 ? 'neg' : 'pos'}">${money(profit)}</b></div>
    </div><div class="card">${txGroups(list)}</div>`;
}
function vList() {
  return `${head('লেনদেনের খাতা')}
  ${rangeChips(L, 'L')}
  <div class="two">
    <select data-c="lacc" aria-label="অ্যাকাউন্ট"><option value="">সব অ্যাকাউন্ট</option>${db.accounts.map(a => `<option value="${a.id}" ${L.acc === a.id ? 'selected' : ''}>${esc(a.name)}</option>`).join('')}</select>
    <input type="text" id="q" placeholder="🔍 নম্বর / নাম খুঁজুন" value="${esc(L.q)}">
  </div>
  <div id="listBody">${listBody()}</div>`;
}

function vDue() {
  const {due} = compute();
  const list = db.customers.slice().sort((a, b) => (due[b.id] || 0) - (due[a.id] || 0));
  return `${head('বাকির খাতা')}
  <div class="hero"><div class="lbl">মোট পাওনা বাকি</div><div class="big">${money(sum(Object.values(due)))}</div></div>
  <div class="btns"><button class="btn" data-a="new" data-kind="duepay">✓ বাকি আদায়</button><button class="btn ghost" data-a="custForm">+ নতুন কাস্টমার</button></div>
  <div class="sec"><h2>কাস্টমার (${bn(list.length)} জন)</h2></div>
  <div class="card">${list.length ? list.map(c => `<button class="tx" data-a="go" data-v="customer" data-arg="${c.id}">
      <span class="dot">${esc([...c.name][0] || '?')}</span>
      <span class="m"><span class="t">${esc(c.name)}</span><span class="s">${esc(c.phone || 'নম্বর নেই')}</span></span>
      <span class="r"><b class="${due[c.id] > 0 ? 'neg' : ''}">${money(due[c.id] || 0)}</b></span></button>`).join('')
    : '<div class="empty">এখনো কোনো বাকির কাস্টমার নেই।<br>ক্যাশ ইন বা রিচার্জ লেখার সময় "বাকিতে দিয়েছি" টিক দিলে এখানে চলে আসবে।</div>'}</div>`;
}
function vCustomer() {
  const c = cust(V.arg);
  if (!c) return vDue();
  const {due} = compute();
  const list = sorted(db.tx.filter(x => x.cust === c.id));
  return `${head(c.name, c.phone || '', 'due')}
  <div class="hero"><div class="lbl">বর্তমান বাকি</div><div class="big">${money(due[c.id] || 0)}</div></div>
  <div class="btns"><button class="btn" data-a="new" data-kind="duepay" data-cust="${c.id}">✓ টাকা পেলাম</button>
    <button class="btn ghost" data-a="new" data-kind="duegive" data-cust="${c.id}">⏳ বাকি দিলাম</button></div>
  <div class="btns">${c.phone ? `<a class="btn ghost" style="text-align:center;text-decoration:none" href="tel:${esc(c.phone)}">📞 কল করুন</a>` : '<span></span>'}
    <button class="btn ghost" data-a="custForm" data-id="${c.id}">✏️ তথ্য বদলান</button></div>
  <div class="sec"><h2>ইতিহাস</h2></div><div class="card">${txGroups(list)}</div>`;
}

function vMore() {
  const item = (a, ic, t, s, extra = '') => `<button data-a="${a}" ${extra}><span>${ic}</span><div>${t}<small>${s}</small></div></button>`;
  return `${head('আরও')}
  <div class="card menu">
    ${item('go', '📊', 'রিপোর্ট', 'দিন, সপ্তাহ ও মাসের লাভ-খরচের হিসাব', 'data-v="report"')}
    ${item('go', '⚖️', 'হিসাব মিলানো', 'আসল ব্যালেন্সের সাথে খাতা মিলিয়ে নিন', 'data-v="recon"')}
    ${item('go', '💳', 'অ্যাকাউন্ট ও কমিশন রেট', 'নতুন অ্যাকাউন্ট, শুরুর ব্যালেন্স, কমিশন', 'data-v="accounts"')}
    ${item('new', '💼', 'মূলধন / উত্তোলন / অন্যান্য আয়', 'ব্যবসায় টাকা ঢোকানো বা তোলা', 'data-kind="capin"')}
  </div>
  <div class="sec"><h2>সেটিংস</h2></div>
  <div class="card menu">
    ${item('shopForm', '🏪', 'দোকানের নাম', esc(db.settings.shop || 'নাম দেওয়া হয়নি'))}
    ${item('pinForm', '🔒', 'পিন লক', db.settings.pin ? 'চালু আছে' : 'বন্ধ আছে')}
  </div>
  <div class="sec"><h2>ডেটা</h2></div>
  <div class="card menu">
    ${item('backup', '💾', 'ব্যাকআপ নিন', 'সব হিসাব একটি ফাইলে সেভ করুন')}
    ${item('restore', '📂', 'ব্যাকআপ থেকে ফিরিয়ে আনুন', 'আগের সেভ করা ফাইল থেকে')}
    ${item('csv', '📑', 'এক্সেল ফাইল (CSV)', 'সব লেনদেন এক্সেলে খোলার জন্য')}
    ${item('reset', '🗑️', 'সব ডেটা মুছে ফেলুন', 'নতুন করে শুরু করতে')}
  </div>
  <p class="hint" style="text-align:center;margin-top:16px">আপনার সব হিসাব শুধু এই ফোনেই থাকে — কোথাও পাঠানো হয় না।</p>`;
}

function vReport() {
  const [f, t] = rangeOf(R);
  const list = db.tx.filter(x => x.d >= f && x.d <= t);
  const s = k => sum(list.filter(x => x.kind === k).map(x => x.amt));
  const com = sum(list.filter(x => KIND[x.kind]?.com).map(x => x.com || 0));
  const exp = s('expense'), inc = s('income');
  const rows = db.accounts.filter(a => a.type !== 'cash').map(a => {
    const m = list.filter(x => x.acc === a.id);
    const g = k => sum(m.filter(x => x.kind === k).map(x => x.amt));
    const out = a.type === 'mfs' ? g('cashin') : g('recharge');
    const c = sum(m.map(x => KIND[x.kind]?.com ? x.com || 0 : 0));
    return out || g('cashout') || c ? `<tr><td>${esc(a.name)}</td><td>${a.type === 'mfs' ? money(out) : '—'}</td><td>${a.type === 'mfs' ? money(g('cashout')) : '—'}</td><td>${a.type === 'telecom' ? money(out) : '—'}</td><td class="pos">${money(c)}</td></tr>` : '';
  }).join('');
  const cats = {};
  list.filter(x => x.kind === 'expense').forEach(x => cats[x.cat || 'অন্যান্য'] = (cats[x.cat || 'অন্যান্য'] || 0) + x.amt);
  const days = [];
  for (let i = 6; i >= 0; i--) { const d = addDays(today(), -i); days.push([d, sum(db.tx.filter(x => x.d === d).map(x => fx(x).profit))]); }
  const mx = Math.max(1, ...days.map(d => Math.abs(d[1])));
  return `${head('রিপোর্ট', f === t ? fdate(f) : R.range === 'all' ? 'শুরু থেকে এখন পর্যন্ত' : fdate(f) + ' – ' + fdate(t), 'more')}
  ${rangeChips(R, 'R')}
  <div class="sum" style="margin-top:10px">
    <div><small>মোট কমিশন</small><b class="pos">${money(com)}</b></div>
    <div><small>অন্যান্য আয়</small><b>${money(inc)}</b></div>
    <div><small>মোট খরচ</small><b class="neg">${money(exp)}</b></div>
    <div><small>নিট লাভ</small><b class="${com + inc - exp < 0 ? 'neg' : 'pos'}">${money(com + inc - exp)}</b></div>
  </div>
  <div class="sec"><h2>অ্যাকাউন্ট অনুযায়ী</h2></div>
  <div class="card" style="overflow-x:auto">${rows ? `<table><tr><th>অ্যাকাউন্ট</th><th>ক্যাশ ইন</th><th>ক্যাশ আউট</th><th>রিচার্জ</th><th>কমিশন</th></tr>${rows}</table>` : '<div class="empty">এই সময়ে কোনো লেনদেন নেই</div>'}</div>
  ${Object.keys(cats).length ? `<div class="sec"><h2>খরচের খাত</h2></div><div class="card"><table>${Object.entries(cats).map(([k, v]) => `<tr><td>${esc(k)}</td><td>${money(v)}</td></tr>`).join('')}</table></div>` : ''}
  <div class="sec"><h2>অন্যান্য</h2></div>
  <div class="card"><table>
    <tr><td>ব্যালেন্স কেনা (B2B)</td><td>${money(s('buy'))}</td></tr>
    <tr><td>ব্যালেন্স ফেরত</td><td>${money(s('sell'))}</td></tr>
    <tr><td>নতুন বাকি দেওয়া</td><td>${money(sum(list.map(x => Math.max(0, fx(x).due))))}</td></tr>
    <tr><td>বাকি আদায়</td><td>${money(s('duepay'))}</td></tr>
    <tr><td>মূলধন যোগ</td><td>${money(s('capin'))}</td></tr>
    <tr><td>মালিকের উত্তোলন</td><td>${money(s('capout'))}</td></tr>
  </table></div>
  <div class="sec"><h2>গত ৭ দিনের নিট লাভ</h2></div>
  <div class="card"><div class="bars">${days.map(([d, v]) => `<div><span>${bn(Math.round(v))}</span><i class="${v < 0 ? 'n' : ''}" style="height:${Math.round(Math.abs(v) / mx * 70)}%"></i><span>${bn(+d.slice(8))}</span></div>`).join('')}</div></div>
  <p class="hint">কমিশন আপনার দেওয়া রেট অনুযায়ী আনুমানিক হিসাব। আসল কমিশন কোম্পানির নিয়ম অনুযায়ী একটু কম-বেশি হতে পারে।</p>`;
}

function vRecon() {
  const {bal} = compute();
  return `${head('হিসাব মিলানো', 'আসল ব্যালেন্স লিখুন — পার্থক্য নিজে ঠিক হয়ে যাবে', 'more')}
  <div class="card pad">
    <p class="hint" style="margin:0">দিন শেষে ক্যাশ গুনে এবং প্রতিটি অ্যাপের ব্যালেন্স দেখে নিচে লিখুন। যেটা মিলছে সেটা খালি রাখুন।</p>
    ${db.accounts.map(a => `<label class="f">${esc(a.name)} — খাতায় আছে ${money(bal[a.id])}
      <input type="text" inputmode="decimal" data-recon="${a.id}" placeholder="আসল ব্যালেন্স"></label>`).join('')}
    <button class="btn" data-a="reconSave">মিলিয়ে সেভ করুন</button>
  </div>`;
}

function vAccounts() {
  const {bal} = compute();
  const tn = {cash: 'ক্যাশ', mfs: 'মোবাইল ব্যাংকিং', telecom: 'রিচার্জ'};
  return `${head('অ্যাকাউন্ট ও কমিশন রেট', 'বদলাতে অ্যাকাউন্টে চাপ দিন', 'more')}
  <div class="card">${db.accounts.map(a => `<button class="tx" data-a="accForm" data-id="${a.id}">
    <span class="dot" style="--c:${a.color}">${esc([...a.name][0])}</span>
    <span class="m"><span class="t">${esc(a.name)}</span><span class="s">${tn[a.type]}${a.type === 'mfs' ? ` · হাজারে ইন ${bn(a.rIn || 0)} / আউট ${bn(a.rOut || 0)}` : a.type === 'telecom' ? ` · হাজারে ${bn(a.rIn || 0)}` : ''}</span></span>
    <span class="r"><b>${money(bal[a.id])}</b></span></button>`).join('')}</div>
  <button class="btn ghost" data-a="accForm">+ নতুন অ্যাকাউন্ট যোগ করুন</button>`;
}

function vSetup() {
  return `<div style="text-align:center;padding:18px 0 6px"><div style="font-size:54px">📒</div><h1>দোকান খাতা</h1>
    <p class="hint">আপনার দোকানের ডিজিটাল হিসাবের খাতা। শুরু করার আগে এখন হাতে ও অ্যাকাউন্টে যা আছে তা লিখুন।</p></div>
  <div class="card pad">
    <label class="f" style="margin-top:0">দোকানের নাম<input type="text" id="suShop" placeholder="যেমন: মায়ের দোয়া টেলিকম"></label>
    <div class="sec" style="margin-left:0"><h2>এখনকার ব্যালেন্স (না থাকলে খালি রাখুন)</h2></div>
    ${db.accounts.map(a => `<label class="f">${esc(a.name)}<input type="text" inputmode="decimal" data-open="${a.id}" placeholder="০"></label>`).join('')}
    <button class="btn" data-a="setupSave">শুরু করুন</button>
    <button class="btn ghost" data-a="restore">আগের ব্যাকআপ থেকে ফিরিয়ে আনুন</button>
  </div>`;
}

/* ---------- শিট (নিচ থেকে ওঠা ফর্ম) ---------- */
function openSheet(title, html) {
  $('#sheet').innerHTML = `<div class="sh"><h2>${esc(title)}</h2><button data-a="closeSheet" aria-label="বন্ধ করুন">✕</button></div>${html}`;
  $('#sheetWrap').hidden = false;
  $('#sheet').scrollTop = 0;
  document.body.style.overflow = 'hidden';
}
function closeSheet() { $('#sheetWrap').hidden = true; document.body.style.overflow = ''; F = null; }

/* ---------- নতুন/সম্পাদনা এন্ট্রি ---------- */
let F = null;
function openEntry(p = {}) {
  F = Object.assign({id: null, t: 0, kind: 'cashin', acc: '', amt: '', com: '', comManual: false, num: '', note: '', d: today(),
    isDue: false, due: '', cust: '', newName: '', newPhone: '', cat: CATS[0]}, p);
  fixAcc();
  if (F.id) F.comManual = num(F.com) !== autoCom();   // সম্পাদনায় কমিশন হাতে বদলানো না থাকলে অটো থাকবে
  renderEntry();
}
function entryAccounts() { const k = KIND[F.kind]; return k.types ? db.accounts.filter(a => k.types.includes(a.type)) : []; }
function fixAcc() { const list = entryAccounts(); if (!list.find(a => a.id === F.acc)) F.acc = list[0]?.id || ''; }
function autoCom() {
  const k = KIND[F.kind], a = acc(F.acc);
  return k.com && a ? r2(num(F.amt) * (+a[k.com] || 0) / 1000) : 0;
}
function custPicker() {
  const sel = F.cust || (db.customers.length ? db.customers[0].id : '__new');
  F.cust = sel;
  return `<label class="f">কাস্টমার<select data-f="cust" data-re="1">
      ${db.customers.map(c => `<option value="${c.id}" ${sel === c.id ? 'selected' : ''}>${esc(c.name)}${c.phone ? ' — ' + esc(c.phone) : ''}</option>`).join('')}
      <option value="__new" ${sel === '__new' ? 'selected' : ''}>➕ নতুন কাস্টমার</option></select></label>
    ${sel === '__new' ? `<div class="two"><label class="f">নাম<input type="text" data-f="newName" value="${esc(F.newName)}" placeholder="কাস্টমারের নাম"></label>
      <label class="f">মোবাইল নম্বর<input type="tel" data-f="newPhone" value="${esc(F.newPhone)}" placeholder="01XXXXXXXXX"></label></div>` : ''}`;
}
function renderEntry() {
  const k = KIND[F.kind];
  const kinds = Object.keys(KIND).filter(x => x !== 'adjust');
  const accs = entryAccounts();
  const {bal} = compute();
  const html = `
    <div class="chips">${kinds.map(x => `<button class="chip ${F.kind === x ? 'on' : ''}" data-a="fKind" data-kind="${x}">${KIND[x].n}</button>`).join('')}</div>
    <p class="hint">${k.hint || ''}</p>
    ${accs.length ? `<label class="f">অ্যাকাউন্ট</label><div class="chips" style="flex-wrap:wrap;margin-top:4px">${accs.map(a =>
      `<button class="chip acc-chip ${F.acc === a.id ? 'on' : ''}" style="--c:${a.color}" data-a="fAcc" data-id="${a.id}">${esc(a.name)}</button>`).join('')}</div>
      <p class="hint" id="fBal">${F.acc ? 'বর্তমান ব্যালেন্স: ' + money(bal[F.acc]) : ''}</p>` : ''}
    ${F.kind === 'expense' ? `<label class="f">খরচের খাত</label><div class="chips" style="flex-wrap:wrap;margin-top:4px">${CATS.map(c =>
      `<button class="chip ${F.cat === c ? 'on' : ''}" data-a="fCat" data-cat="${c}">${c}</button>`).join('')}</div>` : ''}
    ${k.cust ? custPicker() : ''}
    <label class="f">টাকার পরিমাণ<input class="amt" type="text" inputmode="decimal" data-f="amt" value="${esc(F.amt)}" placeholder="৳ ০" autocomplete="off"></label>
    ${k.num || k.com ? `<div class="two">
      ${k.num ? `<label class="f">কাস্টমারের নম্বর (ঐচ্ছিক)<input type="tel" data-f="num" value="${esc(F.num)}" placeholder="01XXXXXXXXX"></label>` : ''}
      ${k.com ? `<label class="f">কমিশন / লাভ (অটো)<input type="text" inputmode="decimal" data-f="com" value="${esc(F.com)}" placeholder="০"></label>` : ''}
    </div>` : ''}
    ${k.due ? `<label class="check"><input type="checkbox" data-f="isDue" data-re="1" ${F.isDue ? 'checked' : ''}>বাকিতে দিয়েছি</label>
      ${F.isDue ? custPicker() + `<label class="f">কত টাকা বাকি (খালি রাখলে পুরোটাই বাকি)<input type="text" inputmode="decimal" data-f="due" value="${esc(F.due)}" placeholder="পুরো টাকা"></label>` : ''}` : ''}
    <div class="two">
      <label class="f">তারিখ<input type="date" data-f="d" value="${F.d}" max="${today()}"></label>
      <label class="f">নোট (ঐচ্ছিক)<input type="text" data-f="note" value="${esc(F.note)}" placeholder="কিছু লিখে রাখুন"></label>
    </div>
    <button class="btn" data-a="fSave">✓ সেভ করুন</button>
    ${F.id ? '<button class="btn danger" data-a="fDel">এই লেনদেন মুছে ফেলুন</button>' : ''}`;
  const y = $('#sheet').scrollTop;
  openSheet(F.id ? 'লেনদেন সম্পাদনা' : 'নতুন লেনদেন', html);
  $('#sheet').scrollTop = y;
}
function syncF() {
  document.querySelectorAll('#sheet [data-f]').forEach(el => { F[el.dataset.f] = el.type === 'checkbox' ? el.checked : el.value; });
}
function ensureCustomer() {
  if (F.cust && F.cust !== '__new' && cust(F.cust)) return F.cust;
  const name = F.newName.trim();
  if (!name) { toast('কাস্টমারের নাম লিখুন'); return null; }
  const c = {id: uid(), name, phone: F.newPhone.trim()};
  db.customers.push(c);
  return c.id;
}
function saveEntry() {
  syncF();
  const k = KIND[F.kind], amt = r2(num(F.amt));
  if (amt <= 0) return toast('টাকার পরিমাণ লিখুন');
  if (k.types && !F.acc) return toast('অ্যাকাউন্ট বাছাই করুন');
  const x = {id: F.id || uid(), t: F.t || Date.now(), d: F.d || today(), kind: F.kind, amt};
  if (k.types) x.acc = F.acc;
  if (k.com) x.com = Math.max(0, r2(num(F.com)));
  if (k.num && F.num.trim()) x.num = F.num.trim();
  if (F.note.trim()) x.note = F.note.trim();
  if (F.kind === 'expense') x.cat = F.cat;
  const before = db.customers.length;
  if (k.cust || (k.due && F.isDue)) {
    const id = ensureCustomer();
    if (!id) return;
    x.cust = id;
    if (k.due) x.due = Math.min(amt, r2(num(F.due)) || amt);
  }
  const old = db.tx;
  const next = old.filter(y => y.id !== x.id).concat(x);
  const b0 = compute(old).bal, b1 = compute(next).bal;
  const low = db.accounts.filter(a => b1[a.id] < 0 && b1[a.id] < b0[a.id]);
  if (low.length && !confirm(low.map(a => a.name).join(', ') + ' — ব্যালেন্স শূন্যের নিচে চলে যাচ্ছে (' + low.map(a => money(b1[a.id])).join(', ') + ')।\n\nতবুও সেভ করবেন?')) {
    db.customers.length = before;
    return;
  }
  db.tx = next; save(); closeSheet(); render();
  toast('✓ সেভ হয়েছে — ' + k.n + ' ' + money(amt));
}

/* ---------- অন্যান্য ফর্ম ---------- */
function custForm(id) {
  const c = cust(id) || {name: '', phone: ''};
  openSheet(id ? 'কাস্টমারের তথ্য' : 'নতুন কাস্টমার', `
    <label class="f">নাম<input type="text" id="cName" value="${esc(c.name)}"></label>
    <label class="f">মোবাইল নম্বর<input type="tel" id="cPhone" value="${esc(c.phone)}" placeholder="01XXXXXXXXX"></label>
    <button class="btn" data-a="custSave" data-id="${id || ''}">সেভ করুন</button>
    ${id ? `<button class="btn danger" data-a="custDel" data-id="${id}">কাস্টমার মুছে ফেলুন</button>` : ''}`);
}
function accForm(id) {
  const a = acc(id) || {name: '', type: 'mfs', color: '#2563eb', open: 0, rIn: 4.1, rOut: 4.1};
  const isCash = a.type === 'cash';
  openSheet(id ? 'অ্যাকাউন্ট সম্পাদনা' : 'নতুন অ্যাকাউন্ট', `
    <label class="f">নাম<input type="text" id="aName" value="${esc(a.name)}" placeholder="যেমন: বিকাশ ২য় সিম"></label>
    ${id ? '' : `<label class="f">ধরন<select id="aType"><option value="mfs">মোবাইল ব্যাংকিং (ক্যাশ ইন/আউট)</option><option value="telecom">রিচার্জ / লোড</option></select></label>`}
    <div class="two"><label class="f">শুরুর ব্যালেন্স<input type="text" inputmode="decimal" id="aOpen" value="${a.open || ''}" placeholder="০"></label>
      <label class="f">রং<input type="color" id="aColor" value="${a.color}" style="width:100%;height:50px;margin-top:4px;border:0;background:none;padding:0"></label></div>
    ${isCash ? '' : `<div class="two">
      <label class="f">${a.type === 'telecom' ? 'রিচার্জ কমিশন' : 'ক্যাশ ইন কমিশন'} (হাজারে)<input type="text" inputmode="decimal" id="aIn" value="${a.rIn ?? ''}"></label>
      <label class="f" ${id && a.type === 'telecom' ? 'hidden' : ''}>ক্যাশ আউট কমিশন (হাজারে)<input type="text" inputmode="decimal" id="aOut" value="${a.rOut ?? ''}"></label></div>
      <p class="hint">হাজারে কত টাকা কমিশন পান তা লিখুন। যেমন রিচার্জে ২.৭৫% হলে হাজারে ২৭.৫ টাকা।</p>`}
    <button class="btn" data-a="accSave" data-id="${id || ''}">সেভ করুন</button>
    ${id && !isCash ? `<button class="btn danger" data-a="accDel" data-id="${id}">অ্যাকাউন্ট মুছে ফেলুন</button>` : ''}`);
}

function download(name, text, type) {
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([text], {type}));
  a.download = name; document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 2000);
}
function showLock() {
  const el = $('#lock');
  el.innerHTML = `<div><div style="font-size:50px">🔒</div><h2>${esc(db.settings.shop || 'দোকান খাতা')}</h2><p style="opacity:.8;margin:6px 0 14px">পিন দিন</p>
    <input type="password" inputmode="numeric" id="pinIn" maxlength="8" autocomplete="off"><button class="btn" data-a="unlock">খুলুন</button></div>`;
  el.hidden = false;
  setTimeout(() => $('#pinIn')?.focus(), 50);
}
function unlock() {
  if (num($('#pinIn').value) === num(db.settings.pin) && $('#pinIn').value) $('#lock').hidden = true;
  else { toast('পিন ভুল হয়েছে'); $('#pinIn').value = ''; }
}

/* ---------- অ্যাকশন ---------- */
const A = {
  go: d => go(d.v, d.arg),
  closeSheet,
  new: d => openEntry({kind: d.kind || 'cashin', cust: d.cust || ''}),
  accTap: d => {
    const a = acc(d.id);
    if (a.type === 'cash') { L.acc = 'cash'; L.range = 'today'; go('list'); }
    else openEntry({kind: a.type === 'mfs' ? 'cashin' : 'recharge', acc: a.id});
  },
  edit: d => {
    const x = db.tx.find(y => y.id === d.id);
    if (!x) return;
    if (x.kind === 'adjust') {
      if (confirm('এই ব্যালেন্স সমন্বয়টি (' + accName(x.acc) + ', ' + money(x.amt) + ') মুছে ফেলবেন?')) { db.tx = db.tx.filter(y => y !== x); save(); render(); toast('মুছে ফেলা হয়েছে'); }
      return;
    }
    openEntry({id: x.id, t: x.t, kind: x.kind, acc: x.acc || '', amt: String(x.amt), com: x.com != null ? String(x.com) : '', comManual: true,
      num: x.num || '', note: x.note || '', d: x.d, isDue: !!x.due, due: x.due ? String(x.due) : '', cust: x.cust || '', cat: x.cat || CATS[0]});
  },
  fKind: d => { syncF(); F.kind = d.kind; fixAcc(); if (!F.id) F.comManual = false; if (!F.comManual) F.com = autoCom() ? String(autoCom()) : ''; renderEntry(); },
  fAcc: d => { syncF(); F.acc = d.id; if (!F.comManual) F.com = autoCom() ? String(autoCom()) : ''; renderEntry(); },
  fCat: d => { syncF(); F.cat = d.cat; renderEntry(); },
  fSave: saveEntry,
  fDel: () => {
    if (!confirm('এই লেনদেনটি মুছে ফেলবেন? ব্যালেন্স আগের মতো হয়ে যাবে।')) return;
    db.tx = db.tx.filter(y => y.id !== F.id); save(); closeSheet(); render(); toast('মুছে ফেলা হয়েছে');
  },
  range: d => { const s = d.w === 'L' ? L : R; s.range = d.r; render(); },
  custForm: d => custForm(d.id),
  custSave: d => {
    const name = $('#cName').value.trim();
    if (!name) return toast('নাম লিখুন');
    const c = cust(d.id);
    if (c) { c.name = name; c.phone = $('#cPhone').value.trim(); }
    else db.customers.push({id: uid(), name, phone: $('#cPhone').value.trim()});
    save(); closeSheet(); render(); toast('✓ সেভ হয়েছে');
  },
  custDel: d => {
    if (Math.abs(compute().due[d.id] || 0) > 0.001) return toast('বাকি শূন্য না হলে মুছা যাবে না');
    if (!confirm('কাস্টমার মুছে ফেলবেন?')) return;
    db.customers = db.customers.filter(c => c.id !== d.id); save(); closeSheet(); go('due');
  },
  accForm: d => accForm(d.id),
  accSave: d => {
    const name = $('#aName').value.trim();
    if (!name) return toast('নাম লিখুন');
    let a = acc(d.id);
    if (!a) { a = {id: uid(), type: $('#aType').value}; db.accounts.push(a); }
    a.name = name; a.color = $('#aColor').value; a.open = r2(num($('#aOpen').value));
    if (a.type !== 'cash') { a.rIn = num($('#aIn').value); if (a.type === 'mfs') a.rOut = num($('#aOut').value); }
    save(); closeSheet(); render(); toast('✓ সেভ হয়েছে');
  },
  accDel: d => {
    if (db.tx.some(x => x.acc === d.id)) return toast('এই অ্যাকাউন্টে লেনদেন আছে, তাই মুছা যাবে না');
    if (!confirm('অ্যাকাউন্টটি মুছে ফেলবেন?')) return;
    db.accounts = db.accounts.filter(a => a.id !== d.id); save(); closeSheet(); render();
  },
  reconSave: () => {
    const {bal} = compute();
    const changes = [];
    document.querySelectorAll('[data-recon]').forEach(el => {
      if (el.value.trim() === '') return;
      const diff = r2(num(el.value) - bal[el.dataset.recon]);
      if (diff) changes.push({id: uid(), t: Date.now(), d: today(), kind: 'adjust', acc: el.dataset.recon, amt: diff, note: 'হিসাব মিলানো'});
    });
    if (!changes.length) return toast('সব হিসাব মিলে গেছে 👍');
    if (!confirm(changes.map(c => accName(c.acc) + ': ' + (c.amt > 0 ? '+' : '') + money(c.amt)).join('\n') + '\n\nএই পার্থক্যগুলো ঠিক করে দেব?')) return;
    db.tx.push(...changes); save(); go('home'); toast('✓ হিসাব মিলিয়ে দেওয়া হয়েছে');
  },
  setupSave: () => {
    db.settings.shop = $('#suShop').value.trim();
    document.querySelectorAll('[data-open]').forEach(el => { acc(el.dataset.open).open = r2(num(el.value)); });
    db.settings.setup = true; save(); go('home');
    toast('স্বাগতম! নিচের + বোতামে চেপে লেনদেন লিখুন');
  },
  shopForm: () => openSheet('দোকানের নাম', `<label class="f">দোকানের নাম<input type="text" id="sName" value="${esc(db.settings.shop)}"></label><button class="btn" data-a="shopSave">সেভ করুন</button>`),
  shopSave: () => { db.settings.shop = $('#sName').value.trim(); save(); closeSheet(); render(); },
  pinForm: () => openSheet('পিন লক', `<p class="hint">অ্যাপ খোলার সময় পিন চাইবে। পিন বন্ধ করতে ঘরটি খালি রেখে সেভ করুন। পিন ভুলে গেলে হিসাব ফেরত পাওয়া কঠিন — তাই মনে রাখার মতো পিন দিন।</p>
    <label class="f">নতুন পিন (৪–৮ সংখ্যা)<input type="password" inputmode="numeric" id="pNew" maxlength="8" autocomplete="off"></label><button class="btn" data-a="pinSave">সেভ করুন</button>`),
  pinSave: () => {
    const p = $('#pNew').value.trim();
    if (p && !/^\d{4,8}$/.test(p)) return toast('৪ থেকে ৮ সংখ্যার পিন দিন (ইংরেজি সংখ্যায়)');
    db.settings.pin = p; save(); closeSheet(); render(); toast(p ? '🔒 পিন চালু হয়েছে' : 'পিন বন্ধ করা হয়েছে');
  },
  unlock,
  backup: () => {
    db.settings.lastBackup = Date.now(); save();
    download('dokan-khata-backup-' + today() + '.json', JSON.stringify(db), 'application/json');
    render(); toast('ব্যাকআপ ফাইল ডাউনলোড হয়েছে — নিরাপদ জায়গায় রাখুন');
  },
  restore: () => $('#file').click(),
  csv: () => {
    const q = v => '"' + String(v ?? '').replace(/"/g, '""') + '"';
    const rows = [['তারিখ', 'সময়', 'ধরন', 'অ্যাকাউন্ট', 'টাকা', 'কমিশন', 'বাকি', 'নম্বর', 'কাস্টমার', 'খাত', 'নোট']];
    sorted(db.tx).reverse().forEach(x => rows.push([x.d, new Date(x.t).toTimeString().slice(0, 5), KIND[x.kind]?.n || x.kind, x.acc ? accName(x.acc) : 'ক্যাশ',
      x.amt, x.com || '', x.due || '', x.num || '', x.cust ? custName(x.cust) : '', x.cat || '', x.note || '']));
    download('dokan-khata-' + today() + '.csv', '﻿' + rows.map(r => r.map(q).join(',')).join('\r\n'), 'text/csv;charset=utf-8');
  },
  reset: () => {
    if (!confirm('সব লেনদেন, কাস্টমার ও সেটিংস চিরতরে মুছে যাবে। আগে ব্যাকআপ নিয়েছেন তো?\n\nসত্যিই সব মুছে ফেলবেন?')) return;
    if (prompt('নিশ্চিত করতে ইংরেজিতে DELETE লিখুন') !== 'DELETE') return toast('মুছা হয়নি');
    localStorage.removeItem(KEY); db = load(); go('setup');
  }
};

/* ---------- ইভেন্ট ---------- */
document.addEventListener('click', e => {
  const el = e.target.closest('[data-a]');
  if (el && A[el.dataset.a]) A[el.dataset.a](el.dataset, el);
});
document.addEventListener('input', e => {
  const el = e.target;
  if (el.id === 'q') { L.q = el.value; $('#listBody').innerHTML = listBody(); return; }
  if (!F || !el.dataset.f) return;
  const f = el.dataset.f;
  F[f] = el.type === 'checkbox' ? el.checked : el.value;
  if (f === 'com') F.comManual = true;
  if (f === 'amt' && !F.comManual) {
    const c = autoCom(), box = $('#sheet [data-f="com"]');
    F.com = c ? String(c) : '';
    if (box) box.value = F.com;
  }
});
document.addEventListener('change', e => {
  const el = e.target;
  if (el.dataset.re && F) { syncF(); renderEntry(); return; }
  if (el.dataset.c === 'lacc') { L.acc = el.value; render(); return; }
  if (el.dataset.c === 'date' && el.value) { (el.dataset.w === 'L' ? L : R)[el.dataset.k] = el.value; render(); return; }
  if (el.id === 'file' && el.files[0]) {
    const fr = new FileReader();
    fr.onload = () => {
      try {
        const d = JSON.parse(fr.result);
        if (!Array.isArray(d.accounts) || !Array.isArray(d.tx)) throw 0;
        if (db.tx.length && !confirm('এখনকার সব হিসাব মুছে ব্যাকআপ ফাইলের হিসাব বসবে। ঠিক আছে?')) return;
        d.customers = d.customers || []; d.settings = Object.assign({}, d.settings, {setup: true});
        db = d; save(); go('home'); toast('✓ ব্যাকআপ থেকে ' + bn(d.tx.length) + ' টি লেনদেন ফিরে এসেছে');
      } catch (err) { toast('ফাইলটি সঠিক ব্যাকআপ ফাইল নয়'); }
      el.value = '';
    };
    fr.readAsText(el.files[0]);
  }
});
document.addEventListener('keydown', e => {
  if (e.key === 'Enter' && e.target.id === 'pinIn') unlock();
  if (e.key === 'Escape' && !$('#sheetWrap').hidden) closeSheet();
});

/* ---------- শুরু ---------- */
if (db.settings.pin) showLock();
render();
if ('serviceWorker' in navigator && location.protocol.startsWith('http')) navigator.serviceWorker.register('sw.js').catch(() => {});
if (navigator.storage && navigator.storage.persist) navigator.storage.persist().catch(() => {});
