// The nav between pages is filled in server-side by functions/_middleware.js,
// which also holds the list of sheets.

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

// Link to any section or card: ids from the heading text ("Undo last
// commit, keep changes" -> #undo-last-commit-keep-changes), plus a "#" link
// that shows on hover.
(function () {
  const used = new Set();
  const slug = function (text) {
    const base = text.toLowerCase().replace(/&/g, ' and ').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
    let id = base;
    for (let n = 2; used.has(id); n++) id = base + '-' + n;
    used.add(id);
    return id;
  };

  document.querySelectorAll('section:has(.card) > h2, .card > h3').forEach(function (heading) {
    const target = heading.parentElement;  // the <section> or .card
    target.id = slug(heading.textContent);
    const a = document.createElement('a');
    a.className = 'anchor';
    a.href = '#' + target.id;
    a.textContent = '#';
    a.setAttribute('aria-label', 'Link to this');
    heading.append(' ', a);
  });

  // The ids didn't exist yet when the browser looked for the #fragment
  if (location.hash) {
    const el = document.getElementById(decodeURIComponent(location.hash.slice(1)));
    if (el) el.scrollIntoView();
  }
})();

// Filter cards by text (cheat sheet pages only). A matching section name
// shows the whole section. The filter is kept in ?q= so results can be shared.
const filter = document.getElementById('filter');
const empty  = document.getElementById('empty');

if (filter) {
  const heading = function (el) {
    return el.firstChild.textContent.toLowerCase();  // without the "#" link
  };

  filter.addEventListener('input', function () {
    const q = filter.value.trim().toLowerCase();
    let any = false;
    document.querySelectorAll('section').forEach(function (section) {
      const h2 = section.querySelector('h2');
      const whole = !q || (h2 && heading(h2).includes(q));
      let visible = 0;
      section.querySelectorAll('.card').forEach(function (card) {
        const match = whole || card.textContent.toLowerCase().includes(q);
        card.hidden = !match;
        if (match) visible++;
      });
      section.hidden = visible === 0;
      if (visible) any = true;
    });
    empty.hidden = any;

    const url = new URL(location.href);
    if (q) {
      url.searchParams.set('q', filter.value.trim());
      url.hash = '';
    } else {
      url.searchParams.delete('q');
    }
    history.replaceState(null, '', url);
  });

  const initial = new URLSearchParams(location.search).get('q');
  if (initial) {
    filter.value = initial;
    filter.dispatchEvent(new Event('input'));
  }

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
