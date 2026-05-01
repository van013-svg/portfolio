import * as d3 from 'https://cdn.jsdelivr.net/npm/d3@7.9.0/+esm';

import { fetchJSON, renderProjects } from '../global.js';

const projects = await fetchJSON('../lib/projects.json');

const projectsContainer = document.querySelector('.projects');

const titleEl = document.querySelector('.projects-title');

if (titleEl) {
  titleEl.textContent = projects.length;
}

renderProjects(projects, projectsContainer, 'h2');

let rolledData = d3.rollups(
  projects,
  (v) => v.length,
  (d) => d.year
);

let data = rolledData.map(([year, count]) => {
  return { value: count, label: year };
});

let sliceGenerator = d3.pie().value((d) => d.value);
let arcData = sliceGenerator(data);
let arcGenerator = d3.arc().innerRadius(0).outerRadius(50);

let colors = d3.scaleOrdinal(d3.schemeTableau10);

d3.select('#projects-pie-plot')
  .selectAll('path')
  .data(arcData)
  .enter()
  .append('path')
  .attr('d', arcGenerator)
  .attr('fill', (d, i) => colors(i));

let legend = d3.select('.legend');

arcData.forEach((d, idx) => {
  let li = legend.append('li')
    .attr('class', 'legend-item')
    .attr('style', `--color:${colors(idx)}`);

  li.append('span')
    .attr('class', 'swatch');

  li.append('span')
    .text(`${d.data.label} (${d.data.value})`);
});
