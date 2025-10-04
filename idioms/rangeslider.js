function createYearRangeSlider() {
  // Limpa o slider anterior para evitar sobreposições
  d3.select('#yearRangeSlider').selectAll('*').remove();

  // Configuração das dimensões do slider
  const width = 300;
  const height = 60;
  // Aumentar margin.bottom dá mais espaço para os rótulos dos anos
  const margin = { top: 10, right: 20, bottom: 30, left: 20 };
  const sliderWidth = width - margin.left - margin.right;
  const sliderHeight = height - margin.top - margin.bottom;

  // Intervalo de anos disponíveis no dataset
  const minYear = 1961;
  const maxYear = 2022;
  let startYear = minYear;
  let endYear = maxYear;
  let currentYear = 2022; 

  // Escala linear que mapeia anos para posições no slider
  // domain() define o intervalo de dados (anos), range() as posições em pixels
  const xScale = d3.scaleLinear()
    .domain([minYear, maxYear])
    .range([0, sliderWidth]);

  // Cria o elemento SVG principal
  const svg = d3.select('#yearRangeSlider')
    .append('svg')
    .attr('width', width)
    .attr('height', height);

  // Grupo principal com margens aplicadas
  const g = svg.append('g')
    .attr('transform', `translate(${margin.left}, ${margin.top})`);

  // Trilha principal do slider (linha cinza de fundo)
  const track = g.append('rect')
    .attr('class', 'slider-track')
    .attr('x', 0)
    .attr('y', sliderHeight / 2 - 2) // Centraliza verticalmente
    .attr('width', sliderWidth)
    .attr('height', 4) // Espessura da linha
    .attr('fill', '#ddd') 
    .attr('rx', 2); // Bordas arredondadas

  // Destaque do intervalo selecionado (linha azul entre as barras)
  const range = g.append('rect')
    .attr('class', 'slider-range')
    .attr('x', xScale(startYear))
    .attr('y', sliderHeight / 2 - 2)
    .attr('width', xScale(endYear) - xScale(startYear))
    .attr('height', 4)
    .attr('fill', 'steelblue') 
    .attr('rx', 2);

  // Comportamento de arrastar para as barras retangulares (definir intervalo)
  const rangeDrag = d3.drag()
    .on('start', function(event, d) {
      // Muda a cor da borda quando começa a arrastar
      d3.select(this).raise().attr('stroke', '#666');
    })
    .on('drag', function(event, d) {
      // Limita o movimento dentro dos limites do slider
      const x = Math.max(0, Math.min(sliderWidth, event.x));
      const year = Math.round(xScale.invert(x)); // Converte posição para ano

      // Reposiciona a barra (- 8 para centralizar na posição do mouse)
      d3.select(this).attr('x', xScale(year) - 8);

      // Atualiza os valores de início e fim do intervalo
      if (d.type === 'start') {
        startYear = Math.min(year, endYear); // Não pode passar do fim
        d.year = startYear;
      } else {
        endYear = Math.max(year, startYear); // Não pode ser menor que o início
        d.year = endYear;
      }

      // Mantém o ano atual dentro do intervalo definido pelas barras
      currentYear = Math.max(startYear, Math.min(endYear, currentYear));

      updateSlider();
    })
    .on('end', function(event, d) {
      // Restaura a cor da borda original
      d3.select(this).attr('stroke', '#333');
    });

  // Comportamento de arrastar para o círculo laranja (ano atual dos gráficos)
  // Este círculo controla que ano é mostrado no scatter plot e donut chart
  const currentYearDrag = d3.drag()
    .on('start', function(event, d) {
      // Muda a cor da borda quando começa a arrastar
      d3.select(this).raise().attr('stroke', '#666');
    })
    .on('drag', function(event, d) {
      const x = Math.max(0, Math.min(sliderWidth, event.x));
      const year = Math.round(xScale.invert(x)); // Converte posição para ano

      // Força o ano atual a ficar dentro do intervalo das barras
      currentYear = Math.max(startYear, Math.min(endYear, year));
      d3.select(this).attr('cx', xScale(currentYear)); // Reposiciona o círculo

      updateSlider();
      updateVisualization(); // IMPORTANTE: Atualiza os gráficos imediatamente
    })
    .on('end', function(event, d) {
      // Restaura a cor da borda original
      d3.select(this).attr('stroke', '#333');
    });

  // Cria as barras retangulares nas extremidades (controles de intervalo)
  const handleData = [
    { type: 'start', year: startYear }, 
    { type: 'end', year: endYear }     
  ];

  const handles = g.selectAll('.handle')
    .data(handleData)
    .enter()
    .append('rect')
    .attr('class', 'handle')
    .attr('x', d => xScale(d.year) - 8) // -8 para centralizar (width/2)
    .attr('y', sliderHeight / 2 - 10)   // -10 para centralizar verticalmente
    .attr('width', 16)    
    .attr('height', 20)   
    .attr('fill', '#fff')
    .attr('stroke', '#333') 
    .attr('stroke-width', 2) 
    .attr('rx', 3) // Arredondamento das bordas
    .style('cursor', 'ew-resize') // Cursor de redimensionamento horizontal
    .call(rangeDrag); // Aplica o comportamento de arrastar

  // Cria o círculo laranja para seleção do ano atual (afeta os gráficos)
  const currentYearCircle = g.append('circle')
    .attr('class', 'current-year-circle')
    .attr('cx', xScale(currentYear)) // Posição horizontal baseada no ano
    .attr('cy', sliderHeight / 2)    // Centralizado verticalmente
    .attr('r', 10)         
    .attr('fill', 'orange')
    .attr('stroke', '#333') 
    .attr('stroke-width', 2) 
    .style('cursor', 'ew-resize') // Cursor de redimensionamento
    .call(currentYearDrag); // Aplica o comportamento de arrastar

  // Alterar o terceiro parâmetro (10) muda o intervalo entre marcas
  const tickYears = d3.range(minYear, maxYear + 1, 10);
  g.selectAll('.tick')
    .data(tickYears)
    .enter()
    .append('line')
    .attr('class', 'tick')
    .attr('x1', d => xScale(d)) // Posição horizontal da marca
    .attr('x2', d => xScale(d))
    .attr('y1', sliderHeight / 2 + 6)  
    .attr('y2', sliderHeight / 2 + 12) 
    .attr('stroke', '#666') 
    .attr('stroke-width', 1); 

  // Rótulos dos anos 
  g.selectAll('.tick-label')
    .data(tickYears)
    .enter()
    .append('text')
    .attr('class', 'tick-label')
    .attr('x', d => xScale(d)) // Posição horizontal do texto
    .attr('y', sliderHeight / 2 + 25) // Posição vertical (abaixo das marcas)
    .attr('text-anchor', 'middle') // Centraliza o texto
    .attr('font-size', '10px') 
    .attr('fill', '#666') 
    .text(d => d); // Mostra o ano

  // Exibição do ano atual e intervalo (texto abaixo do slider)
  const yearDisplay = d3.select('#yearRangeSlider')
    .append('div')
    .style('text-align', 'center') // Centraliza o texto
    .style('margin-top', '5px')    // Espaço acima do texto
    .style('font-size', '14px')    
    .style('font-weight', 'bold') 
    .text(`Current Year: ${currentYear} | Range: ${startYear} - ${endYear}`);

  function updateSlider() {
    // Atualiza a barra azul de destaque do intervalo
    range
      .attr('x', xScale(startYear))
      .attr('width', xScale(endYear) - xScale(startYear));

    // Reposiciona o círculo laranja
    currentYearCircle.attr('cx', xScale(currentYear));

    // Atualiza o texto informativo
    yearDisplay.text(`Current Year: ${currentYear} | Range: ${startYear} - ${endYear}`);
  }

  function updateVisualization() {
    setCurrentData();
    createScatterplot();
    createDonutChart();
  }

  // Funções exportadas para uso por outros componentes
  window.getSelectedYearRange = function() {
    return { start: startYear, end: endYear };
  };

  window.getCurrentYear = function() {
    return currentYear;
  };
}