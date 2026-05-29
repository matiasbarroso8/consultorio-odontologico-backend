const express = require('express');
const fs = require('fs');
const path = require('path');
const app = express();
const PORT = 3000;

// Configuración para entender JSON y servir la carpeta pública
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

const PATH_TURNOS = path.join(__dirname, 'turnos.json');

// Función auxiliar para leer los turnos del JSON
const leerTurnos = () => {
    const data = fs.readFileSync(PATH_TURNOS, 'utf-8');
    return JSON.parse(data);
};

// Función auxiliar para guardar los turnos en el JSON
const guardarTurnos = (turnos) => {
    fs.writeFileSync(PATH_TURNOS, JSON.stringify(turnos, null, 2), 'utf-8');
};

// 1. SIMULACIÓN DE LAMBDA: Obtener turnos disponibles de una doctora
app.get('/api/turnos', (req, res) => {
    const { fecha, doctora } = req.query;
    
    if (!fecha || !doctora) {
        return res.status(400).json({ error: "Faltan parámetros: fecha y doctora" });
    }

    const todosLosTurnos = leerTurnos();
    
    // Filtramos los turnos para esa fecha y esa doctora que estén Disponibles
    const disponibles = todosLosTurnos.filter(t => 
        t.fecha === fecha && 
        t.doctora === doctora && 
        t.estado === "Disponible"
    );

    res.json(disponibles);
});

// 2. SIMULACIÓN DE LAMBDA: Reservar un turno (CON VALIDACIONES DE SEGURIDAD)
app.post('/api/reservar', (req, res) => {
    let { fecha, hora, doctora, nombre, dni, telefono } = req.body;

    // A. Validar que no vengan campos vacíos o con puros espacios en blanco
    if (!fecha || !hora || !doctora || !nombre?.trim() || !dni?.trim() || !telefono?.trim()) {
        return res.status(400).json({ error: "Todos los campos son obligatorios y no pueden estar vacíos." });
    }

    // Limpiamos los espacios extras en los bordes
    nombre = nombre.trim();
    dni = dni.trim();
    telefono = telefono.trim();

    // B. Validar que el DNI contenga SOLO números
    const soloNumeros = /^\d+$/;
    if (!soloNumeros.test(dni)) {
        return res.status(400).json({ error: "El DNI es inválido. Ingrese solo números, sin puntos, espacios ni guiones." });
    }

    // C. Validar longitud lógica del DNI (mínimo 7 dígitos, máximo 9)
    if (dni.length < 7 || dni.length > 9) {
        return res.status(400).json({ error: "El DNI debe tener entre 7 y 9 dígitos." });
    }

    const todosLosTurnos = leerTurnos();

    // Buscamos el turno específico
    const index = todosLosTurnos.findIndex(t => 
        t.fecha === fecha && 
        t.hora === hora && 
        t.doctora === doctora
    );

    if (index === -1) {
        return res.status(404).json({ error: "El horario solicitado no existe en la agenda." });
    }

    if (todosLosTurnos[index].estado === "Reservado") {
        return res.status(400).json({ error: "Este turno ya fue reservado por otro paciente." });
    }

    // Impactamos la reserva de forma segura si pasó todos los filtros
    todosLosTurnos[index].estado = "Reservado";
    todosLosTurnos[index].paciente = { nombre, dni, telefono };

    guardarTurnos(todosLosTurnos);

    res.json({ mensaje: "¡Turno reservado con éxito!", turno: todosLosTurnos[index] });
});

// 3. SIMULACIÓN DE LAMBDA: Obtener la agenda completa de una doctora (PÚBLICO/PRIVADO)
app.get('/api/admin/agenda', (req, res) => {
    const { fecha, doctora } = req.query;
    
    if (!fecha || !doctora) {
        return res.status(400).json({ error: "Faltan parámetros: fecha y doctora" });
    }

    const todosLosTurnos = leerTurnos();
    
    // Filtramos la agenda completa de ese día para esa doctora (libres y ocupados)
    const agendaDia = todosLosTurnos.filter(t => 
        t.fecha === fecha && 
        t.doctora === doctora
    );

    // Ordenamos por hora para que a la doctora le aparezca cronológico
    agendaDia.sort((a, b) => a.hora.localeCompare(b.hora));

    res.json(agendaDia);
});

app.listen(PORT, () => {
    console.log(`Servidor del consultorio corriendo localmente en http://localhost:${PORT}`);
});