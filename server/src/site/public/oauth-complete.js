const openAppLink = document.getElementById('open-fox-app');
const oauthStatus = document.getElementById('oauth-status');

function launchFoxEvolution() {
  if (!openAppLink) return;
  if (oauthStatus) oauthStatus.textContent = 'Logowanie zakończone. Otwieram aplikację Fox Evolution…';
  window.location.assign(openAppLink.href);
}

openAppLink?.addEventListener('click', () => {
  if (oauthStatus) oauthStatus.textContent = 'Otwieram aplikację Fox Evolution…';
});

window.setTimeout(launchFoxEvolution, 300);
