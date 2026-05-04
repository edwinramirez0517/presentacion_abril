// ==========================================
// 1. FUNCIONES DE NAVEGACIÓN
// ==========================================
function showSection(id) {
    document.querySelectorAll('.section').forEach(s => s.classList.remove('active'));
    document.querySelectorAll('.sidebar-nav a').forEach(a => a.classList.remove('active'));
    document.getElementById('section-' + id).classList.add('active');
    const navEl = document.getElementById('nav-' + id);
    if (navEl) navEl.classList.add('active');
    window.scrollTo(0, 0);
    document.getElementById('sidebar').classList.remove('open');
}

function toggleSidebar() {
    document.getElementById('sidebar').classList.toggle('open');
}

// ==========================================
// 2. CONFIGURACIÓN DE GRÁFICAS
// ==========================================
Chart.defaults.font.family = "'Inter', sans-serif";
Chart.defaults.color = '#5f6368';

// ==========================================
// 3. LECTURA DE CSV Y CREACIÓN DE GRÁFICAS
// ==========================================
Papa.parse("distribucion.csv", {
    download: true,
    header: true,
    delimiter: ";", // REGLA 1: Tu Excel usa punto y coma
    skipEmptyLines: true,
    transformHeader: function(header) {
        return header.trim(); // REGLA 2: Borra los espacios invisibles de los títulos
    },
    complete: function(resultados) {
        const datosCSV = resultados.data;

        // Variables para guardar las sumas
        let sumasPorSemana = {};
        let transfAEC = 0;
        let transfDS = 0;

        // Limpieza y sumatoria fila por fila
        datosCSV.forEach(fila => {
            // Buscamos 'UNIDADES.1' y 'BULTOS.1' ya limpios de espacios
            let unidadesTexto = String(fila['UNIDADES.1'] || fila['UNIDADES'] || '0').replace(/,/g, '');
            let bultosTexto = String(fila['BULTOS.1'] || fila['BULTOS'] || '0').replace(/,/g, '');
            
            let unidades = parseFloat(unidadesTexto) || 0;
            let bultos = parseFloat(bultosTexto) || 0;

            let tipo = fila['Tipo Transferencia'];
            
            // Validamos que la fila realmente tenga una semana válida
            if (fila['SEMANA']) {
                let semana = 'SEM-' + fila['SEMANA']; 

                // Filtramos todo lo que NO sea "SEGUNDA"
                if (tipo !== 'SEGUNDA') {
                    
                    // Agrupamos por Semana
                    if (!sumasPorSemana[semana]) {
                        sumasPorSemana[semana] = { unidades: 0, bultos: 0 };
                    }
                    sumasPorSemana[semana].unidades += unidades;
                    sumasPorSemana[semana].bultos += bultos;

                    // Agrupamos por Compañía
                    if (tipo === 'TRASFERENCIAS AEC') {
                        transfAEC += unidades;
                    } else if (tipo === 'TRASFERENCIAS DS') {
                        transfDS += unidades;
                    }
                }
            }
        });

        // Preparamos los datos para la gráfica de Barras (Semanal)
        let etiquetasSemanas = [];
        let arrayUnidades = [];
        let arrayBultos = [];

        Object.keys(sumasPorSemana).sort().forEach(sem => {
            etiquetasSemanas.push(sem);
            arrayUnidades.push(sumasPorSemana[sem].unidades);
            arrayBultos.push(sumasPorSemana[sem].bultos);
        });

        // PINTAMOS LA GRÁFICA SEMANAL
        new Chart(document.getElementById('chartDistSemanal'), {
            type: 'bar',
            data: {
                labels: etiquetasSemanas,
                datasets: [
                    {
                        label: 'Unidades',
                        data: arrayUnidades,
                        backgroundColor: '#1a237e',
                        borderRadius: 6,
                        yAxisID: 'y'
                    },
                    {
                        label: 'Bultos',
                        data: arrayBultos,
                        type: 'line',
                        borderColor: '#ff6f00',
                        backgroundColor: 'transparent',
                        pointBackgroundColor: '#ff6f00',
                        pointRadius: 5,
                        tension: 0.3,
                        yAxisID: 'y1'
                    }
                ]
            },
            options: {
                responsive: true,
                scales: {
                    y: { beginAtZero: true, position: 'left', ticks: { callback: v => (v/1000) + 'K' } },
                    y1: { beginAtZero: true, position: 'right', grid: { drawOnChartArea: false } }
                }
            }
        });

        // PINTAMOS LA GRÁFICA DE DONA
        new Chart(document.getElementById('chartDistTransf'), {
            type: 'doughnut',
            data: {
                labels: ['AEC (' + transfAEC.toLocaleString() + ' uds)', 'DS (' + transfDS.toLocaleString() + ' uds)'],
                datasets: [{
                    data: [transfAEC, transfDS],
                    backgroundColor: ['#1a237e', '#e65100'],
                    borderWidth: 3,
                    borderColor: '#fff'
                }]
            },
            options: {
                responsive: true,
                cutout: '60%',
                plugins: { legend: { position: 'bottom' } }
            }
        });
    },
    error: function(err) {
        console.error("No se pudo cargar el archivo distribucion.csv", err);
    }
});
