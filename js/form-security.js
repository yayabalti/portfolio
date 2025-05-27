// Configuration de sécurité
const RATE_LIMIT_TIME = 60000; // 1 minute entre chaque envoi
const MAX_MESSAGE_LENGTH = 2000;
const MAX_SUBJECT_LENGTH = 100;
const MAX_NAME_LENGTH = 50;

// Variables de rate limiting
let lastSubmitTime = 0;
let submissionCount = 0;

// Regex de validation
const emailRegex = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;
const nameRegex = /^[a-zA-ZÀ-ÿ\s'-]{2,50}$/;

// Fonction de sanitisation
function sanitizeInput(input) {
    return input.replace(/<[^>]*>/g, '').replace(/[<>&"']/g, function(match) {
        const escape = {
            '<': '&lt;',
            '>': '&gt;',
            '&': '&amp;',
            '"': '&quot;',
            "'": '&#x27;'
        };
        return escape[match];
    });
}

// Fonction de validation
function validateContactForm() {
    let isValid = true;
    clearFormErrors();

    // Validation du nom
    const name = document.getElementById('name').value.trim();
    if (!name) {
        showFormError('nameError', 'Le nom est requis.');
        isValid = false;
    } else if (!nameRegex.test(name)) {
        showFormError('nameError', 'Le nom contient des caractères non autorisés.');
        isValid = false;
    }

    // Validation de l'email
    const email = document.getElementById('email').value.trim();
    if (!email) {
        showFormError('emailError', 'L\'email est requis.');
        isValid = false;
    } else if (!emailRegex.test(email)) {
        showFormError('emailError', 'Format d\'email invalide.');
        isValid = false;
    }

    // Validation du sujet
    const subject = document.getElementById('subject').value.trim();
    if (!subject) {
        showFormError('subjectError', 'Le sujet est requis.');
        isValid = false;
    } else if (subject.length > MAX_SUBJECT_LENGTH) {
        showFormError('subjectError', `Le sujet ne peut pas dépasser ${MAX_SUBJECT_LENGTH} caractères.`);
        isValid = false;
    }

    // Validation du message
    const message = document.getElementById('message').value.trim();
    if (!message) {
        showFormError('messageError', 'Le message est requis.');
        isValid = false;
    } else if (message.length > MAX_MESSAGE_LENGTH) {
        showFormError('messageError', `Le message ne peut pas dépasser ${MAX_MESSAGE_LENGTH} caractères.`);
        isValid = false;
    }

    // Validation de la politique de confidentialité
    const privacy = document.getElementById('privacy').checked;
    if (!privacy) {
        showFormError('privacyError', 'Vous devez accepter la politique de confidentialité.');
        isValid = false;
    }

    // Vérification du honeypot
    const honeypot = document.querySelector('input[name="_honey"]');
    if (honeypot && honeypot.value) {
        console.log('Bot détecté');
        return false;
    }

    return isValid;
}

// Fonction de rate limiting
function checkFormRateLimit() {
    const now = Date.now();
    const timeSinceLastSubmit = now - lastSubmitTime;
    
    if (timeSinceLastSubmit < RATE_LIMIT_TIME) {
        const remainingTime = Math.ceil((RATE_LIMIT_TIME - timeSinceLastSubmit) / 1000);
        const rateLimitMsg = document.getElementById('rateLimitMessage');
        if (rateLimitMsg) {
            rateLimitMsg.textContent = `Veuillez patienter ${remainingTime} secondes avant d'envoyer un autre message.`;
            rateLimitMsg.style.display = 'block';
        }
        return false;
    }

    const rateLimitMsg = document.getElementById('rateLimitMessage');
    if (rateLimitMsg) {
        rateLimitMsg.style.display = 'none';
    }
    return true;
}

// Fonction d'affichage des erreurs
function showFormError(elementId, message) {
    const errorElement = document.getElementById(elementId);
    if (errorElement) {
        errorElement.textContent = message;
        errorElement.style.display = 'block';
    }
}

// Fonction pour effacer les erreurs
function clearFormErrors() {
    const errorElements = document.querySelectorAll('.form-error');
    errorElements.forEach(element => {
        element.style.display = 'none';
        element.textContent = '';
    });
    const rateLimitMsg = document.getElementById('rateLimitMessage');
    if (rateLimitMsg) {
        rateLimitMsg.style.display = 'none';
    }
}

// Initialisation de la sécurité du formulaire
function initFormSecurity() {
    const form = document.querySelector('form[action*="formsubmit.co"]');
    if (!form) return;

    // Ajouter le honeypot si pas déjà présent
    if (!form.querySelector('input[name="_honey"]')) {
        const honeypot = document.createElement('input');
        honeypot.type = 'text';
        honeypot.name = '_honey';
        honeypot.style.position = 'absolute';
        honeypot.style.left = '-9999px';
        honeypot.tabIndex = -1;
        honeypot.autocomplete = 'off';
        form.appendChild(honeypot);
    }

    // Sanitisation en temps réel
    const inputs = ['name', 'subject', 'message'];
    inputs.forEach(inputId => {
        const input = document.getElementById(inputId);
        if (input) {
            input.addEventListener('blur', function() {
                this.value = sanitizeInput(this.value);
            });
        }
    });

    // Gestionnaire de soumission
    form.addEventListener('submit', function(e) {
        e.preventDefault();

        // Vérifications de sécurité
        if (!checkFormRateLimit() || !validateContactForm()) {
            return;
        }

        // Sanitisation des données
        const formData = new FormData(this);
        const sanitizedData = new FormData();

        for (let [key, value] of formData.entries()) {
            if (key !== '_honey' && key !== '_captcha' && key !== '_next' && key !== '_subject') {
                sanitizedData.append(key, sanitizeInput(value));
            } else {
                sanitizedData.append(key, value);
            }
        }

        // Désactiver le bouton
        const submitBtn = form.querySelector('button[type="submit"]');
        if (submitBtn) {
            submitBtn.disabled = true;
            submitBtn.textContent = 'Envoi en cours...';
        }

        // Enregistrer le temps
        lastSubmitTime = Date.now();

        // Soumettre le formulaire
        fetch(this.action, {
            method: 'POST',
            body: sanitizedData
        }).then(response => {
            if (response.ok) {
                window.location.href = "merci.html";
            } else {
                throw new Error('Erreur lors de l\'envoi');
            }
        }).catch(error => {
            console.error('Erreur:', error);
            alert('Une erreur est survenue. Veuillez réessayer.');
            
            if (submitBtn) {
                submitBtn.disabled = false;
                submitBtn.textContent = 'Envoyer le message';
            }
        });
    });
}

// Initialiser quand le DOM est chargé
document.addEventListener('DOMContentLoaded', initFormSecurity);