const form = document.getElementById("bookingForm");
let currentStep = 1;

// --- SISTEMA DE NOTIFICACIONES (TOASTS) ---
function showToast(title, message, type = 'info', duration = 4000) {
  const container = document.getElementById("toastContainer");
  if (!container) return;

  const toast = document.createElement("div");
  toast.className = `toast ${type}`;
  
  // Íconos según tipo
  let icon = 'fa-info-circle';
  if (type === 'success') icon = 'fa-check-circle';
  if (type === 'error') icon = 'fa-exclamation-triangle';

  toast.innerHTML = `
    <i class="fas ${icon}"></i>
    <div class="toast-content">
      <div class="toast-title">${title}</div>
      <div class="toast-message">${message}</div>
    </div>
    <div class="toast-progress">
      <div class="toast-progress-bar" style="animation-duration: ${duration}ms"></div>
    </div>
  `;

  container.appendChild(toast);

  // Eliminar toast después de la duración
  setTimeout(() => {
    toast.classList.add("hide");
    setTimeout(() => {
      toast.remove();
    }, 500);
  }, duration);
}

// --- FUNCIÓN DE ENVÍO REFACTOREADA ---
async function handleFormSubmission() {
  console.log("Intentando enviar formulario...");
  
  const termsCheckbox = form.querySelector('input[type="checkbox"]');
  if (!termsCheckbox.checked) {
    showToast("¡Hey!", "Debes aceptar las políticas y condiciones para continuar.", "error");
    return;
  }

  const submitBtn = form.querySelector(".submit-btn");
  const originalBtnText = submitBtn.textContent;
  
  // Feedback visual inmediato
  submitBtn.disabled = true;
  submitBtn.textContent = "ENVIANDO...";
  submitBtn.style.opacity = "0.7";

  const formData = new FormData(form);

  // Crear un controlador para cancelar la petición si tarda demasiado
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 15000); // 15 segundos máximo

  try {
    const response = await fetch("/booking", {
      method: "POST",
      body: formData,
      signal: controller.signal
    });

    clearTimeout(timeoutId);

    if (response.ok) {
      const serverData = await response.json();
      showToast("¡HECHO!", "Redirigiendo a WhatsApp...", "success");
      
      // --- REDIRECCIÓN A WHATSAPP PROFESIONAL ---
      const name = formData.get("name");
      const whatsapp = formData.get("whatsapp");
      const age = formData.get("age");
      const size = formData.get("tattoo-size");
      const style = formData.get("style");
      const idea = formData.get("idea");
      let chosenDesign = formData.get("chosenDesignUrl");
      let uploadedFileUrl = serverData.referenceUrl;

      // Convertir URLs relativas en absolutas para que WhatsApp las reconozca y genere previsualización
      if (chosenDesign && !chosenDesign.startsWith("http")) {
        chosenDesign = window.location.origin + (chosenDesign.startsWith("/") ? "" : "/") + chosenDesign;
      }
      if (uploadedFileUrl && !uploadedFileUrl.startsWith("http")) {
        uploadedFileUrl = window.location.origin + (uploadedFileUrl.startsWith("/") ? "" : "/") + uploadedFileUrl;
      }

      let message = `*𝟛𝟛𝟛 𝕋𝕒𝕥𝕥𝕠𝕠 𝕊𝕥𝕦𝕕𝕚𝕠*\n`;
      message += `━━━━━━━━━━━━━━━━━━━━\n`;
      message += `🔥 *NUEVA SOLICITUD DE TATUAJE*\n\n`;
      message += `👤 *Cliente:* ${name}\n`;
      message += `📱 *WhatsApp:* ${whatsapp}\n`;
      message += `🎂 *Edad:* ${age} años\n`;
      message += `📏 *Tamaño aprox:* ${size}\n`;
      message += `🎨 *Estilo:* ${style}\n`;
      message += `💡 *Idea:* ${idea}\n\n`;
      
      if (chosenDesign) {
        message += `🖼️ *Diseño seleccionado:*\n${chosenDesign}\n\n`;
      } else if (uploadedFileUrl) {
        message += `📎 *Imagen de referencia:*\n${uploadedFileUrl}\n\n`;
      }
      
      message += `━━━━━━━━━━━━━━━━━━━━\n`;
      message += `_Enviado desde el sitio web oficial de 333 tattoo studio_`;

      const encodedMessage = encodeURIComponent(message);
      const whatsappUrl = `https://wa.me/593959584119?text=${encodedMessage}`;
      
      setTimeout(() => {
        window.open(whatsappUrl, '_blank');
        form.reset();
        currentStep = 1;
        updateFormSteps();
        document.getElementById("fileNameDisplay").textContent = "Sin archivos seleccionados";
        
        const selectedDesignContainer = document.getElementById("selectedDesignContainer");
        const chosenDesignInput = document.getElementById("chosenDesignInput");
        const fileUploadSection = document.getElementById("fileUploadSection");
        const fileInput = document.getElementById("fileInput");
        const designChosenMessage = document.getElementById("designChosenMessage");

        if (selectedDesignContainer) selectedDesignContainer.style.display = "none";
        if (chosenDesignInput) chosenDesignInput.value = "";
        if (fileUploadSection) fileUploadSection.style.display = "block";
        if (fileInput) fileInput.setAttribute("required", "");
        if (designChosenMessage) designChosenMessage.style.display = "none";
        const subtitle = document.getElementById("step3Subtitle");
        if (subtitle) subtitle.textContent = "Cuéntanos más detalles";
      }, 1200);
    } else {
      try {
        const errorData = await response.json();
        showToast("ERROR", `Fallo: ${errorData.message || "Intenta de nuevo."}`, "error");
      } catch (e) {
        showToast("ERROR", "Hubo un fallo en la máquina. Intenta enviar de nuevo.", "error");
      }
    }
  } catch (error) {
    console.error("Error de red:", error);
    showToast("CONEXIÓN", "No pudimos conectar con el estudio. Revisa tu internet.", "error");
  } finally {
    submitBtn.disabled = false;
    submitBtn.textContent = originalBtnText;
    submitBtn.style.opacity = "1";
  }
}

// --- LÓGICA DE FORMULARIO MULTI-PASOS ---
function updateFormSteps() {
  // Actualizar visibilidad de pasos
  document.querySelectorAll(".form-step").forEach(step => {
    step.classList.remove("active");
  });
  document.getElementById(`step${currentStep}`).classList.add("active");

  // Actualizar indicadores de pasos
  document.querySelectorAll(".step").forEach((step, index) => {
    if (index + 1 <= currentStep) {
      step.classList.add("active");
    } else {
      step.classList.remove("active");
    }
  });

  // Actualizar líneas de progreso
  const lines = document.querySelectorAll(".step-line");
  lines.forEach((line, index) => {
    if (index + 1 < currentStep) {
      line.classList.add("filled"); // Necesitaremos añadir este estilo en CSS
    } else {
      line.classList.remove("filled");
    }
  });
}

// Botones Siguiente
document.querySelectorAll(".next-step").forEach(button => {
  button.addEventListener("click", () => {
    const currentStepElement = document.getElementById(`step${currentStep}`);
    const inputs = currentStepElement.querySelectorAll("input[required], textarea[required], select[required]");
    
    // Validación básica
    let allValid = true;
    inputs.forEach(input => {
      if (!input.value || (input.type === "checkbox" && !input.checked) || (input.type === "radio" && !currentStepElement.querySelector('input[name="style"]:checked'))) {
        allValid = false;
        input.classList.add("error"); // Podríamos añadir estilos de error
      } else {
        input.classList.remove("error");
      }
    });

    if (allValid) {
      currentStep++;
      updateFormSteps();
      // Scroll suave hacia el centro del formulario para que sea vea todo
      document.getElementById("booking").scrollIntoView({ behavior: 'smooth', block: 'center' });
    } else {
      showToast("¡Hey!", "Falta tinta por rellenar. Completa los campos obligatorios.", "error");
    }
  });
});

// Botones Anterior
document.querySelectorAll(".prev-step").forEach(button => {
  button.addEventListener("click", () => {
    currentStep--;
    updateFormSteps();
  });
});

// Mostrar nombre de archivo seleccionado
const fileInput = document.getElementById("fileInput");
if (fileInput) {
  fileInput.addEventListener("change", (e) => {
    const fileName = e.target.files[0]?.name || "Sin archivos seleccionados";
    document.getElementById("fileNameDisplay").textContent = fileName;
  });
}

// --- LÓGICA DE FORMULARIO MULTI-PASOS ---
function initScrollReveal() {
  const items = document.querySelectorAll(".gallery img:not(.reveal), .design-item:not(.reveal)");
  
  if (items.length === 0) return;

  const observerOptions = {
    threshold: 0.1,
    rootMargin: "0px"
  };

  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add("reveal");
        observer.unobserve(entry.target);
      }
    });
  }, observerOptions);

  items.forEach(item => {
    observer.observe(item);
  });
}

// --- LÓGICA DE RESEÑAS ---
let reviewInterval;
let currentReviewIndex = 0;

async function fetchReviews() {
  const reviewsList = document.getElementById("reviewsList");
  if (!reviewsList) return;

  try {
    const response = await fetch("/api/reviews");
    const reviews = await response.json();

    if (reviews.length === 0) {
      reviewsList.innerHTML = '<p style="text-align: center; color: #888;">Sé el primero en dejar una reseña.</p>';
      return;
    }

    // Limpiar intervalo anterior si existe
    if (reviewInterval) clearInterval(reviewInterval);

    reviewsList.innerHTML = reviews.map(r => `
      <div class="review-card">
        ${r.tattooImageUrl 
          ? (r.tattooMediaType === 'video' 
              ? `<video src="${encodeURI(r.tattooImageUrl)}" class="review-tattoo-thumb" muted loop autoplay playsinline></video>`
              : `<img src="${encodeURI(r.tattooImageUrl)}" class="review-tattoo-thumb" alt="Tatuaje">`
            )
          : ''
        }
        <div class="review-body">
          <div class="review-header">
            <span class="review-name">${r.name}</span>
            <div class="review-stars">
              ${'<i class="fas fa-star"></i>'.repeat(r.rating)}
              ${'<i class="far fa-star"></i>'.repeat(5 - r.rating)}
            </div>
          </div>
          <p class="review-comment">"${r.comment}"</p>
        </div>
      </div>
    `).join('');

    // Iniciar auto-scroll si hay más de una reseña
    if (reviews.length > 1) {
      startReviewCarousel(reviews.length);
    }
  } catch (error) {
    console.error("Error cargando reseñas:", error);
  }
}

function startReviewCarousel(count) {
  const list = document.getElementById("reviewsList");
  currentReviewIndex = 0;
  
  reviewInterval = setInterval(() => {
    currentReviewIndex = (currentReviewIndex + 1) % count;
    const cardHeight = list.children[0].offsetHeight + 30; // Altura + gap
    list.style.transform = `translateY(-${currentReviewIndex * cardHeight}px)`;
  }, 7000); // 7 segundos por reseña (6s quieta + 1s transición aprox)
}

// Cargar portafolio para el selector de reseñas
async function fetchPortfolioForReviews() {
  const selector = document.getElementById("portfolioSelector");
  if (!selector) return;

  try {
    const response = await fetch("/api/portfolio");
    const portfolio = await response.json();

    selector.innerHTML = portfolio.map(item => {
      if (item.mediaType === 'video') {
        return `
          <video src="${encodeURI(item.imageUrl)}" class="portfolio-item-select" muted loop onclick="selectTattooForReview(this, '${item.imageUrl}', 'video')"></video>
        `;
      } else {
        return `
          <img src="${encodeURI(item.imageUrl)}" class="portfolio-item-select" onclick="selectTattooForReview(this, '${item.imageUrl}', 'image')" alt="Tatuaje">
        `;
      }
    }).join('');
  } catch (e) {
    selector.innerHTML = '<p style="color:red;">Error al cargar portafolio</p>';
  }
}

function selectTattooForReview(element, url, type) {
  document.querySelectorAll(".portfolio-item-select").forEach(el => el.classList.remove("selected"));
  element.classList.add("selected");
  document.getElementById("selectedTattooUrl").value = url;
  document.getElementById("selectedTattooMediaType").value = type;
}

// Inicializar selección de estrellas
function initStarRating() {
  const stars = document.querySelectorAll("#starInput i");
  const ratingInput = document.getElementById("ratingValue");

  // Valor por defecto (5 estrellas)
  updateStars(0);
  ratingInput.value =  5;

  stars.forEach(star => {
    star.addEventListener("click", () => {
      const val = parseInt(star.getAttribute("data-value"));
      ratingInput.value = val;
      updateStars(val);
    });
  });
}

async function handleReviewSubmission(e) {
  e.preventDefault();
  const name = document.getElementById("reviewName").value;
  const rating = document.getElementById("ratingValue").value;
  const comment = document.getElementById("reviewComment").value;
  const password = document.getElementById("reviewPassword").value;
  const tattooImageUrl = document.getElementById("selectedTattooUrl").value;
  const tattooMediaType = document.getElementById("selectedTattooMediaType").value;

  const btn = e.target.querySelector("button");
  const originalText = btn.textContent;
  btn.disabled = true;
  btn.textContent = "PUBLICANDO...";

  try {
    const response = await fetch("/api/reviews", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, rating, comment, password, tattooImageUrl, tattooMediaType })
    });

    if (response.ok) {
      showToast("¡GRACIAS!", "Tu reseña ha sido publicada.", "success");
      document.getElementById("reviewForm").reset();
      updateStars(0);
      document.getElementById("ratingValue").value = 0; 
      document.querySelectorAll(".portfolio-item-select").forEach(el => el.classList.remove("selected"));
      document.getElementById("selectedTattooUrl").value = "";
      document.getElementById("selectedTattooMediaType").value = "";
      fetchReviews();
    } else {
      const data = await response.json();
      showToast("ERROR", data.error || "No se pudo publicar la reseña.", "error");
    }
  } catch (error) {
    showToast("ERROR", "Error de conexión.", "error");
  } finally {
    btn.disabled = false;
    btn.textContent = originalText;
  }
}

// Re-declaramos updateStars dentro de handleReviewSubmission o la hacemos accesible
function updateStars(val) {
  const stars = document.querySelectorAll("#starInput i");
  stars.forEach(s => {
    const sVal = parseInt(s.getAttribute("data-value"));
    if (sVal <= val) {
      s.classList.add("active", "fas");
      s.classList.remove("far");
    } else {
      s.classList.remove("active", "fas");
      s.classList.add("far");
    }
  });
}

// --- LÓGICA DE CARGA DE DISEÑOS DINÁMICOS ---
async function fetchPortfolio() {
  const gallery = document.getElementById("portfolioGallery");
  if (!gallery) return;

  try {
    const response = await fetch("/api/portfolio");
    const portfolio = await response.json();

    if (portfolio.length === 0) {
      gallery.innerHTML = '<p style="grid-column: 1/-1; text-align: center; color: #888;">El portafolio está siendo actualizado.</p>';
      return;
    }

    gallery.innerHTML = portfolio.map(item => {
      if (item.mediaType === 'video') {
        return `
          <div class="portfolio-video-container">
            <video src="${encodeURI(item.imageUrl)}" autoplay muted loop playsinline class="reveal"></video>
          </div>
        `;
      } else {
        return `<img src="${encodeURI(item.imageUrl)}" alt="Tatuaje Realizado" class="reveal">`;
      }
    }).join('');

    // Re-inicializar scroll reveal
    // --- LÓGICA DE EDAD Y AUTORIZACIÓN ---
  const ageInput = document.getElementById("ageInput");
  const minorAuthorization = document.getElementById("minorAuthorization");
  const minorAuthCheckbox = document.getElementById("minorAuthCheckbox");

  if (ageInput && minorAuthorization) {
    ageInput.addEventListener("input", (e) => {
      const age = parseInt(e.target.value);
      if (age > 0 && age < 18) {
        minorAuthorization.style.display = "block";
        minorAuthCheckbox.setAttribute("required", "required");
      } else {
        minorAuthorization.style.display = "none";
        minorAuthCheckbox.removeAttribute("required");
        minorAuthCheckbox.checked = false;
      }
    });
  }

  initScrollReveal();
    
  } catch (error) {
    console.error("Error cargando portafolio:", error);
    gallery.innerHTML = '<p style="grid-column: 1/-1; text-align: center; color: #ff4444;">Error al cargar el portafolio.</p>';
  }
}

async function fetchDesigns() {
  const gallery = document.getElementById("designsGallery");
  if (!gallery) return;

  try {
    const response = await fetch("/api/designs");
    const designs = await response.json();

    if (designs.length === 0) {
      gallery.innerHTML = '<p style="grid-column: 1/-1; text-align: center; color: #888;">No hay diseños disponibles por el momento.</p>';
      return;
    }

    gallery.innerHTML = designs.map(design => `
      <div class="design-item">
        ${design.price && design.price !== 'Consultar' ? `<div class="price-badge">${design.price}</div>` : ''}
        <img src="${encodeURI(design.imageUrl)}" alt="Diseño Disponible">
        <div class="design-info">
          <button type="button" class="choose-design-btn">Escoger</button>
        </div>
      </div>
    `).join('');

    // Re-inicializar scroll reveal para los nuevos elementos
    initScrollReveal();
    
  } catch (error) {
    console.error("Error cargando diseños:", error);
    gallery.innerHTML = '<p style="grid-column: 1/-1; text-align: center; color: #ff4444;">Error al cargar los diseños.</p>';
  }
}

// Ejecutar al cargar la página
document.addEventListener("DOMContentLoaded", () => {
  fetchPortfolio();
  fetchDesigns();
  fetchReviews();
  fetchPortfolioForReviews();
  initStarRating();

  const reviewForm = document.getElementById("reviewForm");
  if (reviewForm) {
    reviewForm.addEventListener("submit", handleReviewSubmission);
  }

  // --- LÓGICA DE MOSTRAR/OCULTAR FORMULARIO DE RESEÑA ---
  const showReviewBtn = document.getElementById("showReviewBtn");
  const closeReviewBtn = document.getElementById("closeReviewBtn");
  const reviewFormContainer = document.getElementById("reviewFormContainer");
  const showReviewBtnContainer = document.getElementById("showReviewBtnContainer");

  if (showReviewBtn && reviewFormContainer) {
    showReviewBtn.addEventListener("click", () => {
      reviewFormContainer.style.display = "block";
      showReviewBtnContainer.style.display = "none";
      reviewFormContainer.scrollIntoView({ behavior: 'smooth', block: 'center' });
    });
  }

  if (closeReviewBtn && reviewFormContainer) {
    closeReviewBtn.addEventListener("click", () => {
      reviewFormContainer.style.display = "none";
      showReviewBtnContainer.style.display = "block";
    });
  }

  initScrollReveal();
  
  // Mensaje de bienvenida/versión para confirmar que el código es el nuevo
  showToast("333 Tattoo Studio", "success", 2000);

  // Solo escuchar el evento submit del formulario
  if (form) {
    form.addEventListener("submit", (e) => {
      e.preventDefault();
      handleFormSubmission();
    });
  }
  
  // Re-chequear un poco después por si las imágenes se cargan dinámicamente
  setTimeout(initScrollReveal, 1000);

  // --- FUNCIONALIDAD PARA AMPLIAR IMÁGENES (LIGHTBOX) CON ZOOM ---
  const lightbox = document.getElementById("lightbox");
  const lightboxImg = lightbox.querySelector("img");
  let isZoomed = false;

  document.addEventListener("click", (e) => {
    // Abrir Lightbox
    const img = e.target.closest(".gallery img, .design-item img");
    if (img && !lightbox.classList.contains("active")) {
      lightboxImg.src = img.src;
      lightbox.classList.add("active");
      document.body.style.overflow = "hidden"; // Bloquear scroll
      return;
    }

    // Lógica dentro del Lightbox
    if (lightbox.classList.contains("active")) {
      const clickedOnImg = e.target === lightboxImg;

      if (clickedOnImg) {
        // Toggle ZOOM
        isZoomed = !isZoomed;
        if (isZoomed) {
          lightbox.classList.add("zoomed");
        } else {
          lightbox.classList.remove("zoomed");
          lightboxImg.style.transform = ""; // Reset posición
        }
      } else {
        // Cerrar si se hace clic fuera de la imagen o si ya se quiere cerrar
        lightbox.classList.remove("active", "zoomed");
        isZoomed = false;
        lightboxImg.style.transform = "";
        document.body.style.overflow = "auto"; // Habilitar scroll
      }
    }
  });

  // Efecto de movimiento (Pan) cuando hay zoom
  lightbox.addEventListener("mousemove", (e) => {
    if (isZoomed) {
      const { left, top, width, height } = lightbox.getBoundingClientRect();
      const x = (e.clientX - left) / width;
      const y = (e.clientY - top) / height;

      // Mover la imagen en dirección opuesta al mouse para el efecto de lupa
      const moveX = (x - 0.5) * 50; // Ajustado para un zoom más sutil
      const moveY = (y - 0.5) * 50;

      lightboxImg.style.transform = `scale(1.3) translate(${-moveX}px, ${-moveY}px)`;
    }
  });

  // --- LÓGICA DE SELECCIÓN DE DISEÑO (CON DELEGACIÓN PARA DISEÑOS DINÁMICOS) ---
  const selectedDesignContainer = document.getElementById("selectedDesignContainer");
  const selectedDesignImg = document.getElementById("selectedDesignImg");
  const chosenDesignInput = document.getElementById("chosenDesignInput");
  const fileUploadSection = document.getElementById("fileUploadSection");
  const removeDesignBtn = document.getElementById("removeDesignBtn");
  const designChosenMessage = document.getElementById("designChosenMessage");

  document.addEventListener("click", (e) => {
    const btn = e.target.closest(".choose-design-btn");
    if (btn) {
      e.stopPropagation();
      
      const designItem = btn.closest(".design-item");
      const img = designItem.querySelector("img");
      const imgUrl = img.getAttribute("src");
      
      selectedDesignImg.src = imgUrl;
      chosenDesignInput.value = imgUrl;
      selectedDesignContainer.style.display = "block";
      
      if (designChosenMessage) designChosenMessage.style.display = "flex";
      
      const subtitle = document.getElementById("step3Subtitle");
      if (subtitle) subtitle.textContent = "Diseño escogido, termina la solicitud";
      
      fileUploadSection.style.display = "none";
      const fileInput = document.getElementById("fileInput");
      if (fileInput) fileInput.removeAttribute("required");
      
      updateFormSteps();
      document.getElementById("booking").scrollIntoView({ behavior: 'smooth' });
    }
  });

  removeDesignBtn.addEventListener("click", () => {
    selectedDesignContainer.style.display = "none";
    chosenDesignInput.value = "";
    fileUploadSection.style.display = "block";
    fileInput.setAttribute("required", "");
    
    // Ocultar mensaje informativo arriba
    if (designChosenMessage) designChosenMessage.style.display = "none";
    
    // Restaurar subtítulo original
    const subtitle = document.getElementById("step3Subtitle");
    if (subtitle) subtitle.textContent = "Cuéntanos más detalles";
  });

  // --- LÓGICA DEL BANNER DE COOKIES ---
  const cookieBanner = document.getElementById("cookie-banner");
  const acceptBtn = document.getElementById("cookie-accept");
  const rejectBtn = document.getElementById("cookie-reject");

  // Verificar si ya se aceptó/rechazó anteriormente
  if (!localStorage.getItem("cookieConsent")) {
    cookieBanner.style.display = "block";
  }

  const closeBanner = (choice) => {
    localStorage.setItem("cookieConsent", choice);
    cookieBanner.classList.add("hide"); // Animación de subida y desvanecimiento
    
    // Esperar a que termine la animación para quitar el display:block
    setTimeout(() => {
      cookieBanner.style.display = "none";
    }, 500);
  };

  acceptBtn.addEventListener("click", () => closeBanner("accepted"));
  rejectBtn.addEventListener("click", () => closeBanner("rejected"));
});

// --- LÓGICA DE MODALES LEGALES ---
const legalTexts = {
  privacidad: `<h1>POLÍTICA DE PRIVACIDAD</h1>
<p>POLÍTICA DE PRIVACIDAD
333 Tattoo Studio

Última actualización: 2026

En 333 Tattoo Studio respetamos la privacidad de nuestros clientes y visitantes. Esta Política de Privacidad explica cómo recopilamos, utilizamos, almacenamos y protegemos la información personal que se obtiene a través de nuestro sitio web.

Al utilizar este sitio web, el usuario acepta las prácticas descritas en esta política.

1. Responsable del tratamiento de datos

El responsable del tratamiento de los datos personales recopilados a través de este sitio web es 333 Tattoo Studio.

El estudio es responsable de garantizar que la información personal de los usuarios sea tratada de manera segura, confidencial y conforme a las leyes aplicables de protección de datos.

2. Información que recopilamos

A través de nuestro sitio web podemos recopilar información personal proporcionada voluntariamente por el usuario al completar formularios o comunicarse con el estudio.

La información puede incluir:

* Nombre del usuario
* Número de teléfono o WhatsApp
* Usuario de Instagram u otras redes sociales
* Descripción de la idea del tatuaje
* Imágenes de referencia enviadas por el cliente
* Mensajes o comentarios enviados al estudio

También podemos recopilar información técnica básica como:

* dirección IP
* tipo de navegador
* dispositivo utilizado
* páginas visitadas dentro del sitio

Esta información se utiliza únicamente con fines técnicos y de mejora del servicio.

3. Finalidad del uso de la información

La información recopilada se utiliza exclusivamente para:

* responder solicitudes de cotización
* evaluar diseños de tatuajes solicitados
* comunicarnos con el cliente para coordinar citas
* mejorar la experiencia del usuario en el sitio web
* gestionar reservas y solicitudes de información

333 Tattoo Studio no utiliza la información personal para enviar publicidad masiva ni comunicaciones no solicitadas.

4. Almacenamiento de la información

La información proporcionada por los usuarios puede almacenarse en bases de datos seguras utilizadas por el estudio para la gestión de clientes y solicitudes.

Se aplican medidas razonables de seguridad para proteger los datos contra acceso no autorizado, pérdida, alteración o divulgación.

Sin embargo, el usuario entiende que ningún sistema de almacenamiento digital puede garantizar seguridad absoluta.

5. Imágenes enviadas por los usuarios

Las imágenes de referencia enviadas por los usuarios a través del formulario del sitio web se utilizan únicamente para evaluar el tatuaje solicitado.

Estas imágenes:

* no serán publicadas sin autorización del usuario
* no se utilizarán con fines comerciales
* pueden ser eliminadas cuando ya no sean necesarias para la solicitud

6. Compartición de información

333 Tattoo Studio no vende, alquila ni comparte la información personal de los usuarios con terceros.

La información solo podrá ser compartida cuando:

* sea necesario para cumplir obligaciones legales
* sea requerido por autoridades competentes
* el usuario haya otorgado consentimiento explícito

7. Conservación de los datos

Los datos personales se conservarán únicamente durante el tiempo necesario para cumplir con los fines para los que fueron recopilados.

Una vez que la información ya no sea necesaria, podrá ser eliminada de forma segura.

8. Derechos del usuario

El usuario tiene derecho a:

* solicitar acceso a sus datos personales
* solicitar la corrección de información incorrecta
* solicitar la eliminación de sus datos
* retirar su consentimiento para el uso de su información

Para ejercer estos derechos, el usuario puede comunicarse con el estudio a través de los canales oficiales publicados en el sitio web.

9. Uso de cookies

Este sitio web puede utilizar cookies o tecnologías similares para mejorar la experiencia de navegación.

Las cookies permiten recordar ciertas preferencias del usuario y recopilar información estadística sobre el uso del sitio web.

El usuario puede configurar su navegador para bloquear o eliminar cookies si lo desea.

10. Enlaces a terceros

El sitio web puede contener enlaces a plataformas externas como Instagram, WhatsApp u otras redes sociales.

333 Tattoo Studio no es responsable por las políticas de privacidad o el contenido de dichos sitios externos.

Se recomienda al usuario revisar las políticas de privacidad de cada plataforma que visite.

11. Seguridad de la información

Se implementan medidas técnicas y organizativas razonables para proteger la información personal contra acceso no autorizado, pérdida o uso indebido.

Sin embargo, el usuario reconoce que la transmisión de información a través de internet puede implicar ciertos riesgos.

12. Cambios en esta política

333 Tattoo Studio se reserva el derecho de modificar esta Política de Privacidad en cualquier momento para adaptarse a cambios legales o mejoras en el servicio.

Las actualizaciones serán publicadas en esta página.

13. Contacto

Si el usuario tiene preguntas sobre esta Política de Privacidad o sobre el tratamiento de sus datos personales, puede comunicarse con 333 Tattoo Studio a través de los medios de contacto oficiales publicados en el sitio web.

</p>`,
  terminos: `<h1>TÉRMINOS Y CONDICIONES DE USO</h1>
<p>TÉRMINOS Y CONDICIONES DE USO
333 Tattoo Studio

Última actualización: 2026

1. Introducción

Los presentes Términos y Condiciones regulan el acceso y uso del sitio web de 333 Tattoo Studio, así como las solicitudes de información, cotizaciones y reservas realizadas a través del mismo.

Al acceder, navegar o utilizar este sitio web, el usuario acepta expresamente cumplir con los presentes términos y condiciones. Si el usuario no está de acuerdo con alguna parte de estos términos, deberá abstenerse de utilizar el sitio web.

2. Información sobre el estudio

333 Tattoo Studio es un estudio artístico dedicado al diseño y realización de tatuajes personalizados. El sitio web tiene como finalidad mostrar el portafolio del estudio, facilitar el contacto con posibles clientes y permitir la solicitud de cotizaciones o reservas.

La información publicada en el sitio web tiene fines informativos y puede ser modificada en cualquier momento sin previo aviso.

3. Uso del sitio web

El usuario se compromete a utilizar este sitio web únicamente con fines legítimos y de acuerdo con la legislación aplicable.

Queda prohibido:

* proporcionar información falsa o engañosa
* utilizar el sitio para actividades ilegales
* intentar acceder a áreas restringidas del sistema
* interferir con el funcionamiento del sitio web
* enviar archivos maliciosos o virus informáticos

333 Tattoo Studio se reserva el derecho de restringir el acceso a usuarios que incumplan estas condiciones.

4. Solicitudes de cotización

El sitio web permite a los usuarios enviar solicitudes de cotización para tatuajes mediante formularios.

Las cotizaciones proporcionadas por el estudio son únicamente estimaciones basadas en la información recibida y pueden variar dependiendo de factores como:

* tamaño del tatuaje
* nivel de detalle
* ubicación en el cuerpo
* tiempo de trabajo requerido
* condiciones de la piel del cliente

Una cotización enviada no constituye un acuerdo definitivo ni una cita confirmada.

5. Confirmación de citas

Las citas para tatuajes solo se consideran confirmadas cuando el estudio lo comunique expresamente al cliente mediante los canales oficiales de contacto.

El estudio se reserva el derecho de aceptar o rechazar solicitudes según disponibilidad, criterios artísticos o políticas internas.

6. Depósitos y reservas

En algunos casos se podrá solicitar un depósito para asegurar la reserva de una cita.

El depósito tiene como finalidad garantizar el tiempo reservado para el cliente y cubrir el trabajo de preparación del diseño.

Los depósitos podrán ser no reembolsables en caso de cancelaciones tardías, ausencias del cliente o incumplimiento de las condiciones acordadas.

7. Cancelaciones y reprogramaciones

El cliente puede solicitar cambios en su cita con anticipación razonable.

333 Tattoo Studio se reserva el derecho de aplicar condiciones adicionales en caso de:

* cancelaciones con poca anticipación
* repetidas reprogramaciones
* ausencia del cliente en la cita

El estudio también podrá reprogramar citas por motivos de fuerza mayor, enfermedad del artista o circunstancias operativas.

8. Edad mínima

Para recibir un tatuaje el cliente debe tener al menos 18 años de edad o cumplir con los requisitos legales establecidos por la legislación aplicable.

El estudio podrá solicitar un documento de identidad para verificar la edad del cliente.

En caso de no cumplir con los requisitos legales, el estudio se reserva el derecho de rechazar el servicio.

9. Condiciones de salud

El cliente es responsable de informar al estudio sobre cualquier condición médica relevante antes del procedimiento de tatuaje, incluyendo pero no limitado a:

* alergias
* enfermedades de la piel
* diabetes
* embarazo
* problemas de coagulación
* uso de medicamentos anticoagulantes
* infecciones o afecciones dermatológicas

La omisión de información médica relevante puede aumentar el riesgo de complicaciones y será responsabilidad exclusiva del cliente.

10. Riesgos del procedimiento

El cliente reconoce que el tatuaje es un procedimiento que implica ciertos riesgos, incluyendo:

* irritación de la piel
* infecciones
* reacciones alérgicas
* inflamación o enrojecimiento
* cicatrización irregular

Al solicitar el servicio, el cliente acepta dichos riesgos y reconoce que los resultados pueden variar dependiendo de factores biológicos individuales.

11. Resultados artísticos

Los tatuajes son obras artísticas realizadas manualmente sobre la piel humana.

El cliente entiende que el resultado final puede diferir de la imagen de referencia debido a factores como:

* textura de la piel
* cicatrización
* adaptación del diseño
* técnica del artista

333 Tattoo Studio no garantiza resultados idénticos a imágenes de referencia proporcionadas por el cliente.

12. Diseños y propiedad intelectual

Los diseños creados por el artista son propiedad intelectual del tatuador o del estudio.

El cliente adquiere el derecho de portar el tatuaje en su cuerpo, pero no adquiere derechos comerciales sobre el diseño.

Queda prohibida la reproducción, venta o uso comercial del diseño sin autorización del artista.

13. Uso de imágenes del trabajo realizado

El estudio podrá tomar fotografías de los tatuajes realizados con fines de:

* portafolio
* promoción
* redes sociales
* material publicitario

Si el cliente desea que su tatuaje no sea fotografiado o publicado, deberá informarlo previamente al artista.

14. Conducta del cliente

El estudio se reserva el derecho de rechazar o cancelar un servicio si el cliente:

* se presenta bajo efectos de alcohol o drogas
* muestra comportamiento agresivo o irrespetuoso
* pone en riesgo la seguridad del personal o del estudio

15. Limitación de responsabilidad

333 Tattoo Studio no será responsable por:

* complicaciones derivadas del incumplimiento de cuidados posteriores
* reacciones alérgicas no informadas previamente
* cambios en el tatuaje causados por cicatrización natural
* decisiones tomadas por el usuario basadas en información del sitio web

16. Cuidados posteriores

El cliente recibirá instrucciones de cuidado posterior para asegurar la correcta cicatrización del tatuaje.

El estudio no será responsable por daños causados por el incumplimiento de dichas instrucciones.

17. Disponibilidad del sitio web

333 Tattoo Studio no garantiza que el sitio web esté disponible de forma continua o libre de errores.

El estudio puede modificar o suspender el sitio web en cualquier momento.

18. Modificaciones de los términos

333 Tattoo Studio se reserva el derecho de actualizar o modificar estos términos y condiciones en cualquier momento.

Las modificaciones entrarán en vigor una vez publicadas en el sitio web.

19. Legislación aplicable

Estos términos y condiciones se rigen por la legislación aplicable en la jurisdicción donde opera el estudio.

Cualquier disputa será resuelta conforme a dicha legislación.

20. Contacto

Para consultas relacionadas con estos términos y condiciones, los usuarios pueden comunicarse con 333 Tattoo Studio a través de los medios de contacto disponibles en el sitio web.

</p>`,
  consentimiento: `<h1>CONSENTIMIENTO INFORMADO</h1>
<p>CONSENTIMIENTO INFORMADO PARA PROCEDIMIENTO DE TATUAJE
333 Tattoo Studio

Última actualización: 2026

1. Declaración de mayoría de edad

Declaro bajo mi responsabilidad que tengo al menos 18 años de edad o que cumplo con los requisitos legales necesarios para recibir un tatuaje según la legislación aplicable.

Acepto que el estudio puede solicitar un documento de identidad para verificar mi edad antes de realizar el procedimiento.

2. Consentimiento voluntario

Declaro que solicito voluntariamente la realización de un tatuaje y que entiendo que se trata de un procedimiento permanente realizado mediante la inserción de pigmentos en la piel utilizando agujas especializadas.

Entiendo que este procedimiento implica perforaciones en la piel y que pueden existir riesgos asociados.

3. Riesgos del procedimiento

Reconozco que los posibles riesgos asociados al tatuaje incluyen, entre otros:

* irritación o inflamación de la piel
* infecciones cutáneas
* reacciones alérgicas a pigmentos o materiales
* sangrado leve durante el procedimiento
* cicatrización irregular
* cambios en el color o apariencia del tatuaje con el tiempo

Entiendo que estos riesgos pueden variar dependiendo de mi tipo de piel, estado de salud y cuidados posteriores.

4. Condiciones de salud

Declaro que he informado al tatuador sobre cualquier condición médica relevante que pueda afectar el procedimiento o la cicatrización, incluyendo pero no limitado a:

* alergias conocidas
* enfermedades de la piel
* diabetes
* epilepsia
* problemas de coagulación
* uso de medicamentos anticoagulantes
* embarazo o sospecha de embarazo
* infecciones activas

Acepto que ocultar información médica puede aumentar el riesgo de complicaciones y eximo al estudio de responsabilidad en caso de haber omitido información relevante.

5. Resultados del tatuaje

Entiendo que el tatuaje es una forma de arte aplicada sobre la piel humana y que el resultado final puede variar debido a factores como:

* características individuales de la piel
* proceso natural de cicatrización
* adaptación del diseño al cuerpo
* envejecimiento de la piel con el tiempo

Acepto que el resultado final puede no ser idéntico a una imagen de referencia o diseño preliminar.

6. Permanencia del tatuaje

Reconozco que los tatuajes son permanentes y que su eliminación puede ser difícil, costosa o dolorosa.

También entiendo que los tatuajes pueden desvanecerse, cambiar de color o requerir retoques con el tiempo.

7. Cuidados posteriores

Acepto que el tatuador me proporcionará instrucciones de cuidado posterior para ayudar a una correcta cicatrización del tatuaje.

Me comprometo a seguir dichas instrucciones cuidadosamente.

Entiendo que el incumplimiento de estas recomendaciones puede provocar infecciones, pérdida de color o daño al tatuaje.

En tales casos, el estudio no será responsable por los resultados.

8. Uso de fotografías

Autorizo al estudio a tomar fotografías del tatuaje realizado para fines de:

* portafolio artístico
* promoción del trabajo del artista
* publicaciones en redes sociales

Si no deseo que el tatuaje sea fotografiado o publicado, me comprometo a informarlo antes del procedimiento.

9. Conducta durante el procedimiento

Acepto comportarme de manera respetuosa durante mi visita al estudio y seguir las indicaciones del artista.

Entiendo que el estudio puede suspender o cancelar el procedimiento si mi comportamiento pone en riesgo la seguridad del personal o del establecimiento.

10. Limitación de responsabilidad

Al firmar este documento reconozco que:

* he recibido información suficiente sobre el procedimiento
* he tenido oportunidad de hacer preguntas
* acepto los riesgos inherentes al tatuaje

Libero a 333 Tattoo Studio y a sus artistas de responsabilidad por complicaciones derivadas de:

* información médica no revelada
* incumplimiento de cuidados posteriores
* reacciones inesperadas del cuerpo al procedimiento

11. Aceptación del consentimiento

Declaro que he leído completamente este documento, que entiendo su contenido y que doy mi consentimiento voluntario para la realización del tatuaje.

Nombre del cliente:

Firma del cliente:

Fecha:

Nombre del artista:

</p>`
};

function openLegalModal(type) {
  const modal = document.getElementById("legalModal");
  const content = document.getElementById("legalContent");
  
  // Aquí podrías copiar el texto completo de tus archivos .html si lo prefieres
  // Por ahora cargamos el objeto legalTexts
  if (legalTexts[type]) {
    content.innerHTML = legalTexts[type];
    modal.style.display = "block";
    document.body.style.overflow = "hidden"; // Evitar scroll de fondo
  }
}

// Cerrar modal al hacer clic en la X o fuera del contenido
document.addEventListener("click", (e) => {
  const modal = document.getElementById("legalModal");
  if (e.target.classList.contains("close-modal") || e.target === modal) {
    modal.style.display = "none";
    document.body.style.overflow = "auto";
  }
});