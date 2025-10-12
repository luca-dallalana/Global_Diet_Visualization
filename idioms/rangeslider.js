function createYearRangeSlider() {
  d3.select('#yearRangeSlider').selectAll('*').remove();

  const width = 300;
  const height = 60;
  const margin = { top: 10, right: 20, bottom: 30, left: 20 };
  const sliderWidth = width - margin.left - margin.right;
  const sliderHeight = height - margin.top - margin.bottom;

  // Função para determinar intervalo de anos baseado no filtro selecionado
  function getYearRange() {
    const selectedFilter = d3.select('#filterSelect').property('value');
    if (selectedFilter === 'obesity-rate') {
      return { min: 1990, max: 2022 }; // Dados de obesidade começam em 1990
    }
    return { min: 1961, max: 2022 };   // Outros dados começam em 1961
  }

  const yearRange = getYearRange();
  let minYear = yearRange.min;
  let maxYear = yearRange.max;
  let startYear = minYear;    // Início do intervalo selecionado
  let endYear = maxYear;      // Fim do intervalo selecionado
  let currentYear = maxYear;  // Ano atual (círculo laranja) 

  // Escala linear para mapear anos para posições no slider
  const xScale = d3.scaleLinear()
    .domain([minYear, maxYear])
    .range([0, sliderWidth]);

  const svg = d3.select('#yearRangeSlider')
    .append('svg')
    .attr('width', width)
    .attr('height', height);

  const g = svg.append('g')
    .attr('transform', `translate(${margin.left}, ${margin.top})`);

  // Trilha de fundo do slider (cinza)
  g.append('rect')
    .attr('class', 'slider-track')
    .attr('x', 0)
    .attr('y', sliderHeight / 2 - 2)
    .attr('width', sliderWidth)
    .attr('height', 4)
    .attr('fill', '#ddd')
    .attr('rx', 2);

  // Intervalo selecionado (azul) entre os dois handles
  const range = g.append('rect')
    .attr('class', 'slider-range')
    .attr('x', xScale(startYear))
    .attr('y', sliderHeight / 2 - 2)
    .attr('width', xScale(endYear) - xScale(startYear))
    .attr('height', 4)
    .attr('fill', 'steelblue')
    .attr('rx', 2);

  // Permite o range do drag
  const rangeDrag = d3.drag()
    .on('start', function() {
      d3.select(this).raise().attr('stroke', '#666'); // Destaca handle sendo arrastado
    })
    .on('drag', function(event, d) {
      // Limita posição do mouse dentro dos limites do slider
      const x = Math.max(0, Math.min(sliderWidth, event.x));
      const year = Math.round(xScale.invert(x));

      // Atualiza início ou fim do intervalo baseado no tipo do handle
      if (d.type === 'start') {
        startYear = Math.max(minYear, Math.min(year, endYear)); // Não pode passar do fim
        d.year = startYear;
        d3.select(this).attr('x', xScale(startYear) - 8);
      } else {
        endYear = Math.min(maxYear, Math.max(year, startYear)); // Não pode ser menor que início
        d.year = endYear;
        d3.select(this).attr('x', xScale(endYear) - 8);
      }

      // Garante que o ano atual fica dentro do intervalo selecionado
      currentYear = Math.max(startYear, Math.min(endYear, currentYear));

      updateSlider();

      // Atualiza estado global com novos valores
      if (window.updateGlobalState) {
        window.updateGlobalState({
          currentYear: currentYear,
          yearRange: { start: startYear, end: endYear }
        });
      }
    })
    .on('end', function() {
      d3.select(this).attr('stroke', '#333'); // Remove destaque
    });

  // Comportamento de drag para o círculo do ano atual (laranja)
  const currentYearDrag = d3.drag()
    .on('start', function() {
      d3.select(this).raise().attr('stroke', '#666'); 
    })
    .on('drag', function(event) {
      // Limita posição do mouse dentro dos limites do slider
      const x = Math.max(0, Math.min(sliderWidth, event.x));
      const year = Math.round(xScale.invert(x));

      // Garante que o ano atual fica dentro do intervalo selecionado
      currentYear = Math.max(startYear, Math.min(endYear, year));
      d3.select(this).attr('cx', xScale(currentYear));

      updateSlider();

      // Atualiza estado global com novo ano atual
      if (window.updateGlobalState) {
        window.updateGlobalState({
          currentYear: currentYear,
          yearRange: { start: startYear, end: endYear }
        });
      }
    })
    .on('end', function() {
      d3.select(this).attr('stroke', '#333'); // Remove destaque
    });

  // Dados para os dois handles (início e fim do intervalo)
  const handleData = [
    { type: 'start', year: startYear },
    { type: 'end', year: endYear }
  ];

  // Cria handles retangulares para início e fim do intervalo
  g.selectAll('.handle')
    .data(handleData)
    .enter()
    .append('rect')
    .attr('class', 'handle')
    .attr('x', d => xScale(d.year) - 8)  // Centraliza handle na posição
    .attr('y', sliderHeight / 2 - 10)
    .attr('width', 16)
    .attr('height', 20)
    .attr('fill', '#fff')
    .attr('stroke', '#333')
    .attr('stroke-width', 2)
    .attr('rx', 3)                       
    .style('cursor', 'ew-resize')        
    .call(rangeDrag);                    
    
  // Círculo laranja para o ano atual
  const currentYearCircle = g.append('circle')
    .attr('class', 'current-year-circle')
    .attr('cx', xScale(currentYear))
    .attr('cy', sliderHeight / 2)
    .attr('r', 10)
    .attr('fill', 'orange')
    .attr('stroke', '#333')
    .attr('stroke-width', 2)
    .style('cursor', 'ew-resize')
    .call(currentYearDrag);              // Aplica comportamento de drag

  // Cria marcações de anos de 10 em 10 anos
  const tickYears = d3.range(minYear, maxYear + 1, 10);
  const ticks = g.selectAll('.tick')
    .data(tickYears)
    .enter();

  ticks.append('line')
    .attr('class', 'tick')
    .attr('x1', d => xScale(d))
    .attr('x2', d => xScale(d))
    .attr('y1', sliderHeight / 2 + 6)
    .attr('y2', sliderHeight / 2 + 12)
    .attr('stroke', '#666')
    .attr('stroke-width', 1);

  // Labels dos anos nas marcações
  ticks.append('text')
    .attr('class', 'tick-label')
    .attr('x', d => xScale(d))
    .attr('y', sliderHeight / 2 + 25)
    .attr('text-anchor', 'middle')
    .attr('font-size', '10px')
    .attr('fill', '#666')
    .text(d => d);

  // Display de texto mostrando ano atual e intervalo selecionado
  const yearDisplay = d3.select('#yearRangeSlider')
    .append('div')
    .style('text-align', 'center')
    .style('margin-top', '0px')
    .style('font-size', '14px')
    .style('font-weight', 'bold')
    .text(`Current Year: ${currentYear} | Range: ${startYear} - ${endYear}`);

  // Função para atualizar elementos visuais quando valores mudam
  function updateSlider() {
    // Atualiza largura e posição do intervalo azul
    range
      .attr('x', xScale(startYear))
      .attr('width', xScale(endYear) - xScale(startYear));

    // Atualiza posição do círculo do ano atual
    currentYearCircle.attr('cx', xScale(currentYear));

    // Atualiza texto de display
    yearDisplay.text(`Current Year: ${currentYear} | Range: ${startYear} - ${endYear}`);
  }

  // Função para atualizar slider quando filtro muda (obesidade vs outros dados)
  function updateSliderForFilter() {
    const { min: newMinYear, max: newMaxYear } = getYearRange();

    // Atualiza limites do slider
    minYear = newMinYear;
    maxYear = newMaxYear;

    // Ajusta valores atuais para ficarem dentro dos novos limites
    if (startYear < newMinYear) startYear = newMinYear;
    if (endYear > newMaxYear) endYear = newMaxYear;
    if (currentYear < newMinYear) currentYear = newMinYear;
    if (currentYear > newMaxYear) currentYear = newMaxYear;

    // Atualiza escala com novo domínio
    xScale.domain([newMinYear, newMaxYear]);

    // Atualiza posições dos handles
    d3.selectAll('.handle')
      .attr('x', d => xScale(d.type === 'start' ? startYear : endYear) - 8);

    // Atualiza posição do círculo
    currentYearCircle.attr('cx', xScale(currentYear));

    // Atualiza intervalo azul
    range
      .attr('x', xScale(startYear))
      .attr('width', xScale(endYear) - xScale(startYear));

    // Recria marcações de anos para novo intervalo
    const newTickYears = d3.range(newMinYear, newMaxYear + 1, 10);

    g.selectAll('.tick, .tick-label').remove();

    const ticks = g.selectAll('.tick')
      .data(newTickYears)
      .enter();

    ticks.append('line')
      .attr('class', 'tick')
      .attr('x1', d => xScale(d))
      .attr('x2', d => xScale(d))
      .attr('y1', sliderHeight / 2 + 6)
      .attr('y2', sliderHeight / 2 + 12)
      .attr('stroke', '#666')
      .attr('stroke-width', 1);

    ticks.append('text')
      .attr('class', 'tick-label')
      .attr('x', d => xScale(d))
      .attr('y', sliderHeight / 2 + 25)
      .attr('text-anchor', 'middle')
      .attr('font-size', '10px')
      .attr('fill', '#666')
      .text(d => d);

    updateSlider();
  }

  // Funções globais para acesso externo aos valores do slider
  window.getRangeSliderYearRange = function() {
    return { start: startYear, end: endYear };
  };

  window.getRangeSliderCurrentYear = function() {
    return currentYear;
  };

  // Expõe função para atualizar slider quando filtro muda
  window.updateSliderForFilter = updateSliderForFilter;
}