import * as d3 from 'https://cdn.jsdelivr.net/npm/d3@7.9.0/+esm';

async function loadData() {
    const data = await d3.csv('loc.csv', (row) => ({
        ...row,
        line: Number(row.line), 
        depth: Number(row.depth),
        length: Number(row.length),
        date: new Date(row.date + 'T00:00' + row.timezone),
        datetime: new Date(row.datetime),
    }));
    return data;
}

function processCommits(data) {
    return d3
      .groups(data, (d) => d.commit)
      .map(([commit, lines]) => {
        let first = lines[0];
        let { author, date, time, timezone, datetime } = first;
        let ret = {
          id: commit,
          url: 'https://github.com/dar0010/portfolio/commit/' + commit,
          author,
          date,
          time,
          timezone,
          datetime,
          hourFrac: datetime.getHours() + datetime.getMinutes() / 60,
          totalLines: lines.length,
        };
  
        Object.defineProperty(ret, 'lines', {
          value: lines,
          writable: false,
          enumerable: false,
          configurable: false
        });
  
        return ret;
      });
  }

function renderCommitInfo(data, commits) {
  const dl = d3.select('#stats').append('dl').attr('class', 'stats');

  const totalUniqueFiles = d3.group(data, d => d.file).size;
  const maxLength = d3.max(commits, d => d3.max(d.lines, line => line.length));
  const maxLine = d3.max(commits, d => d3.max(d.lines, line => line.line));
  const maxDepth = d3.max(data, d => d.depth);

  dl.append('dt').html('Total <abbr title="Lines of code">LOC</abbr>');
  dl.append('dd').attr('class', 'loc-commit-info').text(data.length);

  dl.append('dt').text('Total commits');
  dl.append('dd').attr('class', 'total-commits').text(commits.length);

  dl.append('dt').text('Longest line');
  dl.append('dd').attr('class', 'longest-line').text(maxLength);

  dl.append('dt').text('Max file length (in lines)');
  dl.append('dd').attr('class', 'max-length').text(maxLine);

  dl.append('dt').text('Max depth');
  dl.append('dd').attr('class', 'max-depth').text(maxDepth);

  dl.append('dt').text('Total files');
  dl.append('dd').attr('class', 'total-files').text(totalUniqueFiles);
}


function updateCommitInfo(data, commits) {
  let allLines = commits.flatMap(d => d.lines);  // flatten all lines
  let fileGroups = d3.group(allLines, d => d.file);
  let uniqueFileCount = fileGroups.size;

  const maxLength = d3.max(commits, d => d3.max(d.lines, line => line.length));
  const maxLine = d3.max(commits, d => d3.max(d.lines, line => line.line));
  const maxDepth = d3.max(data, d => d.depth);
  const loc = d3.sum(commits, d => d.totalLines);

  d3.select('.loc-commit-info').text(loc);
  d3.select('.total-commits').text(commits.length);
  d3.select('.longest-line').text(maxLength);
  d3.select('.max-length').text(maxLine);
  d3.select('.max-depth').text(maxDepth);
  d3.select('.total-files').text(uniqueFileCount);
}


  
let xScale;
let yScale;

function renderScatterPlot(data, commits) {
    const sortedCommits = d3.sort(commits, (d) => -d.totalLines);
    const width = 1000;
    const height = 600;
    const svg = d3
        .select('#chart')
        .append('svg')
        .attr('viewBox', `0 0 ${width} ${height}`)
        .style('overflow', 'visible');
    xScale = d3
        .scaleTime()
        .domain(d3.extent(commits, (d) => d.datetime))
        .range([0, width])
        .nice();
    yScale = d3.scaleLinear().domain([0,24]).range([height, 0]);
    const margin = {top: 10, right: 10, bottom: 30, left: 20};
    const usableArea = {
        top: margin.top,
        right: width - margin.right,
        bottom: height - margin.bottom,
        left: margin.left,
        width: width - margin.left - margin.right,
        height: height - margin.top - margin.bottom,
    };
    xScale.range([usableArea.left, usableArea.right]);
    yScale.range([usableArea.bottom, usableArea.top]);
    const [minLines, maxLines] = d3.extent(commits, (d) => d.totalLines);
    const rScale = d3.scaleSqrt().domain([minLines, maxLines]).range([2,15]);
    const dots = svg.append('g').attr('class', 'dots');
    dots.selectAll('circle')
        .data(sortedCommits, (d) => d.id)
        .join('circle')
        .attr('cx', (d) => xScale(d.datetime))
        .attr('cy', (d) => yScale(d.hourFrac))
        .attr('r', (d) => rScale(d.totalLines))
        .attr('fill', 'steelBlue')
        .on('mouseenter', (event, commit) => {
            d3.select(event.currentTarget).style('fill-opacity', 1);
            renderTooltipContent(commit);
            updateTooltipVisibility(true);
            updateTooltipPosition(event);
        })
        .on('mouseleave', (event) => {
            d3.select(event.currentTarget).style('fill-opacity', 0.7);
            updateTooltipVisibility(false);
        });
    

    const xAxis = d3.axisBottom(xScale);
    const yAxis = d3
                    .axisLeft(yScale)
                    .tickFormat((d) => String(d % 24).padStart(2,'0') + ':00');
    svg
        .append('g')
        .attr('transform', `translate(0, ${usableArea.bottom})`)
        .attr('class', 'x-axis')
        .call(xAxis);
    svg
        .append('g')
        .attr('transform', `translate(${usableArea.left}, 0)`)
        .attr('class', 'y-axis')
        .call(yAxis);
    
    const timeColorScale = d3.scaleLinear()
        .domain([0, 6, 12, 18, 24])  // night → day → night
        .range(['midnightblue', 'steelblue', 'orange', 'orangered', 'midnightblue']);
    
    
    
    
    const gridlines = svg
        .append('g')
        .attr('class', 'gridlines')
        .attr('transform', `translate(${usableArea.left}, 0)`);
      
    
      // Create gridlines as an axis with no labels and full-width ticks
    gridlines.call(d3.axisLeft(yScale).tickFormat('').tickSize(-usableArea.width));
    createBrushSelector(svg);
  }

  function updateScatterPlot(data, commits) {
  const width = 1000;
  const height = 600;
  const margin = { top: 10, right: 10, bottom: 30, left: 20 };
  const usableArea = {
    top: margin.top,
    right: width - margin.right,
    bottom: height - margin.bottom,
    left: margin.left,
    width: width - margin.left - margin.right,
    height: height - margin.top - margin.bottom,
  };

  const svg = d3.select('#chart').select('svg');

  xScale = xScale.domain(d3.extent(commits, (d) => d.datetime));

  const [minLines, maxLines] = d3.extent(commits, (d) => d.totalLines);
  const rScale = d3.scaleSqrt().domain([minLines, maxLines]).range([2, 30]);

  const xAxis = d3.axisBottom(xScale);
  const xAxisGroup = svg.select('g.x-axis');
  xAxisGroup.selectAll('*').remove();
  xAxisGroup.call(xAxis);

  const dots = svg.select('g.dots');

  const sortedCommits = d3.sort(commits, (d) => -d.totalLines);
  dots
    .selectAll('circle')
    .data(sortedCommits, (d) => d.id)
    .join('circle')
    .attr('cx', (d) => xScale(d.datetime))
    .attr('cy', (d) => yScale(d.hourFrac))
    .attr('r', (d) => rScale(d.totalLines))
    .attr('fill', 'steelblue')
    .style('fill-opacity', 0.7) // Add transparency for overlapping dots
    .on('mouseenter', (event, commit) => {
      d3.select(event.currentTarget).style('fill-opacity', 1); // Full opacity on hover
      renderTooltipContent(commit);
      updateTooltipVisibility(true);
      updateTooltipPosition(event);
    })
    .on('mouseleave', (event) => {
      d3.select(event.currentTarget).style('fill-opacity', 0.7);
      updateTooltipVisibility(false);
    });
}

function renderTooltipContent(commit) {
  const link = document.getElementById('commit-link');
  const date = document.getElementById('commit-date');

  if (Object.keys(commit).length === 0) return;

  link.href = commit.url;
  link.textContent = commit.id;
  date.textContent = commit.datetime?.toLocaleString('en', {
    dateStyle: 'full',
  });
}

function updateTooltipVisibility(isVisible) {
  const tooltip = document.getElementById('commit-tooltip');
  tooltip.hidden = !isVisible;
}

function updateTooltipPosition(event) {
  const tooltip = document.getElementById('commit-tooltip');
  tooltip.style.left = `${event.clientX}px`;
  tooltip.style.top = `${event.clientY}px`;
}

function createBrushSelector(svg){
  svg.call(d3.brush().on('start brush end', brushed));
  svg.selectAll('.dots, .overlay ~ *').raise();
}

function renderSelectionCount(selection) {
  const selectedCommits = selection
    ? commits.filter((d) => isCommitSelected(selection, d))
    : [];

  const countElement = document.querySelector('#selection-count');
  countElement.textContent = `${
    selectedCommits.length || 'No'
  } commits selected`;

  return selectedCommits;
}

function brushed(event){
  // d3.select(svg).call(d3.brush().on('start brush end', brushed));
  const selection = event.selection;
  d3.selectAll('circle').classed('selected', (d) =>
      isCommitSelected(selection, d),
  );
  renderSelectionCount(selection);
  renderLanguageBreakdown(selection);
}

function isCommitSelected(selection, commit) {
  if (!selection) {
    return false;
  }
  // TODO: return true if commit is within brushSelection
  // and false if not
  const [x0, x1] = selection.map((d) => d[0]);
  const [y0, y1] = selection.map((d) => d[1]);
  const x = xScale(commit.datetime);
  const y = yScale(commit.hourFrac);
  return x>=x0 && x<=x1 && y>=y0 && y<=y1;
}

function renderLanguageBreakdown(selection) {
  const selectedCommits = selection
    ? commits.filter((d) => isCommitSelected(selection, d))
    : [];
  const container = document.getElementById('language-breakdown');

  if (selectedCommits.length === 0) {
    container.innerHTML = '';
    return;
  }
  const requiredCommits = selectedCommits.length ? selectedCommits : commits;
  const lines = requiredCommits.flatMap((d) => d.lines);

  // Use d3.rollup to count lines per language
  const breakdown = d3.rollup(
    lines,
    (v) => v.length,
    (d) => d.type,
  );

  // Update DOM with breakdown
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


let data = await loadData();
let commits = processCommits(data);
//lab8
let filteredCommits = commits;

let commitProgress = 100;
let timeScale = d3.scaleTime().domain([
  d3.min(commits, (d) => d.datetime),
  d3.max(commits, (d) => d.datetime),
])
.range([0, 100]);

let commitMaxTime = timeScale.invert(commitProgress);

const slider = document.getElementById('commit-progress');
slider.value = commitProgress;
const time = document.getElementById('commit-time');
let colors = d3.scaleOrdinal(d3.schemeTableau10);

function updateFileDisplay(filteredCommits){
  let lines = filteredCommits.flatMap((d) => d.lines);
  let files = d3
    .groups(lines, (d) => d.file)
    .map(([name, lines]) => {
      return {name, lines};
    })
    .sort((a,b) => b.lines.length - a.lines.length);
  console.log(files);
  let filesContainer = d3
    .select('#files')
    .selectAll('div')
    .data(files, (d) => d.name)
    .join(
      (enter) =>
        enter.append('div').call((div) => {
          div.append('dt')
            .html(d => `<code>${d.name}</code><small>${d.lines.length} lines</small>`);
          div.append('dd');
        }),
      );
  filesContainer
    .select('dd')
    .selectAll('div')
    .data((d) => d.lines)
    .join('div')
    .attr('class', 'loc')
    .attr('style', (d) => `--color: ${colors(d.type)}`);
  
  filesContainer.select('dt > small')
    .text(d => `${d.lines.length} lines`);
}

function onTimeSliderChange(event) {
  commitProgress = +event.target.value;
  commitMaxTime = timeScale.invert(commitProgress);
  time.textContent = commitMaxTime.toLocaleString({dateStyle: "long", timeStyle: "short"});
  filteredCommits = commits.filter((d) => d.datetime <= commitMaxTime);
  updateCommitInfo(data, filteredCommits);
  updateFileDisplay(filteredCommits);
  updateScatterPlot(data, filteredCommits);
}
slider.addEventListener('input', onTimeSliderChange);
//end lab8

renderCommitInfo(data, commits);
renderScatterPlot(data, commits);
const sortedCommits = d3.sort(commits, (d) => d.datetime);
d3.select('#scatter-story')
  .selectAll('.step')
  .data(sortedCommits)
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

d3.select('#unitvis-story')
  .selectAll('.step')
  .data(sortedCommits)
  .join('div')
  .attr('class', 'step')
  .html((d, i) => `
    On ${d.datetime.toLocaleString('en', {
      dateStyle: 'full',
      timeStyle: 'short',
    })},
    I edited ${d.totalLines} lines across ${
      d3.rollups(d.lines, D => D.length, d => d.file).length
    } files.
  `);

import scrollama from 'https://cdn.jsdelivr.net/npm/scrollama@3.2.0/+esm';
function onStepEnter(response) {
  filteredCommits = sortedCommits.filter(d => d.datetime <= response.element.__data__.datetime);
  updateScatterPlot(data, filteredCommits);
  updateCommitInfo(data, filteredCommits);
}

const scroller = scrollama();
scroller
  .setup({
    container: '#scrolly-1',
    step: '#scrolly-1 .step',
  })
  .onStepEnter(onStepEnter);

const unitvisScroller = scrollama();
unitvisScroller
  .setup({
    container: '#scrolly-2',
    step: '#scrolly-2 .step',
  })
  .onStepEnter(response => {
    const stepCommit = response.element.__data__;
    const filteredCommits = sortedCommits.filter(d => d.datetime <= stepCommit.datetime);
    updateFileDisplay(filteredCommits);
  });


