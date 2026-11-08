/* Carnet de plongée — fiche plongée, photos, faune, import Shearwater, statistiques, voyages, rappels PADI */
(() => {
'use strict';
const $ = id => document.getElementById(id);
const BZ = window.BONAIRE;
if (!BZ) return;
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const el = (tag, cls, html) => { const e = document.createElement(tag); if (cls) e.className = cls; if (html != null) e.innerHTML = html; return e; };
const nf = (v, d = 1) => v == null || v === '' || isNaN(v) ? '–' : (+v).toFixed(d).replace(/\.0+$/, '').replace('.', ',');
const fDate = (s, o = { day: 'numeric', month: 'short', year: 'numeric' }) => { if (!s) return 'Sans date'; const d = new Date(s.length === 10 ? s + 'T12:00' : s); return isNaN(d) ? s : d.toLocaleDateString('fr-FR', o); };
const lsG = k => { try { return JSON.parse(localStorage.getItem(k)); } catch { return null; } };
const lsS = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch {} };
const PUBLIC = !!(window.CP && window.CP.publicView);
const ro = () => PUBLIC || BZ.readonly();
const done = () => BZ.dives().filter(d => d.statut === 'faite');
const zoneName = id => { const z = BZ.zoneById(BZ.siteZone(id)); return z ? z.nom : ''; };
const toast = msg => { let t = $('cpToast'); if (!t) { t = el('div', 'toast'); t.id = 'cpToast'; t.setAttribute('role', 'status'); document.body.append(t); } t.textContent = msg; t.hidden = false; clearTimeout(t._h); t._h = setTimeout(() => t.hidden = true, 2600); };
const dbP = (async () => { try { return window.claude && window.claude.use ? await window.claude.use('db') : null; } catch { return null; } })();

/* ---------------- styles ---------------- */
document.head.append(el('style', null, `
.cp-sec{display:flex;flex-direction:column;gap:14px}
.cp-sec h3{margin:0;font-family:var(--f-display);font-size:19px}
.cp-k{font:500 11px var(--f-mono);letter-spacing:.1em;text-transform:uppercase;color:var(--muted)}
.cp-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:14px}
@media (max-width:760px){.cp-grid{grid-template-columns:minmax(0,1fr)}}
.cp-tiles{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:10px}
@media (max-width:520px){.cp-tiles{grid-template-columns:repeat(2,minmax(0,1fr))}}
.cp-tile{display:flex;flex-direction:column;gap:3px;min-width:0}
.cp-tile b{font-family:var(--f-display);font-size:24px;font-weight:700;font-variant-numeric:tabular-nums;line-height:1.05}
.cp-tile span{font-size:11px;letter-spacing:.08em;text-transform:uppercase;color:var(--muted)}
.cp-tile small{font-size:12px;color:var(--muted);overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.cp-bars{display:flex;flex-direction:column;gap:7px}
.cp-bar{display:grid;grid-template-columns:minmax(64px,max-content) minmax(0,1fr) 34px;gap:10px;align-items:center;font-size:13px}
.cp-bar .tr{height:12px;border-radius:6px;background:color-mix(in srgb,var(--line) 70%,transparent);overflow:hidden;display:flex}
.cp-bar .tr i{display:block;height:100%}
.cp-bar b{font-variant-numeric:tabular-nums;text-align:right}
.cp-leg{display:flex;flex-wrap:wrap;gap:6px 12px;font-size:12px;color:var(--muted)}
.cp-leg i{display:inline-block;width:10px;height:10px;border-radius:3px;margin-right:5px;vertical-align:-1px}
.cp-sel{font:14px var(--f-body);padding:7px 10px;border-radius:10px;border:1px solid var(--line);background:var(--surface);color:var(--fg)}
.cp-rec{display:flex;flex-direction:column}
.cp-rec button{display:grid;grid-template-columns:minmax(0,1fr) auto;gap:2px 10px;text-align:left;background:none;border:0;border-top:1px solid var(--line);padding:9px 2px;color:inherit;font:inherit;cursor:pointer}
.cp-rec button:first-child{border-top:0}
.cp-rec .l{font-size:12px;color:var(--muted);grid-column:1/-1}
.cp-rec .n{font-weight:700;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.cp-rec .v{font-family:var(--f-display);font-weight:700;font-variant-numeric:tabular-nums}
.cp-sheet{width:min(640px,100%)}
.cp-head{display:flex;justify-content:space-between;gap:10px;align-items:flex-start}
.cp-head h3{line-height:1.15}
.cp-x{background:none;border:0;color:var(--muted);font-size:26px;line-height:1;cursor:pointer;padding:0 4px}
.cp-met{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:8px}
@media (max-width:460px){.cp-met{grid-template-columns:repeat(2,minmax(0,1fr))}}
.cp-met div{background:var(--bg);border:1px solid var(--line);border-radius:10px;padding:8px 10px;display:flex;flex-direction:column;gap:2px;min-width:0}
.cp-met b{font-family:var(--f-display);font-size:19px;font-variant-numeric:tabular-nums}
.cp-met span{font-size:10.5px;letter-spacing:.08em;text-transform:uppercase;color:var(--muted)}
.cp-prof{width:100%;height:auto;aspect-ratio:600/190;flex:none;display:block;background:color-mix(in srgb,var(--sea) 35%,var(--bg));border-radius:10px;border:1px solid var(--line)}
.cp-prof text{font:14px var(--f-mono);fill:var(--muted)}
.cp-chips{display:flex;flex-wrap:wrap;gap:6px}
.cp-chips .chip{font-size:12.5px;padding:5px 10px}
.cp-ph{display:grid;grid-template-columns:repeat(auto-fill,minmax(92px,1fr));gap:6px}
.cp-ph .t{position:relative;aspect-ratio:1;border-radius:9px;overflow:hidden;background:var(--bg);border:1px solid var(--line)}
.cp-ph img{width:100%;height:100%;object-fit:cover;display:block;cursor:zoom-in}
.cp-ph label.add{display:flex;align-items:center;justify-content:center;aspect-ratio:1;border-radius:9px;border:1.5px dashed var(--line);color:var(--muted);font-weight:700;font-size:13px;cursor:pointer;text-align:center;padding:6px}
.cp-ph .t.up img{opacity:.45}
.cp-ph .t.up .pg{position:absolute;inset:auto 4px 4px 4px;font-size:11px;font-weight:700;color:#fff;background:rgba(0,0,0,.55);border-radius:6px;padding:2px 5px;text-align:center}
.cp-ph .t.up.run .pg{background:var(--done)}
.cp-ph .t.up.err .pg{background:var(--red)}
.cp-ph .t.lost{display:flex}
.cp-ph .lostb{all:unset;cursor:pointer;flex:1;display:flex;align-items:center;justify-content:center;text-align:center;font-size:11.5px;color:var(--muted);padding:6px}
.cp-light{position:fixed;inset:0;z-index:2600;background:rgba(0,0,0,.92);display:flex;align-items:center;justify-content:center;padding:12px}
.cp-light{flex-direction:column;gap:12px}
.cp-light img{max-width:100%;max-height:calc(100% - 64px);object-fit:contain}
.cp-light-bar{display:flex;gap:10px}
.cp-light-bar .btn{background:rgba(255,255,255,.12);color:#fff;border-color:rgba(255,255,255,.3)}
.cp-light-bar .btn.danger{background:var(--red);border-color:var(--red);color:#fff}
.cp-note{font-size:13px;color:var(--muted);margin:0}
.cp-warn{border-radius:12px;padding:10px 12px;font-size:14px;display:flex;flex-direction:column;gap:3px;border:1px solid}
.cp-warn.r{background:color-mix(in srgb,var(--red) 10%,transparent);border-color:color-mix(in srgb,var(--red) 40%,transparent)}
.cp-warn.a{background:color-mix(in srgb,var(--amber) 10%,transparent);border-color:color-mix(in srgb,var(--amber) 40%,transparent)}
.cp-warn.g{background:var(--done-soft);border-color:color-mix(in srgb,var(--done) 40%,transparent)}
.views button .cp-badge{display:inline-block;width:8px;height:8px;border-radius:50%;background:var(--red);margin-left:6px;vertical-align:2px}
.cp-tl{display:flex;flex-direction:column}
.cp-st{display:grid;grid-template-columns:86px minmax(0,1fr);gap:4px 12px;padding:10px 0;border-top:1px solid var(--line)}
.cp-st:first-child{border-top:0}
.cp-st .d{font:500 12px var(--f-mono);color:var(--muted);line-height:1.35}
.cp-st .p b{font-family:var(--f-display);font-size:16px}
.cp-st .p small{display:block;color:var(--muted);font-size:13px}
.cp-st.vol .p b{font-family:var(--f-body);font-size:14px}
.cp-st.vol .p b::before{content:"✈ ";color:var(--muted)}
.cp-st .nf{grid-column:2;font-size:13px;color:var(--amber);font-weight:700}
.cp-chk{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:4px 14px}
@media (max-width:520px){.cp-chk{grid-template-columns:minmax(0,1fr)}}
.cp-chk label{display:flex;gap:9px;align-items:center;padding:5px 0;font-size:14px;cursor:pointer}
.cp-chk input{width:19px;height:19px;accent-color:var(--done);margin:0;flex:none}
.cp-chk label.ok span{color:var(--muted);text-decoration:line-through}
.cp-ed{display:grid;gap:6px}
.cp-ed .r{display:grid;grid-template-columns:minmax(0,1.3fr) 128px 128px minmax(0,1.2fr) auto auto;gap:6px;align-items:center}
.cp-ed .r.v{grid-template-columns:128px 70px minmax(0,1fr) minmax(0,1fr) 80px auto}
@media (max-width:700px){.cp-ed .r,.cp-ed .r.v{grid-template-columns:minmax(0,1fr) minmax(0,1fr);padding-bottom:8px;border-bottom:1px solid var(--line)}}
.cp-ed input{font:13px var(--f-body);padding:6px 8px;border-radius:8px;border:1px solid var(--line);background:var(--bg);color:var(--fg);min-width:0;width:100%}
.cp-ed label.pl{display:flex;gap:5px;align-items:center;font-size:12.5px;white-space:nowrap}
.cp-tide{width:100%;height:auto;aspect-ratio:600/170;flex:none;display:block}
.cp-tide text{font:14px var(--f-mono);fill:var(--muted)}
.cp-imp{display:flex;flex-direction:column;gap:8px;max-height:46vh;overflow:auto}
.cp-imp .r{display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1.2fr);gap:8px;align-items:center;font-size:13.5px}
.cp-imp select{font:13px var(--f-body);padding:6px;border-radius:8px;border:1px solid var(--line);background:var(--bg);color:var(--fg);min-width:0;width:100%}
.cp-deco{display:flex;flex-direction:column;gap:6px}
.cp-ban{margin:0 0 12px}
.cp-ban-in{display:flex;flex-wrap:wrap;gap:8px;align-items:stretch}
.cp-ban-in>div{flex:1 1 140px;background:var(--surface);border:1px solid var(--line);border-left:3px solid var(--amber);border-radius:10px;padding:8px 11px;display:flex;flex-direction:column;gap:2px}
.cp-ban-in span{font-size:10.5px;letter-spacing:.08em;text-transform:uppercase;color:var(--muted)}
.cp-ban-in b{font-size:15px}
.cp-ban .cp-note{margin-top:6px}
.cp-vl{display:grid;grid-template-columns:repeat(auto-fill,minmax(190px,1fr));gap:8px;margin-top:6px}
.cp-vc{display:flex;flex-direction:column;gap:2px;text-align:left;background:var(--bg);border:1px solid var(--line);border-radius:12px;padding:10px 12px;color:inherit;font:inherit;cursor:pointer;min-width:0}
.cp-vc[aria-pressed="true"]{border-color:var(--done);box-shadow:0 0 0 2px color-mix(in srgb,var(--done) 30%,transparent)}
.cp-vc b{font-family:var(--f-display);font-size:16px}
.cp-vc span{font-size:13px}
.cp-vc small{font-size:12px;color:var(--muted)}
.cp-faune{display:flex;gap:8px;align-items:center;margin-top:8px}
.cp-faune select{flex:1;min-width:0}
html.public-view [data-v="padi"],html.public-view [data-v="voyages"],html.public-view [data-v="plan"]{display:none}
`));

/* ---------------- onglets ---------------- */
const views = document.querySelector('.views');
const wrap = $('sec-padi').parentElement;
function addTab(v, label, before) {
  const b = el('button'); b.setAttribute('role', 'tab'); b.dataset.v = v; b.setAttribute('aria-selected', 'false'); b.textContent = label;
  const ref = before && views.querySelector(`[data-v="${before}"]`); ref ? views.insertBefore(b, ref) : views.append(b);
  const s = el('section', 'cp-sec'); s.id = 'sec-' + v; s.hidden = true; wrap.append(s); return s;
}
const secStats = addTab('stats', 'Statistiques', 'plan');
const secVoy = addTab('voyages', 'Voyages', 'ndl');
let curView = 'map';
document.addEventListener('cp-view', e => { curView = e.detail; lsS('cp-view2', e.detail); if (typeof paintDecoBan === 'function') paintDecoBan();
  if (e.detail === 'stats') renderStats(); if (e.detail === 'voyages') renderVoy(); });
const saved = lsG('cp-view2');
if ((saved === 'stats' || (saved === 'voyages' && !PUBLIC))) setTimeout(() => views.querySelector(`[data-v="${saved}"]`).click(), 0);
if (PUBLIC && ['padi', 'plan', 'voyages'].includes(saved)) setTimeout(() => views.querySelector('[data-v="map"]').click(), 0);

/* ---------------- faune ---------------- */
const FAUNE = ['Tortue', 'Raie aigle', 'Raie manta', 'Raie pastenague', 'Requin gris', 'Requin pointe noire', 'Requin citron', 'Requin marteau', 'Requin nourrice', 'Dauphin', 'Baleine', 'Murène', 'Poisson-grenouille', 'Hippocampe', 'Barracuda', 'Tarpon', 'Napoléon', 'Poulpe', 'Calamar', 'Seiche', 'Langouste', 'Poisson-lion', 'Brochet', 'Perche'];
const faunes = () => { const m = new Map(); done().forEach(d => (d.faune || []).forEach(f => m.set(f, (m.get(f) || 0) + 1))); return [...m].sort((a, b) => b[1] - a[1]); };
let fauneSel = '';
const fBox = el('div', 'cp-faune'); fBox.innerHTML = '<label class="cp-k" for="cpFaune">Faune</label><select class="cp-sel" id="cpFaune"></select>';
$('years').after(fBox);
function paintFauneFilter() {
  const list = faunes(), s = $('cpFaune');
  fBox.hidden = !list.length && !fauneSel;
  s.innerHTML = '<option value="">Toutes les plongées</option>' + list.map(([f, n]) => `<option value="${esc(f)}">${esc(f)} (${n})</option>`).join('');
  s.value = fauneSel;
}
$('cpFaune').onchange = e => { fauneSel = e.target.value; window.CP_FILTER = fauneSel ? d => (d.faune || []).includes(fauneSel) : null; BZ.rerender(); };

/* ---------------- photos (Supabase Storage) ---------------- */
const store = () => window.CP && window.CP.sb && !PUBLIC ? window.CP.sb.storage.from('photos') : null;
const urlCache = new Map();
async function signed(paths) {
  const need = paths.filter(p => { const c = urlCache.get(p); return !c || c.t < Date.now(); });
  if (need.length && store()) { const { data } = await store().createSignedUrls(need, 3600);
    (data || []).forEach(x => { if (x.signedUrl) urlCache.set(x.path, { u: x.signedUrl, t: Date.now() + 3300e3 }); }); }
  return paths.map(p => urlCache.get(p)?.u || null);
}
function shrink(file, max = 1800) {
  return new Promise((res, rej) => { const img = new Image(), u = URL.createObjectURL(file);
    img.onload = () => { const k = Math.min(1, max / Math.max(img.width, img.height)), c = document.createElement('canvas');
      c.width = Math.round(img.width * k); c.height = Math.round(img.height * k); c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
      URL.revokeObjectURL(u); c.toBlob(b => b ? res(b) : rej(new Error('jpeg')), 'image/jpeg', .84); };
    img.onerror = () => { URL.revokeObjectURL(u); rej(new Error('image')); }; img.src = u; });
}
const uuid = () => (crypto.randomUUID ? crypto.randomUUID() : Date.now().toString(36) + Math.random().toString(36).slice(2));
function lightbox(src, onDel) {
  const o = el('div', 'cp-light'); o.setAttribute('role', 'dialog'); o.setAttribute('aria-modal', 'true');
  o.innerHTML = `<img alt="" src="${esc(src)}"><div class="cp-light-bar"><button type="button" class="btn" data-a="x">Fermer</button>${onDel ? '<button type="button" class="btn danger" data-a="del">Supprimer</button>' : ''}</div>`;
  const close = () => { o.remove(); document.removeEventListener('keydown', k); }, k = e => { if (e.key === 'Escape') close(); };
  o.onclick = e => { if (e.target === o || e.target.tagName === 'IMG' || e.target.dataset.a === 'x') close(); };
  const b = o.querySelector('[data-a="del"]'); if (b) b.onclick = async e => { e.stopPropagation();
    if (b.dataset.arm !== '1') { b.dataset.arm = '1'; b.textContent = 'Confirmer la suppression'; return; }
    b.disabled = true; await onDel(); close(); };
  document.addEventListener('keydown', k); document.body.append(o);
}

/* ---------------- fiche plongée ---------------- */
const dOv = el('div', 'overlay'); dOv.id = 'cpDive'; dOv.hidden = true;
dOv.innerHTML = '<div class="sheet cp-sheet" role="dialog" aria-modal="true" aria-labelledby="cpDvT"></div>';
document.body.append(dOv);
dOv.addEventListener('click', e => { if (e.target === dOv) closeDive(); });
document.addEventListener('keydown', e => { if (e.key === 'Escape' && !dOv.hidden) closeDive(); });
let openId = null;
function closeDive() { dOv.hidden = true; openId = null; }
const getDive = id => BZ.dives().find(d => d.id === id);
async function patchDive(id, patch) {
  const d = getDive(id); if (!d) return; const { id: _, ...rest } = d;
  await BZ.save(id, { ...rest, ...patch, maj: new Date().toISOString() });
}
function profileSVG(d) {
  const c = d.courbe; if (!c || !c.p || c.p.length < 2) return '';
  const W = 600, H = 190, L = 34, R = 10, T = 12, B = 26, n = c.p.length, dur = (n - 1) * c.pas / 60;
  const mx = Math.max(5, ...c.p), ymax = Math.ceil(mx / 5) * 5;
  const x = i => L + (W - L - R) * i / (n - 1), y = v => T + (H - T - B) * v / ymax;
  const pts = c.p.map((v, i) => `${x(i).toFixed(1)},${y(v).toFixed(1)}`).join(' ');
  let g = '';
  for (let v = 0; v <= ymax; v += ymax > 30 ? 10 : 5) g += `<line x1="${L}" x2="${W - R}" y1="${y(v)}" y2="${y(v)}" stroke="var(--line)" stroke-width="1"/><text x="${L - 5}" y="${y(v) + 4}" text-anchor="end">${v}</text>`;
  const step = dur > 60 ? 15 : 10;
  for (let m = step; m < dur; m += step) g += `<text x="${L + (W - L - R) * m / dur}" y="${H - 7}" text-anchor="middle">${m}′</text>`;
  let tl = '';
  if (c.t && c.t.length === n && Math.max(...c.t) - Math.min(...c.t) >= 1) { const a = Math.min(...c.t), z = Math.max(...c.t), tmn = a - 1, tmx = z + 1, ty = v => T + (H - T - B) * (1 - (v - tmn) / (tmx - tmn));
    tl = `<polyline fill="none" stroke="var(--amber)" stroke-width="1.6" stroke-dasharray="4 3" points="${c.t.map((v, i) => `${x(i).toFixed(1)},${ty(v).toFixed(1)}`).join(' ')}"/><text x="${W - R - 2}" y="${ty(z) - 4}" text-anchor="end" style="fill:var(--amber)">${z} °C</text><text x="${W - R - 2}" y="${ty(a) + 15}" text-anchor="end" style="fill:var(--amber)">${a} °C</text>`; }
  const im = c.p.indexOf(mx);
  return `<svg class="cp-prof" viewBox="0 0 ${W} ${H}" role="img" aria-label="Profil : ${nf(mx)} m maximum, ${Math.round(dur)} minutes">${g}
    <polygon points="${x(0)},${y(0)} ${pts} ${x(n - 1)},${y(0)}" fill="color-mix(in srgb,var(--done) 22%,transparent)"/>
    <polyline points="${pts}" fill="none" stroke="var(--done)" stroke-width="2.2" stroke-linejoin="round"/>${tl}
    <circle cx="${x(im)}" cy="${y(mx)}" r="3.5" fill="var(--done)"/><text x="${Math.min(x(im) + 6, W - 60)}" y="${Math.min(y(mx) + 14, H - B - 2)}" style="fill:var(--fg)">${nf(mx)} m</text>
    <text x="${L}" y="${H - 7}">min</text><text x="4" y="${T + 4}">m</text></svg>`;
}
BZ.openDive = id => { openId = id; paintDive(); dOv.hidden = false; };
function paintDive() {
  const d = getDive(openId), sh = dOv.firstElementChild; if (!d) { closeDive(); return; }
  const R = ro(), s = BZ.site(d.site), tm = BZ.times ? BZ.times(BZ.dives()).get(d.id) : null;
  const heure = d.heure || (tm && !tm.assumed ? tm.time : null);
  const met = [['Prof. max', d.prof != null ? nf(d.prof) + ' m' : '–'], ['Durée', d.duree != null ? d.duree + ' min' : '–'],
    ['Prof. moy.', d.pmoy != null ? nf(d.pmoy) + ' m' : '–'], ['Gaz', esc(d.gaz || '–')],
    ['Eau', d.tmin != null ? (d.tmin === d.tmax || d.tmax == null ? d.tmin + ' °C' : `${d.tmin}–${d.tmax} °C`) : d.temp != null ? nf(d.temp) + ' °C' : '–'],
    ['Lest Chris', d.lestChris != null ? nf(d.lestChris) + ' kg' : '–'], ['Lest Véro', d.lestVero != null ? nf(d.lestVero) + ' kg' : '–'], ['N°', d.numero || '–']];
  const fa = d.faune || [], extra = fa.filter(f => !FAUNE.includes(f));
  sh.innerHTML = `<div class="cp-head"><div><span class="cp-k">${esc(zoneName(d.site))}${s && s.secteur ? ' · ' + esc(s.secteur) : ''}</span>
      <h3 id="cpDvT">${esc(s ? s.name : d.site)}</h3><span class="cp-note">${fDate(d.date, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}${heure ? ' · ' + heure.replace(':', ' h ') : ''}${d.statut === 'prevue' ? ' · prévue' : ''}</span></div>
      <button class="cp-x" type="button" aria-label="Fermer" data-a="x">×</button></div>
    <div class="cp-met">${met.map(([k, v]) => `<div><span>${k}</span><b>${v}</b></div>`).join('')}</div>
    ${profileSVG(d) || (d.statut === 'faite' && !R ? '<p class="cp-note">Pas de profil : importez votre export Shearwater (bouton « Shearwater » de la liste).</p>' : '')}
    ${d.courbe && d.courbe.t && Math.max(...d.courbe.t) - Math.min(...d.courbe.t) >= 1 ? '<div class="cp-leg"><span><i style="background:var(--done)"></i>Profondeur</span><span><i style="background:var(--amber)"></i>Température</span></div>' : ''}
    ${d.statut === 'faite' ? decoHTML(d) : ''}
    ${d.notes ? `<p style="margin:0;white-space:pre-wrap;font-size:14px">${esc(d.notes)}</p>` : ''}
    <div><span class="cp-k">Faune observée</span><div class="cp-chips" id="cpFa" style="margin-top:6px">${R
      ? (fa.length ? fa.map(f => `<span class="chip" aria-pressed="true" style="cursor:default">${esc(f)}</span>`).join('') : '<span class="cp-note">Rien de noté.</span>')
      : [...FAUNE, ...extra].map(f => `<button class="chip" type="button" data-f="${esc(f)}" aria-pressed="${fa.includes(f)}">${esc(f)}</button>`).join('') + '<button class="chip" type="button" data-a="fadd">+ Autre</button>'}</div></div>
    ${PUBLIC ? '' : `<div><span class="cp-k">Photos</span><div class="cp-ph" id="cpPh" style="margin-top:6px"></div><p class="cp-note" id="cpPhMsg" role="status"></p></div>`}
    <div class="row" style="justify-content:flex-end"><button class="btn" type="button" data-a="map">Voir sur la carte</button>${R ? '' : '<button class="btn pri" type="button" data-a="edit">Modifier</button>'}</div>`;
  sh.querySelector('[data-a="x"]').onclick = closeDive;
  sh.querySelector('[data-a="map"]').onclick = () => { closeDive(); BZ.showOnMap(d.site); };
  const ed = sh.querySelector('[data-a="edit"]'); if (ed) ed.onclick = () => { closeDive(); BZ.edit(d.id); };
  if (!R) {
    sh.querySelectorAll('#cpFa [data-f]').forEach(b => b.onclick = () => { const f = b.dataset.f, cur = new Set(getDive(d.id).faune || []);
      cur.has(f) ? cur.delete(f) : cur.add(f); b.setAttribute('aria-pressed', cur.has(f)); patchDive(d.id, { faune: [...cur] }).catch(() => toast('Enregistrement impossible')); });
    sh.querySelector('[data-a="fadd"]').onclick = () => { const v = (prompt('Espèce observée') || '').trim().slice(0, 40); if (!v) return;
      const cur = new Set(getDive(d.id).faune || []); cur.add(v[0].toUpperCase() + v.slice(1)); patchDive(d.id, { faune: [...cur] }).then(paintDive); };
  }
  if (!PUBLIC) paintPhotos(d);
}
/* photos : miniatures + cache local (Cache API) pour ne pas retélécharger */
const PHC = 'cp-photos-v1', objUrl = new Map(), noThumb = new Set(lsG('cp-nothumb') || []);
const thumbOf = p => p.replace(/\.jpg$/, '_t.jpg');
async function cacheGet(path) { try { const c = await caches.open(PHC), r = await c.match(location.origin + '/__photo/' + path); return r ? await r.blob() : null; } catch { return null; } }
async function cachePut(path, blob) { try { const c = await caches.open(PHC); await c.put(location.origin + '/__photo/' + path, new Response(blob, { headers: { 'content-type': blob.type || 'image/jpeg' } })); } catch {} }
async function photoURLs(paths) {   // renvoie une URL locale par chemin (null si introuvable)
  const out = new Map(), miss = [];
  for (const p of paths) { if (objUrl.has(p)) { out.set(p, objUrl.get(p)); continue; } const b = await cacheGet(p); if (b) { const u = URL.createObjectURL(b); objUrl.set(p, u); out.set(p, u); } else miss.push(p); }
  if (miss.length) { const urls = await signed(miss);
    await Promise.all(miss.map(async (p, i) => { if (!urls[i]) return; try { const r = await fetch(urls[i]); if (!r.ok) return; const b = await r.blob(); cachePut(p, b); const u = URL.createObjectURL(b); objUrl.set(p, u); out.set(p, u); } catch {} })); }
  return paths.map(p => out.get(p) || null);
}
async function thumbURLs(paths) {
  const want = paths.map(p => noThumb.has(p) ? p : thumbOf(p)), urls = await photoURLs(want), retry = [];
  urls.forEach((u, i) => { if (!u && want[i] !== paths[i]) { noThumb.add(paths[i]); retry.push(i); } });
  if (retry.length) { lsS('cp-nothumb', [...noThumb]); const r = await photoURLs(retry.map(i => paths[i])); retry.forEach((i, k) => urls[i] = r[k]); }
  return urls;
}
function loadImg(file) { return new Promise((res, rej) => { const img = new Image(), u = URL.createObjectURL(file);
  img.onload = () => { URL.revokeObjectURL(u); res(img); }; img.onerror = () => { URL.revokeObjectURL(u); rej(new Error('image illisible')); }; img.src = u; }); }
const toJpeg = (img, max, q) => new Promise((res, rej) => { const k = Math.min(1, max / Math.max(img.width, img.height)), c = document.createElement('canvas');
  c.width = Math.round(img.width * k); c.height = Math.round(img.height * k); c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
  c.toBlob(b => b ? res(b) : rej(new Error('jpeg')), 'image/jpeg', q); });
async function uploadPhoto(file, dir) {
  const img = await loadImg(file), full = await toJpeg(img, 1600, .8), th = await toJpeg(img, 480, .74), path = `${window.CP.carnet}/${dir}/${uuid()}.jpg`;
  const [a] = await Promise.all([store().upload(path, full, { contentType: 'image/jpeg', upsert: false }), store().upload(thumbOf(path), th, { contentType: 'image/jpeg', upsert: false })]);
  if (a.error) throw a.error;
  cachePut(path, full); cachePut(thumbOf(path), th); objUrl.set(thumbOf(path), URL.createObjectURL(th)); return path;
}
/* liste de photos robuste : une photo supprimée ne revient pas, une photo ajoutée ne disparaît pas (échos de synchro décalés) */
const gonePh = new Set(), addedPh = new Map(), upQ = new Map();   // upQ : envois en cours par dossier
const fixList = (key, list) => [...new Set([...(list || []), ...(addedPh.get(key) || [])])].filter(p => !gonePh.has(p));
const markAdded = (key, ps) => { if (!addedPh.has(key)) addedPh.set(key, new Set()); ps.forEach(p => addedPh.get(key).add(p)); };
const gridState = new WeakMap();
function photoGrid(box, list, { R, dir, max, label, onSave, msg }) {
  if (!box) return; box.dataset.grid = dir;
  const ph = fixList(dir, list), q = upQ.get(dir) || [];
  const key = JSON.stringify([ph, R, q.map(x => x.st)]); if (gridState.get(box) === key) return; gridState.set(box, key);
  box.innerHTML = ph.map((p, i) => `<div class="t"><img alt="${label} ${i + 1}" data-i="${i}" decoding="async"></div>`).join('') +
    q.filter(x => x.st !== 'ok').map(x => `<div class="t up ${x.st}"><img alt="" src="${x.prev}"><span class="pg">${x.st === 'err' ? 'Échec' : x.st === 'wait' ? 'En attente' : 'Envoi…'}</span></div>`).join('') +
    (R ? '' : `<label class="add">+ Ajouter des photos<input type="file" accept="image/*" multiple hidden></label>`);
  if (!ph.length && !q.length && R) box.innerHTML = '<span class="cp-note">Aucune photo.</span>';
  const del = p => async () => { gonePh.add(p); try { await store().remove([p, thumbOf(p)]); } catch {} await onSave(); };
  if (ph.length) thumbURLs(ph).then(async urls => {
    const lost = ph.filter((p, i) => !urls[i]), full = lost.length ? await photoURLs(lost) : [];
    box.querySelectorAll('img[data-i]').forEach(im => { const i = +im.dataset.i, p = ph[i], u = urls[i];
      if (!u) { const t = im.parentElement; if (full[lost.indexOf(p)]) { im.src = full[lost.indexOf(p)]; } else { t.classList.add('lost'); t.innerHTML = `<button type="button" class="lostb">${R ? 'Photo introuvable' : 'Introuvable · retirer'}</button>`; if (!R) t.firstChild.onclick = del(p); return; } }
      else im.src = u;
      im.onclick = async () => { const [f] = await photoURLs([p]); lightbox(f || im.src, R ? null : del(p)); }; }); });
  const inp = box.querySelector('input[type=file]'); if (inp) inp.onchange = async () => {
    const files = [...inp.files].slice(0, max); inp.value = ''; if (!files.length || !store()) return;
    const items = files.map(f => ({ f, st: 'wait', prev: URL.createObjectURL(f) })); upQ.set(dir, [...(upQ.get(dir) || []), ...items]);
    const curList = () => (gridOpts.get(dir) || (() => list))();
    const refresh = () => { const b = document.querySelector(`[data-grid="${CSS.escape(dir)}"]`); if (b) { gridState.delete(b); photoGrid(b, curList(), { R, dir, max, label, onSave, msg }); } };
    refresh();
    let n = 0, idx = 0, batch = [];
    const flush = async () => { if (!batch.length) return; batch = []; await onSave(); };
    const worker = async () => { while (idx < items.length) { const it = items[idx++]; it.st = 'run'; refresh();
      try { const p = await uploadPhoto(it.f, dir); it.st = 'ok'; markAdded(dir, [p]); batch.push(p); if (batch.length >= 4) await flush(); } catch (e) { it.st = 'err'; }
      msg(`${++n}/${items.length} envoyée(s)`); refresh(); } };
    await Promise.all([worker(), worker(), worker()]); await flush();
    upQ.set(dir, (upQ.get(dir) || []).filter(x => !items.includes(x) || x.st === 'err')); items.filter(x => x.st === 'ok').forEach(x => URL.revokeObjectURL(x.prev));
    const ko = items.filter(x => x.st === 'err').length; msg(ko ? `${items.length - ko} envoyée(s), ${ko} en échec` : `${items.length} photo(s) ajoutée(s)`); refresh();
  };
}
const gridOpts = new Map();   // dossier -> fonction qui renvoie la liste à jour
function paintPhotos(d) {
  gridOpts.set(d.id, () => getDive(d.id)?.photos || []);
  photoGrid($('cpPh'), d.photos || [], { R: ro(), dir: d.id, max: 30, label: 'Photo', msg: t => { const m = $('cpPhMsg'); if (m) m.textContent = t; },
    onSave: async () => { await patchDive(d.id, { photos: fixList(d.id, getDive(d.id)?.photos) }); paintDive(); } });
}

/* ---------------- import Shearwater ---------------- */
const SQLJS = 'https://cdnjs.cloudflare.com/ajax/libs/sql.js/1.10.3/';
let sqlP = null;
const loadSql = () => sqlP || (sqlP = new Promise((res, rej) => { const s = document.createElement('script'); s.src = SQLJS + 'sql-wasm.js'; s.crossOrigin = 'anonymous';
  s.onload = () => window.initSqlJs({ locateFile: f => SQLJS + f }).then(res, rej); s.onerror = () => { sqlP = null; rej(new Error('sql.js indisponible (hors ligne ?)')); }; document.head.append(s); }));
async function gunzip(u8) {
  const rd = new Blob([u8]).stream().pipeThrough(new DecompressionStream('gzip')).getReader(), ch = []; let n = 0;
  try { for (;;) { const { done, value } = await rd.read(); if (done) break; ch.push(value); n += value.length; } } catch (e) { if (!n) throw e; }
  const out = new Uint8Array(n); let o = 0; for (const c of ch) { out.set(c, o); o += c.length; } return out;
}
async function parsePNF(bytes) {
  let i = 0; while (i < bytes.length - 1 && !(bytes[i] === 0x1f && bytes[i + 1] === 0x8b)) i++;
  if (i >= bytes.length - 1) return null;
  const raw = await gunzip(bytes.subarray(i)), pts = [], tt = []; let o2 = null;
  for (let k = 0; k + 32 <= raw.length; k += 32) { if (raw[k] !== 1) continue;
    pts.push(((raw[k + 1] << 8) | raw[k + 2]) / 10); tt.push((raw[k + 14] << 24) >> 24); if (o2 == null && raw[k + 8] > 0 && raw[k + 8] <= 100) o2 = raw[k + 8]; }
  if (pts.length < 3) return null;
  const p = [], t = []; for (let k = 0; k < pts.length; k += 3) { const g = pts.slice(k, k + 3); p.push(Math.round(g.reduce((a, b) => a + b, 0) / g.length * 10) / 10); t.push(tt[Math.min(k + 2, tt.length - 1)]); }
  const tv = tt.filter(v => v > -5 && v < 45), pm = pts.reduce((a, b) => a + b, 0) / pts.length;
  return { courbe: { pas: 30, p, t: t.every(v => v > -5 && v < 45) ? t : undefined }, tmin: tv.length ? Math.min(...tv) : null, tmax: tv.length ? Math.max(...tv) : null, pmoy: Math.round(pm * 10) / 10, o2 };
}
const norm = s => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/['’`]/g, '').replace(/[^a-z0-9]+/g, ' ').trim();
const STOP = new Set(['the', 'reef', 'beach', 'playa', 'boka', 'boca', 'le', 'la', 'les', 'de', 'du', 'epave', 'wreck']);
function matchSite(loc, site) {
  const n = norm(site); if (!n) return null; const L = BZ.siteList();
  let hit = L.find(s => norm(s.name) === n) || L.find(s => norm(s.name).split(' (')[0] === n);
  if (hit) return hit.id;
  const toks = n.split(' ').filter(w => w.length > 2 && !STOP.has(w)); if (!toks.length) return null;
  let best = null, sc = 0;
  for (const s of L) { const sn = norm(s.name); const k = toks.filter(w => sn.includes(w)).length / toks.length; if (k > sc) { sc = k; best = s; } }
  return sc >= .99 ? best.id : null;
}
const hm = s => { const [h, m] = (s || '').split(':').map(Number); return h * 60 + (m || 0); };
function tryJSON(v) { try { return JSON.parse(typeof v === 'string' ? v : new TextDecoder().decode(v)); } catch { return null; } }
async function readShearwater(file, prog) {
  prog('Chargement du lecteur…'); const SQL = await loadSql();
  const db = new SQL.Database(new Uint8Array(await file.arrayBuffer()));
  const q = db.exec(`select d.DiveId,d.DiveNumber,d.DiveDate,d.Depth,d.DiveLengthTime,d.Location,d.Site,d.Buddy,d.Notes,d.TankSize,d.Weight,d.Dress,d.MinTemp,d.MaxTemp,d.AverageDepth,
      l.format,l.data_bytes_1,l.data_bytes_2,l.calculated_values_from_samples from dive_details d left join log_data l on l.log_id=d.DiveId`);
  db.close(); if (!q.length) throw new Error('Aucune plongée dans ce fichier');
  const cols = q[0].columns, out = [];
  for (let r = 0; r < q[0].values.length; r++) { const o = {}; cols.forEach((c, i) => o[c] = q[0].values[r][i]);
    if (!o.DiveDate || o.DiveDate.startsWith('1970')) continue; prog(`Lecture des profils… ${r + 1}/${q[0].values.length}`);
    const num = s => s == null || s === '' ? null : +String(s).replace(',', '.');
    const x = { n: o.DiveNumber != null ? +o.DiveNumber : null, date: o.DiveDate.slice(0, 10), heure: o.DiveDate.slice(11, 16), prof: num(o.Depth), duree: o.DiveLengthTime ? Math.round(+o.DiveLengthTime / 60) : null,
      loc: o.Location || '', site: o.Site || '', buddy: o.Buddy || '', notes: o.Notes || '', tank: o.TankSize, weight: o.Weight, dress: o.Dress };
    let p = null;
    try { if (o.format === 'sw-pnf' && o.data_bytes_1) p = await parsePNF(o.data_bytes_1); } catch {}
    const cv = tryJSON(o.calculated_values_from_samples) || {};
    if (!p) { const h = tryJSON(o.data_bytes_1) || tryJSON(o.data_bytes_2) || {};
      p = { tmin: cv.MinTemp > -5 ? Math.round(cv.MinTemp) : num(o.MinTemp), tmax: cv.MaxTemp > -5 ? Math.round(cv.MaxTemp) : num(o.MaxTemp), pmoy: cv.AverageDepth ? Math.round(cv.AverageDepth * 10) / 10 : null, o2: h.HeaderOcGas0O2Percent || null }; }
    out.push({ ...x, ...p });
  }
  return out.sort((a, b) => (a.date + a.heure).localeCompare(b.date + b.heure));
}
function planImport(sw) {
  const ds = BZ.dives(), used = new Set(), upd = [], add = [];
  for (const x of sw) {
    let d = ds.find(d => !used.has(d.id) && (d.id === 'sw' + x.n || (x.n && d.numero === x.n && d.source === 'Shearwater')));
    if (!d) { const same = ds.filter(d => !used.has(d.id) && d.date === x.date && d.statut === 'faite');
      d = same.find(d => d.heure && Math.abs(hm(d.heure) - hm(x.heure)) <= 45) || (same.length === 1 && !same[0].heure ? same[0] : null); }
    const gaz = x.o2 ? (x.o2 <= 22 ? 'Air' : 'Nitrox ' + x.o2) : null;
    const prof = { courbe: x.courbe, tmin: x.tmin, tmax: x.tmax, pmoy: x.pmoy };
    Object.keys(prof).forEach(k => prof[k] == null && delete prof[k]);
    if (d) { used.add(d.id); const patch = { ...prof };
      if (!d.gaz && gaz) patch.gaz = gaz; if (d.temp == null && x.tmin != null) patch.temp = x.tmin; if (!d.numero && x.n) patch.numero = x.n; if (!d.heure && x.heure) patch.heure = x.heure;
      if (d.prof == null && x.prof != null) patch.prof = x.prof; if (d.duree == null && x.duree != null) patch.duree = x.duree;
      const ch = Object.keys(patch).some(k => JSON.stringify(patch[k]) !== JSON.stringify(d[k])); if (ch) upd.push({ d, patch });
    } else {
      const notes = [x.notes, x.buddy && !/v[ée]ro/i.test(x.buddy) ? 'Binôme : ' + x.buddy : '', x.tank ? 'Bouteille ' + x.tank : '', x.weight ? 'Lest : ' + x.weight : '', x.dress ? 'Combinaison : ' + x.dress : ''].filter(Boolean).join(' · ');
      add.push({ x, site: matchSite(x.loc, x.site), obj: { date: x.date, heure: x.heure, statut: 'faite', prof: x.prof, duree: x.duree, gaz: gaz || 'Air', temp: x.tmin ?? null, notes: notes.slice(0, 2000), source: 'Shearwater', numero: x.n, ...prof } });
    }
  }
  return { upd, add };
}
const iOv = el('div', 'overlay'); iOv.id = 'cpImp'; iOv.hidden = true;
iOv.innerHTML = '<div class="sheet" role="dialog" aria-modal="true" aria-labelledby="cpImpT"></div>'; document.body.append(iOv);
function siteOptions(sel) {
  const zs = new Map(); BZ.siteList().forEach(s => { const z = (BZ.zoneById(s.zone) || {}).nom || s.zone; if (!zs.has(z)) zs.set(z, []); zs.get(z).push(s); });
  return '<option value="">Ignorer cette plongée</option>' + [...zs].map(([z, l]) => `<optgroup label="${esc(z)}">${l.sort((a, b) => a.name.localeCompare(b.name, 'fr')).map(s => `<option value="${s.id}"${s.id === sel ? ' selected' : ''}>${esc(s.name)}</option>`).join('')}</optgroup>`).join('');
}
function openImport() {
  const sh = iOv.firstElementChild;
  sh.innerHTML = `<div class="cp-head"><h3 id="cpImpT">Importer depuis Shearwater</h3><button class="cp-x" type="button" aria-label="Fermer" data-a="x">×</button></div>
    <p class="cp-note">Dans Shearwater Cloud (ordinateur) : <b>Fichier › Exporter la base de données</b>, puis choisissez le fichier <b>.db</b>. Les plongées déjà présentes reçoivent profil, températures et gaz ; les nouvelles sont ajoutées.</p>
    <label class="btn pri" style="text-align:center">Choisir le fichier .db<input type="file" accept=".db,.sqlite,application/octet-stream,application/x-sqlite3" hidden id="cpImpIn"></label>
    <p class="cp-note" id="cpImpMsg" role="status"></p><div id="cpImpRes"></div>`;
  sh.querySelector('[data-a="x"]').onclick = () => iOv.hidden = true;
  iOv.hidden = false;
  $('cpImpIn').onchange = async e => { const f = e.target.files[0]; if (!f) return; const msg = $('cpImpMsg');
    try { const sw = await readShearwater(f, t => msg.textContent = t); const plan = planImport(sw); msg.textContent = `${sw.length} plongées lues dans le fichier.`; reviewImport(plan); }
    catch (err) { msg.textContent = 'Lecture impossible : ' + (err.message || err); } };
}
function reviewImport({ upd, add }) {
  const box = $('cpImpRes'), unk = add.filter(a => !a.site);
  box.innerHTML = `<div class="cp-warn g"><b>${upd.length} plongée(s) mises à jour</b><span>${add.length} nouvelle(s)${unk.length ? `, dont ${unk.length} à rattacher à un site` : ''}</span></div>
    ${add.length ? `<div class="cp-imp" style="margin-top:10px">${add.map((a, i) => `<div class="r"><span><b>${fDate(a.x.date)}</b> ${a.x.heure}<br><span class="cp-note">${esc([a.x.loc, a.x.site].filter(Boolean).join(' · ') || 'Lieu inconnu')} · ${nf(a.x.prof)} m</span></span><select data-i="${i}" aria-label="Site pour la plongée du ${fDate(a.x.date)}">${siteOptions(a.site)}</select></div>`).join('')}</div>` : ''}
    <div class="row" style="justify-content:flex-end;margin-top:10px"><button class="btn" type="button" data-a="c">Annuler</button><button class="btn pri" type="button" data-a="go"${upd.length + add.length ? '' : ' disabled'}>Importer</button></div>`;
  box.querySelector('[data-a="c"]').onclick = () => iOv.hidden = true;
  box.querySelector('[data-a="go"]').onclick = async ev => { ev.target.disabled = true; const msg = $('cpImpMsg');
    box.querySelectorAll('select[data-i]').forEach(s => add[+s.dataset.i].site = s.value || null);
    const todo = [...upd.map(u => () => patchDive(u.d.id, u.patch)), ...add.filter(a => a.site).map(a => () => BZ.save(a.x.n ? 'sw' + a.x.n : 'sw' + Date.now().toString(36) + Math.random().toString(36).slice(2, 5), { ...a.obj, site: a.site, maj: new Date().toISOString() }))];
    let ok = 0; for (const f of todo) { try { await f(); ok++; } catch {} msg.textContent = `Enregistrement ${ok}/${todo.length}…`; }
    msg.textContent = `Terminé : ${ok} plongée(s) enregistrée(s).`; box.innerHTML = '<div class="row" style="justify-content:flex-end"><button class="btn pri" type="button">Fermer</button></div>';
    box.querySelector('button').onclick = () => iOv.hidden = true; BZ.rerender(); };
}
const impBtn = el('button', 'btn'); impBtn.type = 'button'; impBtn.textContent = 'Shearwater'; impBtn.title = 'Importer depuis Shearwater';
const addb = $('addbtn'); const grp = el('div', 'row'); addb.before(grp); grp.append(impBtn, addb);
impBtn.onclick = openImport;

/* ---------------- statistiques ---------------- */
const ZCOL = ['var(--done)', 'var(--plan)', 'var(--amber)', '#4f7fd6', '#8a6bd1', 'var(--muted)'];
let stYear = 'all', stZone = 'all';
function renderStats() {
  const all = done(), yrs = [...new Set(all.map(d => (d.date || '').slice(0, 4)).filter(Boolean))].sort().reverse();
  const zones = [...new Set(all.map(d => BZ.siteZone(d.site)))].filter(Boolean);
  const zN = id => (BZ.zoneById(id) || {}).nom || id;
  const ds = all.filter(d => (stYear === 'all' || (d.date || '').startsWith(stYear)) && (stZone === 'all' || BZ.siteZone(d.site) === stZone));
  const min = ds.reduce((a, d) => a + (+d.duree || 0), 0), deep = ds.filter(d => d.prof != null).sort((a, b) => b.prof - a.prof)[0];
  const long = ds.filter(d => d.duree != null).sort((a, b) => b.duree - a.duree)[0];
  const tw = d => d.tmin ?? d.temp; const cold = ds.filter(d => tw(d) != null).sort((a, b) => tw(a) - tw(b))[0], warm = ds.filter(d => (d.tmax ?? d.temp) != null).sort((a, b) => (b.tmax ?? b.temp) - (a.tmax ?? a.temp))[0];
  const sites = new Map(); ds.forEach(d => sites.set(d.site, (sites.get(d.site) || 0) + 1));
  const top = [...sites].sort((a, b) => b[1] - a[1]).slice(0, 6);
  const byY = new Map(); all.filter(d => stZone === 'all' || BZ.siteZone(d.site) === stZone).forEach(d => { const y = (d.date || '????').slice(0, 4); if (!byY.has(y)) byY.set(y, new Map()); const m = byY.get(y), z = BZ.siteZone(d.site); m.set(z, (m.get(z) || 0) + 1); });
  const yMax = Math.max(1, ...[...byY.values()].map(m => [...m.values()].reduce((a, b) => a + b, 0)));
  const zc = id => ZCOL[Math.max(0, zones.indexOf(id)) % ZCOL.length];
  const bins = [[0, 10], [10, 18], [18, 25], [25, 30], [30, 40], [40, 99]], bc = bins.map(([a, b]) => ds.filter(d => d.prof != null && d.prof >= a && d.prof < b).length), bMax = Math.max(1, ...bc);
  const fa = new Map(); ds.forEach(d => (d.faune || []).forEach(f => fa.set(f, (fa.get(f) || 0) + 1))); const faT = [...fa].sort((a, b) => b[1] - a[1]).slice(0, 8);
  const rec = (l, d, v) => d ? `<button type="button" data-d="${d.id}"><span class="l">${l}</span><span class="n">${esc(BZ.siteName(d.site) || d.site)} · ${fDate(d.date)}</span><span class="v">${v}</span></button>` : '';
  secStats.innerHTML = `<div class="card"><div class="listhead"><div><span class="cp-k">Carnet</span><h3>Statistiques</h3></div>
      <div class="row"><select class="cp-sel" id="cpStZ" aria-label="Zone"><option value="all">Toutes zones</option>${zones.map(z => `<option value="${z}">${esc(zN(z))}</option>`).join('')}</select>
      <select class="cp-sel" id="cpStY" aria-label="Année"><option value="all">Toutes années</option>${yrs.map(y => `<option>${y}</option>`).join('')}</select>
      <button class="btn" type="button" id="cpPrintBtn">Carnet en PDF</button></div></div><div id="cpPdfLink" class="row" style="justify-content:flex-end"></div>
    <div class="cp-tiles" style="margin-top:14px">
      <div class="cp-tile"><span>Plongées</span><b>${ds.length}</b><small>${sites.size} sites</small></div>
      <div class="cp-tile"><span>Sous l'eau</span><b>${Math.floor(min / 60)} h ${String(min % 60).padStart(2, '0')}</b><small>moy. ${ds.length ? Math.round(min / ds.length) : 0} min</small></div>
      <div class="cp-tile"><span>Prof. max</span><b>${deep ? nf(deep.prof) + ' m' : '–'}</b><small>moy. ${nf(ds.filter(d => d.prof != null).reduce((a, d) => a + d.prof, 0) / (ds.filter(d => d.prof != null).length || 1))} m</small></div>
      <div class="cp-tile"><span>Eau</span><b>${cold ? tw(cold) + '–' + (warm.tmax ?? warm.temp) + ' °C' : '–'}</b><small>min – max</small></div></div></div>
  <div class="cp-grid">
    <div class="card"><span class="cp-k">Par année</span><div class="cp-bars" style="margin-top:10px">${[...byY].sort((a, b) => b[0].localeCompare(a[0])).map(([y, m]) => { const t = [...m.values()].reduce((a, b) => a + b, 0);
      return `<div class="cp-bar"><span>${y}</span><span class="tr" style="width:${t / yMax * 100}%">${[...m].map(([z, n]) => `<i style="width:${n / t * 100}%;background:${zc(z)}" title="${esc(zN(z))} : ${n}"></i>`).join('')}</span><b>${t}</b></div>`; }).join('')}</div>
      <div class="cp-leg" style="margin-top:10px">${zones.filter(z => stZone === 'all' || z === stZone).map(z => `<span><i style="background:${zc(z)}"></i>${esc(zN(z))}</span>`).join('')}</div></div>
    <div class="card"><span class="cp-k">Profondeur max par plongée</span><div class="cp-bars" style="margin-top:10px">${bins.map(([a, b], i) => `<div class="cp-bar"><span>${b === 99 ? '40 m +' : a + '–' + b + ' m'}</span><span class="tr"><i style="width:${bc[i] / bMax * 100}%;background:var(--done)"></i></span><b>${bc[i]}</b></div>`).join('')}</div></div>
    <div class="card"><span class="cp-k">Records</span><div class="cp-rec" style="margin-top:6px">${rec('La plus profonde', deep, deep && nf(deep.prof) + ' m')}${rec('La plus longue', long, long && long.duree + ' min')}${rec('La plus froide', cold, cold && tw(cold) + ' °C')}${rec('La plus chaude', warm, warm && (warm.tmax ?? warm.temp) + ' °C')}</div></div>
    <div class="card"><span class="cp-k">Sites les plus plongés</span><div class="cp-bars" style="margin-top:10px">${top.map(([s, n]) => `<div class="cp-bar"><span style="max-width:150px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${esc(BZ.siteName(s) || s)}</span><span class="tr"><i style="width:${n / top[0][1] * 100}%;background:var(--stone)"></i></span><b>${n}</b></div>`).join('') || '<p class="cp-note">–</p>'}</div></div>
    ${faT.length ? `<div class="card"><span class="cp-k">Faune la plus vue</span><div class="cp-bars" style="margin-top:10px">${faT.map(([f, n]) => `<div class="cp-bar"><span>${esc(f)}</span><span class="tr"><i style="width:${n / faT[0][1] * 100}%;background:var(--plan)"></i></span><b>${n}</b></div>`).join('')}</div></div>` : ''}
  </div>`;
  $('cpStY').value = yrs.includes(stYear) ? stYear : 'all'; $('cpStZ').value = zones.includes(stZone) ? stZone : 'all';
  $('cpStY').onchange = e => { stYear = e.target.value; renderStats(); }; $('cpStZ').onchange = e => { stZone = e.target.value; renderStats(); };
  secStats.querySelectorAll('[data-d]').forEach(b => b.onclick = () => BZ.openDive(b.dataset.d));
  $('cpPrintBtn').onclick = e => printLog(ds, e.currentTarget); loadPdf().catch(() => {});
}
const PDFJS = ['https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js', 'https://cdnjs.cloudflare.com/ajax/libs/jspdf-autotable/3.8.2/jspdf.plugin.autotable.min.js'];
let pdfP = null;
const loadScript = src => new Promise((res, rej) => { const s = document.createElement('script'); s.src = src; s.onload = res; s.onerror = () => rej(new Error('script')); document.head.append(s); });
const loadPdf = () => pdfP || (pdfP = (async () => { for (const u of PDFJS) await loadScript(u); return window.jspdf.jsPDF; })().catch(e => { pdfP = null; throw e; }));
const pdfTxt = s => String(s ?? '').replace(/[→]/g, '>').replace(/[^\x00-\xFF’‘“”–—…€]/g, '');
let pdfLast = null;
function buildPdf(JsPDF, ds) {
  const rows = [...ds].sort((a, b) => ((a.date || '') + (a.heure || '')).localeCompare((b.date || '') + (b.heure || '')));
  const per = [stZone !== 'all' ? (BZ.zoneById(stZone) || {}).nom : null, stYear !== 'all' ? stYear : null].filter(Boolean).join(' · ');
  const doc = new JsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
  doc.setFont('helvetica', 'bold'); doc.setFontSize(15); doc.text(pdfTxt('Carnet de plongée — Christian & Véro'), 12, 14);
  doc.setFont('helvetica', 'normal'); doc.setFontSize(9); doc.setTextColor(90);
  doc.text(pdfTxt(`${per ? per + ' · ' : ''}${rows.length} plongées · édité le ${fDate(new Date().toISOString().slice(0, 10))}`), 12, 19.5);
  doc.autoTable({ startY: 23, margin: { left: 10, right: 10, top: 12, bottom: 12 }, theme: 'grid',
    head: [['N°', 'Date', 'Site', 'Prof.', 'Durée', 'Eau', 'Gaz', 'Lest C / V', 'Remarques', 'Visa binôme / centre']],
    body: rows.map((d, i) => [d.numero || i + 1, fDate(d.date) + (d.heure ? '\n' + d.heure : ''), (BZ.siteName(d.site) || d.site) + '\n' + zoneName(d.site),
      d.prof != null ? nf(d.prof) + ' m' : '–', d.duree != null ? d.duree + ' min' : '–', (d.tmin ?? d.temp) != null ? (d.tmin ?? d.temp) + ' °C' : '–', d.gaz || '', d.lestChris != null || d.lestVero != null ? nf(d.lestChris) + ' / ' + nf(d.lestVero) : '',
      [(d.faune || []).join(', '), d.notes].filter(Boolean).join(' — ').slice(0, 220), ''].map(pdfTxt)),
    styles: { font: 'helvetica', fontSize: 7.5, cellPadding: 1.4, lineColor: 160, lineWidth: .15, textColor: 20, valign: 'top' },
    headStyles: { fillColor: [232, 240, 243], textColor: 30, fontStyle: 'bold', fontSize: 7 },
    columnStyles: { 0: { halign: 'right', cellWidth: 9 }, 1: { cellWidth: 20 }, 2: { cellWidth: 40 }, 3: { halign: 'right', cellWidth: 13 }, 4: { halign: 'right', cellWidth: 14 }, 5: { halign: 'right', cellWidth: 12 }, 6: { cellWidth: 17 }, 7: { halign: 'right', cellWidth: 16 }, 9: { cellWidth: 34, minCellHeight: 11 } },
    didDrawPage: () => { const n = doc.internal.getNumberOfPages(); doc.setFontSize(8); doc.setTextColor(120); doc.text('Page ' + n, 287, 205, { align: 'right' }); } });
  const name = 'carnet-plongee' + (stYear !== 'all' ? '-' + stYear : '') + '.pdf';
  return new File([doc.output('blob')], name, { type: 'application/pdf' });
}
async function printLog(ds, btn) {
  const lab = btn.textContent; btn.disabled = true; btn.textContent = 'Préparation…';
  try {
    const f = buildPdf(await loadPdf(), ds); pdfLast = f;
    if (navigator.canShare && navigator.canShare({ files: [f] })) {
      try { await navigator.share({ files: [f], title: 'Carnet de plongée' }); return; }
      catch (e) { if (e.name === 'AbortError') return; }   // geste expiré : on propose le lien ci-dessous
    }
    const u = URL.createObjectURL(f), box = $('cpPdfLink');
    if (box) box.innerHTML = `<a class="btn pri" href="${u}" download="${f.name}" target="_blank" rel="noopener">Ouvrir le PDF du carnet</a>`;
    if (!navigator.share) { const a = document.createElement('a'); a.href = u; a.download = f.name; document.body.append(a); a.click(); a.remove(); }
  } catch (e) { toast('PDF impossible : ' + (e.message || 'hors ligne ?')); }
  finally { btn.disabled = false; btn.textContent = lab; }
}

/* ---------------- rappels PADI ---------------- */
let padi = {};
const VALID = [['efr', 'EFR (premiers secours)', 24], ['medical', 'Certificat médical', 12]];
const PEOPLE = [['chris', 'Christian'], ['vero', 'Véro']];
function expiries() {
  const out = [];
  PEOPLE.forEach(([p, nm]) => VALID.forEach(([k, lab, mo]) => { const it = ((padi[p] || {}).items || {})[k];
    if (!it || !it.ok) { if (k === 'medical') out.push({ p: nm, lab, exp: null, st: 'missing' }); return; }
    if (!it.date) { out.push({ p: nm, lab, exp: null, st: 'nodate' }); return; }
    const e = new Date(it.date + 'T12:00'); e.setMonth(e.getMonth() + mo); out.push({ p: nm, lab, exp: e.toISOString().slice(0, 10) }); }));
  return out;
}
function warnHTML(list, refDate, refLab) {
  const now = refDate ? new Date(refDate + 'T12:00') : new Date(), soon = new Date(now); soon.setDate(soon.getDate() + 60);
  const w = list.map(x => { if (x.st === 'missing') return refDate ? null : { c: 'a', t: `${x.p} : ${x.lab} non renseigné` };
    if (x.st === 'nodate') return { c: 'a', t: `${x.p} : ${x.lab} sans date d'obtention` };
    const e = new Date(x.exp + 'T12:00');
    if (e < now) return { c: 'r', t: `${x.p} : ${x.lab} ${refDate ? 'expiré avant ' + refLab : 'expiré depuis le ' + fDate(x.exp)}` + (refDate ? ` (fin ${fDate(x.exp)})` : '') };
    if (e < soon) return { c: 'a', t: `${x.p} : ${x.lab} expire le ${fDate(x.exp)}` };
    return null; }).filter(Boolean);
  return w;
}
const padiBan = el('div'); padiBan.style.display = 'flex'; padiBan.style.flexDirection = 'column'; padiBan.style.gap = '8px';
$('sec-padi').prepend(padiBan);
function paintPadiWarn() {
  if (PUBLIC) return; const w = warnHTML(expiries());
  padiBan.innerHTML = w.map(x => `<div class="cp-warn ${x.c}"><b>${esc(x.t)}</b></div>`).join('');
  const tb = views.querySelector('[data-v="padi"]'); let bd = tb.querySelector('.cp-badge');
  if (w.some(x => x.c === 'r') || w.length) { if (!bd) { bd = el('i', 'cp-badge'); bd.setAttribute('aria-label', 'à vérifier'); tb.append(bd); } } else if (bd) bd.remove();
}

/* ---------------- voyages ---------------- */
const SEED = { nom: 'Polynésie 2027', zone: 'polynesie',
  etapes: [
    { lieu: 'Tahiti', du: '2027-04-29', au: '2027-04-30', heb: 'Nuit à Papeete', plongee: false, lat: -17.535, lon: -149.57 },
    { lieu: "Taha'a", du: '2027-04-30', au: '2027-05-05', heb: "Le Taha'a by Pearl Resorts", plongee: true, lat: -16.625, lon: -151.50 },
    { lieu: 'Rangiroa', du: '2027-05-05', au: '2027-05-08', heb: 'Le Coconut Lodge', plongee: true, lat: -14.970, lon: -147.632 },
    { lieu: 'Tetiaroa', du: '2027-05-08', au: '2027-05-13', heb: 'The Brando', plongee: true, lat: -17.010, lon: -149.56 },
    { lieu: 'Tahiti', du: '2027-05-13', au: '2027-05-14', heb: 'Nuit à Papeete', plongee: false, lat: -17.535, lon: -149.57 }],
  vols: [
    { date: '2027-04-29', heure: '', de: 'Paris CDG', a: 'Papeete', ref: 'TN7' },
    { date: '2027-04-30', heure: '', de: 'Papeete', a: 'Raiatea', ref: '' },
    { date: '2027-05-05', heure: '', de: 'Raiatea', a: 'Rangiroa', ref: '' },
    { date: '2027-05-08', heure: '', de: 'Rangiroa', a: 'Tetiaroa (via Papeete)', ref: '' },
    { date: '2027-05-13', heure: '', de: 'Tetiaroa', a: 'Papeete', ref: '' },
    { date: '2027-05-14', heure: '', de: 'Papeete', a: 'Paris CDG', ref: 'TN8' }],
  check: {}, aVerifier: true };
const CHECK = [['docs', 'Passeports + ESTA (escale USA)'], ['cartes', 'Cartes PADI (ou appli PADI)'], ['med', 'Certificats médicaux'], ['dan', 'Assurance plongée (DAN)'],
  ['ordis', 'Ordinateurs Shearwater + câble'], ['masques', 'Masques + antibuée'], ['palmes', 'Palmes + chaussons'], ['combis', 'Combinaisons 3 mm'], ['detendeurs', 'Détendeurs'], ['gilets', 'Gilets stab'],
  ['lampes', 'Lampes + chargeurs'], ['parachute', 'Parachutes de palier'], ['solaire', 'Crème solaire « reef safe »'], ['oreilles', 'Gouttes auriculaires'], ['pharma', 'Trousse à pharmacie'], ['lestCheck', 'Lestage noté ci-dessous vérifié']];
let voyages = [], vRef = null, vEdit = false, tideSt = null;
const nightBetween = (a, b) => Math.round((new Date(b) - new Date(a)) / 864e5);
function lastWeights(zone) {
  const ds = done().filter(d => d.lestChris != null || d.lestVero != null).sort((a, b) => ((b.date || '') + (b.heure || '')).localeCompare((a.date || '') + (a.heure || '')));
  const zs = [...new Set(ds.map(d => BZ.siteZone(d.site)))];
  return zs.map(z => ({ z, d: ds.find(d => BZ.siteZone(d.site) === z) })).sort((a, b) => (b.z === zone) - (a.z === zone));
}
function noFly(v) {
  return (v.vols || []).map(f => { const before = (v.etapes || []).find(e => e.au === f.date && e.plongee); if (!before) return null;
    const t = new Date(f.date + 'T' + (f.heure || '08:00')); const lim = new Date(t - 24 * 36e5);
    const lastDay = lim.getHours() < 13 ? new Date(lim - 864e5) : lim;
    return { etape: before.lieu, vol: f, lim, lastDay: lastDay.toISOString().slice(0, 10), guess: !f.heure }; }).filter(Boolean);
}
let vSel = lsG('cp-voy');
const today = () => new Date().toISOString().slice(0, 10);
const vDeb = v => [...(v.etapes || []).map(e => e.du), ...(v.vols || []).map(f => f.date)].filter(Boolean).sort()[0] || '';
const vFin = v => [...(v.etapes || []).map(e => e.au), ...(v.vols || []).map(f => f.date)].filter(Boolean).sort().at(-1) || '';
const vPast = v => !!vFin(v) && vFin(v) < today();
const vDives = v => done().filter(d => d.date && d.date >= vDeb(v) && d.date <= vFin(v) && (!v.zone || BZ.siteZone(d.site) === v.zone))
  .sort((a, b) => ((a.date || '') + (a.heure || '')).localeCompare((b.date || '') + (b.heure || '')));
const zNom = id => (BZ.zoneById(id) || {}).nom || id || '';
function vCard(v) {
  const n = vDives(v).length, ph = (v.photos || []).length;
  return `<button type="button" class="cp-vc" data-v="${esc(v.id)}" aria-pressed="${v.id === vSel}"><b>${esc(v.nom || 'Sans nom')}</b>
    <span>${vDeb(v) ? fDate(vDeb(v), { day: 'numeric', month: 'short' }) + ' → ' + fDate(vFin(v), { day: 'numeric', month: 'short', year: 'numeric' }) : 'Dates à définir'}</span>
    <small>${[zNom(v.zone), n ? n + ' plongée' + (n > 1 ? 's' : '') : '', ph ? ph + ' photo' + (ph > 1 ? 's' : '') : ''].filter(Boolean).join(' · ')}</small></button>`;
}
function renderVoy() {
  if (PUBLIC) return;
  const R = ro();
  const up = voyages.filter(v => !vPast(v)).sort((a, b) => vDeb(a).localeCompare(vDeb(b))), past = voyages.filter(vPast).sort((a, b) => vDeb(b).localeCompare(vDeb(a)));
  let v = voyages.find(x => x.id === vSel) || (vEdit === 'new' ? null : up[0] || past[0]);
  if (v) vSel = v.id;
  secVoy.innerHTML = `<div class="card"><div class="listhead"><div><span class="cp-k">Carnet de voyages</span><h3>Mes voyages</h3></div>
      ${R ? '' : '<div class="row"><button class="btn" type="button" id="cpVAuto">Depuis le carnet</button><button class="btn pri" type="button" id="cpVNew">+ Nouveau voyage</button></div>'}</div>
      ${up.length ? `<span class="cp-k" style="display:block;margin-top:12px">À venir</span><div class="cp-vl">${up.map(vCard).join('')}</div>` : ''}
      ${past.length ? `<span class="cp-k" style="display:block;margin-top:12px">Passés</span><div class="cp-vl">${past.map(vCard).join('')}</div>` : ''}
      ${!voyages.length ? '<p class="cp-note" style="margin-top:8px">Aucun voyage pour l’instant.</p>' : ''}</div>
    <div id="cpVOne" class="cp-sec"></div>`;
  secVoy.querySelectorAll('.cp-vc').forEach(b => b.onclick = () => { vSel = b.dataset.v; lsS('cp-voy', vSel); vEdit = false; renderVoy(); });
  const nb = $('cpVNew'); if (nb) nb.onclick = () => { vEdit = 'new'; vSel = null; renderVoy(); };
  const ab = $('cpVAuto'); if (ab) ab.onclick = autoVoyages;
  const one = $('cpVOne');
  if (vEdit === 'new') { one.innerHTML = '<div class="card"><h3>Nouveau voyage</h3><div id="cpVBody" style="margin-top:8px"></div></div>';
    paintVoyEdit($('cpVBody'), { id: null, nom: '', zone: BZ.zone() ? BZ.zone().id : '', etapes: [{ lieu: '', du: '', au: '', heb: '', plongee: true }], vols: [], check: {} }); return; }
  if (!v) return;
  const deb = vDeb(v), fin = vFin(v), passe = vPast(v), j = deb ? nightBetween(today(), deb) : null, nfs = noFly(v);
  const items = [...(v.etapes || []).map(e => ({ k: 'e', date: e.du, e })), ...(v.vols || []).map(f => ({ k: 'v', date: f.date, f }))].sort((a, b) => (a.date || '').localeCompare(b.date || '') || (a.k === 'v' ? -1 : 1));
  const ds = vDives(v);
  const head = `<div class="card"><div class="listhead"><div><span class="cp-k">${deb ? (passe ? 'Terminé' : j > 0 ? 'Dans ' + j + ' jours' : 'En cours') + ' · ' + fDate(deb, { day: 'numeric', month: 'long' }) + ' → ' + fDate(fin) : 'Dates à définir'}${v.zone ? ' · ' + esc(zNom(v.zone)) : ''}</span><h3>${esc(v.nom)}</h3></div>
      ${R ? '' : `<button class="btn" type="button" id="cpVEd">${vEdit ? 'Terminer' : 'Modifier'}</button>`}</div>
      ${v.aVerifier && !passe ? '<div class="cp-warn a" style="margin-top:10px"><b>Dates et vols à vérifier</b><span>Étapes reconstituées d\'après le projet : corrigez-les avec « Modifier », ajoutez les heures de vol pour un calcul précis.</span></div>' : ''}
      <div id="cpVBody" style="margin-top:8px"></div></div>`;
  const photos = `<div class="card cp-sec" style="gap:8px"><span class="cp-k">Photos du voyage${(v.photos || []).length ? ' · ' + v.photos.length : ''}</span><div class="cp-ph" id="cpVPh"></div><p class="cp-note" id="cpVPhMsg" role="status"></p></div>`;
  let rest = '';
  if (passe) {
    const min = ds.reduce((a, d) => a + (+d.duree || 0), 0), deep = ds.filter(d => d.prof != null).sort((a, b) => b.prof - a.prof)[0];
    const fa = new Map(); ds.forEach(d => (d.faune || []).forEach(f => fa.set(f, (fa.get(f) || 0) + 1)));
    rest = `<div class="cp-grid"><div class="card cp-sec" style="gap:10px"><span class="cp-k">Bilan plongée</span>
        ${ds.length ? `<div class="cp-tiles" style="grid-template-columns:repeat(3,minmax(0,1fr))"><div class="cp-tile"><span>Plongées</span><b>${ds.length}</b><small>${(k => k + ' site' + (k > 1 ? 's' : ''))(new Set(ds.map(d => d.site)).size)}</small></div>
          <div class="cp-tile"><span>Sous l'eau</span><b>${Math.floor(min / 60)} h ${String(min % 60).padStart(2, '0')}</b></div><div class="cp-tile"><span>Prof. max</span><b>${deep ? nf(deep.prof) + ' m' : '–'}</b><small>${deep ? esc(BZ.siteName(deep.site) || '') : ''}</small></div></div>
          ${fa.size ? `<div class="cp-chips">${[...fa].sort((a, b) => b[1] - a[1]).map(([f, n]) => `<span class="chip" style="cursor:default">${esc(f)} · ${n}</span>`).join('')}</div>` : ''}
          <div class="cp-rec">${ds.map(d => `<button type="button" data-d="${d.id}"><span class="n">${esc(BZ.siteName(d.site) || d.site)}</span><span class="v">${nf(d.prof)} m · ${d.duree ?? '–'} min</span><span class="l">${fDate(d.date, { weekday: 'short', day: 'numeric', month: 'short' })}${d.heure ? ' · ' + d.heure : ''}</span></button>`).join('')}</div>`
          : '<p class="cp-note">Aucune plongée du carnet sur ces dates' + (v.zone ? ' dans cette zone' : '') + '.</p>'}</div>${photos}</div>`;
  } else {
    const vw = warnHTML(expiries(), fin, 'la fin du voyage'), lw = lastWeights(v.zone), tst = (v.etapes || []).filter(e => e.plongee && e.lat != null);
    rest = `<div class="cp-grid">
      <div class="card cp-sec" style="gap:8px"><span class="cp-k">Avion après plongée</span>
        ${nfs.map(n => `<div class="cp-warn a"><b>${esc(n.etape)} : dernière journée de plongée le ${fDate(n.lastDay, { weekday: 'long', day: 'numeric', month: 'long' })}</b><span>Vol ${esc(n.vol.de)} → ${esc(n.vol.a)} le ${fDate(n.vol.date, { day: 'numeric', month: 'long' })}${n.vol.heure ? ' à ' + n.vol.heure : ' (heure inconnue, 8 h supposé)'} · fin de plongée au plus tard ${n.lim.toLocaleString('fr-FR', { weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}</span></div>`).join('') || '<p class="cp-note">Aucun vol juste après une étape de plongée.</p>'}
        <p class="cp-note">Règle appliquée : 24 h entre la dernière plongée et le décollage (recommandation DAN : 12 h minimum pour une plongée, 18 h pour plusieurs jours de plongée ; 24 h par prudence). Les petits avions inter-îles comptent aussi.</p>
        ${vw.length ? '<span class="cp-k" style="margin-top:6px">Validités PADI pour le voyage</span>' + vw.map(x => `<div class="cp-warn ${x.c}"><b>${esc(x.t)}</b></div>`).join('') : '<div class="cp-warn g"><b>EFR et certificats médicaux valides pour le voyage</b></div>'}</div>
      ${tst.length ? `<div class="card cp-sec" style="gap:8px"><span class="cp-k">Marées et courant dans les passes</span><div class="cp-chips" id="cpTSt"></div><div id="cpTide"><p class="cp-note">Chargement…</p></div>
        <p class="cp-note">Marée montante : le courant entre dans le lagon (eau claire, plongée « entrante » dans les passes). Marée descendante : courant sortant, eau plus trouble. À confirmer avec le centre de plongée sur place.</p></div>` : ''}
      <div class="card cp-sec" style="gap:8px"><span class="cp-k">Dernier lestage connu</span>
        ${lw.length ? lw.map(({ z, d }) => `<button type="button" class="cp-rec" style="all:unset;cursor:pointer;display:grid;grid-template-columns:minmax(0,1fr) auto;gap:2px 10px;padding:6px 0;border-top:1px solid var(--line)" data-d="${d.id}"><span><b>${esc(zNom(z))}</b><br><span class="cp-note">${esc(BZ.siteName(d.site) || '')} · ${fDate(d.date)}</span></span><span style="text-align:right;font-variant-numeric:tabular-nums">Chris ${nf(d.lestChris)} kg<br>Véro ${nf(d.lestVero)} kg</span></button>`).join('') : '<p class="cp-note">Aucun lestage noté dans le carnet.</p>'}</div>
      <div class="card cp-sec" style="gap:8px"><span class="cp-k">Valise plongée · ${CHECK.filter(([k]) => (v.check || {})[k]).length}/${CHECK.length}</span><div class="cp-chk">${CHECK.map(([k, l]) => `<label class="${(v.check || {})[k] ? 'ok' : ''}"><input type="checkbox" data-k="${k}" ${(v.check || {})[k] ? 'checked' : ''} ${R ? 'disabled' : ''}><span>${esc(l)}</span></label>`).join('')}</div></div>
      ${photos}</div>`;
    setTimeout(() => {
      if (!$('cpTSt')) return; if (!tst.some(e => e.lieu === tideSt)) tideSt = (tst.find(e => /rangiroa/i.test(e.lieu)) || tst[0] || {}).lieu;
      $('cpTSt').innerHTML = tst.map(e => `<button class="chip" type="button" aria-pressed="${e.lieu === tideSt}" data-t="${esc(e.lieu)}">${esc(e.lieu)}</button>`).join('');
      $('cpTSt').querySelectorAll('[data-t]').forEach(b => b.onclick = () => { tideSt = b.dataset.t; renderVoy(); });
      const te = tst.find(e => e.lieu === tideSt); if (te) loadTide(te, deb, fin); }, 0);
  }
  one.innerHTML = head + rest;
  const body = $('cpVBody');
  if (vEdit) paintVoyEdit(body, v); else body.innerHTML = items.length ? `<div class="cp-tl">${items.map(it => it.k === 'v'
      ? `<div class="cp-st vol"><span class="d">${fDate(it.f.date, { day: 'numeric', month: 'short' })}${it.f.heure ? '<br>' + it.f.heure : ''}</span><span class="p"><b>${esc(it.f.de)} → ${esc(it.f.a)}</b>${it.f.ref ? `<small>${esc(it.f.ref)}</small>` : ''}</span></div>`
      : `<div class="cp-st"><span class="d">${fDate(it.e.du, { day: 'numeric', month: 'short' })}<br>→ ${fDate(it.e.au, { day: 'numeric', month: 'short' })}</span><span class="p"><b>${esc(it.e.lieu)}</b><small>${[it.e.heb, nightBetween(it.e.du, it.e.au) + ' nuit(s)', it.e.plongee ? 'plongée' : ''].filter(Boolean).map(esc).join(' · ')}</small></span>${(() => { const n = !passe && nfs.find(n => n.etape === it.e.lieu && n.vol.date === it.e.au); return n ? `<span class="nf">Dernière plongée : ${fDate(n.lastDay, { weekday: 'short', day: 'numeric', month: 'short' })}</span>` : ''; })()}</div>`).join('')}</div>` : '<p class="cp-note">Pas encore d’étapes.</p>';
  const eb = $('cpVEd'); if (eb) eb.onclick = () => { vEdit = !vEdit; renderVoy(); };
  one.querySelectorAll('[data-d]').forEach(b => b.onclick = () => BZ.openDive(b.dataset.d));
  one.querySelectorAll('.cp-chk input').forEach(c => c.onchange = () => saveVoy({ ...v, check: { ...(v.check || {}), [c.dataset.k]: c.checked } }));
  paintVoyPhotos(v);
}
function paintVoyPhotos(v) {
  const dir = 'voyages/' + v.id, cur = () => voyages.find(x => x.id === v.id) || v;
  gridOpts.set(dir, () => cur().photos || []);
  photoGrid($('cpVPh'), v.photos || [], { R: ro(), dir, max: 60, label: 'Photo du voyage', msg: t => { const m = $('cpVPhMsg'); if (m) m.textContent = t; },
    onSave: async () => { await saveVoy({ ...cur(), photos: fixList(dir, cur().photos) }); } });
}
function autoVoyages() {
  const ds = done().filter(d => d.date && BZ.siteZone(d.site) && BZ.siteZone(d.site) !== 'france').sort((a, b) => a.date.localeCompare(b.date));
  const groups = []; ds.forEach(d => { const z = BZ.siteZone(d.site), g = groups.find(g => g.z === z && nightBetween(g.au, d.date) <= 5 && d.date >= g.du);
    if (g) g.au = d.date > g.au ? d.date : g.au; else groups.push({ z, du: d.date, au: d.date }); });
  const fresh = groups.filter(g => !voyages.some(v => (!v.zone || v.zone === g.z) && vDeb(v) <= g.au && vFin(v) >= g.du));
  if (!fresh.length) { toast('Tous les séjours du carnet ont déjà leur voyage'); return; }
  const noms = fresh.map(g => `${zNom(g.z)} ${fDate(g.du, { month: 'long', year: 'numeric' })}`);
  if (!confirm('Créer ces voyages à partir de vos plongées ?\n\n' + noms.join('\n') + '\n\n(La France, plongées locales, n’est pas comptée.)')) return;
  fresh.forEach((g, i) => saveVoy({ id: 'v-' + g.z + '-' + g.du, nom: noms[i][0].toUpperCase() + noms[i].slice(1), zone: g.z,
    etapes: [{ lieu: zNom(g.z), du: g.du, au: g.au, heb: '', plongee: true }], vols: [], check: {} }));
  toast(fresh.length + ' voyage(s) créé(s)');
}
function paintVoyEdit(body, v) {
  const E = JSON.parse(JSON.stringify(v)), isNew = !v.id;
  const zones = BZ.zones ? BZ.zones() : [];
  const draw = () => {
    body.innerHTML = `<div class="cp-ed" style="margin-bottom:12px"><div class="r" style="grid-template-columns:minmax(0,2fr) minmax(0,1fr)">
        <input data-g="nom" value="${esc(E.nom || '')}" aria-label="Nom du voyage" placeholder="Nom du voyage (ex. Égypte 2027)">
        <select data-g="zone" class="cp-sel" aria-label="Zone"><option value="">Zone : aucune</option>${zones.map(z => `<option value="${esc(z.id)}"${z.id === E.zone ? ' selected' : ''}>${esc(z.nom)}</option>`).join('')}</select></div></div>
      <span class="cp-k">Étapes</span><div class="cp-ed" style="margin:6px 0 12px">${E.etapes.map((e, i) => `<div class="r" data-i="${i}">
        <input data-f="lieu" value="${esc(e.lieu)}" aria-label="Lieu" placeholder="Lieu"><input type="date" data-f="du" value="${e.du}" aria-label="Arrivée"><input type="date" data-f="au" value="${e.au}" aria-label="Départ">
        <input data-f="heb" value="${esc(e.heb || '')}" aria-label="Hébergement" placeholder="Hébergement"><label class="pl"><input type="checkbox" data-f="plongee" ${e.plongee ? 'checked' : ''} style="width:18px;height:18px">Plongée</label>
        <button class="btn danger" type="button" data-rm="e${i}" aria-label="Supprimer l'étape">×</button></div>`).join('')}
        <button class="btn" type="button" data-add="e">+ Étape</button></div>
      <span class="cp-k">Vols</span><div class="cp-ed" style="margin:6px 0 12px">${E.vols.map((f, i) => `<div class="r v" data-v="${i}">
        <input type="date" data-f="date" value="${f.date}" aria-label="Date du vol"><input type="time" data-f="heure" value="${f.heure || ''}" aria-label="Heure de décollage">
        <input data-f="de" value="${esc(f.de)}" aria-label="Départ" placeholder="De"><input data-f="a" value="${esc(f.a)}" aria-label="Arrivée" placeholder="À"><input data-f="ref" value="${esc(f.ref || '')}" aria-label="N° de vol" placeholder="N° vol">
        <button class="btn danger" type="button" data-rm="v${i}" aria-label="Supprimer le vol">×</button></div>`).join('')}
        <button class="btn" type="button" data-add="v">+ Vol</button></div>
      <p class="cp-note" id="cpVErr" role="status"></p>
      <div class="row" style="justify-content:space-between">${isNew ? '<span></span>' : '<button class="btn danger" type="button" data-a="del">Supprimer le voyage</button>'}<div class="row"><button class="btn" type="button" data-a="c">Annuler</button><button class="btn pri" type="button" data-a="s">Enregistrer</button></div></div>`;
    body.querySelectorAll('[data-g]').forEach(inp => inp.oninput = inp.onchange = () => E[inp.dataset.g] = inp.value);
    body.querySelectorAll('[data-i] [data-f],[data-v] [data-f]').forEach(inp => inp.oninput = inp.onchange = () => {
      const r = inp.closest('[data-i],[data-v]'), arr = r.dataset.i != null ? E.etapes[+r.dataset.i] : E.vols[+r.dataset.v];
      arr[inp.dataset.f] = inp.type === 'checkbox' ? inp.checked : inp.value; });
    body.querySelectorAll('[data-rm]').forEach(b => b.onclick = () => { const k = b.dataset.rm; (k[0] === 'e' ? E.etapes : E.vols).splice(+k.slice(1), 1); draw(); });
    body.querySelectorAll('[data-add]').forEach(b => b.onclick = () => { if (b.dataset.add === 'e') { const l = E.etapes.at(-1); E.etapes.push({ lieu: '', du: l ? l.au : '', au: l ? l.au : '', heb: '', plongee: true }); } else E.vols.push({ date: E.etapes.at(-1)?.au || '', heure: '', de: '', a: '', ref: '' }); draw(); });
    body.querySelector('[data-a="c"]').onclick = () => { vEdit = false; renderVoy(); };
    const del = body.querySelector('[data-a="del"]'); if (del) del.onclick = async () => {
      if (del.dataset.arm !== '1') { del.dataset.arm = '1'; del.textContent = 'Confirmer la suppression'; return; }
      try { if ((v.photos || []).length && store()) await store().remove([...v.photos, ...v.photos.map(thumbOf)]); } catch {}
      try { await vRef.doc(v.id).delete(); } catch { toast('Suppression impossible'); }
      vSel = null; lsS('cp-voy', null); vEdit = false; renderVoy(); };
    body.querySelector('[data-a="s"]').onclick = async () => {
      body.querySelectorAll('[data-g]').forEach(inp => E[inp.dataset.g] = inp.value);   // relit le formulaire tel qu'affiché
      body.querySelectorAll('[data-i] [data-f],[data-v] [data-f]').forEach(inp => { const r = inp.closest('[data-i],[data-v]'), o = r.dataset.i != null ? E.etapes[+r.dataset.i] : E.vols[+r.dataset.v];
        if (o) o[inp.dataset.f] = inp.type === 'checkbox' ? inp.checked : inp.value; });
      const COORD = { tahiti: [-17.535, -149.57], 'taha a': [-16.625, -151.5], tahaa: [-16.625, -151.5], rangiroa: [-14.97, -147.632], tetiaroa: [-17.01, -149.56], fakarava: [-16.06, -145.62], moorea: [-17.53, -149.83], 'bora bora': [-16.5, -151.74], raiatea: [-16.83, -151.43] };
      E.etapes.forEach(e => { const c = COORD[norm(e.lieu)]; if (c) { e.lat = c[0]; e.lon = c[1]; } });
      E.nom = (E.nom || '').trim();
      const err = t => { $('cpVErr').textContent = t; $('cpVErr').style.color = 'var(--red)'; toast(t); };
      if (!E.nom) { err('Donnez un nom au voyage.'); return; }
      E.etapes.forEach(e => { if (!e.lieu) e.lieu = E.nom; if (e.du && !e.au) e.au = e.du; if (e.au && !e.du) e.du = e.au; });
      E.etapes = E.etapes.filter(e => e.du && e.au); E.vols = E.vols.filter(f => f.date);
      if (E.etapes.some(e => e.au < e.du)) { err('Une étape se termine avant de commencer.'); return; }
      if (!E.etapes.length && !E.vols.length) { err('Indiquez au moins les dates d\u2019une étape.'); return; }
      if (isNew) E.id = 'v-' + norm(E.nom).replace(/ /g, '-').slice(0, 30) + '-' + Date.now().toString(36);
      E.aVerifier = false; vEdit = false; vSel = E.id; lsS('cp-voy', E.id); await saveVoy(E); renderVoy(); };
  };
  draw();
}
async function saveVoy(v) { if (ro() || !vRef) return; const { id, ...rest } = v; try { await vRef.doc(id || 'polynesie-2027').set(rest); } catch { toast('Enregistrement impossible'); } }
const tideCache = new Map();
async function loadTide(e, deb, fin) {
  const box = $('cpTide'), key = e.lat + ',' + e.lon;
  try {
    let j = tideCache.get(key);
    if (!j) { const r = await fetch(`https://marine-api.open-meteo.com/v1/marine?latitude=${e.lat}&longitude=${e.lon}&hourly=sea_level_height_msl&timezone=auto&forecast_days=3&cell_selection=sea`);
      if (!r.ok) throw new Error(r.status); j = await r.json(); tideCache.set(key, j); }
    if (tideSt !== e.lieu || !$('cpTide')) return;
    const T = j.hourly.time, H = j.hourly.sea_level_height_msl; if (!H || H.every(v => v == null)) throw new Error('vide');
    const W = 600, Hh = 170, L = 8, Rr = 8, Tp = 22, Bt = 26, n = T.length, mn = Math.min(...H.filter(v => v != null)), mx = Math.max(...H.filter(v => v != null)), pad = (mx - mn) * .15 || .05;
    const x = i => L + (W - L - Rr) * i / (n - 1), y = v => Tp + (Hh - Tp - Bt) * (1 - (v - mn + pad) / (mx - mn + 2 * pad));
    let rise = '', g = '', ext = '';
    for (let i = 1; i < n; i++) if (H[i] != null && H[i - 1] != null && H[i] > H[i - 1]) rise += `<rect x="${x(i - 1)}" y="${Tp}" width="${x(i) - x(i - 1) + .5}" height="${Hh - Tp - Bt}" fill="color-mix(in srgb,var(--done) 13%,transparent)"/>`;
    for (let i = 0; i < n; i += 6) { const h = T[i].slice(11, 13); g += h === '00' ? `<line x1="${x(i)}" x2="${x(i)}" y1="${Tp}" y2="${Hh - Bt}" stroke="var(--line)"/><text x="${x(i) + 3}" y="${Hh - 7}">${fDate(T[i].slice(0, 10), { weekday: 'short', day: 'numeric' })}</text>` : `<text x="${x(i)}" y="${Hh - Bt + 11}" text-anchor="middle" style="font-size:12px">${+h}h</text>`; }
    for (let i = 1; i < n - 1; i++) { if (H[i] == null) continue; const hi = H[i] >= H[i - 1] && H[i] > H[i + 1], lo = H[i] <= H[i - 1] && H[i] < H[i + 1];
      if (hi || lo) ext += `<circle cx="${x(i)}" cy="${y(H[i])}" r="3" fill="${hi ? 'var(--done)' : 'var(--muted)'}"/><text x="${x(i)}" y="${hi ? y(H[i]) - 6 : y(H[i]) + 13}" text-anchor="middle" style="fill:var(--fg)">${T[i].slice(11, 16).replace(':', 'h')}</text>`; }
    const nowI = T.findIndex(t => t >= new Date(Date.now() + (j.utc_offset_seconds || 0) * 1e3).toISOString().slice(0, 13));
    const pts = H.map((v, i) => v == null ? null : `${x(i).toFixed(1)},${y(v).toFixed(1)}`).filter(Boolean).join(' ');
    const amp = Math.round((mx - mn) * 100);
    box.innerHTML = `<svg class="cp-tide" viewBox="0 0 ${W} ${Hh}" role="img" aria-label="Hauteur de marée à ${esc(e.lieu)} sur 3 jours, marnage ${amp} cm">${rise}${g}
      <polyline points="${pts}" fill="none" stroke="var(--fg)" stroke-width="1.8"/>${ext}${nowI > 0 ? `<line x1="${x(nowI)}" x2="${x(nowI)}" y1="${Tp - 4}" y2="${Hh - Bt}" stroke="var(--plan)" stroke-width="1.5"/><text x="${x(nowI)}" y="${Tp - 6}" text-anchor="middle" style="fill:var(--plan)">maintenant</text>` : ''}</svg>
      <div class="cp-leg"><span><i style="background:color-mix(in srgb,var(--done) 35%,transparent)"></i>Montante : courant entrant</span><span>Marnage ≈ ${amp} cm (heure locale)</span></div>
      <p class="cp-note">Prévision des 3 prochains jours (Open-Meteo). Les marées du séjour s'afficheront ici à partir du ${fDate(new Date(new Date(deb) - 2 * 864e5).toISOString().slice(0, 10), { day: 'numeric', month: 'long' })}.</p>`;
  } catch (err) { if ($('cpTide')) $('cpTide').innerHTML = '<p class="cp-note">Marées indisponibles pour le moment (hors ligne ?).</p>'; }
}

/* ---------------- décompression (Bühlmann ZHL-16C), désaturation, avion, apéro ---------------- */
const ZH = [5, 8, 12.5, 18.5, 27, 38.3, 54.3, 77, 109, 146, 187, 239, 305, 390, 498, 635];
const ZA = [1.1696, 1, .8618, .7562, .62, .5043, .441, .4, .375, .35, .3295, .3065, .2835, .261, .248, .2327];
const ZB = [.5578, .6514, .7222, .7825, .8126, .8434, .8693, .891, .9092, .9222, .9319, .9403, .9477, .9544, .9602, .9653];
const PS = 1.013, PW = .0627, PN0 = (PS - PW) * .79, DESAT = .05;
const CFG = Object.assign({ apresPlongee: 4, avantPlongee: 12, avion: 24 }, lsG('cp-deco') || {});
const zStep = (P, pamb, fn2, sec) => { const pi = (pamb - PW) * fn2; return P.map((p, i) => p + (pi - p) * (1 - 2 ** (-sec / 60 / ZH[i]))); };
const zGF = P => Math.max(...P.map((p, i) => (p - PS) / ((ZA[i] + PS / ZB[i]) - PS))) * 100;
const zEx = P => Math.max(...P.map(p => p - PN0));
const fn2Of = g => { const m = /(\d{2})/.exec(g || ''); return /nitrox|ean/i.test(g || '') && m ? 1 - +m[1] / 100 : .79; };
const dStart = d => d.date && d.heure ? new Date(d.date + 'T' + d.heure) : null;
let decoCache = null;
function decoAll() {
  if (decoCache) return decoCache;
  const ds = done().filter(d => dStart(d) && (d.courbe?.p?.length > 1 || d.prof != null && d.duree)).sort((a, b) => dStart(a) - dStart(b));
  const out = new Map(); let P = Array(16).fill(PN0), tEnd = null;
  ds.forEach((d, k) => {
    const t0 = dStart(d); if (tEnd) P = zStep(P, PS, .79, Math.max(0, (t0 - tEnd) / 1e3));
    const pre = zEx(P), fn2 = fn2Of(d.gaz);
    let pts, pas;
    if (d.courbe?.p?.length > 1) { pts = d.courbe.p; pas = d.courbe.pas || 30; }
    else { const n = Math.max(2, Math.round(d.duree * 2)); pas = 30; pts = Array.from({ length: n }, (_, i) => i < 2 || i > n - 7 ? Math.min(d.prof, 5) : d.prof); }   // profil carré si pas de courbe
    pts.forEach(z => P = zStep(P, PS + z / 10, fn2, pas));
    tEnd = new Date(+t0 + pts.length * pas * 1e3);
    const gf = zGF(P), lead = P.map(p => p - PN0).reduce((m, v, i, a) => v > a[m] ? i : m, 0);
    let h = 0, Q = P; while (zEx(Q) > DESAT && h < 96 * 6) { Q = zStep(Q, PS, .79, 600); h++; }
    const desat = new Date(+tEnd + h * 600e3), next = ds[k + 1] ? dStart(ds[k + 1]) : null;
    const apero = new Date(Math.max(+tEnd + CFG.apresPlongee * 36e5, +desat));
    out.set(d.id, { pre: Math.round(pre * 1000), gf: Math.round(gf), lead: lead + 1, tEnd, desat, avion: new Date(+tEnd + CFG.avion * 36e5), apero, next, profilCarre: !d.courbe });
  });
  return decoCache = out;
}
const fH = t => t.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }).replace(':', ' h ');
const fDH = t => { const d0 = new Date(); d0.setHours(0, 0, 0, 0); const dd = Math.round((new Date(t).setHours(0, 0, 0, 0) - d0) / 864e5);
  return (dd === 0 ? "aujourd'hui" : dd === 1 ? 'demain' : dd === -1 ? 'hier' : t.toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric', month: 'short' })) + ' ' + fH(t); };
function decoHTML(d) {
  const x = decoAll().get(d.id); if (!x) return '';
  const nx = x.next && x.next < x.apero ? `<br><span class="cp-note">Plongée suivante à ${fH(x.next)} : le compteur repart après elle.</span>` : '';
  return `<div class="cp-deco"><span class="cp-k">Décompression${x.profilCarre ? ' · estimée (profil carré)' : ''}</span>
    <div class="cp-met"><div><span>GF en sortie</span><b>${x.gf} %</b></div><div><span>Azote au départ</span><b>${x.pre} mbar</b></div>
    <div><span>Désaturation</span><b>${fH(x.desat)}</b></div><div><span>Apéro dès</span><b>${fH(x.apero)}</b></div></div>
    <p class="cp-note">Bühlmann ZHL-16C, compartiment directeur ${x.lead}. Avion : pas avant ${x.avion.toLocaleString('fr-FR', { weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}.${nx}</p></div>`;
}
const decoBan = el('div', 'cp-ban'); $('v-map').before(decoBan);
function paintDecoBan() {
  if (PUBLIC || curView !== 'map') { decoBan.hidden = true; return; }
  const now = new Date(), all = [...decoAll().entries()], last = all.at(-1), items = [];
  if (last && now - last[1].tEnd < CFG.avion * 36e5) { const x = last[1];
    items.push(['Désaturation', now >= x.desat ? 'faite' : fDH(x.desat)], ['Apéro', now >= x.apero ? 'possible' : 'dès ' + fDH(x.apero)], ['Avion', now >= x.avion ? 'possible' : 'pas avant ' + fDH(x.avion)]); }
  const nextPlan = BZ.dives().filter(d => d.statut !== 'faite' && dStart(d) && dStart(d) > now && dStart(d) - now < 36 * 36e5).sort((a, b) => dStart(a) - dStart(b))[0];
  if (nextPlan) { const lim = new Date(+dStart(nextPlan) - CFG.avantPlongee * 36e5);
    items.push(['Dernier verre', now >= lim ? 'plus d’alcool avant la plongée de ' + fH(dStart(nextPlan)) : 'avant ' + fDH(lim)]); }
  decoBan.hidden = !items.length;
  decoBan.innerHTML = items.length ? `<div class="cp-ban-in">${items.map(([k, v]) => `<div><span>${k}</span><b>${esc(v)}</b></div>`).join('')}
    <button type="button" class="cp-x" aria-label="Réglages" id="cpDecoCfg" style="font-size:18px">⚙</button></div>
    <p class="cp-note">Calcul selon le modèle de votre ordinateur, avec une marge de prudence. Un verre d'eau par verre d'alcool. Au moindre symptôme après une plongée : oxygène et médecin.</p>` : '';
  const c = $('cpDecoCfg'); if (c) c.onclick = () => {
    const a = prompt('Heures minimum après la sortie de l’eau avant un verre', CFG.apresPlongee); if (a === null) return;
    const b = prompt('Heures sans alcool avant une plongée', CFG.avantPlongee); if (b === null) return;
    CFG.apresPlongee = Math.max(0, +a || 4); CFG.avantPlongee = Math.max(0, +b || 12); lsS('cp-deco', { apresPlongee: CFG.apresPlongee, avantPlongee: CFG.avantPlongee });
    decoCache = null; paintDecoBan(); };
}
setInterval(paintDecoBan, 5 * 60e3);

/* ---------------- abonnements ---------------- */
BZ.listeners.push(() => { decoCache = null; paintDecoBan(); paintFauneFilter(); if (curView === 'stats') renderStats(); if (curView === 'voyages' && !vEdit) renderVoy(); if (!dOv.hidden) paintDive(); });
paintFauneFilter(); paintDecoBan();
(async () => {
  const db = await dbP; if (!db) return;
  if (PUBLIC) { impBtn.hidden = true; return; }
  if (db.role === 'lecteur') impBtn.hidden = true;
  db.collection('padi').onSnapshot(s => { padi = {}; s.docs.forEach(d => padi[d.id] = d.data()); paintPadiWarn(); if (curView === 'voyages' && !vEdit) renderVoy(); }, () => {});
  vRef = db.collection('voyages');
  let seeded = false;
  vRef.onSnapshot(s => { voyages = s.docs.map(d => ({ id: d.id, ...d.data() })).sort((a, b) => ((a.etapes || [])[0]?.du || '').localeCompare((b.etapes || [])[0]?.du || ''));
    if (!voyages.length && !seeded && db.role !== 'lecteur' && window.CP && window.CP.carnet) { seeded = true;   // vérifie côté serveur avant de créer le voyage d'exemple
      window.CP.sb.from('docs').select('doc_id').eq('carnet_id', window.CP.carnet).eq('collection', 'voyages').limit(1)
        .then(({ data, error }) => { if (!error && data && !data.length) vRef.doc('polynesie-2027').set(SEED).catch(() => {}); }); }
    if (curView === 'voyages' && !vEdit) renderVoy(); }, () => {});   // pas de rafraîchissement pendant une saisie
})();
})();
