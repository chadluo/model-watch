function computeMetrics(model) {
  const releases = model.releases;
  const latest = releases[releases.length - 1];
  const daysSinceLast = (Date.now() - new Date(latest.date)) / 86400000;

  if (releases.length < 2) {
    return { avgCycleDays: null, latestRelease: latest, daysSinceLast, pct: 0, verdict: "CURRENT" };
  }

  let totalGap = 0;
  for (let i = 1; i < releases.length; i++) {
    totalGap += (new Date(releases[i].date) - new Date(releases[i - 1].date)) / 86400000;
  }
  const avgCycleDays = totalGap / (releases.length - 1);
  const pct = daysSinceLast / avgCycleDays;

  const verdict = pct < 0.5 ? "CURRENT" : pct < 0.8 ? "MID-CYCLE" : "UPDATE DUE";
  return { avgCycleDays, latestRelease: latest, daysSinceLast, pct, verdict };
}

const VERDICT_COLOR = { "CURRENT": "#22c55e", "MID-CYCLE": "#f59e0b", "UPDATE DUE": "#ef4444" };

function fmtDate(str) {
  return new Date(str).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" });
}

function renderTable(items) {
  const rows = items.map(({ model, metrics: m }) => {
    const c = VERDICT_COLOR[m.verdict];
    const hasCycle = m.avgCycleDays !== null;
    const barVal = hasCycle ? Math.min(m.pct, 1).toFixed(2) : null;
    return `
<tr data-tier="${model.tier}">
  <td style="color:${model.labColor}">${model.lab}</td>
  <td>${model.name}</td>
  <td><span class="td-version">${m.latestRelease.version}</span><span class="td-date">${fmtDate(m.latestRelease.date)}</span></td>
  <td>${Math.round(m.daysSinceLast)}d</td>
  <td>${barVal !== null ? `<progress value="${barVal}" max="1"></progress>` : ''}</td>
  <td>${hasCycle ? Math.round(m.avgCycleDays) + 'd' : ''}</td>
  <td><span style="color:${c}">${m.verdict}</span></td>
</tr>`;
  }).join('');

  return `
<div class="table-wrapper">
  <table class="models-table">
    <thead>
      <tr>
        <th>Developer</th>
        <th>Model</th>
        <th>Latest Release</th>
        <th>Since</th>
        <th>Meter</th>
        <th>Avg Cycle</th>
        <th>Verdict</th>
      </tr>
    </thead>
    <tbody>${rows}</tbody>
  </table>
</div>`;
}

function renderTimeline() {
  const currentYear = new Date().getFullYear();

  const all = MODELS
    .flatMap(m => m.releases.map(r => ({ ...r, model: m })))
    .sort((a, b) => new Date(b.date) - new Date(a.date));

  const groups = {};
  all.forEach(r => {
    const d = new Date(r.date);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    (groups[key] = groups[key] || []).push(r);
  });

  const sorted = Object.entries(groups).sort(([a], [b]) => b.localeCompare(a));
  const current = sorted.filter(([key]) => key.startsWith(currentYear));
  const older = sorted.filter(([key]) => !key.startsWith(currentYear));

  function renderMonth([key, releases]) {
    const [y, mo] = key.split("-");
    const label = new Date(+y, +mo - 1).toLocaleDateString("en-US", { month: "long", year: "numeric" });
    const items = releases.map(r => `
<div class="tl-item">
  <span class="tl-dot" style="background:${r.model.labColor}"></span>
  <div class="tl-body">
    <span class="tl-version">${r.version}</span>
    <span class="tl-date">${fmtDate(r.date)}</span>
    ${r.note ? `<span class="tl-note">${r.note}</span>` : ""}
  </div>
</div>`).join("");
    return `<div class="tl-month"><div class="tl-month-label">${label}</div><div class="tl-items">${items}</div></div>`;
  }

  const currentHtml = current.map(renderMonth).join("");
  if (!older.length) return currentHtml;

  const byYear = {};
  older.forEach(entry => {
    const y = entry[0].split("-")[0];
    (byYear[y] = byYear[y] || []).push(entry);
  });

  const olderHtml = Object.entries(byYear)
    .sort(([a], [b]) => b - a)
    .map(([year, months]) => `
<details class="tl-older">
  <summary class="tl-older-summary">${year}</summary>
  <div class="tl-older-content">${months.map(renderMonth).join("")}</div>
</details>`).join("");

  return currentHtml + olderHtml;
}

function refresh() {
  const items = MODELS
    .map(m => ({ model: m, metrics: computeMetrics(m) }))
    .sort((a, b) => new Date(b.metrics.latestRelease.date) - new Date(a.metrics.latestRelease.date));

  document.getElementById("table-container").innerHTML = renderTable(items);
}

document.addEventListener("DOMContentLoaded", () => {
  document.getElementById("timeline-container").innerHTML = renderTimeline();
  refresh();
});
