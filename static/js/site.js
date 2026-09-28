document.documentElement.classList.add("js-enabled");

const menuToggle = document.querySelector(".menu-toggle");
const navContent = document.querySelector(".nav-content");
const menuCloseButton = document.querySelector(".nav-menu-close");
const menuBackdrop = document.querySelector(".menu-backdrop");

function closeMenu({ restoreFocus = false } = {}) {
    if (!menuToggle || !navContent) return;
    menuToggle.setAttribute("aria-expanded", "false");
    menuToggle.setAttribute("aria-label", "Abrir menú");
    navContent.classList.remove("is-open");
    document.body.classList.remove("menu-open");
    navContent.inert = window.innerWidth <= 820;
    navContent.setAttribute("aria-hidden", String(window.innerWidth <= 820));
    if (menuBackdrop) {
        menuBackdrop.hidden = true;
        menuBackdrop.setAttribute("aria-hidden", "true");
    }
    if (restoreFocus) menuToggle.focus();
}

if (menuToggle && navContent) {
    if (window.innerWidth <= 820) {
        navContent.inert = true;
        navContent.setAttribute("aria-hidden", "true");
    }

    menuToggle.addEventListener("click", () => {
        const isOpen = menuToggle.getAttribute("aria-expanded") === "true";
        if (isOpen) {
            closeMenu({ restoreFocus: true });
            return;
        }

        menuToggle.setAttribute("aria-expanded", "true");
        menuToggle.setAttribute("aria-label", "Cerrar menú");
        navContent.classList.add("is-open");
        navContent.inert = false;
        navContent.setAttribute("aria-hidden", "false");
        document.body.classList.add("menu-open");
        if (menuBackdrop) {
            menuBackdrop.hidden = false;
            menuBackdrop.setAttribute("aria-hidden", "false");
        }
        menuCloseButton?.focus();
    });

    navContent.querySelectorAll("a").forEach((link) => {
        link.addEventListener("click", () => closeMenu());
    });

    menuCloseButton?.addEventListener("click", () => closeMenu({ restoreFocus: true }));
    menuBackdrop?.addEventListener("click", () => closeMenu({ restoreFocus: true }));

    document.addEventListener("keydown", (event) => {
        if (menuToggle.getAttribute("aria-expanded") !== "true") return;
        if (event.key === "Escape") {
            closeMenu({ restoreFocus: true });
            return;
        }

        if (event.key === "Tab") {
            const focusableElements = [...navContent.querySelectorAll("a[href], button:not([disabled])")];
            const firstElement = focusableElements[0];
            const lastElement = focusableElements.at(-1);
            if (event.shiftKey && document.activeElement === firstElement) {
                event.preventDefault();
                lastElement?.focus();
            } else if (!event.shiftKey && document.activeElement === lastElement) {
                event.preventDefault();
                firstElement?.focus();
            }
        }
    });

    window.addEventListener("resize", () => {
        if (window.innerWidth > 820) {
            closeMenu();
        } else if (menuToggle.getAttribute("aria-expanded") !== "true") {
            navContent.inert = true;
            navContent.setAttribute("aria-hidden", "true");
        }
    });
}

const revealElements = document.querySelectorAll(".reveal");
const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
let revealObserver = null;

if ("IntersectionObserver" in window && !reducedMotion) {
    revealObserver = new IntersectionObserver((entries, observer) => {
        entries.forEach((entry) => {
            if (entry.isIntersecting) {
                entry.target.classList.add("is-visible");
                observer.unobserve(entry.target);
            }
        });
    }, { threshold: 0.12 });

    revealElements.forEach((element) => revealObserver.observe(element));
} else {
    revealElements.forEach((element) => element.classList.add("is-visible"));
}

function observeRevealElements(elements) {
    elements.forEach((element) => {
        if (revealObserver) {
            revealObserver.observe(element);
        } else {
            element.classList.add("is-visible");
        }
    });
}

const heroProductStage = document.querySelector("[data-hero-parallax]");
if (heroProductStage && !reducedMotion && window.matchMedia("(pointer: fine)").matches) {
    heroProductStage.addEventListener("pointermove", (event) => {
        const bounds = heroProductStage.getBoundingClientRect();
        const horizontalPosition = (event.clientX - bounds.left) / bounds.width - 0.5;
        const verticalPosition = (event.clientY - bounds.top) / bounds.height - 0.5;
        heroProductStage.style.setProperty("--hero-tilt-x", `${-verticalPosition * 3}deg`);
        heroProductStage.style.setProperty("--hero-tilt-y", `${horizontalPosition * 3}deg`);
    });

    heroProductStage.addEventListener("pointerleave", () => {
        heroProductStage.style.setProperty("--hero-tilt-x", "0deg");
        heroProductStage.style.setProperty("--hero-tilt-y", "0deg");
    });
}

const VALEO_WHATSAPP_NUMBER = "573212533995";
const QUOTE_STORAGE_KEY = "valeo-quote-items-v1";
let catalogDataPromise = null;

const loadCatalogData = () => {
    if (!catalogDataPromise) {
        catalogDataPromise = (async () => {
            const response = await fetch("/static/data/catalogo-productos.json");
            if (!response.ok) {
                throw new Error(`Catálogo no disponible: HTTP ${response.status}`);
            }

            const data = await response.json();
            if (!Array.isArray(data.categories) || data.categories.length !== 3 || !Array.isArray(data.products) || data.products.length === 0) {
                throw new Error("El archivo de catálogo no contiene las tres categorías y sus productos.");
            }

            return data;
        })();
    }
    return catalogDataPromise;
};

const initializeHeroCarousel = (data) => {
    const stage = document.querySelector("[data-hero-parallax]");
    if (!stage) return;

    const cards = [...stage.querySelectorAll("[data-hero-product-card]")];
    const categories = data.categories;
    const productQueues = new Map(categories.map((category) => {
        const categoryProducts = data.products.filter((product) => product.category === category.id);
        for (let index = categoryProducts.length - 1; index > 0; index -= 1) {
            const swapIndex = Math.floor(Math.random() * (index + 1));
            [categoryProducts[index], categoryProducts[swapIndex]] = [categoryProducts[swapIndex], categoryProducts[index]];
        }
        return [category.id, { products: categoryProducts, index: 0 }];
    }));
    const totalLabel = stage.querySelector("[data-hero-product-total]");
    const pauseButton = stage.querySelector("[data-hero-carousel-toggle]");
    const previousButton = stage.querySelector("[data-hero-carousel-prev]");
    const nextButton = stage.querySelector("[data-hero-carousel-next]");
    const initialCards = cards.map((card) => {
        const image = card.querySelector("img");
        return { card, image, category: card.dataset.heroProductCard };
    });
    let isPaused = reducedMotion;
    let isChanging = false;
    let rotationTimer = null;

    if (totalLabel) {
        totalLabel.textContent = `${data.products.length} referencias · ${categories.length} líneas`;
    }

    initialCards.forEach(({ card, image, category: categoryId }) => {
        const queue = productQueues.get(categoryId);
        const category = categories.find((item) => item.id === categoryId);
        const product = queue.products[queue.index];
        image.src = product.image;
        image.alt = `${product.name}, repuesto real para ${category.name.toLowerCase()} del catálogo Valeo`;
        card.querySelector("[data-hero-product-category]").textContent = category.name.toUpperCase();
        card.querySelector("[data-hero-product-name]").textContent = product.name;
        card.dataset.heroProductId = product.id;
    });

    const updatePauseButton = () => {
        if (!pauseButton) return;
        pauseButton.textContent = isPaused ? "▶" : "Ⅱ";
        pauseButton.setAttribute("aria-label", isPaused ? "Reanudar carrusel" : "Pausar carrusel");
        pauseButton.setAttribute("aria-pressed", String(isPaused));
    };

    const preloadProduct = async (product) => {
        const image = new Image();
        image.src = product.image;
        await image.decode();
    };

    const moveCarousel = async (direction = 1) => {
        if (isChanging) return;

        const nextCards = initialCards.map(({ category }) => {
            const queue = productQueues.get(category);
            queue.index = (queue.index + direction + queue.products.length) % queue.products.length;
            return {
                category: categories.find((item) => item.id === category),
                product: queue.products[queue.index]
            };
        });

        isChanging = true;
        try {
            await Promise.all(nextCards.map(({ product }) => preloadProduct(product)));
            cards.forEach((card) => card.classList.add("is-changing"));
            await new Promise((resolve) => window.setTimeout(resolve, reducedMotion ? 0 : 180));

            initialCards.forEach(({ card, image, category: categoryId }, index) => {
                const { category, product } = nextCards[index];
                image.src = product.image;
                image.alt = `${product.name}, repuesto real para ${category.name.toLowerCase()} del catálogo Valeo`;
                card.querySelector("[data-hero-product-category]").textContent = category.name.toUpperCase();
                card.querySelector("[data-hero-product-name]").textContent = product.name;
                card.dataset.heroProductId = product.id;
                card.dataset.heroProductCard = categoryId;
            });

            requestAnimationFrame(() => {
                cards.forEach((card) => card.classList.remove("is-changing"));
                isChanging = false;
            });
        } catch (error) {
            console.error("No fue posible actualizar las fotografías del carrusel.", error);
            isChanging = false;
        }
    };

    const startRotation = () => {
        if (rotationTimer !== null) window.clearInterval(rotationTimer);
        rotationTimer = null;
        if (!isPaused) {
            rotationTimer = window.setInterval(() => {
                if (!document.hidden) moveCarousel(1);
            }, 4800);
        }
    };

    pauseButton?.addEventListener("click", () => {
        isPaused = !isPaused;
        updatePauseButton();
        startRotation();
    });
    previousButton?.addEventListener("click", () => moveCarousel(-1));
    nextButton?.addEventListener("click", () => moveCarousel(1));
    document.addEventListener("visibilitychange", startRotation);

    updatePauseButton();
    startRotation();
};

const productSection = document.querySelector("#productos");
const quoteDialog = document.querySelector("#quote-dialog");
const privacyDialog = document.querySelector("#privacy-dialog");
const quoteForm = document.querySelector("#quote-form");
const quoteItemsContainer = document.querySelector("[data-quote-items]");
const quoteEmpty = document.querySelector("[data-quote-empty]");
const quoteStatus = document.querySelector("[data-quote-status]");
const quoteSuccess = document.querySelector("[data-quote-success]");
const quoteError = document.querySelector("[data-quote-error]");
const quoteSubmitButton = quoteForm?.querySelector(".quote-submit-button");
const quoteSubmitNote = quoteForm?.querySelector(".quote-submit-note");
const quoteCustomerFields = quoteForm?.querySelector(".quote-fields");
const quoteConsent = quoteForm?.querySelector(".quote-consent");
const quoteColorPattern = /\bcolores\b|\b(?:gris,\s*)?blanc[oa]\s+y\s+negr[oa]\b|\bgris,\s*blanca\b/i;
const quoteColorOptions = ["Azul", "Rojo", "Negro", "Gris", "Blanco", "Verde", "Amarillo"];
let quoteProducts = [];
let quoteItems = [];
let storedQuoteItems = [];
let quoteRequestPending = false;
let quoteRequestAccepted = false;

const cleanWhatsappValue = (value) => {
    if (typeof value !== "string" && typeof value !== "number") return "";
    const text = String(value).replace(/[\u0000-\u001f\u007f]/g, " ").replace(/\s+/g, " ").trim();
    return /^(?:undefined|null|nan|\[object object\])$/i.test(text) ? "" : text;
};

const createWhatsAppUrl = (message) =>
    `https://wa.me/${VALEO_WHATSAPP_NUMBER}?text=${encodeURIComponent(message)}`;

try {
    const storedQuote = JSON.parse(window.localStorage.getItem(QUOTE_STORAGE_KEY) || "[]");
    if (Array.isArray(storedQuote)) {
        storedQuoteItems = storedQuote;
    }
} catch (error) {
    console.error("No fue posible recuperar la cotización guardada en este navegador.", error);
}

const productHasColorVariants = (product) => quoteColorPattern.test(product.name);
const createQuoteId = (productId) => `${productId}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
const normalizeQuoteColor = (color) => color.trim().toLocaleLowerCase();
const isPresetQuoteColor = (color) => quoteColorOptions.some(
    (option) => normalizeQuoteColor(option) === normalizeQuoteColor(color)
);

const normalizeStoredQuoteItems = (storedItems, products) => {
    const normalizedItems = new Map();
    const validProducts = new Map(products.map((product) => [product.id, product]));
    const addVariant = (line, color, quantity) => {
        const normalizedColor = normalizeQuoteColor(color);
        const existingVariant = line.variants.find((variant) =>
            normalizeQuoteColor(variant.color) === normalizedColor
        );
        if (existingVariant) {
            existingVariant.quantity = Math.min(1_000_000, existingVariant.quantity + quantity);
        } else {
            line.variants.push({
                variantId: createQuoteId(line.productId),
                color,
                quantity,
                customColor: Boolean(color) && !isPresetQuoteColor(color)
            });
        }
    };

    storedItems.forEach((item) => {
        if (!item || typeof item.productId !== "string") return;
        const product = validProducts.get(item.productId);
        if (!product) return;
        const hasColorVariants = productHasColorVariants(product);
        let line = normalizedItems.get(product.id);
        if (!line) {
            line = {
                lineId: createQuoteId(product.id),
                productId: product.id,
                quantity: 0,
                variants: []
            };
            normalizedItems.set(product.id, line);
        }

        if (!hasColorVariants) {
            if (Number.isInteger(item.quantity) && item.quantity > 0) {
                line.quantity = Math.min(1_000_000, line.quantity + item.quantity);
            }
            return;
        }

        if (Array.isArray(item.variants)) {
            item.variants.forEach((variant) => {
                if (
                    variant &&
                    typeof variant.color === "string" &&
                    variant.color.length <= 60 &&
                    Number.isInteger(variant.quantity) &&
                    variant.quantity > 0
                ) {
                    addVariant(line, variant.color.trim(), variant.quantity);
                }
            });
        } else if (
            Number.isInteger(item.quantity) &&
            item.quantity > 0 &&
            typeof item.color === "string" &&
            item.color.length <= 60
        ) {
            addVariant(line, item.color.trim(), item.quantity);
        }
    });

    return [...normalizedItems.values()];
};

const saveQuoteItems = () => {
    try {
        window.localStorage.setItem(QUOTE_STORAGE_KEY, JSON.stringify(quoteItems));
    } catch (error) {
        console.error("No fue posible guardar la cotización en este navegador.", error);
        if (quoteStatus) quoteStatus.textContent = "El navegador no permite guardar la selección; mantenla abierta hasta solicitarla.";
    }
};

const updateQuoteCount = () => {
    document.querySelectorAll("[data-quote-count]").forEach((count) => {
        count.textContent = String(quoteItems.length);
    });
    const variantCount = quoteItems.reduce(
        (total, line) => total + line.variants.filter((variant) => variant.color.trim()).length,
        0
    );
    const summary = quoteDialog?.querySelector("[data-quote-summary]");
    if (summary) {
        const productLabel = quoteItems.length === 1 ? "producto" : "productos";
        const variantLabel = variantCount === 1 ? "variante de color" : "variantes de color";
        summary.textContent = variantCount
            ? `${quoteItems.length} ${productLabel} · ${variantCount} ${variantLabel}`
            : `${quoteItems.length} ${productLabel}`;
    }
    const floatingWhatsapp = document.querySelector(".floating-whatsapp");
    if (floatingWhatsapp) {
        const lines = getWhatsappQuoteLines();
        const message = lines.length
            ? buildQuoteWhatsappMessage(lines)
            : "Hola, Industrias Valeo. Quisiera recibir información sobre sus repuestos para ventiladores, licuadoras y ollas a presión.";
        floatingWhatsapp.href = createWhatsAppUrl(message);
    }
};

const buildQuoteWhatsappMessage = (lines, customer = null, quoteId = null) => {
    if (!Array.isArray(lines) || lines.length === 0) return "";
    const validQuoteId = Number.isSafeInteger(Number(quoteId)) && Number(quoteId) > 0
        ? String(Number(quoteId))
        : "";
    const messageLines = [
        "Hola, Industrias Valeo.",
        `Quiero continuar con mi solicitud de cotización${validQuoteId ? ` #${validQuoteId}` : ""}.`
    ];
    if (customer) {
        const name = cleanWhatsappValue(customer.name);
        const city = cleanWhatsappValue(customer.city);
        const phone = cleanWhatsappValue(customer.phone);
        if (!name || !city || !phone) return "";
        messageLines.push("", `Nombre: ${name}`, `Ciudad: ${city}`, `Celular: ${phone}`);
    }
    messageLines.push("", "Productos solicitados:", "");

    let productNumber = 0;
    lines.forEach((line) => {
        const name = cleanWhatsappValue(line.name);
        if (!name) return;
        const validVariants = line.variants.filter((variant) => {
            const quantity = Number(variant.quantity);
            return Number.isInteger(quantity) && quantity > 0 && quantity <= 1_000_000;
        });
        if (!validVariants.length) return;
        productNumber += 1;
        messageLines.push(`${productNumber}. ${name}`);
        validVariants.forEach((variant) => {
            const color = cleanWhatsappValue(variant.color);
            const quantity = Number(variant.quantity);
            const unitLabel = quantity === 1 ? "unidad" : "unidades";
            messageLines.push(`   • ${color ? `${color} — ` : ""}${quantity} ${unitLabel}`);
        });
        messageLines.push("");
    });

    if (!productNumber) return "";
    messageLines.push("Gracias.");
    return messageLines.join("\n").trim();
};

const getWhatsappQuoteLines = () => {
    if (!quoteItems.length || !quoteHasValidItems()) return [];
    return quoteItems.flatMap((line) => {
        const product = quoteProducts.find((item) => item.id === line.productId);
        const name = cleanWhatsappValue(product?.name);
        if (!name) return [];
        const variants = productHasColorVariants(product)
            ? line.variants.map((variant) => ({ color: variant.color, quantity: variant.quantity }))
            : [{ color: "", quantity: line.quantity }];
        return [{ name, variants }];
    });
};

const quoteHasValidItems = () => quoteItems.every((line) => {
    const product = quoteProducts.find((item) => item.id === line.productId);
    if (!product) return false;
    if (!productHasColorVariants(product)) {
        return Number.isInteger(line.quantity) && line.quantity > 0 && line.quantity <= 1_000_000;
    }
    if (!Array.isArray(line.variants)) return false;
    const colors = line.variants.map((variant) => normalizeQuoteColor(variant.color));
    const hasUniqueColors = new Set(colors.filter(Boolean)).size === colors.filter(Boolean).length;
    return line.variants.length > 0 && line.variants.every((variant) =>
        variant.color.trim().length > 0 &&
        Number.isInteger(variant.quantity) &&
        variant.quantity > 0 &&
        variant.quantity <= 1_000_000
    ) && hasUniqueColors;
});

const updateQuoteSubmitButton = () => {
    if (quoteSubmitButton) {
        quoteSubmitButton.disabled = quoteItems.length === 0 || !quoteHasValidItems() || quoteRequestPending || quoteRequestAccepted;
        quoteSubmitButton.hidden = quoteRequestAccepted;
    }
};

const resetQuoteRequestAccepted = () => {
    if (!quoteRequestAccepted) return;
    quoteRequestAccepted = false;
    quoteSuccess.hidden = true;
    if (quoteSubmitNote) quoteSubmitNote.hidden = false;
    if (quoteCustomerFields) quoteCustomerFields.hidden = false;
    if (quoteConsent) quoteConsent.hidden = false;
    updateQuoteSubmitButton();
};

const renderQuoteItems = () => {
    if (!quoteItemsContainer) return;
    quoteItemsContainer.replaceChildren();
    if (quoteEmpty) quoteEmpty.hidden = quoteItems.length > 0;

    quoteItems.forEach((line) => {
        const product = quoteProducts.find((item) => item.id === line.productId);
        if (!product) return;

        const article = document.createElement("article");
        article.className = "quote-item";
        const image = document.createElement("img");
        image.src = product.image;
        image.alt = "";
        image.loading = "lazy";
        const details = document.createElement("div");
        details.className = "quote-item-details";
        details.append(createQuoteText("span", "overline", product.group));
        details.append(createQuoteText("strong", "", product.name));

        if (productHasColorVariants(product)) {
            const variantList = document.createElement("div");
            variantList.className = "quote-variant-list";
            const variantHeader = document.createElement("div");
            variantHeader.className = "quote-variant-header";
            variantHeader.append(
                createQuoteText("span", "", "Color de interés"),
                createQuoteText("span", "", "Cantidad")
            );
            variantList.append(variantHeader);

            line.variants.forEach((variant) => {
                const variantRow = document.createElement("div");
                variantRow.className = "quote-variant-row";
                const colorLabel = document.createElement("label");
                colorLabel.className = "quote-variant-color";
                colorLabel.append(createQuoteText("span", "visually-hidden", `Color de interés para ${product.name}`));
                const colorSelect = document.createElement("select");
                colorSelect.dataset.quoteVariantColor = variant.variantId;
                colorSelect.setAttribute("aria-label", `Color de interés para ${product.name}`);
                const placeholder = document.createElement("option");
                placeholder.value = "";
                placeholder.textContent = "Seleccionar color";
                colorSelect.append(placeholder);

                const selectedColorIsPreset = isPresetQuoteColor(variant.color);
                quoteColorOptions.forEach((color) => {
                    const option = document.createElement("option");
                    option.value = color;
                    option.textContent = color;
                    option.disabled = line.variants.some((other) =>
                        other.variantId !== variant.variantId &&
                        normalizeQuoteColor(other.color) === normalizeQuoteColor(color)
                    );
                    colorSelect.append(option);
                });
                const otherOption = document.createElement("option");
                otherOption.value = "__other__";
                otherOption.textContent = "Otro color…";
                colorSelect.append(otherOption);
                const isCustomColor = variant.customColor || (Boolean(variant.color) && !selectedColorIsPreset);
                colorSelect.value = isCustomColor ? "__other__" : variant.color || "";
                colorLabel.append(colorSelect);
                variantRow.append(colorLabel);

                if (isCustomColor) {
                    const customColor = document.createElement("input");
                    customColor.type = "text";
                    customColor.className = "quote-custom-color";
                    customColor.value = selectedColorIsPreset ? "" : variant.color;
                    customColor.maxLength = 60;
                    customColor.placeholder = "Especifica el color";
                    customColor.dataset.quoteVariantCustomColor = variant.variantId;
                    customColor.setAttribute("aria-label", `Especifica otro color para ${product.name}`);
                    variantRow.append(customColor);
                    const colorError = createQuoteText("span", "quote-color-error", "Ese color ya está agregado para este producto.");
                    colorError.dataset.quoteColorError = "";
                    colorError.hidden = true;
                    variantRow.append(colorError);
                }

                const quantityLabel = document.createElement("label");
                quantityLabel.className = "quote-variant-quantity";
                quantityLabel.append(createQuoteText("span", "visually-hidden", `Cantidad de ${variant.color || "este color"}`));
                const quantityInput = document.createElement("input");
                quantityInput.type = "number";
                quantityInput.min = "1";
                quantityInput.max = "1000000";
                quantityInput.step = "1";
                quantityInput.value = String(variant.quantity);
                quantityInput.inputMode = "numeric";
                quantityInput.dataset.quoteVariantQuantity = variant.variantId;
                quantityInput.setAttribute("aria-label", `Cantidad de ${variant.color || "este color"} para ${product.name}`);
                quantityLabel.append(quantityInput);

                const removeColorButton = createQuoteText("button", "quote-remove-button quote-remove-color", "×");
                removeColorButton.type = "button";
                removeColorButton.dataset.quoteRemoveVariant = variant.variantId;
                removeColorButton.setAttribute("aria-label", `Quitar color ${variant.color || "sin seleccionar"} de ${product.name}`);
                variantRow.append(quantityLabel, removeColorButton);
                variantList.append(variantRow);
            });

            const addVariantButton = createQuoteText("button", "quote-add-color-button", "+ Agregar otro color");
            addVariantButton.type = "button";
            addVariantButton.dataset.quoteAddColor = line.productId;
            details.append(variantList);
            details.append(addVariantButton);
        } else {
            const controls = document.createElement("div");
            controls.className = "quote-item-controls";
            const quantityLabel = document.createElement("label");
            quantityLabel.append(document.createTextNode("Cantidad"));
            const quantityInput = document.createElement("input");
            quantityInput.type = "number";
            quantityInput.min = "1";
            quantityInput.max = "1000000";
            quantityInput.step = "1";
            quantityInput.value = String(line.quantity);
            quantityInput.inputMode = "numeric";
            quantityInput.dataset.quoteQuantity = line.lineId;
            quantityInput.setAttribute("aria-label", `Cantidad solicitada de ${product.name}`);
            quantityLabel.append(quantityInput);
            controls.append(quantityLabel);
            details.append(controls);
        }

        const removeButton = createQuoteText("button", "quote-remove-button", "Quitar");
        removeButton.type = "button";
        removeButton.className = "quote-remove-button quote-remove-product";
        removeButton.dataset.quoteRemoveProduct = line.productId;
        removeButton.textContent = "Quitar producto";
        article.append(image, details, removeButton);
        quoteItemsContainer.append(article);
    });

    updateQuoteCount();
    updateQuoteSubmitButton();
};

const createQuoteText = (tagName, className, text) => {
    const element = document.createElement(tagName);
    if (className) element.className = className;
    element.textContent = text || "";
    return element;
};

document.addEventListener("click", (event) => {
    const button = event.target.closest("[data-open-quote]");
    if (!button) return;
    event.preventDefault();
    if (!quoteDialog?.open) quoteDialog?.showModal();
    renderQuoteItems();
    if (quoteStatus && quoteItems.length === 0) {
        quoteStatus.textContent = "Primero agrega al menos un producto desde el catálogo.";
    }
});

document.querySelectorAll("[data-open-privacy]").forEach((button) => {
    button.addEventListener("click", (event) => {
        event.preventDefault();
        privacyDialog?.showModal();
    });
});

quoteItemsContainer?.addEventListener("input", (event) => {
    const target = event.target;
    resetQuoteRequestAccepted();
    const variantId = target.dataset.quoteVariantCustomColor || target.dataset.quoteVariantQuantity;
    if (target.dataset.quoteVariantCustomColor) {
        const variant = quoteItems.flatMap((line) => line.variants).find((item) => item.variantId === variantId);
        if (!variant) return;
        variant.color = target.value.trim().slice(0, 60);
        variant.customColor = true;
        const line = quoteItems.find((item) => item.variants.includes(variant));
        const duplicateColor = line?.variants.some((other) =>
            other.variantId !== variant.variantId &&
            normalizeQuoteColor(other.color) === normalizeQuoteColor(variant.color)
        );
        const colorError = target.closest(".quote-variant-row")?.querySelector("[data-quote-color-error]");
        if (colorError) colorError.hidden = !duplicateColor;
        target.setAttribute("aria-invalid", String(Boolean(duplicateColor)));
        saveQuoteItems();
        updateQuoteSubmitButton();
        return;
    }

    const lineId = target.dataset.quoteQuantity;
    const line = quoteItems.find((item) => item.lineId === lineId);
    const variant = variantId && quoteItems.flatMap((item) => item.variants).find((item) => item.variantId === variantId);
    if (!line && !variant) return;
    if (target.dataset.quoteQuantity) {
        const quantity = Number.parseInt(target.value, 10);
        if (Number.isInteger(quantity) && quantity > 0 && quantity <= 1000000) line.quantity = quantity;
    }
    if (target.dataset.quoteVariantQuantity) {
        const quantity = Number.parseInt(target.value, 10);
        if (Number.isInteger(quantity) && quantity > 0 && quantity <= 1000000) variant.quantity = quantity;
    }
    saveQuoteItems();
    updateQuoteSubmitButton();
});

quoteItemsContainer?.addEventListener("change", (event) => {
    const target = event.target;
    const variantId = target.dataset.quoteVariantColor;
    if (!variantId) return;
    resetQuoteRequestAccepted();
    const variant = quoteItems.flatMap((line) => line.variants).find((item) => item.variantId === variantId);
    if (!variant) return;
    if (target.value === "__other__") {
        variant.color = "";
        variant.customColor = true;
    } else {
        variant.color = target.value;
        variant.customColor = false;
    }
    saveQuoteItems();
    renderQuoteItems();
});

quoteItemsContainer?.addEventListener("click", (event) => {
    const target = event.target.closest("button");
    if (!target) return;
    const removeProductId = target.dataset.quoteRemoveProduct;
    if (removeProductId) {
        resetQuoteRequestAccepted();
        quoteItems = quoteItems.filter((item) => item.productId !== removeProductId);
        saveQuoteItems();
        renderQuoteItems();
        return;
    }
    const removeVariantId = target.dataset.quoteRemoveVariant;
    if (removeVariantId) {
        resetQuoteRequestAccepted();
        quoteItems.forEach((line) => {
            line.variants = line.variants.filter((variant) => variant.variantId !== removeVariantId);
        });
        saveQuoteItems();
        renderQuoteItems();
        return;
    }
    const addColorProductId = target.dataset.quoteAddColor;
    if (addColorProductId) {
        resetQuoteRequestAccepted();
        const line = quoteItems.find((item) => item.productId === addColorProductId);
        if (!line) return;
        line.variants.push({
            variantId: createQuoteId(line.productId),
            color: "",
            quantity: 1
        });
        saveQuoteItems();
        renderQuoteItems();
    }
});

quoteForm?.addEventListener("input", resetQuoteRequestAccepted);
quoteForm?.addEventListener("change", resetQuoteRequestAccepted);

quoteForm?.addEventListener("submit", async (event) => {
    event.preventDefault();
    if (quoteRequestPending || quoteItems.length === 0 || !quoteHasValidItems() || !quoteForm.reportValidity()) return;

    const formData = new FormData(quoteForm);
    const customer = {
        name: cleanWhatsappValue(formData.get("name")),
        city: cleanWhatsappValue(formData.get("city")),
        phone: cleanWhatsappValue(formData.get("phone"))
    };
    if (!customer.name || !customer.city || !customer.phone || !quoteItems.length || !quoteHasValidItems()) {
        if (quoteStatus) quoteStatus.textContent = "Completa nombre, ciudad, celular y al menos un producto con cantidades válidas.";
        return;
    }
    const products = quoteItems.flatMap((line) => {
        const product = quoteProducts.find((item) => item.id === line.productId);
        if (!product) return [];
        if (productHasColorVariants(product)) {
            return [{
                nombre: cleanWhatsappValue(product.name),
                referencia: cleanWhatsappValue(product.id),
                variantes: line.variants.map((variant) => ({
                    color: cleanWhatsappValue(variant.color),
                    cantidad: variant.quantity
                }))
            }];
        }
        return [{
            nombre: cleanWhatsappValue(product.name),
            referencia: cleanWhatsappValue(product.id),
            cantidad: line.quantity
        }];
    });
    const whatsappLines = getWhatsappQuoteLines();
    const whatsappMessage = buildQuoteWhatsappMessage(whatsappLines, customer);
    if (!products.length || !whatsappMessage) {
        if (quoteStatus) quoteStatus.textContent = "No se pudo preparar un resumen válido de la cotización. Revisa los productos y sus cantidades.";
        return;
    }

    quoteRequestPending = true;
    if (quoteError) quoteError.hidden = true;
    if (quoteStatus) quoteStatus.textContent = "Enviando la solicitud de forma segura…";
    renderQuoteItems();
    try {
        const response = await fetch("/api/cotizaciones", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                nombre: customer.name,
                ciudad: customer.city,
                celular: customer.phone,
                productos
            })
        });
        let result;
        try {
            result = await response.json();
        } catch {
            throw new Error("El servidor no devolvió una confirmación válida.");
        }
        if (
            response.status !== 201 ||
            result?.ok !== true ||
            !Number.isSafeInteger(result.cotizacion_id) ||
            result.cotizacion_id < 1
        ) {
            throw new Error(typeof result?.detail === "string" ? result.detail : "No se confirmó el registro de la cotización.");
        }

        const whatsappLink = quoteDialog.querySelector("[data-quote-whatsapp]");
        const successWhatsappMessage = buildQuoteWhatsappMessage(
            whatsappLines,
            customer,
            result.cotizacion_id
        );
        whatsappLink.href = createWhatsAppUrl(successWhatsappMessage);
        quoteSuccess.querySelector("[data-quote-number]").textContent = `Número de solicitud: #${result.cotizacion_id}`;
        quoteRequestAccepted = true;
        if (quoteSubmitNote) quoteSubmitNote.hidden = true;
        if (quoteCustomerFields) quoteCustomerFields.hidden = true;
        if (quoteConsent) quoteConsent.hidden = true;
        quoteSuccess.hidden = false;
        if (quoteError) quoteError.hidden = true;
        if (quoteStatus) quoteStatus.textContent = "";
        renderQuoteItems();
    } catch (error) {
        console.error("No fue posible enviar la solicitud de cotización.", error);
        quoteError.querySelector("[data-quote-error-message]").textContent =
            "No pudimos registrar tu solicitud en este momento. Tu selección sigue guardada. Puedes intentarlo nuevamente o continuar por WhatsApp.";
        quoteError.querySelector("[data-quote-error-whatsapp]").href =
            createWhatsAppUrl(buildQuoteWhatsappMessage(whatsappLines, customer));
        quoteError.hidden = false;
        if (quoteStatus) quoteStatus.textContent = "";
    } finally {
        quoteRequestPending = false;
        updateQuoteSubmitButton();
    }
});

quoteForm?.addEventListener("click", (event) => {
    if (event.target.closest("[data-quote-retry]")) {
        quoteForm.requestSubmit();
    }
});

quoteDialog?.addEventListener("close", () => {
    if (!quoteRequestAccepted && quoteStatus) quoteStatus.textContent = "";
});

if (productSection) {
    const productBrowser = productSection.querySelector("#catalogo-productos");
    const productTabs = productSection.querySelector("#product-tabs");
    const productFilters = productSection.querySelector("#product-filters");
    const productGrid = productSection.querySelector("#product-grid");
    const productStatus = productSection.querySelector("#product-results-status");
    const productSearch = productSection.querySelector("#product-search");
    const productDialog = productSection.querySelector("#product-image-dialog");
    const productDialogImage = productSection.querySelector("#product-dialog-image");
    const productDialogName = productSection.querySelector("#product-dialog-title");
    const productDialogCategory = productSection.querySelector("#product-dialog-category");
    const productDialogWhatsapp = productSection.querySelector("#product-dialog-whatsapp");
    const catalogLinks = document.querySelectorAll(".catalog-item[data-product-category]");

    let categories = [];
    let products = [];
    let activeCategoryId = null;
    let activeGroupName = null;

    const createTextElement = (tagName, className, text) => {
        const element = document.createElement(tagName);
        if (className) element.className = className;
        element.textContent = text;
        return element;
    };

    const normalizeSearchText = (text) => text
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .toLocaleLowerCase()
        .trim();

    const scrollToProductBrowser = () => {
        productBrowser.scrollIntoView({
            behavior: reducedMotion ? "auto" : "smooth",
            block: "start"
        });
    };

    const renderTabs = () => {
        productTabs.replaceChildren();
        categories.forEach((category) => {
            const button = document.createElement("button");
            button.className = "product-tab";
            button.type = "button";
            button.id = `product-tab-${category.id}`;
            button.dataset.productCategory = category.id;
            button.setAttribute("role", "tab");
            button.setAttribute("aria-controls", "product-grid");
            button.setAttribute("aria-selected", String(category.id === activeCategoryId));
            button.tabIndex = category.id === activeCategoryId ? 0 : -1;
            button.append(document.createTextNode(category.name));
            button.append(createTextElement("span", "product-tab-count", String(category.count)));
            productTabs.append(button);
        });
    };

    const renderFilters = (category) => {
        productFilters.replaceChildren();
        const groups = category.groups || [];
        productFilters.hidden = groups.length < 2;
        if (groups.length < 2) return;

        const addFilter = (label, groupName) => {
            const button = createTextElement("button", "product-filter", label);
            button.type = "button";
            button.setAttribute("aria-pressed", String(activeGroupName === groupName));
            button.addEventListener("click", () => {
                activeGroupName = groupName;
                renderFilters(category);
                renderProducts(category);
            });
            productFilters.append(button);
        };

        addFilter("Todos", null);
        groups.forEach((group) => addFilter(group.name, group.name));
    };

    const renderProducts = (category) => {
        const query = normalizeSearchText(productSearch.value);
        const categoryProducts = products.filter((product) =>
            product.category === category.id &&
            (!activeGroupName || product.group === activeGroupName) &&
            (!query || normalizeSearchText(`${product.name} ${product.group}`).includes(query))
        );
        productGrid.replaceChildren();

        categoryProducts.forEach((product) => {
            const article = document.createElement("article");
            article.className = "product-card catalog-product-card reveal";

            const imageFrame = document.createElement("div");
            imageFrame.className = "product-image-frame";
            const imageTrigger = document.createElement("button");
            imageTrigger.className = "product-image-trigger";
            imageTrigger.type = "button";
            imageTrigger.dataset.productImage = product.id;
            imageTrigger.setAttribute("aria-label", `Ampliar fotografía de ${product.name}`);
            const image = document.createElement("img");
            image.className = "product-image";
            image.src = product.image;
            image.alt = `${product.name}, fotografía del catálogo oficial de Industrias Valeo`;
            image.width = 380;
            image.height = 240;
            image.loading = "lazy";
            image.decoding = "async";
            imageTrigger.append(image);
            imageFrame.append(imageTrigger);

            const content = document.createElement("div");
            content.className = "product-copy";
            content.append(createTextElement("span", "overline", category.name.toUpperCase()));
            content.append(createTextElement("h3", "", product.name));

            const consultLink = createTextElement("a", "button button-whatsapp product-whatsapp-button", "");
            consultLink.href = createWhatsAppUrl(product.name);
            consultLink.target = "_blank";
            consultLink.rel = "noopener noreferrer";
            consultLink.setAttribute("aria-label", `Consultar ${product.name} por WhatsApp`);
            consultLink.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M20.52 3.48A11.86 11.86 0 0 0 12.08 0C5.5 0 .15 5.35.15 11.93c0 2.1.55 4.15 1.6 5.96L0 24l6.27-1.65a11.9 11.9 0 0 0 5.8 1.48h.01C18.66 23.83 24 18.48 24 11.9a11.85 11.85 0 0 0-3.48-8.42ZM12.08 21.8h-.01a9.9 9.9 0 0 1-5.04-1.38l-.36-.21-3.72.98.99-3.63-.24-.37a9.85 9.85 0 0 1-1.52-5.26c0-5.48 4.46-9.94 9.95-9.94a9.88 9.88 0 0 1 7.03 2.91 9.88 9.88 0 0 1 2.91 7.04c0 5.49-4.46 9.95-9.99 9.95Zm5.46-7.45c-.3-.15-1.77-.87-2.04-.97-.27-.1-.47-.15-.67.15-.2.3-.77.97-.95 1.17-.17.2-.35.22-.65.07-.3-.15-1.26-.47-2.4-1.49-.88-.78-1.48-1.75-1.65-2.05-.18-.3-.02-.46.13-.61.14-.13.3-.35.45-.52.15-.18.2-.3.3-.5.1-.2.05-.38-.03-.53-.08-.15-.67-1.62-.92-2.22-.24-.58-.49-.5-.67-.51h-.57c-.2 0-.52.08-.8.38-.27.3-1.04 1.02-1.04 2.49s1.07 2.89 1.22 3.09c.15.2 2.1 3.2 5.08 4.49.71.3 1.27.49 1.7.63.71.23 1.36.2 1.87.12.57-.09 1.77-.72 2.02-1.42.25-.7.25-1.3.17-1.42-.07-.13-.27-.2-.57-.35Z"/></path></svg>';
            consultLink.append(document.createTextNode("Consultar por WhatsApp"));
            const addQuoteButton = createTextElement("button", "button button-quote product-quote-button", "Agregar a cotización");
            addQuoteButton.type = "button";
            addQuoteButton.dataset.addToQuote = product.id;
            addQuoteButton.setAttribute("aria-label", `Agregar ${product.name} a la cotización`);
            content.append(consultLink, addQuoteButton);

            article.append(imageFrame, content);
            productGrid.append(article);
        });

        if (categoryProducts.length === 0) {
            productGrid.append(createTextElement("p", "product-empty-state", "No encontramos productos que coincidan con tu búsqueda."));
        }

        const productLabel = categoryProducts.length === 1 ? "producto" : "productos";
        productStatus.textContent = `${categoryProducts.length} ${productLabel} del catálogo en ${category.name}.`;
        observeRevealElements(productGrid.querySelectorAll(".reveal"));
    };

    const selectCategory = (categoryId, scroll = false) => {
        const category = categories.find((item) => item.id === categoryId);
        if (!category) return;

        activeCategoryId = categoryId;
        activeGroupName = null;
        productSearch.value = "";
        renderTabs();
        renderFilters(category);
        renderProducts(category);

        if (scroll) scrollToProductBrowser();
    };

    productSearch.addEventListener("input", () => {
        const category = categories.find((item) => item.id === activeCategoryId);
        if (category) renderProducts(category);
    });

    productGrid.addEventListener("click", (event) => {
        const addQuoteButton = event.target.closest("[data-add-to-quote]");
        if (addQuoteButton) {
            const product = products.find((item) => item.id === addQuoteButton.dataset.addToQuote);
            if (!product) return;
            const existingLine = quoteItems.find((item) => item.productId === product.id);
            if (existingLine) {
                quoteStatus.textContent = "Ese producto ya está en tu cotización. Cada producto aparece una sola vez.";
                quoteDialog.showModal();
                renderQuoteItems();
                return;
            }
            resetQuoteRequestAccepted();
            const line = {
                lineId: createQuoteId(product.id),
                productId: product.id,
                quantity: 1,
                variants: []
            };
            if (productHasColorVariants(product)) {
                line.variants.push({
                    variantId: createQuoteId(product.id),
                    color: "",
                    quantity: 1
                });
            }
            quoteItems.push(line);
            quoteProducts = products;
            saveQuoteItems();
            renderQuoteItems();
            quoteStatus.textContent = `${product.name} se agregó a tu cotización.`;
            addQuoteButton.textContent = "Agregado";
            window.setTimeout(() => {
                if (addQuoteButton.isConnected) addQuoteButton.textContent = "Agregar a cotización";
            }, 1800);
            return;
        }

        const trigger = event.target.closest("[data-product-image]");
        if (!trigger) return;

        const product = products.find((item) => item.id === trigger.dataset.productImage);
        const category = product && categories.find((item) => item.id === product.category);
        if (!product || !category) return;

        productDialogImage.src = product.image;
        productDialogImage.alt = `${product.name}, fotografía completa del catálogo oficial de Industrias Valeo`;
        productDialogName.textContent = product.name;
        productDialogCategory.textContent = category.name;
        productDialogWhatsapp.href = createWhatsAppUrl(
            `Hola, Industrias Valeo. Estoy interesado en ${cleanWhatsappValue(product.name)}. ¿Me pueden brindar información y precio?`
        );
        productDialog.showModal();
    });

    productDialog.addEventListener("click", (event) => {
        if (event.target === productDialog) productDialog.close();
    });

    productTabs.addEventListener("click", (event) => {
        const button = event.target.closest("[data-product-category]");
        if (button) selectCategory(button.dataset.productCategory);
    });

    productTabs.addEventListener("keydown", (event) => {
        if (!["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)) return;

        const currentIndex = categories.findIndex((category) => category.id === activeCategoryId);
        const nextIndex = event.key === "Home"
            ? 0
            : event.key === "End"
                ? categories.length - 1
                : (currentIndex + (event.key === "ArrowRight" ? 1 : -1) + categories.length) % categories.length;
        event.preventDefault();
        selectCategory(categories[nextIndex].id);
        productTabs.querySelector(`#product-tab-${categories[nextIndex].id}`)?.focus();
    });

    catalogLinks.forEach((link) => {
        link.addEventListener("click", (event) => {
            event.preventDefault();
            selectCategory(link.dataset.productCategory, true);
        });
    });

    const loadProductCatalog = async () => {
        try {
            const data = await loadCatalogData();

            categories = data.categories;
            products = data.products;
            quoteProducts = products;
            const availableProductIds = new Set(products.map((product) => product.id));
            quoteItems = normalizeStoredQuoteItems(storedQuoteItems, products)
                .filter((item) => availableProductIds.has(item.productId));
            saveQuoteItems();
            renderQuoteItems();
            initializeHeroCarousel(data);
            selectCategory(categories[0].id);
        } catch (error) {
            console.error("No fue posible cargar el catálogo de productos.", error);
            productStatus.textContent = "No fue posible cargar los productos. Actualiza la página para intentarlo de nuevo.";
        }
    };

    loadProductCatalog();
}

const coverageSection = document.querySelector("#cobertura");
const coverageMap = coverageSection?.querySelector(".colombia-map");
const departmentDetail = coverageSection?.querySelector("[data-department-detail]");

if (coverageSection && coverageMap && departmentDetail) {
    const departmentDataUrl = "/static/data/coverage-departments.json";
    let departments = new Map();
    let departmentPaths = [];
    let selectedDepartment = null;

    const updateMapStatus = (text) => {
        const status = coverageSection.querySelector(".map-card-status");
        if (!status) return;
        const indicator = status.querySelector("span");
        status.replaceChildren(
            ...(indicator ? [indicator, document.createTextNode(" ")] : []),
            document.createTextNode(text)
        );
    };

    const renderDepartment = (departmentId) => {
        departmentDetail.replaceChildren();
        const department = departments.get(departmentId);
        if (!department) {
            const empty = document.createElement("div");
            empty.className = "department-detail-empty";
            empty.append(
                createQuoteText("span", "department-detail-kicker", "COBERTURA POR DEPARTAMENTO"),
                createQuoteText("h3", "", "Selecciona un departamento"),
                createQuoteText("p", "", "Pasa el cursor sobre el mapa o selecciona un departamento para conocer algunas de sus principales ciudades.")
            );
            departmentDetail.append(empty);
            updateMapStatus("Selecciona un departamento");
            return;
        }

        const heading = document.createElement("div");
        heading.className = "department-detail-heading";
        const headingCopy = document.createElement("div");
        headingCopy.append(
            createQuoteText("span", "department-detail-kicker", department.isCapital ? "SEDE PRINCIPAL" : "COBERTURA POR DEPARTAMENTO"),
            createQuoteText("h3", "", department.name)
        );
        if (department.isCapital) {
            headingCopy.append(createQuoteText("p", "department-headquarters-label", "Sede de Industrias Valeo S.A.S."));
        } else {
            headingCopy.append(createQuoteText("p", "", "Realizamos envíos a todo el departamento."));
        }
        heading.append(headingCopy);

        const cityHeading = createQuoteText("strong", "department-cities-label", "Ciudades principales de referencia");
        const cityList = document.createElement("ul");
        cityList.className = "department-city-list";
        department.cities.forEach((city) => {
            const item = document.createElement("li");
            item.append(createQuoteText("span", "department-city-chip", city));
            cityList.append(item);
        });
        const coverageNote = createQuoteText(
            "p",
            "department-coverage-note",
            department.isCapital
                ? "Realizamos despachos desde Bogotá a todo Colombia."
                : "¿No encuentras tu ciudad? También realizamos envíos a los demás municipios del departamento. La cobertura abarca todo el departamento."
        );
        const quoteButton = createQuoteText("button", "button button-primary department-quote-button", "Solicitar cotización");
        quoteButton.type = "button";
        quoteButton.dataset.openQuote = "";
        quoteButton.append(createQuoteText("span", "", "↗"));
        departmentDetail.append(heading, cityHeading, cityList, coverageNote, quoteButton);
        updateMapStatus(department.isCapital ? "Sede Industrias Valeo S.A.S." : `Cobertura en ${department.name}`);
    };

    const updateDepartmentState = (departmentId, { select = false } = {}) => {
        if (!departments.has(departmentId)) return;
        if (select) selectedDepartment = departmentId;
        const departmentTargets = [
            ...departmentPaths,
            ...(coverageMap.contentDocument?.querySelectorAll(".capital-marker[data-department]") || [])
        ];
        departmentTargets.forEach((path) => {
            const isSelected = path.dataset.department === selectedDepartment;
            path.classList.toggle("is-selected", isSelected);
            path.setAttribute("aria-pressed", String(isSelected));
        });
        renderDepartment(departmentId);
    };

    const initializeDepartmentMap = async () => {
        const pathReadiness = coverageMap.contentDocument?.querySelector(".department-shape")
            ? Promise.resolve()
            : new Promise((resolve, reject) => {
                coverageMap.addEventListener("load", () => {
                    if (coverageMap.contentDocument?.querySelector(".department-shape")) resolve();
                    else reject(new Error("El archivo SVG no contiene límites departamentales."));
                }, { once: true });
                coverageMap.addEventListener("error", () => reject(new Error("No se pudo abrir el mapa departamental.")), { once: true });
            });
        const response = await fetch(departmentDataUrl);
        if (!response.ok) throw new Error(`No se pudieron cargar las ciudades: HTTP ${response.status}`);
        const data = await response.json();
        if (!Array.isArray(data.departments) || data.departments.length !== 33) {
            throw new Error("Los datos de cobertura no incluyen los 32 departamentos y Bogotá D.C.");
        }
        departments = new Map(data.departments.map((department) => [department.id, department]));
        await pathReadiness;
        const mapDocument = coverageMap.contentDocument;
        if (!mapDocument) throw new Error("No se pudo abrir el mapa departamental.");
        departmentPaths = [...mapDocument.querySelectorAll(".department-shape")];
        if (departmentPaths.length !== departments.size) {
            throw new Error(`El mapa muestra ${departmentPaths.length} regiones; se esperaban ${departments.size}.`);
        }
        const departmentTargets = [
            ...departmentPaths,
            ...mapDocument.querySelectorAll(".capital-marker[data-department]")
        ];
        departmentTargets.forEach((path) => {
            const departmentId = path.dataset.department;
            if (!departments.has(departmentId)) {
                throw new Error(`El mapa contiene un departamento sin datos: ${departmentId}.`);
            }
            const department = departments.get(departmentId);
            path.setAttribute(
                "aria-label",
                department.isCapital
                    ? `Seleccionar ${department.name}, sede de Industrias Valeo S.A.S.`
                    : `Seleccionar ${department.name}`
            );
            const pathTitle = path.querySelector("title");
            if (pathTitle) pathTitle.textContent = department.name;
            const previewDepartment = () => renderDepartment(departmentId);
            path.addEventListener("pointerenter", previewDepartment);
            path.addEventListener("pointerleave", () => renderDepartment(selectedDepartment));
            path.addEventListener("focus", previewDepartment);
            path.addEventListener("blur", () => renderDepartment(selectedDepartment));
            path.addEventListener("click", () => {
                updateDepartmentState(departmentId, { select: true });
            });
            path.addEventListener("keydown", (event) => {
                if (event.key !== "Enter" && event.key !== " ") return;
                event.preventDefault();
                updateDepartmentState(departmentId, { select: true });
            });
        });

        updateDepartmentState(selectedDepartment, { select: true });
    };

    initializeDepartmentMap().catch((error) => {
        console.error("No fue posible iniciar el mapa interactivo de cobertura.", error);
        departmentDetail.replaceChildren(
            createQuoteText("p", "department-map-error", "No fue posible cargar el mapa. La cobertura de envíos sigue disponible para todos los departamentos, ciudades y municipios de Colombia.")
        );
    });

    if (reducedMotion || !("IntersectionObserver" in window)) {
        coverageSection.querySelectorAll(".reveal").forEach((element) => element.classList.add("is-visible"));
    } else {
        const coverageObserver = new IntersectionObserver((entries, observer) => {
            if (entries.some((entry) => entry.isIntersecting)) {
                coverageSection.querySelectorAll(".reveal").forEach((element) => element.classList.add("is-visible"));
                observer.disconnect();
            }
        }, { threshold: 0.12 });
        coverageObserver.observe(coverageSection);
    }
}

const currentYear = document.getElementById("current-year");
if (currentYear) currentYear.textContent = String(new Date().getFullYear());
