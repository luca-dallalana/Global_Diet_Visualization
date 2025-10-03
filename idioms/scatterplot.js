// Create scatter plot
function createScatterplot() {
  // Clear previous chart
  d3.select('#scatterplot').selectAll('*').remove();

  if (currentData.length === 0) {
    d3.select('#scatterplot')
      .append('div')
      .style('text-align', 'center')
      .style('padding', '50px')
      .style('color', '#666')
      .text('No data available for the selected filters');
    return;
  }

  // Get dynamic configuration
  const config = getChartConfig();

  // Create SVG
  const svg = d3.select('#scatterplot')
    .append('svg')
    .attr('width', config.width)
    .attr('height', config.height);

  // Create scales - limit GDP scale to max $100,000
  const isGdpOnX = currentData[0]?.xLabel?.includes('GDP');
  const xDomain = isGdpOnX ?
    [0, Math.min(160000, d3.max(currentData, d => d.x))] :
    d3.extent(currentData, d => d.x);

  const xScale = d3.scaleLinear()
    .domain(xDomain)
    .nice()
    .range([config.margin.left, config.width - config.margin.right]);

  const yScale = d3.scaleLinear()
    .domain(d3.extent(currentData, d => d.y))
    .nice()
    .range([config.height - config.margin.bottom, config.margin.top]);

  // Color scale by country
  const uniqueCountries = [...new Set(currentData.map(d => d.country))];
  const colorScale = d3.scaleOrdinal(d3.schemeCategory10)
    .domain(uniqueCountries);

  // Create tooltip
  const tooltip = d3.select('body')
    .append('div')
    .attr('class', 'tooltip');

  // Draw circles
  svg.selectAll('.circle')
    .data(currentData)
    .enter()
    .append('circle')
    .attr('class', 'circle')
    .attr('cx', d => xScale(d.x))
    .attr('cy', d => yScale(d.y))
    .attr('r', 5)
    .attr('fill', d => colorScale(d.country))
    .on('mouseover', function(event, d) {
      d3.select(this).attr('r', 7);
      tooltip
        .style('opacity', 1)
        .html(`
          <strong>${d.country}</strong><br/>
          Year: ${d.year}<br/>
          ${d.xLabel}: ${d.x.toLocaleString()}<br/>
          ${d.yLabel}: ${d.y.toFixed(2)}
        `)
        .style('left', (event.pageX + 10) + 'px')
        .style('top', (event.pageY - 10) + 'px');
    })
    .on('mouseout', function() {
      d3.select(this).attr('r', 5);
      tooltip.style('opacity', 0);
    });

  // Add regression line
  const regression = calculateLinearRegression(currentData);
  if (regression) {
    const lineData = [
      { x: d3.min(currentData, d => d.x), y: regression.slope * d3.min(currentData, d => d.x) + regression.intercept },
      { x: d3.max(currentData, d => d.x), y: regression.slope * d3.max(currentData, d => d.x) + regression.intercept }
    ];

    svg.append('path')
      .datum(lineData)
      .attr('class', 'regression-line')
      .attr('d', d3.line()
        .x(d => xScale(d.x))
        .y(d => yScale(d.y))
      );

    // Add regression equation
    svg.append('text')
      .attr('class', 'regression-info')
      .attr('x', config.width - config.margin.right - 10)
      .attr('y', config.margin.top + 20)
      .attr('text-anchor', 'end')
      .text(`R² = ${regression.rSquared.toFixed(3)}`);
  }

  // Add axes
  svg.append('g')
    .attr('class', 'axis')
    .attr('transform', `translate(0,${config.height - config.margin.bottom})`)
    .call(d3.axisBottom(xScale));

  svg.append('g')
    .attr('class', 'axis')
    .attr('transform', `translate(${config.margin.left},0)`)
    .call(d3.axisLeft(yScale));

  // Add axis labels
  svg.append('text')
    .attr('class', 'axis-label')
    .attr('x', config.width / 2 )
    .attr('y', config.height - 5)
    .attr('text-anchor', 'middle')
    .text(currentData[0]?.xLabel || 'X Axis');

  svg.append('text')
    .attr('class', 'axis-label')
    .attr('transform', 'rotate(-90)')
    .attr('x', -config.height / 2)
    .attr('y', 10)
    .attr('text-anchor', 'middle')
    .text(currentData[0]?.yLabel || 'Y Axis');
}

// Calculate linear regression
function calculateLinearRegression(data) {
  if (data.length < 2) return null;

  const xValues = data.map(d => d.x);
  const yValues = data.map(d => d.y);
  const n = data.length;

  const xMean = d3.mean(xValues);
  const yMean = d3.mean(yValues);

  let numerator = 0;
  let denominator = 0;
  let totalSumSquares = 0;

  for (let i = 0; i < n; i++) {
    numerator += (xValues[i] - xMean) * (yValues[i] - yMean);
    denominator += (xValues[i] - xMean) ** 2;
    totalSumSquares += (yValues[i] - yMean) ** 2;
  }

  const slope = numerator / denominator;
  const intercept = yMean - slope * xMean;

  // Calculate R-squared
  let residualSumSquares = 0;
  for (let i = 0; i < n; i++) {
    const predicted = slope * xValues[i] + intercept;
    residualSumSquares += (yValues[i] - predicted) ** 2;
  }
  const rSquared = 1 - (residualSumSquares / totalSumSquares);

  return { slope, intercept, rSquared };
}