// ---- Now playing: one sound at a time, and a bar that follows the visitor ----
const nowBar = document.getElementById('now-bar');
const nowTitle = nowBar.querySelector('.now-bar__title');
const nowSub = nowBar.querySelector('.now-bar__sub');
const nowTime = nowBar.querySelector('.now-bar__time');
const nowLink = document.getElementById('now-link');
let nowPlaying = null;   // { title, sub, totalMs?, link?, stop }

const clock = ms => `${Math.floor(ms / 60000)}:${String(Math.floor(ms / 1000) % 60).padStart(2, '0')}`;
function setNowTime(ms) {
    if (!nowPlaying) return;
    nowTime.textContent = nowPlaying.totalMs ? `${clock(ms)} / ${clock(nowPlaying.totalMs)}` : clock(ms);
}
const nowSaid = document.getElementById('now-said');
function showNow(info) {
    nowPlaying = info;
    nowSaid.textContent = info ? `Sonando: ${info.title}${info.sub ? `, ${info.sub}` : ''}.` : '';
    nowBar.hidden = !info;
    document.documentElement.classList.toggle('has-now-bar', !!info);
    nowBar.classList.remove('is-timed');
    if (!info) return;
    nowTitle.textContent = info.title;
    nowSub.textContent = info.sub;
    nowLink.hidden = !info.link || !shareable;
    setNowTime(0);
    if (info.totalMs) {
        nowBar.style.setProperty('--now-ms', `${info.totalMs}ms`);
        void nowBar.offsetWidth;   // restart the progress animation
        nowBar.classList.add('is-timed');
    }
    document.documentElement.style.setProperty('--now-h', `${nowBar.offsetHeight}px`);
}
const stopSound = () => { if (nowPlaying) nowPlaying.stop(); };
document.getElementById('now-stop').addEventListener('click', stopSound);
nowLink.addEventListener('click', () => shareLink(new URL(nowPlaying.link, location.href).href, `${nowPlaying.title} · ${BASE_TITLE}`));
if (canShare) {
    nowLink.setAttribute('aria-label', 'Compartir');
    nowLink.querySelectorAll('span').forEach(label => { label.textContent = 'Compartir'; });
}
// Leaving the tab stops the sound
document.addEventListener('visibilitychange', () => { if (document.hidden) stopSound(); });
