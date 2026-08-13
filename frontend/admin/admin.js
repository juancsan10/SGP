function nav(id) {
  document.querySelectorAll('.section').forEach(s => s.classList.remove('active'));
  document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
  document.querySelectorAll('.topbar-nav button:not(.role-btn)').forEach(b => b.classList.remove('active'));
  document.getElementById('sec-' + id).classList.add('active');
  document.querySelectorAll('.nav-item').forEach(n => {
    if (n.getAttribute('onclick') && n.getAttribute('onclick').includes("nav('" + id + "')"))
      n.classList.add('active');
  });
  const tb = document.getElementById('tnav-' + id);
  if (tb) tb.classList.add('active');
}

function sendMsgA() {
  const input = document.getElementById('chatInputA');
  const txt = input.value.trim();
  if (!txt) return;
  const msgs = document.getElementById('chatMsgsA');
  const now = new Date();
  const time = now.getHours() + ':' + String(now.getMinutes()).padStart(2, '0') + ' ' + (now.getHours() < 12 ? 'am' : 'pm');
  msgs.innerHTML += `<div class="msg mine"><div class="msg-avatar" style="background:#1a73e8">AD</div><div><div class="msg-bubble">${txt}</div><div class="msg-time">${time}</div></div></div>`;
  input.value = '';
  msgs.scrollTop = msgs.scrollHeight;
}
