// ==========================================
// 1. NAVEGACIÓN
// ==========================================
function showSection(id) {
    document.querySelectorAll('.section').forEach(s => s.classList.remove('active'));
    document.querySelectorAll('.sidebar-nav a').forEach(a => a.classList.remove('active'));
    document.getElementById('section-' + id).classList.add('active');
    document.getElementById('nav-' + id).classList.add('active');
}

Chart.defaults.font.family = "'Inter', sans-serif";

// Función para ordenar objetos y sacar los Top N
function getTopN(obj, n) {
    return Object.entries(obj)
        .sort((a, b) => b[1].unidades - a[1].unidades)
        .slice(0, n);
}

// ==========================================
// 2. LECTURA Y PROCESAMIENTO DEL CSV
// ==========================================
Papa.parse("distribucion.csv", {
    download: true,
    header: true,
    delimiter: ";",
    skipEmptyLines: true,
    transformHeader: function(header) { return header.trim(); },
    complete: function(resultados) {
        const datos = resultados.data;

        // --- VARIABLES GENERALES ---
        let distSemanas = {};
        let transfAEC = 0;
        let transfDS = 0;
        let totalDistUnidades = 0;
        let totalDistBultos = 0;
        
        // --- VARIABLES DE CLASIFICACIÓN (Mayoreo vs Detalle) ---
        let distDivisiones = {};
        let mayoreoDestinos = {};
        let detalleDestinos = {};

        // --- VARIABLES PARA SEGUNDA ---
        let segDestinos = {};
        let totalSegUnidades = 0;
        let totalSegBultos = 0;

        // ==========================================
        // PROCESAMIENTO FILA POR FILA
        // ==========================================
        datos.forEach(fila => {
            let unidades = parseFloat(String(fila['UNIDADES.1'] || fila['UNIDADES'] || '0').replace(/,/g, '')) || 0;
            let bultos = parseFloat(String(fila['BULTOS.1'] || fila['BULTOS'] || '0').replace(/,/g, '')) || 0;
            let tipo = fila['Tipo Transferencia'];
            let division = fila['Division'] || 'Sin División';
            let destino = fila['Destino'] || 'Sin Destino';
            
            if (!fila['SEMANA']) return;
            let semana = 'SEM-' + fila['SEMANA'];

            // Regla de Negocio: AEC tiene Mayoreo y Detalle. DS solo tiene Detalle.
            // Identificamos "Mayoreo" si la palabra existe en el destino.
            let isMayoreo = destino.toUpperCase().includes('MAYOREO');

            if (tipo !== 'SEGUNDA') {
                totalDistUnidades += unidades;
                totalDistBultos += bultos;

                // Sumatoria Semanal
                if (!distSemanas[semana]) distSemanas[semana] = { unidades: 0, bultos: 0 };
                distSemanas[semana].unidades += unidades;
                distSemanas[semana].bultos += bultos;

                // Sumatoria Compañía
                if (tipo === 'TRASFERENCIAS AEC') transfAEC += unidades;
                else if (tipo === 'TRASFERENCIAS DS') transfDS += unidades;

                // Agrupar Divisiones y separar internamente por Mayoreo/Detalle
                if (!distDivisiones[division]) {
                    distDivisiones[division] = { total: 0, mayoreo: 0, detalle: 0 };
                }
                distDivisiones[division].total += unidades;
                if (isMayoreo) {
                    distDivisiones[division].mayoreo += unidades;
                } else {
                    distDivisiones[division].detalle += unidades;
                }

                // Agrupar Destinos en dos listas separadas
                if (isMayoreo) {
                    if (!mayoreoDestinos[destino]) mayoreoDestinos[destino] = { unidades: 0, bultos: 0 };
                    mayoreoDestinos[destino].unidades += unidades;
                    mayoreoDestinos[destino].bultos += bultos;
                } else {
                    if (!detalleDestinos[destino]) detalleDestinos[destino] = { unidades: 0, bultos: 0 };
                    detalleDestinos[destino].unidades += unidades;
                    detalleDestinos[destino].bultos += bultos;
                }

            } else {
                // LÓGICA EXCLUSIVA SEGUNDA (Todo es Detalle)
                totalSegUnidades += unidades;
                totalSegBultos += bultos;

                if (!segDestinos[destino]) segDestinos[destino] = { unidades: 0 };
                segDestinos[destino].unidades += unidades;
            }
        });

        // ==========================================
        // ACTUALIZAR KPIs EN PANTALLA
        // ==========================================
        document.getElementById('kpi-dist-unidades').innerText = totalDistUnidades.toLocaleString();
        document.getElementById('kpi-dist-bultos').innerText = totalDistBultos.toLocaleString();
        document.getElementById('kpi-seg-unidades').innerText = totalSegUnidades.toLocaleString();
        document.getElementById('kpi-seg-bultos').innerText = totalSegBultos.toLocaleString();

        // ==========================================
        // DIBUJAR GRÁFICAS Y TABLAS
        // ==========================================
        
        // 1. Gráfica Semanal
        let etiquetasSemanas = Object.keys(distSemanas).sort();
        new Chart(document.getElementById('chartDistSemanal'), {
            type: 'bar',
            data: {
                labels: etiquetasSemanas,
                datasets: [
                    { label: 'Unidades', data: etiquetasSemanas.map(s => distSemanas[s].unidades), backgroundColor: '#1a237e', borderRadius: 4, yAxisID: 'y' },
                    { label: 'Bultos', data: etiquetasSemanas.map(s => distSemanas[s].bultos), type: 'line', borderColor: '#ff6f00', pointBackgroundColor: '#ff6f00', tension: 0.2, yAxisID: 'y1' }
                ]
            },
            options: { scales: { y: { ticks: { callback: v => (v/1000) + 'K' } }, y1: { position: 'right', grid: { drawOnChartArea: false } } } }
        });

        // 2. Dona de Transferencias
        new Chart(document.getElementById('chartDistTransf'), {
            type: 'doughnut',
            data: {
                labels: ['AEC', 'DS'],
                datasets: [{ data: [transfAEC, transfDS], backgroundColor: ['#1a237e', '#e65100'] }]
            }
        });

        // 3. Gráfica de Barras Apiladas (Divisiones: Mayoreo vs Detalle)
        let topDivs = Object.entries(distDivisiones).sort((a,b) => b[1].total - a[1].total).slice(0, 10);
        new Chart(document.getElementById('chartDistDivisiones'), {
            type: 'bar',
            data: {
                labels: topDivs.map(item => item[0]),
                datasets: [
                    { label: 'Detalle', data: topDivs.map(item => item[1].detalle), backgroundColor: '#3949ab', borderRadius: 4 },
                    { label: 'Mayoreo (Solo AEC)', data: topDivs.map(item => item[1].mayoreo), backgroundColor: '#ff6f00', borderRadius: 4 }
                ]
            },
            options: { 
                indexAxis: 'y', 
                plugins: { legend: { position: 'bottom' } }, 
                scales: { 
                    x: { stacked: true, ticks: { callback: v => (v/1000) + 'K' } },
                    y: { stacked: true }
                } 
            }
        });

        // 4. Llenar Tabla de Top Tiendas - MAYOREO
        let topMayoreo = getTopN(mayoreoDestinos, 10);
        let htmlMayoreo = '';
        topMayoreo.forEach((item, index) => {
            htmlMayoreo += `<tr>
                <td><strong>${index + 1}.</strong> ${item[0]}</td>
                <td class="text-right"><span class="badge-warning">${item[1].unidades.toLocaleString()}</span></td>
                <td class="text-right">${item[1].bultos.toLocaleString()}</td>
            </tr>`;
        });
        document.querySelector('#tabla-mayoreo tbody').innerHTML = htmlMayoreo;

        // 5. Llenar Tabla de Top Tiendas - DETALLE
        let topDetalle = getTopN(detalleDestinos, 10);
        let htmlDetalle = '';
        topDetalle.forEach((item, index) => {
            htmlDetalle += `<tr>
                <td><strong>${index + 1}.</strong> ${item[0]}</td>
                <td class="text-right"><span class="badge-info">${item[1].unidades.toLocaleString()}</span></td>
                <td class="text-right">${item[1].bultos.toLocaleString()}</td>
            </tr>`;
        });
        document.querySelector('#tabla-detalle tbody').innerHTML = htmlDetalle;

        // ==========================================
        // GRÁFICA DE SEGUNDA (Separada)
        // ==========================================
        let topDestinosSeg = getTopN(segDestinos, 15);
        new Chart(document.getElementById('chartSegDestinos'), {
            type: 'bar',
            data: {
                labels: topDestinosSeg.map(item => item[0]),
                datasets: [{ label: 'Unidades Enviadas (Segunda)', data: topDestinosSeg.map(item => item[1].unidades), backgroundColor: '#e65100', borderRadius: 4 }]
            },
            options: { plugins: { legend: { display: false } }, scales: { y: { ticks: { callback: v => (v/1000) + 'K' } } } }
        });

    }
});
