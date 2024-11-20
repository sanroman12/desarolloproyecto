// Selección de elementos del DOM
const addQuestionBtn = document.getElementById('add-question-btn');
const questionModal = document.getElementById('question-modal');
const closeQuestionModalBtn = document.getElementById('close-question-modal');
const addAnswerBtn = document.getElementById('add-answer-btn');
const saveQuestionBtn = document.getElementById('save-question-btn');
const saveExamBtn = document.getElementById('save-exam-btn');
const answersSection = document.getElementById('answers-section');
const questionList = document.getElementById('question-list');
const questionTitle = document.getElementById('question-title');
const isMultipleChoice = document.getElementById('is-multiple-choice');
const modalTitle = document.getElementById('modal-title');
const examTitle = document.getElementById('exam-title');
const editExamBtn = document.getElementById('edit-exam-btn');
const editExamModal = document.getElementById('edit-exam-modal');
const examNameInput = document.getElementById('exam-name-input');
const saveExamNameBtn = document.getElementById('save-exam-name-btn');
const cancelExamNameBtn = document.getElementById('cancel-exam-name-btn');
const questionScoreInput = document.getElementById('question-score'); // Campo para el puntaje

let answerCount = 0;
let editingQuestion = null;

// === Funcionalidades ===

// Abrir modal para agregar o editar una pregunta
addQuestionBtn.addEventListener('click', () => openModal());

// Cerrar modal de pregunta
closeQuestionModalBtn.addEventListener('click', () => closeModal());

// Agregar respuesta a la pregunta
addAnswerBtn.addEventListener('click', () => {
    if (answerCount >= 10) {
        alert('Solo puedes agregar hasta 10 respuestas.');
        return;
    }

    const answerItem = document.createElement('div');
    answerItem.classList.add('answer-item');
    answerItem.innerHTML = `
        <input type="text" placeholder="Escribe una respuesta">
        <input type="checkbox">
    `;
    answersSection.appendChild(answerItem);
    answerCount++;
});

// Guardar una nueva pregunta o editarla
saveQuestionBtn.addEventListener('click', () => {
    const questionText = questionTitle.value.trim();
    const questionScore = parseInt(questionScoreInput.value.trim(), 10);

    if (!questionText) {
        alert('La pregunta no puede estar vacía.');
        return;
    }
    if (isNaN(questionScore) || questionScore <= 0) {
        alert('El puntaje debe ser un número mayor que 0.');
        return;
    }

    const answers = Array.from(answersSection.children).map((child) => {
        const text = child.querySelector('input[type="text"]').value.trim();
        const isCorrect = child.querySelector('input[type="checkbox"]').checked;
        return { text, isCorrect };
    });

    if (answers.length === 0) {
        alert('Debe haber al menos una respuesta.');
        return;
    }

    if (editingQuestion) {
        updateQuestion(editingQuestion, questionText, answers, isMultipleChoice.checked, questionScore);
    } else {
        createQuestion(questionText, answers, isMultipleChoice.checked, questionScore);
    }

    closeModal();
});

// Abrir el modal para editar el nombre del examen
editExamBtn.addEventListener('click', () => {
    examNameInput.value = examTitle.textContent.trim();
    editExamModal.style.display = 'flex';
});

// Guardar el nuevo nombre del examen
saveExamNameBtn.addEventListener('click', () => {
    const newName = examNameInput.value.trim();
    if (!newName) {
        alert('El nombre del examen no puede estar vacío.');
        return;
    }
    examTitle.textContent = newName;
    editExamModal.style.display = 'none';
});

// Cancelar la edición del nombre del examen
cancelExamNameBtn.addEventListener('click', () => {
    editExamModal.style.display = 'none';
});

// Función para abrir el modal de preguntas
function openModal(question = null) {
    questionModal.style.display = 'flex';
    answersSection.innerHTML = '';
    questionTitle.value = '';
    questionScoreInput.value = '1'; // Resetear puntaje
    isMultipleChoice.checked = false;
    answerCount = 0;

    if (question) {
        modalTitle.textContent = 'Editar pregunta';
        questionTitle.value = question.querySelector('.question-title').textContent.trim();
        questionScoreInput.value = question.dataset.score || '1'; // Cargar puntaje existente
        isMultipleChoice.checked = question.dataset.multipleChoice === 'true';
        editingQuestion = question;

        const answers = JSON.parse(question.dataset.answers);
        answers.forEach((answer) => {
            const answerItem = document.createElement('div');
            answerItem.classList.add('answer-item');
            answerItem.innerHTML = `
                <input type="text" value="${answer.text}">
                <input type="checkbox" ${answer.isCorrect ? 'checked' : ''}>
            `;
            answersSection.appendChild(answerItem);
            answerCount++;
        });
    } else {
        modalTitle.textContent = 'Agregar pregunta';
        editingQuestion = null;
    }
}

// Función para cerrar el modal de preguntas
function closeModal() {
    questionModal.style.display = 'none';
    editingQuestion = null;
}

// Crear una nueva pregunta
function createQuestion(title, answers, isMultiple, score) {
    const questionElement = document.createElement('div');
    questionElement.classList.add('question-item');
    questionElement.dataset.multipleChoice = isMultiple;
    questionElement.dataset.answers = JSON.stringify(answers);
    questionElement.dataset.score = score; // Guardar puntaje

    questionElement.innerHTML = `
        <h4 class="question-title">${title} ${isMultiple ? '' : '(Pregunta abierta)'}</h4>
        <p>Puntaje: ${score}</p>
        <ul>
          ${answers.map(a => `<li>${a.text} ${a.isCorrect ? '(Correcta)' : ''}</li>`).join('')}
        </ul>
        <div class="question-actions">
          <button class="edit-btn">Editar</button>
          <button class="delete-btn">Eliminar</button>
        </div>
    `;

    questionElement.querySelector('.edit-btn').addEventListener('click', () => openModal(questionElement));
    questionElement.querySelector('.delete-btn').addEventListener('click', () => questionElement.remove());

    questionList.appendChild(questionElement);
}

// Actualizar una pregunta existente
function updateQuestion(questionElement, title, answers, isMultiple, score) {
    questionElement.dataset.multipleChoice = isMultiple;
    questionElement.dataset.answers = JSON.stringify(answers);
    questionElement.dataset.score = score;

    questionElement.querySelector('.question-title').textContent = `${title} ${isMultiple ? '' : '(Pregunta abierta)'}`;
    questionElement.querySelector('p').textContent = `Puntaje: ${score}`;
    const answerList = questionElement.querySelector('ul');
    answerList.innerHTML = answers.map(a => `<li>${a.text} ${a.isCorrect ? '(Correcta)' : ''}</li>`).join('');
}

saveExamBtn.addEventListener('click', () => {
    const examData = {
        title: examTitle.textContent.trim(),
        questions: Array.from(questionList.children).map((questionElement) => ({
            title: questionElement.querySelector('.question-title').textContent.trim(),
            isMultipleChoice: questionElement.dataset.multipleChoice === 'true',
            answers: JSON.parse(questionElement.dataset.answers),
            score: parseInt(questionElement.dataset.score, 10),
        })),
    };

    if (!examData.title) {
        alert('El examen debe tener un título.');
        return;
    }
    if (examData.questions.length === 0) {
        alert('El examen debe tener al menos una pregunta.');
        return;
    }

    fetch('/api/save-exam', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(examData),
    })
        .then((response) => {
            if (response.ok) {
                alert('Examen guardado con éxito.');
                window.location.href = '/pruebas.html';
            } else {
                response.text().then((errorMessage) => {
                    console.error('Error del servidor:', errorMessage);
                    alert('No se pudo guardar el examen. Inténtalo de nuevo.');
                });
            }
        })
        .catch((error) => {
            console.error('Error al guardar el examen:', error);
            alert('No se pudo guardar el examen. Inténtalo de nuevo.');
        });
});