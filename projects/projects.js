import * as d3 from 'https://cdn.jsdelivr.net/npm/d3@7.9.0/+esm';

import { fetchJSON, renderProjects } from '../global.js';

const projects = await fetchJSON('../lib/projects.json');

const projectsContainer = document.querySelector('.projects');

const titleEl = document.querySelector('.projects-title');

if (titleEl) {
  titleEl.textContent = projects.length;
}

renderProjects(projects, projectsContainer, 'h2');

let arcGenerator = d3.arc().innerRadius(0).outerRadius(50);

let data = [
  { value: 1, label: 'apples' },
  { value: 2, label: 'oranges' },
  { value: 3, label: 'mangos' },
  { value: 4, label: 'pears' },
  { value: 5, label: 'limes' },
  { value: 5, label: 'cherries' },
];

let sliceGenerator = d3.pie().value((d) => d.value);

let arcData = sliceGenerator(data);

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