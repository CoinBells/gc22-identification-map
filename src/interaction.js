const infoBox = document.getElementById('info');

export function showInfo(item) {
  infoBox.style.display = 'block';

  const hseList = (item.hse || []).map(h => `<li>${h}</li>`).join('');
  const meta = item.meta
    ? Object.entries(item.meta).map(([k,v]) => `<p><b>${k}:</b> ${v}</p>`).join('')
    : '';

  infoBox.innerHTML = `
    <h3>${item.name}</h3>
    ${item.category ? `<p><b>Category:</b> ${item.category}</p>` : ''}
    ${item.purpose ? `<p><b>Purpose:</b> ${item.purpose}</p>` : ''}
    ${meta}
    ${(item.hse && item.hse.length) ? `<p><b>HSE:</b></p><ul>${hseList}</ul>` : ''}
  `;
}
