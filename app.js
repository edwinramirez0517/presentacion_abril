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

// Funciones Auxiliares
function getTopN(obj, n, property = 'unidades') {
    return Object.entries(obj)
        .sort((a, b) => b[1][property] - a[1][property])
        .slice(0, n);
}

function formatCurrency(val) {
    return 'L ' + val.toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2});
}

function cleanNumber(str) {
    return parseFloat(String(str || '0').replace(/L/g, '').replace(/,/g, '').trim()) || 0;
}

// ==========================================
// 2. MÓDULO: DISTRIBUCIÓN & SEGUNDA
// ==========================================
Papa.parse("distribucion.csv", {
    download: true,
    header: true,
    delimiter: ";",
    skipEmptyLines: true,
    transformHeader: function(header) { return header.trim(); },
    complete: function(resultados) {
        const datos = resultados.data;

        let distSemanas = {}, distDivisiones = {}, mayoreoDestinos = {}, detalleDestinos = {}, segDestinos = {};
        let transfAEC = 0, transfDS = 0, totalDistUnidades = 0, totalDistBultos = 0, totalSegUnidades = 0, totalSegBultos = 0;

        datos.forEach(fila => {
            let unidades = cleanNumber(fila['UNIDADES.1'] || fila['UNIDADES']);
            let bultos = cleanNumber(fila['BULTOS.1'] || fila['BULTOS']);
            let tipo = fila['Tipo Transferencia'];
            let division = fila['Division'] || 'Sin División';
            let destino = fila['Destino'] || 'Sin Destino';
            
            if (!fila['SEMANA']) return;
            let semana = 'SEM-' + fila['SEMANA'];
            let isMayoreo = destino.toUpperCase().includes('MAYOREO');

            if (tipo !== 'SEGUNDA') {
                totalDistUnidades += unidades; totalDistBultos += bultos;

                if (!distSemanas[semana]) distSemanas[semana] = { unidades: 0, bultos: 0 };
                distSemanas[semana].unidades += unidades; distSemanas[semana].bultos += bultos;

                if (tipo === 'TRASFERENCIAS AEC') transfAEC += unidades;
                else if (tipo === 'TRASFERENCIAS DS') transfDS += unidades;

                if (!distDivisiones[division]) distDivisiones[division] = { total: 0, mayoreo: 0, detalle: 0 };
                distDivisiones[division].total += unidades;
                if (isMayoreo) distDivisiones[division].mayoreo += unidades;
                else distDivisiones[division].detalle += unidades;

                if (isMayoreo) {
                    if (!mayoreoDestinos[destino]) mayoreoDestinos[destino] = { unidades: 0, bultos: 0 };
                    mayoreoDestinos[destino].unidades += unidades; mayoreoDestinos[destino].bultos += bultos;
                } else {
                    if (!detalleDestinos[destino]) detalleDestinos[destino] = { unidades: 0, bultos: 0 };
                    detalleDestinos[destino].unidades += unidades; detalleDestinos[destino].bultos += bultos;
                }
            } else {
                totalSegUnidades += unidades; totalSegBultos += bultos;
                if (!segDestinos[destino]) segDestinos[destino] = { unidades: 0 };
                segDestinos[destino].unidades += unidades;
            }
        });

        // Update UI - KPIs
        document.getElementById('kpi-dist-unidades').innerText = totalDistUnidades.toLocaleString();
        document.getElementById('kpi-dist-bultos').innerText = totalDistBultos.toLocaleString();
        document.getElementById('kpi-seg-unidades').innerText = totalSegUnidades.toLocaleString();
        document.getElementById('kpi-seg-bultos').innerText = totalSegBultos.toLocaleString();

        // Gráficas Distribución
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

        new Chart(document.getElementById('chartDistTransf'), {
            type: 'doughnut',
            data: { labels: ['AEC', 'DS'], datasets: [{ data: [transfAEC, transfDS], backgroundColor: ['#1a237e', '#e65100'] }] }
        });

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
            options: { indexAxis: 'y', scales: { x: { stacked: true }, y: { stacked: true } } }
        });

        // Tablas
        let htmlMayoreo = '';
        getTopN(mayoreoDestinos, 10).forEach((item, i) => {
            htmlMayoreo += `<tr><td><strong>${i + 1}.</strong> ${item[0]}</td><td class="text-right"><span class="badge-warning">${item[1].unidades.toLocaleString()}</span></td><td class="text-right">${item[1].bultos.toLocaleString()}</td></tr>`;
        });
        document.querySelector('#tabla-mayoreo tbody').innerHTML = htmlMayoreo;

        let htmlDetalle = '';
        getTopN(detalleDestinos, 10).forEach((item, i) => {
            htmlDetalle += `<tr><td><strong>${i + 1}.</strong> ${item[0]}</td><td class="text-right"><span class="badge-info">${item[1].unidades.toLocaleString()}</span></td><td class="text-right">${item[1].bultos.toLocaleString()}</td></tr>`;
        });
        document.querySelector('#tabla-detalle tbody').innerHTML = htmlDetalle;

        // Gráfica Segunda
        let topDestinosSeg = getTopN(segDestinos, 15);
        new Chart(document.getElementById('chartSegDestinos'), {
            type: 'bar',
            data: { labels: topDestinosSeg.map(item => item[0]), datasets: [{ label: 'Unidades', data: topDestinosSeg.map(item => item[1].unidades), backgroundColor: '#e65100', borderRadius: 4 }] },
            options: { plugins: { legend: { display: false } } }
        });
    }
});


// ==========================================
// 3. MÓDULO: DEVOLUCIONES (AEC & DS)
// ==========================================
let devData = {
    semanas: {},
    motivos: { 'FALTANTE': 0, 'SOBRANTE': 0 },
    aec_tiendas: {}, ds_tiendas: {},
    aec_total_cost: 0, aec_total_und: 0, ds_total_cost: 0, ds_total_und: 0
};

// Función maestra para procesar archivos de Devolución
function processDevoluciones(fileUrl, isAEC) {
    return new Promise((resolve, reject) => {
        Papa.parse(fileUrl, {
            download: true, header: true, delimiter: ";", skipEmptyLines: true,
            transformHeader: function(header) { return header.trim(); },
            complete: function(resultados) {
                resultados.data.forEach(fila => {
                    let costo = cleanNumber(fila['COSTO TOTAL']);
                    let unidades = cleanNumber(fila['UNIDADES']);
                    let bultos = cleanNumber(fila['BULTOS']);
                    let origen = fila['ORIGEN'] || 'Desconocido';
                    let motivo = (fila['TIPO DE ERROR'] || '').toUpperCase();
                    let semanaRaw = fila['SEMANA RECIBIDO'] || '';
                    
                    let semana = semanaRaw.includes('SEM') ? semanaRaw : 'SEM-' + semanaRaw;
                    if (!semanaRaw) return;

                    // Acumuladores Globales
                    if (isAEC) {
                        devData.aec_total_cost += costo; devData.aec_total_und += unidades;
                        if (!devData.aec_tiendas[origen]) devData.aec_tiendas[origen] = { unidades: 0, costo: 0 };
                        devData.aec_tiendas[origen].unidades += unidades; devData.aec_tiendas[origen].costo += costo;
                    } else {
                        devData.ds_total_cost += costo; devData.ds_total_und += unidades;
                        if (!devData.ds_tiendas[origen]) devData.ds_tiendas[origen] = { unidades: 0, costo: 0 };
                        devData.ds_tiendas[origen].unidades += unidades; devData.ds_tiendas[origen].costo += costo;
                    }

                    // Acumulador Semanal
                    if (!devData.semanas[semana]) devData.semanas[semana] = { aec: 0, ds: 0 };
                    if (isAEC) devData.semanas[semana].aec += unidades;
                    else devData.semanas[semana].ds += unidades;

                    // Acumulador Motivos (Ignorando vacíos para dar mejor visibilidad a gerencia)
                    if (motivo.includes('FALTANTE')) devData.motivos['FALTANTE'] += unidades;
                    if (motivo.includes('SOBRANTE')) devData.motivos['SOBRANTE'] += unidades;
                });
                resolve();
            },
            error: function(err) { resolve(); } // Resolvemos igual para no bloquear la otra carga
        });
    });
}

// Ejecutar lectura de ambos archivos y luego renderizar
Promise.all([
    processDevoluciones("devoluciones_aec.csv", true),
    processDevoluciones("devoluciones_ds.csv", false)
]).then(() => {
    
    // 1. KPIs
    document.getElementById('kpi-dev-aec-costo').innerText = formatCurrency(devData.aec_total_cost);
    document.getElementById('kpi-dev-aec-unidades').innerText = devData.aec_total_und.toLocaleString();
    document.getElementById('kpi-dev-ds-costo').innerText = formatCurrency(devData.ds_total_cost);
    document.getElementById('kpi-dev-ds-unidades').innerText = devData.ds_total_und.toLocaleString();

    // 2. Gráfica Semanal Comparativa
    let etiquetasSem = Object.keys(devData.semanas).sort();
    new Chart(document.getElementById('chartDevSemanal'), {
        type: 'line',
        data: {
            labels: etiquetasSem,
            datasets: [
                { label: 'Unidades AEC', data: etiquetasSem.map(s => devData.semanas[s].aec), borderColor: '#1a237e', backgroundColor: 'rgba(26, 35, 126, 0.1)', fill: true, tension: 0.3 },
                { label: 'Unidades DS', data: etiquetasSem.map(s => devData.semanas[s].ds), borderColor: '#e65100', backgroundColor: 'rgba(230, 81, 0, 0.1)', fill: true, tension: 0.3 }
            ]
        }
    });

    // 3. Gráfica Motivos (Dona)
    new Chart(document.getElementById('chartDevMotivos'), {
        type: 'doughnut',
        data: {
            labels: ['Faltante', 'Sobrante'],
            datasets: [{ data: [devData.motivos['FALTANTE'], devData.motivos['SOBRANTE']], backgroundColor: ['#c62828', '#ff6f00'] }]
        }
    });

    // 4. Tablas Top Tiendas (Ordenadas por Costo, que es lo que duele)
    let htmlDevAEC = '';
    getTopN(devData.aec_tiendas, 10, 'costo').forEach((item, i) => {
        htmlDevAEC += `<tr><td><strong>${i + 1}.</strong> ${item[0]}</td><td class="text-right">${item[1].unidades.toLocaleString()}</td><td class="text-right"><span class="badge-danger">${formatCurrency(item[1].costo)}</span></td></tr>`;
    });
    document.querySelector('#tabla-dev-aec tbody').innerHTML = htmlDevAEC;

    let htmlDevDS = '';
    getTopN(devData.ds_tiendas, 10, 'costo').forEach((item, i) => {
        htmlDevDS += `<tr><td><strong>${i + 1}.</strong> ${item[0]}</td><td class="text-right">${item[1].unidades.toLocaleString()}</td><td class="text-right"><span class="badge-warning">${formatCurrency(item[1].costo)}</span></td></tr>`;
    });
    document.querySelector('#tabla-dev-ds tbody').innerHTML = htmlDevDS;
});
