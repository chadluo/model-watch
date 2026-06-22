function computeMetrics(model) {
  const releases = model.releases;
  const latest = releases[releases.length - 1];
  const daysSinceLast = (Date.now() - new Date(latest.date)) / 86400000;

  if (releases.length < 2) {
    return { avgCycleDays: null, latestRelease: latest, daysSinceLast, pct: 0, verdict: "BUY NOW" };
  }

  let totalGap = 0;
  for (let i = 1; i < releases.length; i++) {
    totalGap += (new Date(releases[i].date) - new Date(releases[i - 1].date)) / 86400000;
  }
  const avgCycleDays = totalGap / (releases.length - 1);
  const pct = daysSinceLast / avgCycleDays;

  const verdict = pct < 0.5 ? "BUY NOW" : pct < 0.8 ? "CAUTION" : "WAIT";
  return { avgCycleDays, latestRelease: latest, daysSinceLast, pct, verdict };
}

const VERDICT_COLOR = { "BUY NOW": "#22c55e", "CAUTION": "#f59e0b", "WAIT": "#ef4444" };

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
  <td style="color:${c}">${m.verdict}</td>
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
  const all = MODELS
    .flatMap(m => m.releases.map(r => ({ ...r, model: m })))
    .sort((a, b) => new Date(b.date) - new Date(a.date));

  const groups = {};
  all.forEach(r => {
    const d = new Date(r.date);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    (groups[key] = groups[key] || []).push(r);
  });

  return Object.entries(groups)
    .sort(([a], [b]) => b.localeCompare(a))
    .slice(0, 20)
    .map(([key, releases]) => {
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
    }).join("");
}

let activeFilter = "all";

function refresh() {
  const items = MODELS
    .filter(m => activeFilter === "all" || m.tier === activeFilter)
    .map(m => ({ model: m, metrics: computeMetrics(m) }))
    .sort((a, b) => b.metrics.pct - a.metrics.pct);

  document.getElementById("table-container").innerHTML = renderTable(items);
}

document.addEventListener("DOMContentLoaded", () => {
  document.querySelectorAll(".filter-tab").forEach(tab => {
    tab.addEventListener("click", () => {
      activeFilter = tab.dataset.filter;
      document.querySelectorAll(".filter-tab").forEach(t => t.classList.toggle("active", t === tab));
      refresh();
    });
  });

  document.getElementById("timeline-container").innerHTML = renderTimeline();
  refresh();
});
