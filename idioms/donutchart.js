// Create donut chart for macronutrient distribution
function createDonutChart() {
  // Clear previous chart
  d3.select('#donutchart').selectAll('*').remove();

  // Get selected countries and year
  const selectedYear = d3.select('#yearSlider').property('value');
  const selectedCountries = Array.from(d3.selectAll('#countryCheckboxes input[type="checkbox"]:checked').nodes())
    .map(checkbox => checkbox.value);

  // Filter data for the selected year and countries
  let yearData = macronutrientData.filter(d => d.year === +selectedYear);

  if (selectedCountries.length > 0) {
    yearData = yearData.filter(d => selectedCountries.includes(d.country));
  }

  if (yearData.length === 0) {
    d3.select('#donutchart')
      .append('div')
      .style('text-align', 'center')
      .style('padding', '50px')
      .style('color', '#666')
      .text('No macronutrient data available for the selected filters');
    return;
  }

  // Calculate averages for the filtered data
  const avgCarbohydrates = d3.mean(yearData, d => d.carbohydrates);
  const avgFat = d3.mean(yearData, d => d.fat);
  const avgAnimalProtein = d3.mean(yearData, d => d.animalProtein);
  const avgVegetalProtein = d3.mean(yearData, d => d.vegetalProtein);
  const totalProtein = avgAnimalProtein + avgVegetalProtein;

  // Prepare data for donut chart
  const donutData = [
    { name: 'Carbohydrates', value: avgCarbohydrates, color: '#ff7f0e' },
    { name: 'Fats', value: avgFat, color: '#2ca02c' },
    { name: 'Proteins', value: totalProtein, color: '#1f77b4' }
  ];

  // Chart dimensions
  const width = 220;
  const height = 220;
  const margin = { top: 20, right: 20, bottom: 20, left: 20 };
  const radius = Math.min(width - margin.left - margin.right, height - margin.top - margin.bottom) / 2;
  const innerRadius = radius * 0.6; // Creates donut hole

  // Add title with total calories
  const totalCalories = d3.sum(donutData, d => d.value);
  // Create title based on selection
  let titleText = `Daily Calorie Distribution (${selectedYear})`;
  if (selectedCountries.length === 1) {
    titleText = `${selectedCountries[0]} - ${titleText}`;
  } else if (selectedCountries.length > 1) {
    titleText = `Selected Countries - ${titleText}`;
  } else {
    titleText = `Global - ${titleText}`;
  }

  d3.select('#donutchart')
    .append('h4')
    .style('text-align', 'center')
    .style('margin-bottom', '10px')
    .text(titleText);

  d3.select('#donutchart')
    .append('div')
    .style('text-align', 'center')
    .style('margin-bottom', '5px')
    .style('font-size', '18px')
    .style('font-weight', 'bold')
    .style('color', '#333')
    .text(`Total: ${totalCalories.toFixed(0)} calories`);

  // Create SVG
  const svg = d3.select('#donutchart')
    .append('svg')
    .attr('width', width)
    .attr('height', height)
    .style('margin-left', '20px')
    .style('margin-top', '-20px');

  const g = svg.append('g')
    .attr('transform', `translate(${width / 2}, ${height / 2})`);

  // Create pie generator
  const pie = d3.pie()
    .value(d => d.value)
    .sort(null);

  // Create arc generator
  const arc = d3.arc()
    .innerRadius(innerRadius)
    .outerRadius(radius);

  // Create arc for labels
  const labelArc = d3.arc()
    .innerRadius(radius + 10)
    .outerRadius(radius + 10);

  // Create tooltip
  const tooltip = d3.select('body')
    .append('div')
    .attr('class', 'tooltip');

  // Create pie slices
  const slices = g.selectAll('.slice')
    .data(pie(donutData))
    .enter()
    .append('g')
    .attr('class', 'slice');

  // Add paths for slices
  slices.append('path')
    .attr('d', arc)
    .style('fill', d => d.data.color)
    .style('stroke', '#fff')
    .style('stroke-width', '2px')
    .style('cursor', 'pointer')
    .on('mouseover', function(event, d) {
      d3.select(this)
        .style('opacity', 0.8)
        .style('stroke-width', '3px');

      tooltip
        .style('opacity', 1)
        .html(`
          <strong>${d.data.name}</strong><br/>
          Calories: ${d.data.value.toFixed(1)}<br/>
          Percentage: ${((d.data.value / d3.sum(donutData, d => d.value)) * 100).toFixed(1)}%
        `)
        .style('left', (event.pageX + 10) + 'px')
        .style('top', (event.pageY - 10) + 'px');
    })
    .on('mouseout', function() {
      d3.select(this)
        .style('opacity', 1)
        .style('stroke-width', '2px');

      tooltip.style('opacity', 0);
    });

  // Add percentage labels on slices
  slices.append('text')
    .attr('transform', d => `translate(${arc.centroid(d)})`)
    .attr('text-anchor', 'middle')
    .attr('dominant-baseline', 'middle')
    .style('font-size', '14px')
    .style('font-weight', 'bold')
    .style('fill', '#fff')
    .style('text-shadow', '1px 1px 2px rgba(0,0,0,0.7)')
    .text(d => {
      const percentage = (d.data.value / d3.sum(donutData, d => d.value)) * 100;
      return percentage > 5 ? `${percentage.toFixed(1)}%` : '';
    });

  // Add center text showing individual macronutrient values
  const centerG = g.append('g')
    .attr('class', 'center-text')
    .style('text-anchor', 'middle');

  centerG.append('text')
    .attr('y', -20)
    .style('font-size', '12px')
    .style('font-weight', 'bold')
    .style('fill', '#ff7f0e')
    .text(`Carbs: ${avgCarbohydrates.toFixed(0)}`);

  centerG.append('text')
    .attr('y', 0)
    .style('font-size', '12px')
    .style('font-weight', 'bold')
    .style('fill', '#2ca02c')
    .text(`Fats: ${avgFat.toFixed(0)}`);

  centerG.append('text')
    .attr('y', 20)
    .style('font-size', '12px')
    .style('font-weight', 'bold')
    .style('fill', '#1f77b4')
    .text(`Proteins: ${totalProtein.toFixed(0)}`);


}