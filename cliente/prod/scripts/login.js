// Durante el login, después de obtener el token
function handleLogin () {
    // Prevenir el envío del formulario para realizar un manejo manual
    event.preventDefault ();
    // Obtener los valores de los campos
    const username = document.getElementById ('username').value;
    const password = document.getElementById ('password').value;
    const credentials = {
    username: username,
    password: password,
};

fetch ('https://heernandezdev.com/api/v1/login', {
    method: 'POST',
    headers: {
    'Content-Type': 'application/json',
    },
    body: JSON.stringify (credentials),
})
    .then (response => response.json ())
    .then (data => {
    if (data.token) {
        // Guarda el token en localStorage o sessionStorage
        //localStorage.setItem('jwtToken', data.token);
        // O si prefieres usar sessionStorage:
        sessionStorage.setItem ('jwtToken', data.token);
        console.log ('Token guardado:', data.token);
        window.location.href = 'tracking.html';
    } else {
        throw new Error ('Error en la autenticación');
    }
    })
    .catch (error => {
    console.error ('Error durante la autenticación:', error);
    });
}
