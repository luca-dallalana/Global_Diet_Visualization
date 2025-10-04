// D3 Range Slider for Year Selection
function createYearRangeSlider() {
  // Clear previous slider
  d3.select('#yearRangeSlider').selectAll('*').remove();

  // Slider configuration
  const width = 300;
  const height = 60;
  const margin = { top: 10, right: 20, bottom: 30, left: 20 };
  const sliderWidth = width - margin.left - margin.right;
  const sliderHeight = height - margin.top - margin.bottom;

  // Year range
  const minYear = 1961;
  const maxYear = 2022;

  // Initial range (handles start at ends, current year in middle)
  let startYear = minYear;
  let endYear = maxYear;
  let currentYear = 2022;

  // Create scale
  const xScale = d3.scaleLinear()
    .domain([minYear, maxYear])
    .range([0, sliderWidth]);

  // Create SVG
  const svg = d3.select('#yearRangeSlider')
    .append('svg')
    .attr('width', width)
    .attr('height', height);

  const g = svg.append('g')
    .attr('transform', `translate(${margin.left}, ${margin.top})`);

  // Create slider track
  const track = g.append('rect')
    .attr('class', 'slider-track')
    .attr('x', 0)
    .attr('y', sliderHeight / 2 - 2)
    .attr('width', sliderWidth)
    .attr('height', 4)
    .attr('fill', '#ddd')
    .attr('rx', 2);

  // Create range highlight
  const range = g.append('rect')
    .attr('class', 'slider-range')
    .attr('x', xScale(startYear))
    .attr('y', sliderHeight / 2 - 2)
    .attr('width', xScale(endYear) - xScale(startYear))
    .attr('height', 4)
    .attr('fill', 'steelblue')
    .attr('rx', 2);

  // Create drag behavior for range handles
  const rangeDrag = d3.drag()
    .on('start', function(event, d) {
      d3.select(this).raise().attr('stroke', '#666');
    })
    .on('drag', function(event, d) {
      const x = Math.max(0, Math.min(sliderWidth, event.x));
      const year = Math.round(xScale.invert(x));

      d3.select(this).attr('x', xScale(year) - 8);

      if (d.type === 'start') {
        startYear = Math.min(year, endYear);
        d.year = startYear;
      } else {
        endYear = Math.max(year, startYear);
        d.year = endYear;
      }

      // Keep current year within range
      currentYear = Math.max(startYear, Math.min(endYear, currentYear));

      updateSlider();
    })
    .on('end', function(event, d) {
      d3.select(this).attr('stroke', '#333');
    });

  // Create drag behavior for current year circle
  const currentYearDrag = d3.drag()
    .on('start', function(event, d) {
      d3.select(this).raise().attr('stroke', '#666');
    })
    .on('drag', function(event, d) {
      const x = Math.max(0, Math.min(sliderWidth, event.x));
      const year = Math.round(xScale.invert(x));

      // Keep within range bounds
      currentYear = Math.max(startYear, Math.min(endYear, year));
      d3.select(this).attr('cx', xScale(currentYear));

      updateSlider();
      updateVisualization();
    })
    .on('end', function(event, d) {
      d3.select(this).attr('stroke', '#333');
    });

  // Create range handles (rectangles at ends)
  const handleData = [
    { type: 'start', year: startYear },
    { type: 'end', year: endYear }
  ];

  const handles = g.selectAll('.handle')
    .data(handleData)
    .enter()
    .append('rect')
    .attr('class', 'handle')
    .attr('x', d => xScale(d.year) - 8)
    .attr('y', sliderHeight / 2 - 10)
    .attr('width', 16)
    .attr('height', 20)
    .attr('fill', '#fff')
    .attr('stroke', '#333')
    .attr('stroke-width', 2)
    .attr('rx', 3)
    .style('cursor', 'ew-resize')
    .call(rangeDrag);

  // Create current year circle (for chart updates)
  const currentYearCircle = g.append('circle')
    .attr('class', 'current-year-circle')
    .attr('cx', xScale(currentYear))
    .attr('cy', sliderHeight / 2)
    .attr('r', 10)
    .attr('fill', 'orange')
    .attr('stroke', '#333')
    .attr('stroke-width', 2)
    .style('cursor', 'ew-resize')
    .call(currentYearDrag);

  // Add tick marks
  const tickYears = d3.range(minYear, maxYear + 1, 10);
  g.selectAll('.tick')
    .data(tickYears)
    .enter()
    .append('line')
    .attr('class', 'tick')
    .attr('x1', d => xScale(d))
    .attr('x2', d => xScale(d))
    .attr('y1', sliderHeight / 2 + 6)
    .attr('y2', sliderHeight / 2 + 12)
    .attr('stroke', '#666')
    .attr('stroke-width', 1);

  // Add tick labels
  g.selectAll('.tick-label')
    .data(tickYears)
    .enter()
    .append('text')
    .attr('class', 'tick-label')
    .attr('x', d => xScale(d))
    .attr('y', sliderHeight / 2 + 25)
    .attr('text-anchor', 'middle')
    .attr('font-size', '10px')
    .attr('fill', '#666')
    .text(d => d);

  // Add current year display
  const yearDisplay = d3.select('#yearRangeSlider')
    .append('div')
    .style('text-align', 'center')
    .style('margin-top', '5px')
    .style('font-size', '14px')
    .style('font-weight', 'bold')
    .text(`Current Year: ${currentYear} | Range: ${startYear} - ${endYear}`);

  // Update functions
  function updateSlider() {
    range
      .attr('x', xScale(startYear))
      .attr('width', xScale(endYear) - xScale(startYear));

    currentYearCircle.attr('cx', xScale(currentYear));

    yearDisplay.text(`Current Year: ${currentYear} | Range: ${startYear} - ${endYear}`);
  }

  function updateVisualization() {
    // Update the data based on selected year range
    setCurrentData();
    createScatterplot();
    createDonutChart();
  }

  // Export current year and range for use by other components
  window.getSelectedYearRange = function() {
    return { start: startYear, end: endYear };
  };

  window.getCurrentYear = function() {
    return currentYear;
  };
}