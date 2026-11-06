/* Carnet de plongée : connexion, carnet partagé et synchronisation hors ligne (Supabase).
   Expose window.claude.use("db") avec la même interface que la base des artefacts Claude,
   pour que le reste de la page fonctionne sans changement. */
(() => {
const SB_URL = 'https://istppmzkpkwgxpyafcfw.supabase.co';
const SB_KEY = 'sb_publishable_ZPXa_NiEzsUTt-D1iMQC9g_lRQoBRtk';
const sb = window.supabase.createClient(SB_URL, SB_KEY, { auth: { persistSession: true, autoRefreshToken: true } });

const $ = id => document.getElementById(id);
const lsg = (k, d) => { try { const v = JSON.parse(localStorage.getItem(k)); return v ?? d; } catch { return d; } };
const lss = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch {} };
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const ROLE = { proprietaire: 'Propriétaire', editeur: 'Peut modifier', lecteur: 'Lecture seule' };

const CK = 'cp-cache', QK = 'cp-queue';
let cache = lsg(CK, {});          // { uid, carnet, role, nom, email, cols: { nom: { id: data } } }
let queue = lsg(QK, []);          // écritures en attente : { c, id, data|null }
let me = null, carnet = null, role = null;
const subs = {};
const saveCache = () => lss(CK, cache);
const saveQueue = () => lss(QK, queue);

/* ---------- statut ---------- */
function setStatus() {
  const el = $('sync'); if (!el || !carnet || PUBLIC_ID) return;
  const n = queue.length, off = !navigator.onLine;
  const txt = off ? (n ? `Hors ligne · ${n} en attente` : 'Hors ligne') : n ? `Envoi de ${n} modification${n > 1 ? 's' : ''}…` : (role === 'lecteur' ? 'Synchronisé · lecture seule' : 'Synchronisé · partagé');
  el.classList.toggle('on', !off && !n);
  const sp = el.querySelector('span'); if (sp) sp.textContent = txt;
}

/* ---------- données ---------- */
function emit(name) {
  const m = (cache.cols && cache.cols[name]) || {};
  const docs = Object.entries(m).map(([id, data]) => ({ id, data: () => JSON.parse(JSON.stringify(data)) }));
  (subs[name] || []).forEach(cb => { try { cb({ docs }); } catch (e) { console.error(e); } });
  setTimeout(setStatus, 0);
}
function setLocal(name, id, data) {
  cache.cols = cache.cols || {};
  const m = cache.cols[name] = cache.cols[name] || {};
  if (data === null) delete m[id]; else m[id] = data;
  saveCache();
}
async function fetchCol(name) {
  if (!carnet || !navigator.onLine) return;
  const { data, error } = await sb.from('docs').select('doc_id,data').eq('carnet_id', carnet).eq('collection', name);
  if (error) { console.warn('[carnet]', error); return; }
  const m = {};
  data.forEach(r => { m[r.doc_id] = r.data; });
  queue.filter(q => q.c === name).forEach(q => { if (q.data === null) delete m[q.id]; else m[q.id] = q.data; });
  cache.cols = cache.cols || {}; cache.cols[name] = m; saveCache(); emit(name);
}
const refreshAll = () => Object.keys(subs).forEach(n => fetchCol(n));
const isNet = e => !e || !e.code || /fetch|network|load failed/i.test(e.message || '');

let flushing = false;
async function flush() {
  if (flushing || !carnet || !navigator.onLine || !queue.length) { setStatus(); return; }
  flushing = true; setStatus();
  try {
    while (queue.length) {
      const q = queue[0];
      const r = q.data === null
        ? await sb.from('docs').delete().match({ carnet_id: carnet, collection: q.c, doc_id: q.id })
        : await sb.from('docs').upsert({ carnet_id: carnet, collection: q.c, doc_id: q.id, data: q.data, updated_at: new Date().toISOString() });
      if (r.error && isNet(r.error)) break;
      if (r.error) console.warn('[carnet] écriture refusée', r.error);
      queue.shift(); saveQueue();
    }
  } catch (e) { console.warn('[carnet]', e); }
  finally { flushing = false; setStatus(); }
}

function write(name, id, data) {
  if (role === 'lecteur') return Promise.reject({ code: 'invalid_argument', message: 'Lecture seule' });
  setLocal(name, id, data);
  queue = queue.filter(q => !(q.c === name && q.id === id));
  queue.push({ c: name, id, data }); saveQueue();
  emit(name); flush();
  return Promise.resolve();
}

const db = {
  get role() { return role; },
  collection(name) {
    return {
      onSnapshot(cb) { (subs[name] = subs[name] || []).push(cb); emit(name); fetchCol(name); return () => {}; },
      doc(id) { return { set: obj => write(name, id, JSON.parse(JSON.stringify(obj))), delete: () => write(name, id, null) }; }
    };
  }
};

let resolveReady; const ready = new Promise(r => { resolveReady = r; });
const PUBLIC_ID = new URLSearchParams(location.search).get('voir');
window.CP = { sb, get carnet() { return carnet; }, get role() { return role; }, get me() { return me; }, publicView: !!PUBLIC_ID };
window.claude = { use: async cap => cap === 'db' ? ready : null };

let channel = null;
function startRealtime() {
  if (channel) sb.removeChannel(channel);
  channel = sb.channel('docs-' + carnet)
    .on('postgres_changes', { event: '*', schema: 'public', table: 'docs', filter: 'carnet_id=eq.' + carnet }, p => {
      const n = (p.new && p.new.collection) || (p.old && p.old.collection);
      if (n && subs[n]) fetchCol(n); else refreshAll();
    }).subscribe();
}

function useCarnet(c) {
  carnet = c.carnet_id; role = c.role;
  if (cache.uid !== me.id || cache.carnet !== carnet) cache = { cols: {} };
  Object.assign(cache, { uid: me.id, carnet, role, nom: c.nom, email: me.email }); saveCache();
}

async function joinOnline() {
  const { data, error } = await sb.rpc('rejoindre');
  if (error || !data || !data.length) throw error || new Error('Aucun carnet');
  return data[0];
}

async function start(session) {
  me = session.user;
  hideLogin();
  let started = false;
  if (cache.uid === me.id && cache.carnet) { carnet = cache.carnet; role = cache.role; started = true; resolveReady(db); }
  try {
    const c = await joinOnline();
    const changed = c.carnet_id !== carnet || c.role !== role;
    useCarnet(c);
    if (!started) resolveReady(db);
    else if (changed) location.reload();
    startRealtime(); refreshAll(); flush();
  } catch (e) {
    console.warn('[carnet]', e);
    if (!started) { showLogin(navigator.onLine ? 'Impossible d\'ouvrir le carnet. Réessayez.' : 'Pas de réseau : connectez-vous une première fois en ligne.'); }
  }
  setStatus();
}

window.addEventListener('online', () => { flush(); refreshAll(); });
window.addEventListener('offline', setStatus);
document.addEventListener('visibilitychange', () => { if (!document.hidden && carnet) { flush(); refreshAll(); } });

/* ---------- écran de connexion ---------- */
let mode = 'login';
function showLogin(msg) { $('auth').hidden = false; $('authErr').textContent = msg || ''; paintMode(); }
function hideLogin() { $('auth').hidden = true; }
function paintMode() {
  const L = { login: ['Se connecter', 'Se connecter', 'Créer un compte', 'Mot de passe oublié ?'],
              signup: ['Créer un compte', 'Créer le compte', 'J\'ai déjà un compte', ''],
              reset: ['Mot de passe oublié', 'Envoyer le lien', 'Retour', ''],
              newpw: ['Nouveau mot de passe', 'Enregistrer', '', ''] }[mode];
  $('authTitle').textContent = L[0]; $('authGo').textContent = L[1];
  $('authAlt').textContent = L[2]; $('authAlt').hidden = !L[2];
  $('authForgot').hidden = !L[3];
  $('authEmailF').hidden = mode === 'newpw';
  $('authPwF').hidden = mode === 'reset';
  $('authPw').autocomplete = mode === 'login' ? 'current-password' : 'new-password';
}
function bindLogin() {
  $('authAlt').onclick = () => { mode = mode === 'login' ? 'signup' : 'login'; $('authErr').textContent = ''; paintMode(); };
  $('authForgot').onclick = () => { mode = 'reset'; $('authErr').textContent = ''; paintMode(); };
  $('authForm').onsubmit = async e => {
    e.preventDefault();
    const email = $('authEmail').value.trim().toLowerCase(), pw = $('authPw').value, err = $('authErr'), go = $('authGo');
    err.textContent = ''; go.disabled = true;
    try {
      const back = location.origin + location.pathname;
      if (mode === 'login') {
        const { error } = await sb.auth.signInWithPassword({ email, password: pw });
        if (error) throw error;
      } else if (mode === 'signup') {
        if (pw.length < 8) throw new Error('Choisissez un mot de passe d\'au moins 8 caractères.');
        const { data, error } = await sb.auth.signUp({ email, password: pw, options: { emailRedirectTo: back } });
        if (error) throw error;
        if (!data.session) { mode = 'login'; paintMode(); err.textContent = 'Compte créé. Ouvrez le lien reçu par e-mail pour le confirmer, puis connectez-vous ici.'; }
      } else if (mode === 'reset') {
        const { error } = await sb.auth.resetPasswordForEmail(email, { redirectTo: back });
        if (error) throw error;
        mode = 'login'; paintMode(); err.textContent = 'E-mail envoyé. Suivez le lien pour choisir un nouveau mot de passe.';
      } else if (mode === 'newpw') {
        if (pw.length < 8) throw new Error('Au moins 8 caractères.');
        const { error } = await sb.auth.updateUser({ password: pw });
        if (error) throw error;
        mode = 'login'; const { data } = await sb.auth.getSession(); if (data.session) start(data.session);
      }
    } catch (e2) {
      const m = e2 && e2.message || '';
      err.textContent = /invalid login/i.test(m) ? 'E-mail ou mot de passe incorrect.'
        : /not confirmed/i.test(m) ? 'Adresse pas encore confirmée : ouvrez le lien reçu par e-mail.'
        : /already registered/i.test(m) ? 'Ce compte existe déjà : connectez-vous.'
        : /rate limit/i.test(m) ? 'Trop de tentatives, réessayez dans quelques minutes.'
        : /fetch|network/i.test(m) ? 'Pas de réseau.' : (m || 'Erreur inattendue.');
    } finally { go.disabled = false; }
  };
}

/* ---------- compte et partage ---------- */
async function openAccount() {
  const box = $('acct'); box.hidden = false;
  $('acctEmail').textContent = me ? me.email : '';
  $('acctRole').textContent = (cache.nom || 'Carnet') + ' · ' + (ROLE[role] || '');
  $('acctShare').hidden = role !== 'proprietaire';
  $('acctMsg').textContent = '';
  if (role === 'proprietaire') { await paintMembers(); await paintPublic(); }
}
async function paintMembers() {
  const list = $('acctList');
  if (!navigator.onLine) { list.innerHTML = '<p class="acct-note">Le partage se gère en ligne.</p>'; return; }
  const [m, i] = await Promise.all([
    sb.from('membres').select('user_id,email,role').eq('carnet_id', carnet).order('joined_at'),
    sb.from('invitations').select('email,role').eq('carnet_id', carnet).order('created_at')
  ]);
  const rows = (m.data || []).map(x => `<div class="acct-row"><span>${esc(x.email)}${x.user_id === me.id ? ' (vous)' : ''}<small>${ROLE[x.role] || x.role}</small></span>${x.user_id === me.id ? '' : `<button class="btn" data-rm="${esc(x.user_id)}">Retirer</button>`}</div>`)
    .concat((i.data || []).map(x => `<div class="acct-row"><span>${esc(x.email)}<small>Invitation en attente · ${ROLE[x.role] || x.role}</small></span><button class="btn" data-cancel="${esc(x.email)}">Annuler</button></div>`));
  list.innerHTML = rows.join('') || '<p class="acct-note">Personne d\'autre pour l\'instant.</p>';
}
async function paintPublic() {
  const box = $('acctPublic'); if (!box) return;
  const { data } = await sb.from('carnets').select('public').eq('id', carnet).maybeSingle();
  const on = !!(data && data.public), url = location.origin + location.pathname + '?voir=' + carnet;
  box.innerHTML = `<label class="acct-row" style="cursor:pointer"><span>Lien public en lecture<small>Carte, plongées et statistiques visibles sans compte (sans le parcours PADI ni les photos)</small></span><input type="checkbox" id="pubOn" ${on ? 'checked' : ''} style="width:22px;height:22px;accent-color:var(--done)"></label>` +
    (on ? `<div class="invite" style="margin-top:6px"><input class="f" id="pubUrl" readonly value="${esc(url)}" style="font:13px var(--f-mono);padding:8px;border-radius:9px;border:1px solid var(--line);background:var(--bg);color:var(--fg);min-width:0"><button class="btn" type="button" id="pubCopy">Copier</button></div>` : '');
  $('pubOn').onchange = async e => { const { error } = await sb.from('carnets').update({ public: e.target.checked }).eq('id', carnet); if (error) $('acctMsg').textContent = 'Réglage impossible : ' + error.message; paintPublic(); };
  const c = $('pubCopy'); if (c) c.onclick = async () => { try { await navigator.clipboard.writeText(url); c.textContent = 'Copié'; } catch { $('pubUrl').select(); } };
}
function bindAccount() {
  $('acctBtn').onclick = openAccount;
  $('acctClose').onclick = () => { $('acct').hidden = true; };
  $('acct').addEventListener('click', async e => {
    if (e.target === $('acct')) { $('acct').hidden = true; return; }
    const rm = e.target.closest('[data-rm]'), cn = e.target.closest('[data-cancel]');
    if (rm) { await sb.from('membres').delete().match({ carnet_id: carnet, user_id: rm.dataset.rm }); paintMembers(); }
    if (cn) { await sb.from('invitations').delete().match({ carnet_id: carnet, email: cn.dataset.cancel }); paintMembers(); }
  });
  $('inviteForm').onsubmit = async e => {
    e.preventDefault();
    const email = $('inviteEmail').value.trim().toLowerCase(), r = $('inviteRole').value, msg = $('acctMsg');
    if (!email) return;
    const { error } = await sb.from('invitations').upsert({ carnet_id: carnet, email, role: r });
    msg.textContent = error ? 'Invitation impossible : ' + error.message
      : `Invitation enregistrée. ${email} doit créer un compte dans l'app avec cette adresse : le carnet apparaîtra à sa connexion.`;
    if (!error) { $('inviteEmail').value = ''; paintMembers(); }
  };
  $('acctOut').onclick = async () => {
    if (queue.length && !confirm(`${queue.length} modification(s) pas encore envoyée(s) seront perdues. Se déconnecter quand même ?`)) return;
    await sb.auth.signOut(); localStorage.removeItem(CK); localStorage.removeItem(QK); location.reload();
  };
}

/* ---------- démarrage ---------- */
async function startPublic() {
  carnet = PUBLIC_ID; role = 'lecteur'; me = { id: 'public', email: '' };
  hideLogin(); document.documentElement.classList.add('public-view');
  const ab = $('acctBtn'); if (ab) ab.hidden = true;
  cache = { cols: {}, carnet, role, uid: 'public' };
  resolveReady(db); setStatus();
  const el = $('sync'); if (el) { el.classList.add('on'); const sp = el.querySelector('span'); if (sp) sp.textContent = 'Carnet partagé · lecture seule'; }
}
document.addEventListener('DOMContentLoaded', async () => {
  bindLogin(); bindAccount();
  if (PUBLIC_ID) { startPublic(); return; }
  sb.auth.onAuthStateChange((ev, session) => {
    if (ev === 'PASSWORD_RECOVERY') { mode = 'newpw'; showLogin('Choisissez votre nouveau mot de passe.'); return; }
    if (ev === 'SIGNED_IN' && session && !me) start(session);
  });
  const { data } = await sb.auth.getSession();
  if (data.session) { if (!me) start(data.session); }
  else if (mode !== 'newpw') showLogin();
});

if ('serviceWorker' in navigator) window.addEventListener('load', () => navigator.serviceWorker.register('sw.js').catch(() => {}));
})();
