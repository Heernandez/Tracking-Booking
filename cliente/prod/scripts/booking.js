function redirectToClient() {
    window.location.href = 'tracking.html';
}
function addRow() {
    const table = document.getElementById("cargoTable").getElementsByTagName('tbody')[0];
    const newRow = table.insertRow();
    
    const piecesCell = newRow.insertCell(0);
    piecesCell.innerHTML = '<input type="number" name="pieces[]" required>';

    const packingCell = newRow.insertCell(1);
    packingCell.innerHTML = '<input type="text" name="packing[]" required>';

    const weightCell = newRow.insertCell(2);
    weightCell.innerHTML = '<input type="number" name="weight[]" step="0.01" required>';

    const lengthCell = newRow.insertCell(3);
    lengthCell.innerHTML = '<input type="number" name="length[]" step="0.01" required>';

    const widthCell = newRow.insertCell(4);
    widthCell.innerHTML = '<input type="number" name="width[]" step="0.01" required>';

    const heightCell = newRow.insertCell(5);
    heightCell.innerHTML = '<input type="number" name="height[]" step="0.01" required>';

    const volumeCell = newRow.insertCell(6);
    volumeCell.innerHTML = '<input type="number" name="volume[]" step="0.01" required>';

    const referenceCell = newRow.insertCell(7);
    referenceCell.innerHTML = '<input type="text" name="reference[]" required>';

    const noteCell = newRow.insertCell(8);
    noteCell.innerHTML = '<input type="text" name="note[]" required>';

    const actionCell = newRow.insertCell(9);
    actionCell.innerHTML = '<button type="button" onclick="removeRow(this)">Remove</button> <button type="button" onclick="deleteRow(this)">Delete Cargo</button>';
}
function removeRow(button) {
    const row = button.closest('tr');
    row.remove();
    calculateTotals();
}
function deleteRow(button) {
    const row = button.closest('tr');
    row.remove();
    calculateTotals();
}
function calculateTotals() {
    let totalPieces = 0;
    let totalWeight = 0;
    let totalVolume = 0;

    const pieces = document.getElementsByName('pieces[]');
    const weight = document.getElementsByName('weight[]');
    const volume = document.getElementsByName('volume[]');

    for (let i = 0; i < pieces.length; i++) {
        totalPieces += parseInt(pieces[i].value) || 0;
        totalWeight += parseFloat(weight[i].value) || 0;
        totalVolume += parseFloat(volume[i].value) || 0;
    }

    document.getElementById('totalPieces').value = totalPieces;
    document.getElementById('totalWeight').value = totalWeight.toFixed(2);
    document.getElementById('totalVolume').value = totalVolume.toFixed(2);
}

document.getElementById('cargoTable').addEventListener('input', calculateTotals);

function handleSubmit(event) {
    // Prevenir el envío del formulario para realizar un manejo manual
    event.preventDefault();
    /* Opcional, solo si se contempla manejo de JWT con la api
    const token = sessionStorage.getItem('jwtToken');
    if (!token) {
        alert('Token not found. Please log in.');
        window.location.href = 'login.html'; // Redirigir a la página de login
        return;
    }
    */
    const token = "QWERTYUIOP";
    // Obtener datos del formulario
    const formData = new FormData(document.getElementById('bookingForm'));
    
    // Construir el objeto final excluyendo los campos no deseados
    const data = {};
    const cargoData = [];
    
    formData.forEach((value, key) => {
        // Filtrar campos que no deben ser recogidos
        if (key.endsWith('[]')) {
            // Agrupar datos de la tabla cargo
            const baseKey = key.slice(0, -2); // Eliminar '[]' del final del nombre
            if (!data[baseKey]) {
                data[baseKey] = [];
            }
            data[baseKey].push(value);
        } else {
            // Añadir otros campos del formulario
            data[key] = value;
        }
    });
    
    // Agrupar los datos de cargo en objetos
    const cargoRows = data.pieces.map((_, index) => ({
        pieces: data.pieces[index],
        packing: data.packing[index],
        weight: data.weight[index],
        length: data.length[index],
        width: data.width[index],
        height: data.height[index],
        volume: data.volume[index],
        reference: data.reference[index],
        note: data.note[index]
    }));
    // Eliminar los campos individuales que se usan solo para construir el objeto cargo
    delete data.pieces;
    delete data.packing;
    delete data.weight;
    delete data.length;
    delete data.width;
    delete data.height;
    delete data.volume;
    delete data.reference;
    delete data.note;
    // Incluir los datos de cargo en el objeto final
    const finalData = {
        ...data,
        cargo: cargoRows,
        totalPieces: parseInt(document.getElementById('totalPieces').value),
        totalWeight: parseFloat(document.getElementById('totalWeight').value),
        totalVolume: parseFloat(document.getElementById('totalVolume').value)
    };

    // Enviar datos al servidor
    fetch('https://heernandezdev.com/api/v1/booking', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(finalData)
    }).then(response => response.json())
    .then(data => {
        console.log('Success:', data);
        alert('Booking submitted successfully!');
    }).catch((error) => {
        console.error('Error:', error);
        alert('Error submitting booking.');
    });
}