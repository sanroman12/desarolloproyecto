const express = require('express');
const bodyParser = require('body-parser');
const fs = require('fs');
const path = require('path');
const session = require('express-session');

const app = express();
const PORT = 3000;

const sql = require('mssql'); // Importar mssql
require('dotenv').config(); // Cargar variables de entorno

// Configuración de la conexión a SQL Server
const dbConfig = {
    server: process.env.DB_SERVER, // Servidor sin el "\SQLEXPRESS"
    database: process.env.DB_NAME,
    port: parseInt(process.env.DB_PORT, 10), // Especifica el puerto
    options: {
      encrypt: true,
      trustServerCertificate: true,
    },
  };
  

// Conexión a SQL Server
sql.connect(dbConfig)
  .then(() => console.log('Conexión a SQL Server exitosa'))
  .catch(err => console.error('Error al conectar a SQL Server:', err));

// Middleware
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.use(express.static('public'));
app.use(express.static(path.join(__dirname, 'public')));

// Configuración de sesiones
app.use(
    session({
        secret: 'clave-secreta', // Cambia esto por una clave secreta más segura
        resave: false,
        saveUninitialized: true,
        cookie: { secure: false }, // Configura `secure: true` si usas HTTPS
    })
);

// Ruta para manejar el registro de usuarios
app.post('/api/register', (req, res) => {
    const { email, password, day, month, year } = req.body;

    const newUser = {
        email,
        password,
        birthdate: `${day}-${month}-${year}`,
    };

    const filePath = path.join(__dirname, 'users.json');
    let users = [];
    if (fs.existsSync(filePath)) {
        const fileData = fs.readFileSync(filePath);
        users = JSON.parse(fileData);
    }

    const emailExists = users.some(user => user.email === email);
    if (emailExists) {
        return res.status(400).send('El correo ya está registrado. Intenta con otro.');
    }

    users.push(newUser);
    fs.writeFileSync(filePath, JSON.stringify(users, null, 2));

    console.log('Usuario registrado:', newUser);
    res.send('Cuenta creada exitosamente. Puedes iniciar sesión ahora.');
});

// Ruta para manejar el inicio de sesión
app.post('/api/login', (req, res) => {
    const { email, password } = req.body;

    const filePath = path.join(__dirname, 'users.json');
    if (!fs.existsSync(filePath)) {
        return res.status(400).send('No hay usuarios registrados.');
    }

    const fileData = fs.readFileSync(filePath);
    const users = JSON.parse(fileData);

    // Validar el email y la contraseña
    const user = users.find(user => user.email === email && user.password === password);
    if (!user) {
        return res.status(400).send('Correo o contraseña incorrectos.');
    }

    // Guardar la información del usuario en la sesión
    req.session.user = {
        email: user.email,
        birthdate: user.birthdate,
    };

    console.log('Usuario autenticado:', req.session.user);
    res.redirect('/home.html'); // Redirigir al archivo `home.html`
});

// Ruta para verificar si el usuario está autenticado
app.get('/api/session', (req, res) => {
    if (req.session.user) {
        res.json({ loggedIn: true, user: req.session.user });
    } else {
        res.json({ loggedIn: false });
    }
});

// Ruta para cerrar sesión
app.post('/api/logout', (req, res) => {
    req.session.destroy(err => {
        if (err) {
            return res.status(500).send('Error al cerrar la sesión.');
        }
        res.redirect('/ingreso.html'); // Redirigir al inicio de sesión
    });
});

// Ruta para guardar un examen
app.post('/api/save-exam', (req, res) => {
    const examData = req.body;

    if (!examData.title || !Array.isArray(examData.questions) || examData.questions.length === 0) {
        return res.status(400).send('Datos inválidos para el examen.');
    }

    // Ruta del archivo JSON del usuario actual
    const userFilePath = path.join(__dirname, 'data', `${req.session.user.email}.json`);

    fs.readFile(userFilePath, 'utf8', (err, data) => {
        let userData = { exams: [] };
        if (!err && data) {
            userData = JSON.parse(data);
        }

        // Agregar ID único al examen
        examData.id = Math.floor(100000 + Math.random() * 900000);
        userData.exams.push(examData);

        fs.writeFile(userFilePath, JSON.stringify(userData, null, 2), (err) => {
            if (err) {
                console.error('Error al guardar el examen:', err);
                return res.status(500).send('Error al guardar el examen.');
            }
            res.status(200).send('Examen guardado con éxito.');
        });
    });
});


app.get('/api/join-exam/:id', (req, res) => {
    const examId = parseInt(req.params.id, 10);

    if (isNaN(examId)) {
        return res.status(400).send('El ID del examen debe ser un número válido.');
    }

    const exams = [];
    const usersDir = path.join(__dirname, 'data/');

    // Buscar en todos los usuarios los exámenes con el ID solicitado
    fs.readdir(usersDir, (err, files) => {
        if (err) {
            console.error('Error al leer la carpeta de usuarios:', err);
            return res.status(500).send('Hubo un problema al buscar el examen.');
        }

        files.forEach((file) => {
            const userFilePath = path.join(usersDir, file);

            const userData = JSON.parse(fs.readFileSync(userFilePath, 'utf8'));
            const foundExam = userData.exams.find((exam) => exam.id === examId);

            if (foundExam) {
                exams.push(foundExam);
            }
        });

        if (exams.length > 0) {
            res.status(200).send('Examen encontrado.');
        } else {
            res.status(404).send('Examen no encontrado.');
        }
    });
});

// Ruta para obtener los exámenes del usuario autenticado
app.get('/api/get-exams', (req, res) => {
    if (!req.session.user) {
        return res.status(401).json({ loggedIn: false });
    }

    const userFilePath = path.join(__dirname, 'data', `${req.session.user.email}.json`);
    fs.readFile(userFilePath, 'utf8', (err, data) => {
        if (err || !data) {
            return res.json({ loggedIn: true, exams: [] });
        }

        const userData = JSON.parse(data);
        res.json({ loggedIn: true, exams: userData.exams || [] });
    });
});

// Ruta base
app.get('/', (req, res) => {
    res.redirect('/crear_examen.html');
});

// Iniciar el servidor


app.get('/api/get-exam/:id', (req, res) => {
    const examId = parseInt(req.params.id, 10); // Convertir ID a número
    const examsFilePath = path.join(__dirname, 'data', 'exams.json');

    fs.readFile(examsFilePath, 'utf8', (err, data) => {
        if (err) {
            console.error('Error al leer los exámenes:', err);
            return res.status(500).send('Error al cargar el examen.');
        }

        try {
            const exams = JSON.parse(data); // Parsear el JSON
            const exam = exams.find((exam) => exam.id === examId);

            if (!exam) {
                return res.status(404).send('Examen no encontrado.');
            }

            res.json({
                id: exam.id,
                title: exam.title,
                questions: exam.questions,
            });
        } catch (parseError) {
            console.error('Error al parsear el JSON:', parseError);
            return res.status(500).send('Error interno del servidor.');
        }
    });
});


// Ruta para obtener las respuestas de un examen y calcular las calificaciones
app.get('/api/exam-responses/:id', (req, res) => {
    const examId = parseInt(req.params.id, 10);

    if (isNaN(examId)) {
        return res.status(400).send('El ID del examen debe ser un número válido.');
    }

    const usersDir = path.join(__dirname, 'data/');
    let foundExam = null;
    let responses = [];

    fs.readdir(usersDir, (err, files) => {
        if (err) {
            console.error('Error al leer la carpeta de usuarios:', err);
            return res.status(500).send('Hubo un problema al buscar el examen.');
        }

        // Buscar el examen y sus respuestas
        files.forEach((file) => {
            const userFilePath = path.join(usersDir, file);

            try {
                const userData = JSON.parse(fs.readFileSync(userFilePath, 'utf8'));

                if (userData && Array.isArray(userData.exams)) {
                    const exam = userData.exams.find((e) => e.id === examId);
                    if (exam && !foundExam) {
                        foundExam = exam;
                    }

                    // Verificar si este usuario tiene respuestas para este examen
                    if (userData.responses && Array.isArray(userData.responses)) {
                        const examResponses = userData.responses.filter((r) => r.examId === examId);

                        examResponses.forEach((response) => {
                            // Calcular la puntuación del usuario
                            let score = 0;
                            response.answers.forEach((answer) => {
                                const question = foundExam.questions.find((q) => q.title === answer.questionTitle);
                                if (question) {
                                    const correctAnswers = question.answers.filter((a) => a.isCorrect).map((a) => a.text);

                                    // Comparar respuestas del usuario con respuestas correctas
                                    if (question.isMultipleChoice) {
                                        const isCorrect = answer.selectedAnswers.every((a) => correctAnswers.includes(a)) &&
                                            correctAnswers.length === answer.selectedAnswers.length;
                                        if (isCorrect) score += question.score;
                                    } else {
                                        if (answer.selectedAnswer === correctAnswers[0]) score += question.score;
                                    }
                                }
                            });

                            responses.push({
                                name: response.name,
                                score,
                            });
                        });
                    }
                }
            } catch (parseError) {
                console.error(`Error al analizar el archivo ${file}:`, parseError);
            }
        });

        if (!foundExam) {
            return res.status(404).send('Examen no encontrado.');
        }

        // Responder con las calificaciones y el puntaje total
        const totalScore = foundExam.questions.reduce((sum, q) => sum + q.score, 0);
        res.json({
            title: foundExam.title,
            totalScore,
            responses,
        });
    });
});

app.post('/api/save-response', (req, res) => {
    const { examId, name, answers } = req.body;

    if (!examId || !name || !Array.isArray(answers)) {
        return res.status(400).send('Datos inválidos para guardar las respuestas.');
    }

    const responsesFilePath = path.join(__dirname, 'data', 'respuestas.json');

    fs.readFile(responsesFilePath, 'utf8', (err, data) => {
        let responses = {};

        if (!err && data) {
            try {
                responses = JSON.parse(data);
            } catch (parseErr) {
                console.error('Error al parsear respuestas.json:', parseErr);
                return res.status(500).send('Error al procesar respuestas.');
            }
        }

        if (!responses[examId]) {
            responses[examId] = [];
        }

        responses[examId].push({
            name,
            answers,
        });

        fs.writeFile(responsesFilePath, JSON.stringify(responses, null, 2), (writeErr) => {
            if (writeErr) {
                console.error('Error al guardar respuestas:', writeErr);
                return res.status(500).send('Error al guardar respuestas.');
            }

            res.status(200).send('Respuestas guardadas con éxito.');
        });
    });
});



app.get('/api/exam-responses/:id', (req, res) => {
    const examId = req.params.id;
    const responsesFilePath = path.join(__dirname, 'data', 'respuestas.json');
    const examsFilePath = path.join(__dirname, 'data', `${req.session.user.email}.json`);

    // Leer respuestas
    fs.readFile(responsesFilePath, 'utf8', (err, responsesData) => {
        if (err) {
            console.error('Error al leer respuestas.json:', err);
            return res.status(500).send('Error al cargar las respuestas.');
        }

        let responses;
        try {
            responses = JSON.parse(responsesData);
        } catch (parseErr) {
            console.error('Error al parsear respuestas.json:', parseErr);
            return res.status(500).send('Error al procesar las respuestas.');
        }

        // Leer exámenes del usuario
        fs.readFile(examsFilePath, 'utf8', (err, examsData) => {
            if (err) {
                console.error('Error al leer exámenes del usuario:', err);
                return res.status(500).send('Error al cargar los exámenes.');
            }

            let exams;
            try {
                exams = JSON.parse(examsData).exams;
            } catch (parseErr) {
                console.error('Error al parsear exámenes:', parseErr);
                return res.status(500).send('Error al procesar los exámenes.');
            }

            // Encontrar el examen correspondiente
            const exam = exams.find((e) => e.id === parseInt(examId, 10));
            if (!exam) {
                return res.status(404).send('Examen no encontrado.');
            }

            const examResponses = responses[examId] || [];
            const totalScore = exam.questions.reduce((sum, q) => sum + q.score, 0);

            // Calcular puntuaciones de los usuarios
            const calculatedResponses = examResponses.map((response) => {
                let score = 0;

                response.answers.forEach((answer) => {
                    const question = exam.questions.find((q) => q.title === answer.questionTitle);

                    if (question) {
                        if (question.isMultipleChoice) {
                            const correctAnswers = question.answers.filter((a) => a.isCorrect).map((a) => a.text);
                            const isCorrect = Array.isArray(answer.selectedAnswer)
                                ? answer.selectedAnswer.every((a) => correctAnswers.includes(a)) &&
                                correctAnswers.length === answer.selectedAnswer.length
                                : false;

                            if (isCorrect) score += question.score;
                        } else if (answer.selectedAnswer === question.answers.find((a) => a.isCorrect).text) {
                            score += question.score;
                        }
                    }
                });

                return { name: response.name, score };
            });

            res.json({
                title: exam.title,
                totalScore,
                responses: calculatedResponses,
            });
        });
    });
});






app.listen(PORT, () => {
    console.log(`Servidor ejecutándose en http://localhost:${PORT}`);
});