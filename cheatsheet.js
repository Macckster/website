// Every cheat sheet page. Add new ones here (and to CHEATSHEETS in
// functions/_middleware.js for the curl version).
const SHEETS = ['firewalld', 'systemd', 'git', 'ssh'];
// Other pages shown in the nav, after the sheets
const EXTRA = ['tools'];

// Nav between sheets. Pages include an empty <nav class="sheets"> so its
// space is reserved before this runs (no layout jump); the links come from here.
(function () {
  let nav = document.querySelector('nav.sheets');
  if (!nav) {
    nav = document.createElement('nav');
    nav.className = 'sheets';
    document.querySelector('header > a').after(nav);
  }
  const here = location.pathname.replace(/\/$/, '');
  SHEETS.concat(EXTRA).forEach(function (name) {
    const a = document.createElement('a');
    a.href = '/' + name;
    a.textContent = name;
    if (here === '/' + name) a.classList.add('current');
    if (EXTRA.includes(name)) a.classList.add('extra');
    nav.appendChild(a);
  });
})();

// Copy buttons on every code block
document.querySelectorAll('.code').forEach(function (block) {
  const btn = document.createElement('button');
  btn.className = 'copy';
  btn.type = 'button';
  btn.textContent = 'copy';
  btn.addEventListener('click', function () {
    copyText(block.querySelector('pre').innerText).then(function () {
      btn.textContent = 'copied';
      btn.classList.add('done');
      setTimeout(function () {
        btn.textContent = 'copy';
        btn.classList.remove('done');
      }, 1200);
    });
  });
  block.appendChild(btn);
});

function copyText(text) {
  if (navigator.clipboard && window.isSecureContext) {
    return navigator.clipboard.writeText(text);
  }
  // Fallback for plain http
  const ta = document.createElement('textarea');
  ta.value = text;
  ta.style.position = 'fixed';
  ta.style.opacity = '0';
  document.body.appendChild(ta);
  ta.select();
  document.execCommand('copy');
  ta.remove();
  return Promise.resolve();
}

// Filter cards by text (cheat sheet pages only)
const filter = document.getElementById('filter');
const empty  = document.getElementById('empty');

if (filter) {
  filter.addEventListener('input', function () {
    const q = filter.value.trim().toLowerCase();
    let any = false;
    document.querySelectorAll('section').forEach(function (section) {
      let visible = 0;
      section.querySelectorAll('.card').forEach(function (card) {
        const match = !q || card.textContent.toLowerCase().includes(q);
        card.hidden = !match;
        if (match) visible++;
      });
      section.hidden = visible === 0;
      if (visible) any = true;
    });
    empty.hidden = any;
  });

  // "/" focuses the filter, Esc clears it
  document.addEventListener('keydown', function (e) {
    if (e.key === '/' && document.activeElement !== filter) {
      e.preventDefault();
      filter.focus();
    } else if (e.key === 'Escape' && document.activeElement === filter) {
      filter.value = '';
      filter.dispatchEvent(new Event('input'));
      filter.blur();
    }
  });
}
