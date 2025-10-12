function createDonutChart(selector = '#donutchart') {
  const container = selector.startsWith('.') ? d3.select(selector).select('#donutchart') : d3.select(selector);
  container.selectAll('*').remove();

  // Usa getters pra aceder ao GlobalState
  const currentYear = window.getCurrentYear();
  const selectedCountries = window.getSelectedCountries();
  const macronutrientData = window.getMacronutrientData();

  // Usa só o ano atual
  let yearData = macronutrientData.filter(d => d.year === currentYear);

  // Usa so os países selecionados
  if (selectedCountries.length > 0) {
    yearData = yearData.filter(d => selectedCountries.includes(d.country));
  }

  // Se não tiver nenhum pais selected
  if (yearData.length === 0) {
    container
      .append('div')
      .style('text-align', 'center')
      .style('padding', '50px')
      .style('color', '#666')
      .text('No macronutrient data available for the selected filters');
    return;
  }

  // caculos aux
  const avgCarbohydrates = d3.mean(yearData, d => d.carbohydrates);
  const avgFat = d3.mean(yearData, d => d.fat);
  const avgAnimalProtein = d3.mean(yearData, d => d.animalProtein);
  const avgVegetalProtein = d3.mean(yearData, d => d.vegetalProtein);
  const totalProtein = avgAnimalProtein + avgVegetalProtein; 

  // Mapzinho de cores
  const donutData = [
    { name: 'Carbohydrates', value: avgCarbohydrates, color: '#ff7f0e' }, 
    { name: 'Fats', value: avgFat, color: '#2ca02c' },                    
    { name: 'Proteins', value: totalProtein, color: '#1f77b4' }           
  ];

  const width = 220;
  const height = 220;
  const radius = Math.min(width, height) / 2;
  const innerRadius = radius * 0.6; // 60% do raio externo para criar o "buraco" do donut

  // Calcula total de calorias para mostrar no centro
  const totalCalories = d3.sum(donutData, d => d.value);

  // Cria título dinâmico baseado na seleção de países
  let titleText = `Daily Calorie Distribution (${currentYear})`;
  if (selectedCountries.length === 1) {
    titleText = `${selectedCountries[0]} - ${titleText}`;        // Um país específico
  } else if (selectedCountries.length > 1) {
    titleText = `Selected Countries - ${titleText}`;             // Múltiplos países
  } else {
    titleText = `Global - ${titleText}`;                         // Todos os países
  }

  // Adiciona o título do gráfico
  container
    .append('h4')
    .style('text-align', 'center')
    .style('margin-bottom', '10px')
    .text(titleText);

  // Adiciona o total de calorias abaixo do título
  container
    .append('div')
    .style('text-align', 'center')
    .style('margin-bottom', '5px')
    .style('font-size', '18px')
    .style('font-weight', 'bold')
    .style('color', '#333')
    .text(`Total: ${totalCalories.toFixed(0)} calories`);

  // Cria o elemento SVG principal
  const svg = container
    .append('svg')
    .attr('width', width)
    .attr('height', height)
    .style('margin-left', '70px')      // Centraliza o gráfico
    .style('margin-top', '10px');

  // Grupo principal centrado no SVG
  const g = svg.append('g')
    .attr('transform', `translate(${width / 2}, ${height / 2})`);

  const pie = d3.pie()
    .value(d => d.value)
    .sort(null);            // Mantém ordem original dos dados

  const arc = d3.arc()
    .innerRadius(innerRadius)
    .outerRadius(radius);

  const tooltip = d3.select('body')
    .append('div')
    .attr('class', 'tooltip');

  // Cria grupos para cada fatia do donut
  const slices = g.selectAll('.slice')
    .data(pie(donutData))
    .enter()
    .append('g')
    .attr('class', 'slice');

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
          Percentage: ${((d.data.value / totalCalories) * 100).toFixed(1)}%
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