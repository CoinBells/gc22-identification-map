const infoBox = document.getElementById('info');

export function showInfo(item) {
  if (!infoBox) return;

  infoBox.style.display = 'block';

  const hse = Array.isArray(item.hse) ? item.hse : [];
  const hseHtml = hse.length ? `<p><b>HSE:</b></p><ul>${hse.map(x => `<li>${escapeHtml(x)}</li>`).join('')}</ul>` : '';

  const meta = item.meta && typeof item.meta === 'object'
    ? Object.entries(item.meta).map(([k, v]) => `<p><b>${escapeHtml(k)}:</b> ${escapeHtml(String(v))}</p>`).join('')
    : '';

  infoBox.innerHTML = `
    <h3>${escapeHtml(item.name || 'Unknown')}</h3>
    ${item.category ? `<p><b>Category:</b> ${escapeHtml(item.category)}</p>` : ''}
    ${item.purpose ? `<p><b>Purpose:</b> ${escapeHtml(item.purpose)}</p>` : ''}
    ${meta}
    ${hseHtml}
  `;
}

function escapeHtml(str) {
  return str
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}
