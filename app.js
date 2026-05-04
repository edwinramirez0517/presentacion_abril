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

// Utilidad para ordenar objetos por valor y sacar el Top N
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

        // --- VARIABLES PARA DISTRIBUCIÓN (Excluyendo Segunda) ---
        let distSemanas = {};
        let distDivisiones = {};
        let distDestinos = {};
        let totalDistUnidades = 0;
        let totalDistBultos = 0;
        let transfAEC = 0;
        let transfDS = 0;

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
            
            if (!fila['SEMANA']) return; // Ignorar filas vacías
            let semana = 'SEM-' + fila['SEMANA'];

            if (tipo !== 'SEGUNDA') {
                // --- LÓGICA DISTRIBUCIÓN ---
                totalDistUnidades += unidades;
                totalDistBultos += bultos;

                // Agrupar por Semana
                if (!distSemanas[semana]) distSemanas[semana] = { unidades: 0, bultos: 0 };
                distSemanas[semana].unidades += unidades;
                distSemanas[semana].bultos += bultos;

                // Agrupar por Compañía
                if (tipo === 'TRASFERENCIAS AEC') transfAEC += unidades;
                else if (tipo === 'TRASFERENCIAS DS') transfDS += unidades;

                // Agrupar por División
                if (!distDivisiones[division]) distDivisiones[division] = { unidades: 0 };
                distDivisiones[division].unidades += unidades;

                // Agrupar por Destino
                if (!distDestinos[destino]) distDestinos[destino] = { unidades: 0, bultos: 0 };
                distDestinos[destino].unidades += unidades;
                distDestinos[destino].bultos += bultos;

            } else {
                // --- LÓGICA SEGUNDA ---
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
        // DIBUJAR GRÁFICAS DE DISTRIBUCIÓN
        // ==========================================
        
        // 1. Gráfica Semanal
        let etiquetasSemanas = Object.keys(distSemanas).sort();
        new Chart(document.getElementById('chartDistSemanal'), {
            type: 'bar',
            data: {
                labels: etiquetasSemanas,
                datasets: [
                    { label: 'Unidades', data: etiquetasSemanas.map(s => distSemanas[s].unidades), backgroundColor: '#1a237e', borderRadius: 4, yAxisID: 'y' },
                    { label: 'Bultos', data: etiquetasSemanas.map(s => distSemanas[s].bultos), type: 'line', borderColor: '#ff6f00', pointBackgroundColor: '#ff6f00', yAxisID: 'y1' }
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

        // 3. Top 10 Divisiones (Distribución)
        let topDivs = getTopN(distDivisiones, 10);
        new Chart(document.getElementById('chartDistDivisiones'), {
            type: 'bar',
            data: {
                labels: topDivs.map(item => item[0]),
                datasets: [{ label: 'Unidades', data: topDivs.map(item => item[1].unidades), backgroundColor: '#3949ab', borderRadius: 4 }]
            },
            options: { indexAxis: 'y', plugins: { legend: { display: false } }, scales: { x: { ticks: { callback: v => (v/1000) + 'K' } } } }
        });

        // 4. Llenar Tabla de Top 10 Destinos (Distribución)
        let topDestinosDist = getTopN(distDestinos, 10);
        let tablaHtml = '';
        topDestinosDist.forEach((item, index) => {
            tablaHtml += `<tr>
                <td><strong>${index + 1}.</strong> ${item[0]}</td>
                <td class="text-right"><span class="badge-info">${item[1].unidades.toLocaleString()}</span></td>
                <td class="text-right">${item[1].bultos.toLocaleString()}</td>
            </tr>`;
        });
        document.querySelector('#tabla-destinos-dist tbody').innerHTML = tablaHtml;


        // ==========================================
        // DIBUJAR GRÁFICAS DE SEGUNDA
        // ==========================================
        
        // Top 10 Destinos de Segunda
        let topDestinosSeg = getTopN(segDestinos, 10);
        new Chart(document.getElementById('chartSegDestinos'), {
            type: 'bar',
            data: {
                labels: topDestinosSeg.map(item => item[0]),
                datasets: [{ label: 'Unidades Enviadas', data: topDestinosSeg.map(item => item[1].unidades), backgroundColor: '#e65100', borderRadius: 4 }]
            },
            options: { plugins: { legend: { display: false } } }
        });

    }
});
