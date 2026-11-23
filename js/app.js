(() => {
  "use strict";

  const properties = window.HAVEN_PROPERTIES || [];
  const testimonials = window.HAVEN_TESTIMONIALS || [];
  const grid = document.getElementById("propertyGrid");
  const money = new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  });
  let activeFilter = "All";
  let visibleCount = 6;
  const propertiesPerPage = 6;
  let activeProperty = null;
  let galleryIndex = 0;
  let storyIndex = 0;
  let lastFocusedElement = null;
  let favorites = readFavorites();

  function readFavorites() {
    try {
      const saved = JSON.parse(localStorage.getItem("haven-favorites") || "[]");
      return new Set(Array.isArray(saved) ? saved : []);
    } catch (error) {
      console.warn("Saved favorites could not be read.", error);
      return new Set();
    }
  }

  function saveFavorites() {
    try {
      localStorage.setItem("haven-favorites", JSON.stringify([...favorites]));
    } catch (error) {
      console.warn("Saved favorites could not be stored.", error);
    }
  }

  function formatPrice(property) {
    return property.status === "For Rent"
      ? `${money.format(property.price)}<small> / month</small>`
      : money.format(property.price);
  }

  function filteredProperties() {
    const type = document.getElementById("searchType").value;
    const location = document
      .getElementById("searchLocation")
      .value.trim()
      .toLowerCase();
    const maxPrice =
      Number(document.getElementById("searchPrice").value) || Infinity;
    return properties.filter((property) => {
      const matchesTab =
        activeFilter === "All" ||
        (activeFilter === "Luxury Villas"
          ? property.type === "Villa" && property.price >= 900000
          : property.status === activeFilter);
      return (
        matchesTab &&
        (!type || property.type === type) &&
        (!location ||
          property.location.toLowerCase().includes(location) ||
          property.title.toLowerCase().includes(location)) &&
        property.price <= maxPrice
      );
    });
  }

  function renderProperties() {
    const results = filteredProperties();
    const visibleProperties = results.slice(0, visibleCount);
    const shownCount = visibleProperties.length;
    document.getElementById("resultsCount").textContent =
      `${results.length} ${results.length === 1 ? "home" : "homes"}`;
    document.getElementById("emptyState").hidden = results.length > 0;
    document.getElementById("loadMoreCount").textContent =
      `Showing ${shownCount} of ${results.length} properties`;
    document.getElementById("loadMoreWrap").hidden = results.length === 0;
    document.getElementById("loadMoreButton").hidden = shownCount >= results.length;
    grid.innerHTML = visibleProperties
      .map(
        (property) => `
      <article class="property-card reveal" data-property="${property.id}">
        <button class="property-open" data-open-property="${property.id}" aria-label="View ${property.title} details">
          <div class="property-image-wrap"><img class="property-image" src="${property.image}" alt="${property.title}, ${property.location}" loading="lazy">
            <span class="status-badge ${property.status === "For Rent" ? "badge-rent" : ""}">${property.status}</span>
            ${property.featured ? '<span class="featured-badge">A HAVEN FAVORITE</span>' : ""}
          </div>
          <div class="property-info"><div class="property-price">${formatPrice(property)}</div><h3>${property.title}</h3><p class="property-location"><span aria-hidden="true">⌖</span> ${property.location}</p>
            <div class="property-specs"><span><b>⌂</b>${property.beds} beds</span><span><b>◌</b>${property.baths} baths</span><span><b>▱</b>${property.sqft.toLocaleString()} sqft</span></div>
          </div>
        </button>
        <button class="favorite-button ${favorites.has(property.id) ? "is-favorite" : ""}" data-favorite="${property.id}" aria-label="${favorites.has(property.id) ? "Remove from" : "Add to"} saved homes" aria-pressed="${favorites.has(property.id)}"><span>${favorites.has(property.id) ? "♥" : "♡"}</span></button>
      </article>`,
      )
      .join("");
    updateFavoriteCount();
    observeReveals();
  }

  function updateFavoriteCount() {
    document.getElementById("favoriteCount").textContent = favorites.size;
  }

  function setFilter(filter) {
    activeFilter = filter;
    visibleCount = propertiesPerPage;
    document.querySelectorAll(".filter-tab").forEach((button) => {
      const active = button.dataset.filter === filter;
      button.classList.toggle("active", active);
      button.setAttribute("aria-pressed", String(active));
    });
    renderProperties();
  }

  function openProperty(id) {
    activeProperty = properties.find((property) => property.id === Number(id));
    if (!activeProperty) return;
    lastFocusedElement = document.activeElement;
    galleryIndex = 0;
    const modal = document.getElementById("propertyModal");
    document.getElementById("modalTitle").textContent = activeProperty.title;
    document.getElementById("modalStatus").textContent =
      `${activeProperty.status} · ${formatPrice(activeProperty).replace(/<[^>]*>/g, "")}`;
    document.getElementById("modalLocation").textContent =
      activeProperty.location;
    document.getElementById("modalDescription").textContent =
      activeProperty.description;
    document.getElementById("modalSpecs").innerHTML =
      `<span>⌂ ${activeProperty.beds} beds</span><span>◌ ${activeProperty.baths} baths</span><span>▱ ${activeProperty.sqft.toLocaleString()} sqft</span>`;
    document.getElementById("modalAmenities").innerHTML =
      activeProperty.amenities.map((amenity) => `<li>${amenity}</li>`).join("");
    document.getElementById("viewingForm").reset();
    document.getElementById("viewingMessage").textContent = "";
    updateGallery();
    modal.classList.add("is-open");
    modal.setAttribute("aria-hidden", "false");
    document.body.classList.add("modal-open");
    document.getElementById("modalClose").focus();
  }

  function updateGallery() {
    const gallery = activeProperty.gallery || [activeProperty.image];
    document.getElementById("modalImage").src = gallery[galleryIndex];
    document.getElementById("modalImage").alt =
      `${activeProperty.title}, image ${galleryIndex + 1}`;
    document.getElementById("galleryCount").textContent =
      `${galleryIndex + 1} / ${gallery.length}`;
    const multiple = gallery.length > 1;
    document.getElementById("galleryPrev").hidden = !multiple;
    document.getElementById("galleryNext").hidden = !multiple;
  }

  function closeModal() {
    const modal = document.getElementById("propertyModal");
    modal.classList.remove("is-open");
    modal.setAttribute("aria-hidden", "true");
    document.body.classList.remove("modal-open");
    if (lastFocusedElement) lastFocusedElement.focus();
  }

  function updateCalculator() {
    const price = Number(document.getElementById("homePrice").value);
    const downPercent = Number(document.getElementById("downPayment").value);
    const annualRate =
      Number(document.getElementById("interestRate").value) / 100;
    const years = Number(document.getElementById("loanTerm").value);
    const principal = price * (1 - downPercent / 100);
    const monthlyRate = annualRate / 12;
    const months = years * 12;
    const payment =
      monthlyRate === 0
        ? principal / months
        : (principal * monthlyRate) / (1 - Math.pow(1 + monthlyRate, -months));
    document.getElementById("homePriceOutput").textContent =
      money.format(price);
    document.getElementById("downPaymentOutput").textContent =
      `${downPercent}% · ${money.format((price * downPercent) / 100)}`;
    document.getElementById("interestRateOutput").textContent =
      `${annualRate * 100}%`;
    document.getElementById("loanTermOutput").textContent = `${years} years`;
    document.getElementById("monthlyPayment").textContent = money.format(
      Math.round(payment),
    );
  }

  function renderTestimonial() {
    const story = testimonials[storyIndex];
    if (!story) return;
    document.getElementById("testimonialQuote").textContent = story.quote;
    document.getElementById("testimonialName").textContent = story.name;
    document.getElementById("testimonialMeta").textContent = story.meta;
    document.getElementById("testimonialAvatar").textContent = story.initials;
  }

  let revealObserver;
  function observeReveals() {
    if (!("IntersectionObserver" in window)) {
      document
        .querySelectorAll(".reveal")
        .forEach((element) => element.classList.add("is-visible"));
      return;
    }
    if (!revealObserver) {
      revealObserver = new IntersectionObserver(
        (entries, observer) => {
          entries.forEach((entry) => {
            if (entry.isIntersecting) {
              entry.target.classList.add("is-visible");
              observer.unobserve(entry.target);
            }
          });
        },
        { threshold: 0.12 },
      );
    }
    document
      .querySelectorAll(".reveal:not(.is-visible)")
      .forEach((element) => revealObserver.observe(element));
  }

  document
    .querySelectorAll(".filter-tab")
    .forEach((button) =>
      button.addEventListener("click", () => setFilter(button.dataset.filter)),
    );
  document.getElementById("searchForm").addEventListener("submit", (event) => {
    event.preventDefault();
    setFilter("All");
    document
      .getElementById("properties")
      .scrollIntoView({ behavior: "smooth" });
  });
  document
    .getElementById("searchLocation")
    .addEventListener("input", () => {
      visibleCount = propertiesPerPage;
      renderProperties();
    });
  document
    .getElementById("searchType")
    .addEventListener("change", () => {
      visibleCount = propertiesPerPage;
      renderProperties();
    });
  document
    .getElementById("searchPrice")
    .addEventListener("change", () => {
      visibleCount = propertiesPerPage;
      renderProperties();
    });
  document.getElementById("loadMoreButton").addEventListener("click", () => {
    visibleCount += propertiesPerPage;
    renderProperties();
  });
  grid.addEventListener("click", (event) => {
    const favorite = event.target.closest("[data-favorite]");
    if (favorite) {
      event.stopPropagation();
      const id = Number(favorite.dataset.favorite);
      favorites.has(id) ? favorites.delete(id) : favorites.add(id);
      saveFavorites();
      renderProperties();
      return;
    }
    const open = event.target.closest("[data-open-property]");
    if (open) openProperty(open.dataset.openProperty);
  });
  document.getElementById("resetFilters").addEventListener("click", () => {
    document.getElementById("searchForm").reset();
    setFilter("All");
  });
  document.getElementById("modalClose").addEventListener("click", closeModal);
  document
    .getElementById("propertyModal")
    .addEventListener("click", (event) => {
      if (event.target.id === "propertyModal") closeModal();
    });
  document.addEventListener("keydown", (event) => {
    if (
      event.key === "Escape" &&
      document.getElementById("propertyModal").classList.contains("is-open")
    )
      closeModal();
  });
  document.getElementById("galleryPrev").addEventListener("click", () => {
    const count = activeProperty.gallery.length;
    galleryIndex = (galleryIndex - 1 + count) % count;
    updateGallery();
  });
  document.getElementById("galleryNext").addEventListener("click", () => {
    galleryIndex = (galleryIndex + 1) % activeProperty.gallery.length;
    updateGallery();
  });
  document
    .querySelectorAll(".calc-row input")
    .forEach((input) => input.addEventListener("input", updateCalculator));
  document.getElementById("prevStory").addEventListener("click", () => {
    storyIndex = (storyIndex - 1 + testimonials.length) % testimonials.length;
    renderTestimonial();
  });
  document.getElementById("nextStory").addEventListener("click", () => {
    storyIndex = (storyIndex + 1) % testimonials.length;
    renderTestimonial();
  });
  document.getElementById("menuToggle").addEventListener("click", (event) => {
    const button = event.currentTarget;
    const open = button.getAttribute("aria-expanded") !== "true";
    button.setAttribute("aria-expanded", String(open));
    button.setAttribute(
      "aria-label",
      open ? "Close navigation menu" : "Open navigation menu",
    );
    document.getElementById("navLinks").classList.toggle("nav-open", open);
  });
  document.querySelectorAll(".nav-links a").forEach((link) =>
    link.addEventListener("click", () => {
      document.getElementById("navLinks").classList.remove("nav-open");
      document
        .getElementById("menuToggle")
        .setAttribute("aria-expanded", "false");
    }),
  );
  document
    .getElementById("newsletterForm")
    .addEventListener("submit", (event) => {
      event.preventDefault();
      const input = document.getElementById("newsletterEmail");
      const message = document.getElementById("newsletterMessage");
      if (!input.validity.valid) {
        message.textContent = "Please enter a valid email address.";
        message.classList.add("error");
        input.focus();
        return;
      }
      message.textContent =
        "You're on the list. Look out for a note from us soon.";
      message.classList.remove("error");
      input.value = "";
    });
  document.getElementById("viewingForm").addEventListener("submit", (event) => {
    event.preventDefault();
    const form = event.currentTarget;
    if (!form.reportValidity()) return;
    document.getElementById("viewingMessage").textContent =
      "Thanks! We'll be in touch to find a time.";
    form.reset();
  });

  document.getElementById("currentYear").textContent = new Date().getFullYear();
  renderProperties();
  updateCalculator();
  renderTestimonial();
  observeReveals();
})();
