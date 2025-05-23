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
    // Create the dl element
    const dl = d3.select('#stats').append('dl').attr('class', 'stats');
    
    const totalUniqueFiles = d3.group(data, d => d.file).size;
          
    const maxLength = d3.max(commits, d => d3.max(d.lines, line => line.length));
    const maxLine = d3.max(commits, d => d3.max(d.lines, line => line.line));
    const maxDepth = d3.max(data, d => d.depth);
    
    // Add total LOC
    dl.append('dt').html('Total <abbr title="Lines of code">LOC</abbr>');
    dl.append('dd').text(data.length);
  
    // Add total commits
    dl.append('dt').text('Total commits');
    dl.append('dd').text(commits.length);
  
    dl.append('dt').text('Longest line');
    dl.append('dd').text(maxLength);

    dl.append('dt').text('Max file length (in lines)');
    dl.append('dd').text(maxLine);

    dl.append('dt').text('Max depth');
    dl.append('dd').text(maxDepth);

    dl.append('dt').text('Total files');
    dl.append('dd').text(totalUniqueFiles);
  }

  let xScale;
  let yScale;

  function updateScatterPlot(data, filteredCommits) {
    const sortedCommits = d3.sort(filteredCommits, (d) => -d.totalLines);
    const width = 1000;
    const height = 600;
    d3.select('svg').remove();
    const svg = d3
        .select('#chart')
        .append('svg')
        .attr('viewBox', `0 0 ${width} ${height}`)
        .style('overflow', 'visible');
    xScale = d3
        .scaleTime()
        .domain(d3.extent(filteredCommits, (d) => d.datetime))
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
    const [minLines, maxLines] = d3.extent(filteredCommits, (d) => d.totalLines);
    const rScale = d3.scaleSqrt().domain([minLines, maxLines]).range([2,15]);
    svg.selectAll('g').remove();
    const dots = svg.append('g').attr('class', 'dots');
    dots.selectAll('circle').remove();
    dots.selectAll('circle')
        .data(sortedCommits)
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
        .call(xAxis);
    svg
        .append('g')
        .attr('transform', `translate(${usableArea.left}, 0)`)
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

  
  function updateTimeDisplay() {
    commitProgress = Number(timeSlider.value);
  }

  let data = await loadData();
  let commits = processCommits(data);
  //lab8
  let filteredCommits = [];
  let commitProgress = 100;

  const timeSlider = document.getElementById('commit-slider');
  const selectedTime = d3.select('#commit-slider-time');

  let timeScale = d3.scaleTime(
    [d3.min(commits, (d) => d.datetime), d3.max(commits, (d) => d.datetime)],
    [0, 100],
  );

  timeSlider.value = commitProgress;

  function filterCommitsByTime(commitMaxTime) {
    filteredCommits = commits.filter(d => d.datetime <= commitMaxTime);
  }

  function updateTimeDisplay() {
    commitProgress = Number(timeSlider.value);
    let commitMaxTime = timeScale.invert(commitProgress);
    
    selectedTime.text(commitMaxTime.toLocaleString({dateStyle: "long", timeStyle: "short"}));
    filterCommitsByTime(commitMaxTime);
    updateScatterPlot(data, filteredCommits);
  }

  timeSlider.addEventListener('input', updateTimeDisplay);
  renderCommitInfo(data, commits);
  updateTimeDisplay();
  
  // let filteredCommits;  
  // let commitProgress = 100;
  // let timeScale = d3.scaleTime(
  //   [d3.min(commits, (d) => d.datetime), d3.max(commits, (d) => d.datetime)],
  //   [0, 100],
  // );
  // d3.select('#commit-slider').property('value', commitProgress);
  // let commitMaxTime = timeScale.invert(commitProgress);
  // const selectedTime = d3.select('#commit-slider-time');
  // selectedTime.textContent = timeScale.invert(commitProgress).toLocaleString({ dateStyle: "long", timeStyle: "short" });
  // d3.select('#commit-slider-time')
  //       .text(commitMaxTime.toLocaleString({dataStyle: 'long', timeStyle: 'short'}));
  
  // filteredCommits = 
  
  // d3.select('#commit-slider')
  //   .on('input', function() {
  //     let commitProgress = +this.value;
  //     let commitMaxTime = timeScale.invert(commitProgress);
  //     d3.select('#commit-slider-time')
  //       .text(commitMaxTime.toLocaleString({dataStyle: 'long', timeStyle: 'short'}));
  //   });
