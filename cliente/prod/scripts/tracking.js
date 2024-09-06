function booking () {
    window.location.href = 'booking.html';
}

function logout () {
    // Eliminar el token del sessionStorage
    sessionStorage.removeItem ('jwtToken');
    localStorage.removeItem ('jwtToken');
    // Opcionalmente, redirigir a la página de inicio de sesión o a otra página
    window.location.href = 'login.html';
}

function handleSubmit (event) {
    // Prevenir el envío del formulario para realizar un manejo manual
    event.preventDefault ();
    // Obtener el valor del input
    const trackId = document.getElementById ('trackId').value;
    // Recuperar el token guardado
    //const token = localStorage.getItem('jwtToken');
    const token = 'QWERTYUIOP';
    /* Opcional, solo si se contempla manejo de JWT con la api
    sessionStorage.getItem('jwtToken');
    if (!token) {
        alert('No se encontró el token. Por favor, inicia sesión nuevamente.');
        window.location.href = 'login.html';
    }
    */
  // Construir la URL con el parámetro trackId
    const url = `https://heernandezdev.com/api/v1/search?trackId=${encodeURIComponent (trackId)}`;
    fetch (url, {
    method: 'GET',
    headers: {
        Authorization: `Bearer ${token}`,
    },
})
    .then (response => response.json ())
    .then (data => {
        // Manejo de la respuesta
        console.log ('Respuesta del servidor:', data);
        const resultsContainer = document.getElementById ('results');
        const noResultsMessage = document.getElementById ('noResults');
        // Limpiar los resultados anteriores
        resultsContainer.innerHTML = '';
        noResultsMessage.style.display = 'none';
        if (data.length === 0) {
            noResultsMessage.style.display = 'block';
        } else {
        // Crear tabla
        const table = document.createElement ('table');
        // Crear encabezado
        const thead = document.createElement ('thead');
        const headerRow = document.createElement ('tr');
        const headers = [
        //'CODE',
        'No.',
        'Date',
        //'DATEINF',
        //'ID',
        'Note',
        'Pieces',
        //'REFERENCE',
        //'SOURCE',
        //'TYPE',
        //'USERID',
        'Weight',
        ];
        headers.forEach (headerText => {
        const th = document.createElement ('th');
        th.textContent = headerText;
        headerRow.appendChild (th);
        });
        thead.appendChild (headerRow);
        table.appendChild (thead);

        // Crear cuerpo de la tabla
        const tbody = document.createElement ('tbody');
        data.forEach (item => {
        const row = document.createElement ('tr');
        Object.values (item).forEach (value => {
            const td = document.createElement ('td');
            td.textContent = value.trim ();
            row.appendChild (td);
        });
        tbody.appendChild (row);
        });
        table.appendChild (tbody);

        // Agregar la tabla al contenedor de resultados
        resultsContainer.appendChild (table);
    }
    })
    .catch (error => {
    console.error ('Error:', error);
    });
}
