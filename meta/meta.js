import * as d3 from 'https://cdn.jsdelivr.net/npm/d3@7.9.0/+esm';
import scrollama from 'https://cdn.jsdelivr.net/npm/scrollama@3.2.0/+esm';

let xScale;
let yScale;
let colors = d3.scaleOrdinal(d3.schemeTableau10);

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

function processCommits(data) {
  return d3.groups(data, d => d.commit)
    .map(([commit, lines]) => {
      let first = lines[0];
      let dt = first.datetime;

      return {
        id: commit,
        url: `https://github.com/vis-society/lab-7/commit/${commit}`,
        author: first.author,
        datetime: dt,
        hourFrac: dt.getHours() + dt.getMinutes() / 60,
        totalLines: lines.length,
        lines
      };
    })
    .sort((a, b) => a.datetime - b.datetime);
}

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

function renderCommitInfo(data, commits) {
  const container = d3.select('#stats');

  container.selectAll('*').remove();

  const dl = container.append('dl').attr('class', 'stats');

  let filteredLines = commits.flatMap(d => d.lines);

  dl.append('dt').html('Total <abbr title="Lines of code">LOC</abbr>');
  dl.append('dd').text(filteredLines.length);

  dl.append('dt').text('Total commits');
  dl.append('dd').text(commits.length);

  let numFiles = new Set(filteredLines.map(d => d.file)).size;

  dl.append('dt').text('Number of files');
  dl.append('dd').text(numFiles);

  let avgFileLength = d3.mean(
    d3.rollups(filteredLines, v => v.length, d => d.file),
    d => d[1]
  );

  dl.append('dt').text('Avg file length');
  dl.append('dd').text(avgFileLength?.toFixed(2) ?? 0);

  let maxFileLength = d3.max(
    d3.rollups(filteredLines, v => v.length, d => d.file),
    d => d[1]
  );

  dl.append('dt').text('Max file length');
  dl.append('dd').text(maxFileLength ?? 0);

  let dayCounts = d3.rollups(
    filteredLines,
    v => v.length,
    d => new Date(d.datetime).getDay()
  );

  let mostActiveDay = d3.greatest(dayCounts, d => d[1]);
  const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

  dl.append('dt').text('Most active day');
  dl.append('dd').text(
    mostActiveDay ? days[mostActiveDay[0]] : '-'
  );
}

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
  };

  const svg = d3.select("#chart")
    .append("svg")
    .attr("viewBox", `0 0 ${width} ${height}`);

  xScale = d3.scaleTime()
    .domain(d3.extent(commits, d => d.datetime))
    .range([usableArea.left, usableArea.right])
    .nice();

  yScale = d3.scaleLinear()
    .domain([0, 24])
    .range([usableArea.bottom, usableArea.top]);

  const gridlines = svg
    .append("g")
    .attr("class", "gridlines")
    .attr("transform", `translate(${usableArea.left},0)`);

  gridlines.call(
    d3.axisLeft(yScale)
      .tickFormat("")
      .tickSize(-usableArea.width)
  );

  svg.call(
    d3.brush()
      .extent([[0, 0], [1000, 600]])
      .on("brush end", brushed)
  );

  svg.append("g")
    .attr("class", "x-axis")
    .attr("transform", `translate(0,${usableArea.bottom})`)
    .call(d3.axisBottom(xScale));

  svg.append("g")
    .attr("class", "y-axis")
    .attr("transform", `translate(${usableArea.left},0)`)
    .call(
      d3.axisLeft(yScale)
        .tickFormat(d => String(d).padStart(2, "0") + ":00")
    );

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
    .style("fill-opacity", 0.7);
}

function updateScatterPlot(data, commits) {
  const svg = d3.select("#chart").select("svg");

  xScale.domain(d3.extent(commits, d => d.datetime));

  svg.select("g.x-axis")
    .call(d3.axisBottom(xScale));

  const [minLines, maxLines] = d3.extent(commits, d => d.totalLines);

  const rScale = d3.scaleSqrt()
    .domain([minLines, maxLines])
    .range([5, 15]);

  svg.select("g.dots")
    .selectAll("circle")
    .data(commits, d => d.id)
    .join("circle")
    .attr("cx", d => xScale(d.datetime))
    .attr("cy", d => yScale(d.hourFrac))
    .attr("r", d => rScale(d.totalLines))
    .style("--r", d => rScale(d.totalLines))
    .attr("fill", "#4e79a7")
    .style("fill-opacity", 0.7);
}

function renderLanguageBreakdown(selection) {
  const container = document.getElementById('language-breakdown');

  const selectedCommits = selection
    ? commits.filter(d => isCommitSelected(selection, d))
    : [];

  if (selectedCommits.length === 0) {
    container.innerHTML = '';
    return;
  }

  const lines = selectedCommits.flatMap(d => d.lines);

  const breakdown = d3.rollup(
    lines,
    v => v.length,
    d => d.type
  );

  container.innerHTML = '';

  for (const [language, count] of breakdown) {
    const proportion = count / lines.length;
    const formatted = d3.format('.1~%')(proportion);

    container.innerHTML += `
      <dt>${language}</dt>
      <dd>${count} lines (${formatted})</dd>
    `;
  }
}

function brushed(event) {
  const selection = event.selection;

  const svg = d3.select("#chart svg");

  const circles = svg.select("g.dots").selectAll("circle");

  circles.classed("selected", d =>
    selection && isCommitSelected(selection, d)
  );

  const selected = circles.data()
    .filter(d => selection && isCommitSelected(selection, d));

  renderSelectionCount(selected);
  renderLanguageBreakdown(selection);
}

function isCommitSelected(selection, commit) {
  if (!selection) return false;

  const [[x0, y0], [x1, y1]] = selection;

  const x = xScale(commit.datetime);
  const y = yScale(commit.hourFrac);

  return x >= x0 && x <= x1 && y >= y0 && y <= y1;
}

function renderSelectionCount(selected) {
  const label = document.getElementById("selection-count");

  if (!selected || selected.length === 0) {
    label.textContent = "No commits selected";
    return;
  }

  label.textContent = `${selected.length} commits selected`;
}

function updateFileDisplay(filteredCommits) {

  const container = d3.select('#files');

  let lines = filteredCommits.flatMap(d => d.lines);

  let files = d3.groups(lines, d => d.file)
    .map(([name, lines]) => ({ name, lines }))
    .sort((a, b) => b.lines.length - a.lines.length);

  const oldPositions = new Map();

  container.selectAll('div.file-row').each(function(d) {
    oldPositions.set(d.name, this.getBoundingClientRect().top);
  });

  let fileDivs = container
    .selectAll('div.file-row')
    .data(files, d => d.name)
    .join(
      enter => {
        const div = enter.append('div')
          .attr('class', 'file-row')
          .style('opacity', 1);

        div.append('dt').append('code');
        div.append('dd');

        return div;
      }
    );

  fileDivs.select('dt > code')
    .text(d => d.name);

  fileDivs.select('dt')
    .select('small')
    .remove();

  fileDivs.select('dt')
    .append('small')
    .text(d => `${d.lines.length} lines`);

  fileDivs.select('dd')
    .selectAll('div.loc')
    .data(d => d.lines, d => d.line)
    .join(
      enter => enter.append('div').attr('class', 'loc'),
      update => update,
      exit => exit.remove()
    )
    .style('--color', d => colors(d.type));

  requestAnimationFrame(() => {

    container.selectAll('div.file-row').each(function(d) {
      const oldTop = oldPositions.get(d.name);
      if (oldTop == null) return;

      const newTop = this.getBoundingClientRect().top;
      const delta = oldTop - newTop;

      const el = d3.select(this);

      el.interrupt();

      el.style('transform', `translateY(${delta}px)`);

      el.transition()
        .duration(1000)
        .ease(d3.easeCubicOut)
        .style('transform', 'translateY(0px)');
    });

  });
}

let data = await loadData();
let commits = processCommits(data);

renderCommitInfo(data, commits);
renderScatterPlot(data, commits);
updateFileDisplay(commits);

d3.select('#scatter-story')
  .selectAll('.step')
  .data(commits)
  .join('div')
  .attr('class', 'step')
  .html(
    (d, i) => `
    On ${d.datetime.toLocaleString('en', {
      dateStyle: 'full',
      timeStyle: 'short',
    })},
    I made <a href="${d.url}" target="_blank">${
      i > 0 ? 'another glorious commit' : 'my first commit, and it was glorious'
    }</a>.
    I edited ${d.totalLines} lines across ${
      d3.rollups(
        d.lines,
        (D) => D.length,
        (d) => d.file,
      ).length
    } files.
    Then I looked over all I had made, and I saw that it was very good.
  `,
  );

let visibleCommits;

function onStepEnter(response) {
  const commitDate = response.element.__data__.datetime;

  visibleCommits = commits.filter(
    d => d.datetime <= commitDate
  );

  updateScatterPlot(data, visibleCommits);
  renderCommitInfo(data, visibleCommits);
}

const scroller = scrollama();

scroller
  .setup({
    container: '#scrolly-1',
    step: '#scrolly-1 .step',
  })
  .onStepEnter(onStepEnter);

d3.select('#file-story')
  .selectAll('.step')
  .data(commits)
  .join('div')
  .attr('class', 'step')
  .html(
    (d, i) => `
    On ${d.datetime.toLocaleString('en', {
      dateStyle: 'full',
      timeStyle: 'short',
    })},
    I made <a href="${d.url}" target="_blank">${
      i > 0 ? 'another glorious commit' : 'my first commit, and it was glorious'
    }</a>.
    I edited ${d.totalLines} lines across ${
      d3.rollups(
        d.lines,
        (D) => D.length,
        (d) => d.file,
      ).length
    } files.
    Then I looked over all I had made, and I saw that it was very good.
  `,
  );

function onFileStepEnter(response) {

  const commitDate = response.element.__data__.datetime;

  const visibleCommits = commits.filter(
    d => d.datetime <= commitDate
  );

  updateFileDisplay(visibleCommits);
}

const fileScroller = scrollama();

fileScroller
  .setup({
    container: '#file-scrolly',
    step: '#file-scrolly .step',
  })
  .onStepEnter(onFileStepEnter);