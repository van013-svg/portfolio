import * as d3 from 'https://cdn.jsdelivr.net/npm/d3@7.9.0/+esm';

let xScale;
let yScale;

/* ---------------- DATA ---------------- */

async function loadData() {
  const data = await d3.csv("loc.csv", (row) => ({
    ...row,
    line: Number(row.line),
    depth: Number(row.depth),
    length: Number(row.length),
    date: new Date(row.date + "T00:00" + row.timezone),
    datetime: new Date(row.datetime),
  }));

  return data;
}

/* ---------------- COMMITS ---------------- */

function processCommits(data) {
  return d3.groups(data, d => d.commit).map(([commit, lines]) => {
    let first = lines[0];
    let dt = first.datetime;

    return {
      id: commit,
      url: `https://github.com/vis-society/lab-7/commit/${commit}`,
      author: first.author,
      datetime: dt,
      hourFrac: dt.getHours() + dt.getMinutes() / 60,
      totalLines: lines.length,
      lines: lines
    };
  });
}

/* ---------------- TOOLTIP ---------------- */

function renderTooltipContent(commit) {
  const link = document.getElementById('commit-link');
  const date = document.getElementById('commit-date');
  const time = document.getElementById('commit-time');
  const author = document.getElementById('commit-author');
  const lines = document.getElementById('commit-lines');

  if (!commit) return;

  link.href = commit.url;
  link.textContent = commit.id;

  date.textContent = commit.datetime?.toLocaleString('en', {
    dateStyle: 'full',
  });

  time.textContent = commit.datetime?.toLocaleString('en', {
    timeStyle: 'short',
  });

  author.textContent = commit.author;
  lines.textContent = commit.totalLines;
}

function updateTooltipVisibility(isVisible) {
  document.getElementById("commit-tooltip").hidden = !isVisible;
}

function updateTooltipPosition(event) {
  const tooltip = document.getElementById('commit-tooltip');
  tooltip.style.left = `${event.clientX}px`;
  tooltip.style.top = `${event.clientY}px`;
}

/* ---------------- STATS ---------------- */

function renderCommitInfo(data, commits) {
  const container = d3.select('#stats');

  container.selectAll('*').remove();

  const dl = container.append('dl').attr('class', 'stats');

  dl.append('dt').html('Total <abbr title="Lines of code">LOC</abbr>');
  dl.append('dd').text(data.length);

  dl.append('dt').text('Total commits');
  dl.append('dd').text(commits.length);

  let numFiles = new Set(data.map(d => d.file)).size;
  dl.append('dt').text('Number of files');
  dl.append('dd').text(numFiles);

  let avgFileLength = d3.mean(
    d3.rollups(data, v => v.length, d => d.file),
    d => d[1]
  );

  dl.append('dt').text('Avg file length');
  dl.append('dd').text(avgFileLength.toFixed(2));

  let maxFileLength = d3.max(
    d3.rollups(data, v => v.length, d => d.file),
    d => d[1]
  );

  dl.append('dt').text('Max file length');
  dl.append('dd').text(maxFileLength);

  let dayCounts = d3.rollups(
    data,
    v => v.length,
    d => new Date(d.datetime).getDay()
  );

  let mostActiveDay = d3.greatest(dayCounts, d => d[1]);
  const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

  dl.append('dt').text('Most active day');
  dl.append('dd').text(days[mostActiveDay[0]]);
}

/* ---------------- SCATTER PLOT ---------------- */

function renderScatterPlot(data, commits) {
  const width = 1000;
  const height = 600;
  const margin = { top: 10, right: 10, bottom: 30, left: 20 };

  const usableArea = {
    left: margin.left,
    right: width - margin.right,
    top: margin.top,
    bottom: height - margin.bottom,
    width: width - margin.left - margin.right,
    height: height - margin.top - margin.bottom,
  };

  const svg = d3.select("#chart")
    .append("svg")
    .attr("viewBox", `0 0 ${width} ${height}`);

  /* IMPORTANT: scales first */
  xScale = d3.scaleTime()
    .domain(d3.extent(commits, d => d.datetime))
    .range([usableArea.left, usableArea.right])
    .nice();

  yScale = d3.scaleLinear()
    .domain([0, 24])
    .range([usableArea.bottom, usableArea.top]);

  /* GRIDLINES (FIXED ORDER + VARIABLE) */
  const gridlines = svg
    .append("g")
    .attr("class", "gridlines")
    .attr("transform", `translate(${usableArea.left},0)`);

  gridlines.call(
    d3.axisLeft(yScale)
      .tickFormat("")
      .tickSize(-usableArea.width)
  );

  svg.call(d3.brush().on('start brush end', brushed));

  const xAxis = d3.axisBottom(xScale);
  const yAxis = d3.axisLeft(yScale)
    .tickFormat(d => String(d).padStart(2, "0") + ":00");

  svg.append("g")
    .attr("class", "x-axis")
    .attr("transform", `translate(0,${usableArea.bottom})`)
    .call(xAxis);

  svg.append("g")
    .attr("class", "y-axis")
    .attr("transform", `translate(${usableArea.left},0)`)
    .call(yAxis);

  const dots = svg.append("g").attr("class", "dots");

  const [minLines, maxLines] = d3.extent(commits, d => d.totalLines);

  const rScale = d3.scaleSqrt()
    .domain([minLines, maxLines])
    .range([5, 15]);

  dots.selectAll("circle")
    .data(commits, d => d.id)
    .join("circle")
    .attr("cx", d => xScale(d.datetime))
    .attr("cy", d => yScale(d.hourFrac))
    .attr("r", d => rScale(d.totalLines))
    .style("--r", d => rScale(d.totalLines))
    .attr("fill", "#4e79a7")
    .style("fill-opacity", 0.7)
    .on("mouseenter", (event, commit) => {
      renderTooltipContent(commit);
      updateTooltipVisibility(true);
      updateTooltipPosition(event);
    })
    .on("mouseleave", () => {
      updateTooltipVisibility(false);
    });
}

/* ---------------- UPDATE ---------------- */

function updateScatterPlot(data, commits) {
  const svg = d3.select("#chart").select("svg");

  xScale.domain(d3.extent(commits, d => d.datetime));

  svg.select("g.x-axis")
    .call(d3.axisBottom(xScale));

  const [minLines, maxLines] = d3.extent(commits, d => d.totalLines);

  const rScale = d3.scaleSqrt()
    .domain([minLines, maxLines])
    .range([5, 15]);

  const dots = svg.select("g.dots");

  const sorted = d3.sort(commits, d => -d.totalLines);

  dots.selectAll("circle")
    .data(sorted, d => d.id)
    .join("circle")
    .attr("cx", d => xScale(d.datetime))
    .attr("cy", d => yScale(d.hourFrac))
    .attr("r", d => rScale(d.totalLines))
    .style("--r", d => rScale(d.totalLines))
    .attr("fill", "#4e79a7")
    .style("fill-opacity", 0.7);
}

/* ---------------- BRUSH ---------------- */

function brushed(event) {
  const selection = event.selection;

  d3.selectAll("circle")
    .classed("selected", d => isCommitSelected(selection, d));

  renderSelectionCount(selection);
  renderLanguageBreakdown(selection);
}

function isCommitSelected(selection, commit) {
  if (!selection) return false;

  const [[x0, y0], [x1, y1]] = selection;

  const x = xScale(commit.datetime);
  const y = yScale(commit.hourFrac);

  return x >= x0 && x <= x1 && y >= y0 && y <= y1;
}

/* ---------------- MAIN ---------------- */

let data = await loadData();
let commits = processCommits(data);

renderCommitInfo(data, commits);
renderScatterPlot(data, commits);

/* ---------------- SLIDER ---------------- */

let commitProgress = 100;

let timeScale = d3.scaleTime()
  .domain([
    d3.min(commits, d => d.datetime),
    d3.max(commits, d => d.datetime),
  ])
  .range([0, 100]);

let commitMaxTime = timeScale.invert(commitProgress);

function updateFileDisplay(filteredCommits) {
  let lines = filteredCommits.flatMap(d => d.lines);

  let files = d3
    .groups(lines, (d) => d.file)
    .map(([name, lines]) => {
      return { name, lines };
    })
    .sort((a, b) => b.lines.length - a.lines.length);

  let filesContainer = d3
    .select('#files')
    .selectAll('div')
    .data(files, d => d.name)
    .join(
      enter =>
        enter.append('div').call(div => {
          div.append('dt').append('code');
          div.append('dd');
        })
    );

  filesContainer
  .select('dt')
  .html(d => `
    <code>${d.name}</code>
    <small>${d.lines.length} lines</small>
  `);

  // unit visualization (IMPORTANT FIX)
  filesContainer
    .select('dd')
    .selectAll('div')
    .data(d => d.lines)
    .join('div')
    .attr('class', 'loc');
}

function onTimeSliderChange() {
  const slider = document.getElementById("commit-progress");

  commitProgress = +slider.value;
  commitMaxTime = timeScale.invert(commitProgress);

  document.getElementById("commit-time").textContent =
    commitMaxTime.toLocaleString(undefined, {
      dateStyle: "long",
      timeStyle: "short",
    });

  const filteredCommits = commits.filter(d => d.datetime <= commitMaxTime);

  updateScatterPlot(data, filteredCommits);
  renderCommitInfo(data, filteredCommits);
  updateFileDisplay(filteredCommits);
}

document
  .getElementById("commit-progress")
  .addEventListener("input", onTimeSliderChange);

onTimeSliderChange();