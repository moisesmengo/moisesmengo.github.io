// -- smooth scroll (Lenis) ---------------------------------------------------
// Lenis applies natural inertia to the native scroll. We feed its RAF loop
// into the GSAP ticker so ScrollTrigger receives the smoothed position
// instead of the raw window scroll — the officially recommended integration.
// Disabled for prefers-reduced-motion users (same policy as all other FX).
const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

let lenis;
if (window.Lenis && !reducedMotion) {
  lenis = new Lenis({
    lerp: 0.085,
    orientation: "vertical",
    gestureOrientation: "vertical",
    smoothWheel: true,
    syncTouch: false,
    wheelMultiplier: 0.9,
    touchMultiplier: 1,
    infinite: false,
  });

  if (window.gsap && window.ScrollTrigger) {
    gsap.registerPlugin(ScrollTrigger);

    // Sync with GSAP ticker — ScrollTrigger hooks into this automatically
    gsap.ticker.add((time) => lenis.raf(time * 1000));
    gsap.ticker.lagSmoothing(0);

    // Keep every pin and scrub synchronized with Lenis' interpolated position.
    lenis.on("scroll", ScrollTrigger.update);
  } else {
    // Fallback own RAF when GSAP isn't available yet
    (function rafLoop(time) { lenis.raf(time); requestAnimationFrame(rafLoop); })();
  }
}

// Helper: make smooth-scroll anchor links respect Lenis
document.querySelectorAll('a[href^="#"]').forEach((anchor) => {
  anchor.addEventListener("click", (e) => {
    const href = anchor.getAttribute("href");
    if (!href || href === "#") return;

    const target = document.querySelector(href);
    if (!target || !lenis) return;

    e.preventDefault();
    lenis.start();
    lenis.scrollTo(target, {
      offset: -(document.querySelector("header")?.offsetHeight || 88) - 12,
      duration: 1.35,
      easing: (t) => 1 - Math.pow(1 - t, 4),
    });
  });
});

// -- WhatsApp availability notice -------------------------------------------
{
  const noticeModal = document.querySelector("[data-whatsapp-notice-modal]");
  const noticeTriggers = document.querySelectorAll("[data-whatsapp-notice]");
  let noticeReturnFocus = null;
  let noticeCloseTimer = null;

  const closeWhatsAppNotice = () => {
    if (!noticeModal || noticeModal.hidden) return;

    noticeModal.classList.remove("is-open");
    noticeModal.setAttribute("aria-hidden", "true");
    document.body.classList.remove("notice-modal-open");
    if (!document.body.classList.contains("menu-open")) lenis?.start();

    noticeCloseTimer = window.setTimeout(() => {
      noticeModal.hidden = true;
      noticeReturnFocus?.focus();
      noticeReturnFocus = null;
    }, 180);
  };

  const openWhatsAppNotice = (trigger) => {
    if (!noticeModal) return;

    window.clearTimeout(noticeCloseTimer);
    noticeReturnFocus = trigger;
    noticeModal.hidden = false;
    noticeModal.setAttribute("aria-hidden", "false");
    document.body.classList.add("notice-modal-open");
    lenis?.stop();

    window.requestAnimationFrame(() => {
      noticeModal.classList.add("is-open");
      noticeModal.querySelector(".whatsapp-notice__button")?.focus();
    });
  };

  noticeTriggers.forEach((trigger) => {
    trigger.addEventListener("click", (event) => {
      event.preventDefault();
      openWhatsAppNotice(trigger);
    });
  });

  noticeModal?.querySelectorAll("[data-whatsapp-notice-close]").forEach((control) => {
    control.addEventListener("click", closeWhatsAppNotice);
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && noticeModal && !noticeModal.hidden) {
      closeWhatsAppNotice();
    }
  });
}

// Keep the bat loader visible long enough for its motion to register, then
// release the page only after all of its visual assets have settled.
const pageLoader = document.querySelector("[data-page-loader]");
const pageLoaderStartedAt = window.performance.now();
let pageLoaderDismissed = false;

const dismissPageLoader = () => {
  if (!pageLoader || pageLoaderDismissed) return;

  pageLoaderDismissed = true;
  const remainingDisplayTime = Math.max(
    0,
    520 - (window.performance.now() - pageLoaderStartedAt),
  );

  window.setTimeout(() => {
    pageLoader.classList.add("is-leaving");
    window.setTimeout(() => {
      pageLoader.hidden = true;
    }, 460);
  }, remainingDisplayTime);
};

// Images and web fonts can change section measurements after the initial
// ScrollTrigger pass. Recalculate once everything has settled.
window.addEventListener(
  "load",
  () => {
    dismissPageLoader();
    lenis?.resize();
    window.ScrollTrigger?.refresh();
  },
  { once: true },
);

if (document.readyState === "complete") dismissPageLoader();

// ---------------------------------------------------------------------------
const header = document.querySelector("header");
const toggle = document.querySelector(".toggle");
const nav = document.querySelector("nav");

if (header && nav) {
  const navLinks = [...nav.querySelectorAll('a[href^="#"]')];
  const navigationTargets = navLinks
    .map((link) => ({ link, section: document.querySelector(link.getAttribute("href")) }))
    .filter(({ section }) => section);

  let headerUpdateQueued = false;

  const updateHeaderState = () => {
    headerUpdateQueued = false;
    header.classList.toggle("is-scrolled", window.scrollY > 18);

    const guideLine = window.innerHeight * 0.42;
    let activeLink = navigationTargets[0]?.link;

    navigationTargets.forEach(({ link, section }) => {
      if (section.getBoundingClientRect().top <= guideLine) activeLink = link;
    });

    navLinks.forEach((link) => {
      const isActive = link === activeLink;
      link.parentElement?.classList.toggle("active", isActive);

      if (isActive) link.setAttribute("aria-current", "location");
      else link.removeAttribute("aria-current");
    });
  };

  const requestHeaderUpdate = () => {
    if (headerUpdateQueued) return;

    headerUpdateQueued = true;
    window.requestAnimationFrame(updateHeaderState);
  };

  if (lenis) lenis.on("scroll", requestHeaderUpdate);
  else window.addEventListener("scroll", requestHeaderUpdate, { passive: true });

  window.addEventListener("resize", requestHeaderUpdate, { passive: true });
  window.addEventListener("load", requestHeaderUpdate, { once: true });
  updateHeaderState();
}

if (toggle && nav) {
  toggle.addEventListener("click", () => {
    const isOpen = nav.classList.toggle("open");
    toggle.setAttribute("aria-expanded", String(isOpen));
    toggle.setAttribute("aria-label", isOpen ? "Fechar menu" : "Abrir menu");
    document.body.classList.toggle("menu-open", isOpen);

    if (isOpen) lenis?.stop();
    else lenis?.start();
  });

  nav.querySelectorAll("a").forEach((link) => {
    link.addEventListener("click", () => {
      nav.classList.remove("open");
      toggle.setAttribute("aria-expanded", "false");
      toggle.setAttribute("aria-label", "Abrir menu");
      document.body.classList.remove("menu-open");
      lenis?.start();
    });
  });
}

// -- vampire reveal: fluid cursor field ------------------------------------
// The reference Hero converts pointer velocity into a persistent fluid map.
// This compact canvas version follows the same visual logic: velocity widens
// the brush, small offset vortices deform its edge, and the trail dissipates
// gradually instead of behaving like a circular spotlight.
const media = document.querySelector(".hero .media");
const vampireImage = media?.querySelector(".vampire");
const fluidCanvas = media?.querySelector(".vampire-fluid");
const canHover = window.matchMedia("(hover: hover) and (pointer: fine)").matches;

if (media && vampireImage && fluidCanvas && !reducedMotion) {
  const output = fluidCanvas.getContext("2d", { alpha: true });
  const field = document.createElement("canvas");
  const fieldContext = field.getContext("2d", { alpha: true });
  const brush = document.createElement("canvas");
  const brushContext = brush.getContext("2d", { alpha: true });

  if (output && fieldContext && brushContext) {
    const state = {
      width: 1,
      height: 1,
      scaleX: 1,
      scaleY: 1,
      x: 0,
      y: 0,
      targetX: 0,
      targetY: 0,
      previousX: 0,
      previousY: 0,
      velocityX: 0,
      velocityY: 0,
      energy: 0,
      active: false,
      touched: false,
      visible: true,
      ready: false,
      sleeping: false,
      lastInput: performance.now(),
      frame: 0,
    };

    // A pre-rendered feathered brush keeps the effect inexpensive even while
    // several velocity splats are being blended during a fast pointer move.
    brush.width = 192;
    brush.height = 192;
    const brushGradient = brushContext.createRadialGradient(96, 96, 0, 96, 96, 96);
    brushGradient.addColorStop(0, "rgba(255,255,255,1)");
    brushGradient.addColorStop(0.38, "rgba(255,255,255,.98)");
    brushGradient.addColorStop(0.68, "rgba(255,255,255,.72)");
    brushGradient.addColorStop(0.88, "rgba(255,255,255,.2)");
    brushGradient.addColorStop(1, "rgba(255,255,255,0)");
    brushContext.fillStyle = brushGradient;
    brushContext.fillRect(0, 0, brush.width, brush.height);

    const clamp = (value, minimum, maximum) => Math.min(maximum, Math.max(minimum, value));

    const drawImageCover = (context, image, width, height) => {
      const positionX = window.innerWidth <= 900 ? 0.66 : 0.74;
      const positionY = window.innerWidth <= 900 ? 0.24 : 0.3;
      const imageRatio = image.naturalWidth / image.naturalHeight;
      const canvasRatio = width / height;
      let sourceX = 0;
      let sourceY = 0;
      let sourceWidth = image.naturalWidth;
      let sourceHeight = image.naturalHeight;

      if (imageRatio > canvasRatio) {
        sourceWidth = image.naturalHeight * canvasRatio;
        sourceX = (image.naturalWidth - sourceWidth) * positionX;
      } else {
        sourceHeight = image.naturalWidth / canvasRatio;
        sourceY = (image.naturalHeight - sourceHeight) * positionY;
      }

      context.drawImage(
        image,
        sourceX,
        sourceY,
        sourceWidth,
        sourceHeight,
        0,
        0,
        width,
        height,
      );
    };

    const resizeFluid = () => {
      const bounds = media.getBoundingClientRect();
      const width = Math.max(1, Math.round(bounds.width));
      const height = Math.max(1, Math.round(bounds.height));
      const pixelRatio = Math.min(window.devicePixelRatio || 1, canHover ? 1.7 : 1.35);
      const fieldWidth = clamp(Math.round(width * (canHover ? 0.58 : 0.52)), 240, 620);
      const fieldHeight = Math.max(1, Math.round(fieldWidth * (height / width)));

      fluidCanvas.width = Math.round(width * pixelRatio);
      fluidCanvas.height = Math.round(height * pixelRatio);
      field.width = fieldWidth;
      field.height = fieldHeight;

      state.width = fieldWidth;
      state.height = fieldHeight;
      state.scaleX = fieldWidth / width;
      state.scaleY = fieldHeight / height;
      state.x = state.targetX = state.previousX = fieldWidth * 0.66;
      state.y = state.targetY = state.previousY = fieldHeight * 0.34;
      state.energy = 0;
    };

    const setPointer = (event, activate = true) => {
      const bounds = media.getBoundingClientRect();
      state.targetX = clamp((event.clientX - bounds.left) * state.scaleX, 0, state.width);
      state.targetY = clamp((event.clientY - bounds.top) * state.scaleY, 0, state.height);
      state.lastInput = performance.now();
      state.touched = true;
      state.sleeping = false;
      if (activate) {
        state.active = true;
        media.classList.add("is-fluid-active");
      }
    };

    const drawSplat = (x, y, velocityX, velocityY, strength, time) => {
      const speed = Math.hypot(velocityX, velocityY);
      const baseRadius = clamp(state.width * (canHover ? 0.145 : 0.18), 38, 92);
      const stretch = 1 + clamp(speed / Math.max(baseRadius, 1), 0, 1.15);
      const angle = Math.atan2(velocityY, velocityX);
      const wobble = Math.sin(time * 0.0043 + x * 0.037 + y * 0.021);

      fieldContext.save();
      fieldContext.globalCompositeOperation = "source-over";
      fieldContext.globalAlpha = 0.26 + strength * 0.54;
      fieldContext.translate(x, y);
      fieldContext.rotate(angle);
      fieldContext.scale(stretch, 0.82 + wobble * 0.08);
      fieldContext.drawImage(brush, -baseRadius, -baseRadius, baseRadius * 2, baseRadius * 2);
      fieldContext.restore();

      // Two counter-moving lobes break the perfect radial edge and emulate
      // the small vortices visible in the reference fluid simulation.
      const normalX = speed > 0.01 ? -velocityY / speed : 0;
      const normalY = speed > 0.01 ? velocityX / speed : 0;
      [-1, 1].forEach((direction, index) => {
        const orbit = baseRadius * (0.23 + index * 0.07) * direction;
        const radius = baseRadius * (0.46 + index * 0.08);

        fieldContext.save();
        fieldContext.globalCompositeOperation = "source-over";
        fieldContext.globalAlpha = (0.15 + strength * 0.18) * (index ? 0.8 : 1);
        fieldContext.translate(
          x + normalX * orbit + Math.cos(time * 0.003 + index * 2.4) * baseRadius * 0.08,
          y + normalY * orbit + Math.sin(time * 0.0037 + index * 1.7) * baseRadius * 0.08,
        );
        fieldContext.rotate(angle - direction * 0.45);
        fieldContext.scale(1.35, 0.75);
        fieldContext.drawImage(brush, -radius, -radius, radius * 2, radius * 2);
        fieldContext.restore();
      });
    };

    const depositTrail = (fromX, fromY, toX, toY, strength, time) => {
      const deltaX = toX - fromX;
      const deltaY = toY - fromY;
      const distance = Math.hypot(deltaX, deltaY);
      const stepSize = Math.max(6, state.width * 0.018);
      const steps = clamp(Math.ceil(distance / stepSize), 1, 18);

      for (let index = 1; index <= steps; index += 1) {
        const progress = index / steps;
        drawSplat(
          fromX + deltaX * progress,
          fromY + deltaY * progress,
          deltaX / steps,
          deltaY / steps,
          strength,
          time + index * 17,
        );
      }
    };

    const renderFluid = (time) => {
      state.frame = window.requestAnimationFrame(renderFluid);
      if (!state.ready || !state.visible) return;

      const isIdle = canHover && !state.active && time - state.lastInput > 1450;

      if (!canHover && !state.active && state.energy < 0.01 && time - state.lastInput > 3600) {
        if (!state.sleeping) {
          fieldContext.clearRect(0, 0, state.width, state.height);
          output.clearRect(0, 0, fluidCanvas.width, fluidCanvas.height);
          state.sleeping = true;
        }
        return;
      }

      if (isIdle) {
        // The downloaded reference also starts an autonomous cursor path when
        // the visitor is idle. Keeping it around the face hints at the effect.
        state.targetX = state.width * (0.64 + Math.cos(time * 0.00072) * 0.13);
        state.targetY = state.height * (0.34 + Math.sin(time * 0.00093) * 0.17);
      }

      const ease = state.active ? 0.24 : isIdle ? 0.075 : 0.13;
      state.x += (state.targetX - state.x) * ease;
      state.y += (state.targetY - state.y) * ease;
      state.velocityX = state.x - state.previousX;
      state.velocityY = state.y - state.previousY;

      const targetEnergy = state.active ? 1 : isIdle ? 0.58 : 0;
      state.energy += (targetEnergy - state.energy) * (targetEnergy > state.energy ? 0.11 : 0.035);

      // Alpha erosion gives the wake a natural lifetime; it remains long
      // enough to read as liquid, then closes without an abrupt animation.
      fieldContext.save();
      fieldContext.globalCompositeOperation = "destination-out";
      fieldContext.fillStyle = `rgba(0,0,0,${state.active ? 0.012 : 0.027})`;
      fieldContext.fillRect(0, 0, state.width, state.height);
      fieldContext.restore();

      if (state.energy > 0.025) {
        depositTrail(
          state.previousX,
          state.previousY,
          state.x,
          state.y,
          state.energy,
          time,
        );
      }

      state.previousX = state.x;
      state.previousY = state.y;

      output.clearRect(0, 0, fluidCanvas.width, fluidCanvas.height);
      drawImageCover(output, vampireImage, fluidCanvas.width, fluidCanvas.height);
      output.save();
      output.globalCompositeOperation = "destination-in";
      output.filter = `blur(${Math.max(1.5, fluidCanvas.width / state.width) * 1.15}px)`;
      output.drawImage(field, 0, 0, fluidCanvas.width, fluidCanvas.height);
      output.restore();
    };

    const initialiseFluid = () => {
      if (state.ready) return;
      resizeFluid();
      state.ready = true;
      media.classList.add("is-fluid-ready");
      state.frame = window.requestAnimationFrame(renderFluid);
    };

    const resizeObserver = new ResizeObserver(resizeFluid);
    resizeObserver.observe(media);

    const visibilityObserver = new IntersectionObserver(
      ([entry]) => {
        state.visible = entry.isIntersecting;
      },
      { rootMargin: "120px" },
    );
    visibilityObserver.observe(media);

    media.addEventListener("pointerenter", (event) => setPointer(event), { passive: true });
    media.addEventListener("pointerdown", (event) => setPointer(event), { passive: true });
    media.addEventListener("pointermove", (event) => {
      if (canHover || event.pressure > 0) setPointer(event);
    }, { passive: true });
    media.addEventListener("pointerleave", () => {
      state.active = false;
      state.lastInput = performance.now();
      media.classList.remove("is-fluid-active");
    }, { passive: true });
    media.addEventListener("pointerup", () => {
      if (!canHover) {
        state.active = false;
        media.classList.remove("is-fluid-active");
      }
    }, { passive: true });
    media.addEventListener("pointercancel", () => {
      state.active = false;
      media.classList.remove("is-fluid-active");
    }, { passive: true });

    if (vampireImage.complete && vampireImage.naturalWidth) initialiseFluid();
    else vampireImage.addEventListener("load", initialiseFluid, { once: true });
  }
}

// -- hero entrance ----------------------------------------------------------
if (window.gsap && !reducedMotion) {
  // clearProps drops the inline transform GSAP leaves behind once a tween
  // settles — without it Chromium keeps a compositing layer on the title
  // spans, which shows up as hairline seams between glyphs (Bebas Neue's
  // negative letter-spacing makes this especially visible).
  const tl = gsap.timeline({ defaults: { ease: "power3.out", clearProps: "all" } });

  tl.from(header, { y: -24, opacity: 0, duration: 0.6 })
    .from(".hero .content .pd", { y: 16, opacity: 0, duration: 0.5 }, "-=0.25")
    .from(
      ".hero .content .title .in",
      { yPercent: 100, opacity: 0, duration: 0.7, stagger: 0.08 },
      "-=0.2",
    )
    .from(".hero .content .sub", { y: 16, opacity: 0, duration: 0.5 }, "-=0.35")
    .from(".hero .content .highlights li", { y: 12, opacity: 0, duration: 0.4, stagger: 0.05 }, "-=0.3")
    .from(".hero .content .actions > *", { y: 12, opacity: 0, duration: 0.4, stagger: 0.08 }, "-=0.25")
    .from(".hero .photo", { opacity: 0, duration: 0.8 }, "-=0.6")
    .from(".hero .social a", { opacity: 0, x: 12, duration: 0.4, stagger: 0.06 }, "-=0.5");
}

// -- metrics: horizontal strip -> 2 × 2 portal -> About --------------------
// The strip travels into the viewport naturally. Once it reaches the top,
// the sticky stage maps each item to a quadrant and the resulting square
// expands past the viewport while its dark veil exposes the About section.
if (window.gsap && window.ScrollTrigger && !reducedMotion) {
  gsap.registerPlugin(ScrollTrigger);

  const metricsTransition = document.querySelector(".metrics-transition");
  const metricsZoom = metricsTransition?.querySelector(".metrics-zoom");
  const metricsPanel = metricsTransition?.querySelector(".metrics");
  const metricsGroups = metricsTransition ? [...metricsTransition.querySelectorAll(".group")] : [];
  const metricsAxes = metricsTransition?.querySelectorAll(".axis");
  const metricsIcons = metricsTransition?.querySelectorAll(".group > svg");
  const metricsValues = metricsTransition?.querySelectorAll(".group .value");
  const metricsLabels = metricsTransition?.querySelectorAll(".group .label");
  const metricsText = [...(metricsValues || []), ...(metricsLabels || [])];
  const metricsVeil = metricsTransition?.querySelector(".metrics-veil");
  const metricsBats = metricsTransition?.querySelector(".metrics-bats");
  const metricBatItems = metricsTransition?.querySelectorAll(".metrics-bats span");
  const aboutAfterMetrics = metricsTransition?.nextElementSibling?.matches(".about")
    ? metricsTransition.nextElementSibling
    : null;

  if (
    metricsTransition &&
    metricsZoom &&
    metricsPanel &&
    metricsGroups.length === 4 &&
    metricsVeil &&
    aboutAfterMetrics
  ) {
    const metricsMatchMedia = gsap.matchMedia();

    metricsMatchMedia.add(
      {
        desktop: "(min-width: 768px)",
        mobile: "(max-width: 767px)",
      },
      (context) => {
      const isMobile = context.conditions?.mobile;
      const barHeight = isMobile ? 86 : 104;
      const batsStart = isMobile ? 0.34 : 0.52;
      const squareSize = () => isMobile
        ? Math.min(420, window.innerWidth * 0.88, window.innerHeight * 0.62)
        : Math.min(580, window.innerWidth * 0.82, window.innerHeight * 0.7);
      const coverScale = () => {
        const side = squareSize();
        return Math.max(window.innerWidth / side, window.innerHeight / side) * 2.25;
      };

      // A large 3D compositor texture turns type soft while this portal
      // expands. Keeping the zoom in 2D lets the browser repaint the text
      // sharply for the readable part of the transition.
      gsap.set(metricsZoom, { force3D: false });

      // Phase 1 starts the moment the 104px strip is fully visible. It runs
      // while the section is still travelling upward, so there is no dead
      // viewport before the four items begin moving into their quadrants.
      const morphTimeline = gsap.timeline({
        scrollTrigger: {
          trigger: metricsTransition,
          start: () => `top bottom-=${barHeight}`,
          end: "top top",
          scrub: isMobile ? 0.4 : 0.65,
          invalidateOnRefresh: true,
        },
      });

      morphTimeline.to(
        metricsPanel,
        {
          left: "50%",
          top: "50%",
          xPercent: -50,
          yPercent: -50,
          width: squareSize,
          height: squareSize,
          borderRadius: 8,
          ease: "power2.inOut",
          duration: 0.36,
        },
        0,
      );

      metricsGroups.forEach((group, index) => {
        morphTimeline.to(
          group,
          {
            left: `${(index % 2) * 50}%`,
            top: `${Math.floor(index / 2) * 50}%`,
            width: "50%",
            height: "50%",
            ease: "power2.inOut",
            duration: 0.36,
          },
          0,
        );
      });

      morphTimeline
        .to(metricsGroups, { "--divider-opacity": 0, duration: 0.2, ease: "none" }, 0.12)
        .to(metricsAxes, { opacity: 0.78, duration: 0.18, ease: "power2.out" }, 0.18);

      if (isMobile) {
        morphTimeline
          .to(metricsGroups, { gap: 10, duration: 0.3, ease: "power2.inOut" }, 0)
          .to(metricsIcons, { width: 34, height: 34, padding: 8, duration: 0.3 }, 0)
          .to(metricsValues, { fontSize: 14, duration: 0.3 }, 0)
          .to(metricsLabels, { opacity: 1, duration: 0.18, ease: "power2.out" }, 0.16);
      }

      // Phase 2 begins with the square already centred. This pinned timeline
      // is deliberately shorter and contains only the impact/zoom/reveal.
      const transitionTimeline = gsap.timeline({
        scrollTrigger: {
          trigger: metricsTransition,
          start: "top top",
          end: () => `+=${window.innerHeight * (isMobile ? 1.05 : 1.25)}`,
          pin: metricsTransition.querySelector(".metrics-sticky"),
          pinSpacing: true,
          anticipatePin: 1,
          scrub: isMobile ? 0.5 : 0.8,
          invalidateOnRefresh: true,
        },
      });

      transitionTimeline
        .to(metricsZoom, { scale: 0.965, force3D: false, duration: 0.08, ease: "power2.out" }, 0)
        .to(metricsZoom, { scale: 1, force3D: false, duration: 0.08, ease: "power2.inOut" }, 0.08)
        .to(
          metricsZoom,
          {
            scale: coverScale,
            force3D: false,
            ease: "power2.in",
            duration: 0.66,
          },
          0.16,
        )
        .to(metricsText, { opacity: 0, duration: 0.18, ease: "power1.out" }, 0.4)
        .to(metricsAxes, { opacity: 0.18, duration: 0.3, ease: "none" }, 0.36)
        .to(metricsVeil, { opacity: 0, ease: "power2.inOut", duration: 0.48 }, 0.3)
        .to(metricsBats, { opacity: 1, duration: 0.2, ease: "power2.out" }, batsStart)
        .fromTo(
          metricBatItems,
          { opacity: 0, y: 64, x: (index) => (index % 2 ? 24 : -24) },
          {
            opacity: 1,
            y: -18,
            x: (index) => (index % 2 ? -8 : 8),
            duration: 0.3,
            stagger: 0.012,
            ease: "power2.out",
          },
          batsStart + 0.02,
        )
        .to(
          metricsPanel,
          {
            opacity: 0,
            filter: "brightness(1.9) blur(6px)",
            ease: "power2.in",
            duration: 0.16,
          },
          0.86,
        );

      return () => {
        morphTimeline.scrollTrigger?.kill();
        morphTimeline.kill();
        transitionTimeline.scrollTrigger?.kill();
        transitionTimeline.kill();
        gsap.set(
          [
            metricsZoom,
            metricsPanel,
            metricsVeil,
            metricsBats,
            ...metricsGroups,
            ...(metricsAxes || []),
            ...(metricsIcons || []),
            ...(metricsValues || []),
            ...(metricsLabels || []),
            ...(metricBatItems || []),
          ],
          {
          clearProps: "all",
          },
        );
      };
    });
  }
}

// -- about: scroll entrance + parallax --------------------------------------
if (window.gsap && window.ScrollTrigger) {
  gsap.registerPlugin(ScrollTrigger);

  const about = document.querySelector(".about");

  if (about && !reducedMotion) {
    const introTl = gsap.timeline({
      defaults: { ease: "power3.out" },
      scrollTrigger: { trigger: about, start: "top 88%", once: true },
    });

    // Absolute positions (rather than "-=" chaining) keep this cascade
    // tight and legible: the brief asks for a short, confident reveal, not
    // a slow drip — each step starts ~0.15s after the last instead of
    // waiting for it to mostly finish.
    introTl
      .from(about.querySelector(".bg"), { opacity: 0, duration: 0.9 }, 0)
      .from(about.querySelectorAll(".visual .fire.back"), { opacity: 0, duration: 0.9 }, 0.1)
      .from(about.querySelector(".visual .portrait"), { y: 24, opacity: 0, duration: 0.9 }, 0.25)
      .from(about.querySelector(".content .pd"), { y: 20, opacity: 0, duration: 0.7 }, 0.4)
      .from(about.querySelector(".content .title"), { y: 24, opacity: 0, duration: 0.8 }, 0.55)
      .from(about.querySelector(".content .body"), { y: 16, opacity: 0, duration: 0.7 }, 0.7)
      .from(about.querySelector(".content .quote"), { y: 12, opacity: 0, duration: 0.6 }, 0.85)
      .from(
        about.querySelectorAll(".content .metrics .group"),
        { y: 14, opacity: 0, duration: 0.7, stagger: 0.07 },
        1,
      )
      .from(about.querySelector(".content .btn"), { y: 12, opacity: 0, duration: 0.6 }, 1.15);

    ScrollTrigger.create({
      trigger: about,
      start: "top 78%",
      end: "bottom top",
      onToggle: ({ isActive }) => {
        about.classList.toggle("is-lighting", isActive);
      },
    });
  }
}

// -- about -> testimonials: chapter cover reveal ----------------------------
// About first holds as a readable chapter — including its CTA — before the
// testimonial cover takes over. The cover itself remains in normal document
// flow, so this stays independent from the adjacent pinned chapters.
if (window.gsap && window.ScrollTrigger && !reducedMotion) {
  const aboutChapter = document.querySelector(".about");
  const testimonialsCover = document.querySelector(".testimonials");

  if (aboutChapter && testimonialsCover) {
    gsap.registerPlugin(ScrollTrigger);
    const coverMatchMedia = gsap.matchMedia();

    coverMatchMedia.add("(min-width: 900px)", () => {
      const coverTimeline = gsap.timeline({
        scrollTrigger: {
          trigger: aboutChapter,
          start: "bottom bottom",
          end: () => `+=${window.innerHeight * 1.7}`,
          pin: aboutChapter,
          pinSpacing: false,
          scrub: 0.6,
          anticipatePin: 1,
          invalidateOnRefresh: true,
        },
      });

      coverTimeline
        // Keep the chapter above the incoming section during the reading hold.
        .set(aboutChapter, { zIndex: 13 }, 0)
        .to(
          aboutChapter,
          {
            opacity: 0,
            duration: 0.82,
            ease: "power1.inOut",
          },
          0.52,
        );

      return () => {
        coverTimeline.scrollTrigger?.kill();
        coverTimeline.kill();
        gsap.set(aboutChapter, { clearProps: "opacity,zIndex" });
      };
    });
  }
}

// -- testimonials: pinned horizontal scroll ----------------------------------
if (window.gsap && window.ScrollTrigger) {
  const section = document.querySelector(".testimonials");
  const track = section?.querySelector(".track");
  const cardsWrap = section?.querySelector(".cards");
  const fills = section?.querySelectorAll(".progress .fill");
  const prevBtn = section?.querySelector(".arrow.prev");
  const nextBtn = section?.querySelector(".arrow.next");

  if (section && track && cardsWrap) {
    const cardGap = 24;

    const setProgress = (p) => {
      const clamped = Math.max(0, Math.min(1, p));
      if (fills?.length === 2) {
        fills[0].style.transform = `scaleX(${Math.min(1, clamped * 2)})`;
        fills[1].style.transform = `scaleX(${Math.max(0, clamped * 2 - 1)})`;
      }
    };

    const cardStep = () => {
      const card = track.querySelector(".card");
      return card ? card.getBoundingClientRect().width + cardGap : 0;
    };

    // Native scroll is the baseline (works with no JS at all, and is what
    // mobile/reduced-motion use on purpose) — the pinned GSAP scrub below
    // is a progressive enhancement layered on top of it, not a replacement.
    const setupNativeFallback = () => {
      section.classList.remove("pinned");
      gsap.set(track, { clearProps: "x" });

      const onScroll = () => {
        const max = cardsWrap.scrollWidth - cardsWrap.clientWidth;
        setProgress(max > 0 ? cardsWrap.scrollLeft / max : 0);
      };
      const onPrev = () => cardsWrap.scrollBy({ left: -cardStep(), behavior: "smooth" });
      const onNext = () => cardsWrap.scrollBy({ left: cardStep(), behavior: "smooth" });

      cardsWrap.addEventListener("scroll", onScroll, { passive: true });
      prevBtn?.addEventListener("click", onPrev);
      nextBtn?.addEventListener("click", onNext);
      onScroll();

      return () => {
        cardsWrap.removeEventListener("scroll", onScroll);
        prevBtn?.removeEventListener("click", onPrev);
        nextBtn?.removeEventListener("click", onNext);
      };
    };

    if (reducedMotion) {
      setupNativeFallback();
    } else {
      gsap.registerPlugin(ScrollTrigger);

      ScrollTrigger.matchMedia({
        "(min-width: 900px)": function () {
          section.classList.add("pinned");

          gsap.from(gsap.utils.toArray(".card", track), {
            opacity: 0,
            y: 24,
            duration: 0.65,
            stagger: 0.07,
            ease: "power3.out",
            scrollTrigger: { trigger: section, start: "top 72%", once: true },
          });

          const tween = gsap.to(track, {
            x: () => -(track.scrollWidth - window.innerWidth),
            ease: "none",
            scrollTrigger: {
              trigger: ".testimonials .pin",
              pin: true,
              scrub: 1,
              start: "top top",
              end: () => {
                const travel = Math.max(0, track.scrollWidth - window.innerWidth);
                return `+=${Math.max(window.innerHeight * 2.1, travel * 1.05)}`;
              },
              invalidateOnRefresh: true,
              onUpdate: (self) => setProgress(self.progress),
            },
          });

          const st = tween.scrollTrigger;
          const onPrev = () => {
            const travel = Math.max(1, track.scrollWidth - window.innerWidth);
            const ratio = (st.end - st.start) / travel;
            const target = window.scrollY - cardStep() * ratio;

            if (lenis) lenis.scrollTo(target, { duration: 1.1 });
            else window.scrollTo({ top: target, behavior: "smooth" });
          };
          const onNext = () => {
            const travel = Math.max(1, track.scrollWidth - window.innerWidth);
            const ratio = (st.end - st.start) / travel;
            const target = window.scrollY + cardStep() * ratio;

            if (lenis) lenis.scrollTo(target, { duration: 1.1 });
            else window.scrollTo({ top: target, behavior: "smooth" });
          };

          prevBtn?.addEventListener("click", onPrev);
          nextBtn?.addEventListener("click", onNext);

          return () => {
            section.classList.remove("pinned");
            prevBtn?.removeEventListener("click", onPrev);
            nextBtn?.removeEventListener("click", onNext);
          };
        },

        "(max-width: 899px)": setupNativeFallback,
      });
    }
  }
}

// -- projects: data + pinned horizontal scroll -------------------------------
// Project data — add each real project here as it is received.
const projects = [
  {
    id: "01",
    title: "THE LED",
    technologies: ["HTML", "CSS Mobile First", "WordPress"],
    url: "https://theled.com.br/",
        image: "assets/img/projects/the-led-showcase.png",
    imageAlt: "Captura da página inicial do site THE LED",
  },
  {
    id: "02",
    title: "Caixa Assistência",
    technologies: ["Angular", "GSAP", "TypeScript"],
    url: "https://caixaassistencia.com.br/",
        image: "assets/img/projects/caixa-assistencia-showcase.png",
    imageAlt: "Captura da página inicial do site Caixa Assistência",
  },
  {
    id: "03",
    title: "CTS&I",
    technologies: ["HTML", "Tailwind", "GSAP", "Lenis.js"],
    url: "https://ctsandi.com/",
        image: "assets/img/projects/ctsandi-showcase.png",
    imageAlt: "Captura da página inicial do site CTS&I",
  },
  {
    id: "04",
    title: "BreathTech®",
    technologies: ["HTML", "Tailwind", "GSAP"],
    url: "https://breathtechfilm.com/",
        image: "assets/img/projects/breathtechfilm-showcase.png",
    imageAlt: "Captura da página inicial do site BreathTech",
  },
  {
    id: "05",
    title: "3GEN Masonry Products",
    technologies: ["WordPress", "HTML", "Tailwind"],
    url: "https://3genmp.com/",
        image: "assets/img/projects/3genmp-showcase.png",
    imageAlt: "Captura da página inicial do site 3GEN Masonry Products",
  },
  {
    id: "06",
    title: "Imohoo",
    technologies: ["WordPress", "PHP"],
    url: "https://imohoo.com.br/",
    image: "assets/img/projects/imohoo-showcase.png",
    imageAlt: "Captura da página inicial do site Imohoo",
  },
  {
    id: "07",
    title: "Plataforma Filantropia",
    technologies: ["HTML", "Bootstrap 5"],
    url: "https://impactos.filantropia.ong/",
    image: "assets/img/projects/filantropia-impactos-showcase-v2.png",
    imageAlt: "Captura da página inicial da Plataforma Filantropia",
  },
  {
    id: "08",
    title: "Rafael Takei",
    technologies: ["HTML", "CSS", "JavaScript", "WordPress"],
    url: "https://rafaeltakei.com.br/",
    image: "assets/img/projects/rafael-takei-showcase.png",
    imageAlt: "Captura da página inicial do site Rafael Takei",
  },
  {
    id: "09",
    title: "Ibiza Group",
    technologies: ["PHP", "CSS", "JavaScript"],
    url: "https://ibizagroup.com.br/",
    image: "assets/img/projects/ibiza-group-showcase.png",
    imageAlt: "Captura da página inicial do site Ibiza Group",
  },
  {
    id: "10",
    title: "Prefeitura de Galinhos",
    technologies: ["WordPress"],
    url: "https://www.galinhos.rn.gov.br/",
    image: "assets/img/projects/galinhos-showcase.png",
    imageAlt: "Captura da página inicial do Portal da Prefeitura de Galinhos",
  },
];

{
  const projectsSection = document.querySelector(".projects");

  if (projectsSection) {
    projectsSection.classList.remove("pinned");

    if (window.gsap && window.ScrollTrigger && !reducedMotion) {
      gsap.registerPlugin(ScrollTrigger);

      ScrollTrigger.create({
        trigger: projectsSection,
        start: "top 78%",
        end: "bottom top",
        onToggle: ({ isActive }) => {
          projectsSection.classList.toggle("is-lighting", isActive);
        },
      });
    }

    projects.forEach((project) => {
      const card = projectsSection.querySelector(`.project-card[data-id="${project.id}"]`);
      if (!card) return;

      card.href = project.url;
      card.setAttribute("aria-label", `Abrir projeto ${project.title} em nova aba`);
      card.querySelector(".name").textContent = project.title;
      if (project.image) {
        const media = card.querySelector(".media");
        const image = document.createElement("img");

        image.className = "project-image";
        image.src = project.image;
        image.alt = project.imageAlt || "";
        image.loading = "lazy";
        image.decoding = "async";
        media.append(image);
        media.classList.add("has-image");
        media.style.setProperty("--project-image", `url("${project.image}")`);

        if (project.previewMode === "contained") {
          media.classList.add("has-full-preview");
        }
      }
      card.querySelector(".tech").textContent = project.technologies.join(" · ");
    });

    const projectCards = Array.from(projectsSection.querySelectorAll(".project-card"));
    const currentNumber = projectsSection.querySelector(".project-status .current");
    const totalNumber = projectsSection.querySelector(".project-status .total");
    const progressFill = projectsSection.querySelector(".project-progress i");
    let activeFrame = 0;

    const updateActiveProject = () => {
      activeFrame = 0;
      if (!projectCards.length) return;

      const focusLine = window.innerHeight * 0.47;
      let activeIndex = 0;
      let closestDistance = Number.POSITIVE_INFINITY;

      projectCards.forEach((card, index) => {
        const bounds = card.getBoundingClientRect();
        const cardCenter = bounds.top + bounds.height / 2;
        const distance = Math.abs(cardCenter - focusLine);

        if (distance < closestDistance) {
          closestDistance = distance;
          activeIndex = index;
        }
      });

      projectCards.forEach((card, index) => {
        const isActive = index === activeIndex;
        card.classList.toggle("is-active", isActive);

        if (isActive) card.setAttribute("aria-current", "true");
        else card.removeAttribute("aria-current");
      });

      if (currentNumber) currentNumber.textContent = projectCards[activeIndex].dataset.id;
      if (totalNumber) totalNumber.textContent = String(projectCards.length).padStart(2, "0");
      if (progressFill) {
        progressFill.style.transform = `scaleY(${(activeIndex + 1) / projectCards.length})`;
      }
    };

    const requestActiveUpdate = () => {
      if (activeFrame) return;
      activeFrame = requestAnimationFrame(updateActiveProject);
    };

    window.addEventListener("scroll", requestActiveUpdate, { passive: true });
    window.addEventListener("resize", requestActiveUpdate);
    requestActiveUpdate();
  }
}

// -- skills: data + render + entrance + mouse glow ---------------------------
// Inner markup only (no outer <svg>) — brand marks use fill, Lucide concept
// icons use stroke; the render step below picks the right wrapper per type.
const skillIcons = {
  html5: '<path d="M1.5 0h21l-1.91 21.563L11.977 24l-8.564-2.438L1.5 0zm7.031 9.75l-.232-2.718 10.059.003.23-2.622L5.412 4.41l.698 8.01h9.126l-.326 3.426-2.91.804-2.955-.81-.188-2.11H6.248l.33 4.171L12 19.351l5.379-1.443.744-8.157H8.531z"/>',
  css3: '<path d="M1.5 0h21l-1.91 21.563L11.977 24l-8.565-2.438L1.5 0zm17.09 4.413L5.41 4.41l.213 2.622 10.125.002-.255 2.716h-6.64l.24 2.573h6.182l-.366 3.523-2.91.804-2.956-.81-.188-2.11h-2.61l.29 3.855L12 19.288l5.373-1.53L18.59 4.414z"/>',
  javascript:
    '<path d="M0 0h24v24H0V0zm22.034 18.276c-.175-1.095-.888-2.015-3.003-2.873-.736-.345-1.554-.585-1.797-1.14-.091-.33-.105-.51-.046-.705.15-.646.915-.84 1.515-.66.39.12.75.42.976.9 1.034-.676 1.034-.676 1.755-1.125-.27-.42-.404-.601-.586-.78-.63-.705-1.469-1.065-2.834-1.034l-.705.089c-.676.165-1.32.525-1.71 1.005-1.14 1.291-.811 3.541.569 4.471 1.365 1.02 3.361 1.244 3.616 2.205.24 1.17-.87 1.545-1.966 1.41-.811-.18-1.26-.586-1.755-1.336l-1.83 1.051c.21.48.45.689.81 1.109 1.74 1.756 6.09 1.666 6.871-1.004.029-.09.24-.705.074-1.65l.046.067zm-8.983-7.245h-2.248c0 1.938-.009 3.864-.009 5.805 0 1.232.063 2.363-.138 2.711-.33.689-1.18.601-1.566.48-.396-.196-.597-.466-.83-.855-.063-.105-.11-.196-.127-.196l-1.825 1.125c.305.63.75 1.172 1.324 1.517.855.51 2.004.675 3.207.405.783-.226 1.458-.691 1.811-1.411.51-.93.402-2.07.397-3.346.012-2.054 0-4.109 0-6.179l.004-.056z"/>',
  typescript:
    '<path d="M1.125 0C.502 0 0 .502 0 1.125v21.75C0 23.498.502 24 1.125 24h21.75c.623 0 1.125-.502 1.125-1.125V1.125C24 .502 23.498 0 22.875 0zm17.363 9.75c.612 0 1.154.037 1.627.111a6.38 6.38 0 0 1 1.306.34v2.458a3.95 3.95 0 0 0-.643-.361 5.093 5.093 0 0 0-.717-.26 5.453 5.453 0 0 0-1.426-.2c-.3 0-.573.028-.819.086a2.1 2.1 0 0 0-.623.242c-.17.104-.3.229-.393.374a.888.888 0 0 0-.14.49c0 .196.053.373.156.529.104.156.252.304.443.444s.423.276.696.41c.273.135.582.274.926.416.47.197.892.407 1.266.628.374.222.695.473.963.753.268.279.472.598.614.957.142.359.214.776.214 1.253 0 .657-.125 1.21-.373 1.656a3.033 3.033 0 0 1-1.012 1.085 4.38 4.38 0 0 1-1.487.596c-.566.12-1.163.18-1.79.18a9.916 9.916 0 0 1-1.84-.164 5.544 5.544 0 0 1-1.512-.493v-2.63a5.033 5.033 0 0 0 3.237 1.2c.333 0 .624-.03.872-.09.249-.06.456-.144.623-.25.166-.108.29-.234.373-.38a1.023 1.023 0 0 0-.074-1.089 2.12 2.12 0 0 0-.537-.5 5.597 5.597 0 0 0-.807-.444 27.72 27.72 0 0 0-1.007-.436c-.918-.383-1.602-.852-2.053-1.405-.45-.553-.676-1.222-.676-2.005 0-.614.123-1.141.369-1.582.246-.441.58-.804 1.004-1.089a4.494 4.494 0 0 1 1.47-.629 7.536 7.536 0 0 1 1.77-.201zm-15.113.188h9.563v2.166H9.506v9.646H6.789v-9.646H3.375z"/>',
  react:
    '<path d="M14.23 12.004a2.236 2.236 0 0 1-2.235 2.236 2.236 2.236 0 0 1-2.236-2.236 2.236 2.236 0 0 1 2.235-2.236 2.236 2.236 0 0 1 2.236 2.236zm2.648-10.69c-1.346 0-3.107.96-4.888 2.622-1.78-1.653-3.542-2.602-4.887-2.602-.41 0-.783.093-1.106.278-1.375.793-1.683 3.264-.973 6.365C1.98 8.917 0 10.42 0 12.004c0 1.59 1.99 3.097 5.043 4.03-.704 3.113-.39 5.588.988 6.38.32.187.69.275 1.102.275 1.345 0 3.107-.96 4.888-2.624 1.78 1.654 3.542 2.603 4.887 2.603.41 0 .783-.09 1.106-.275 1.374-.792 1.683-3.263.973-6.365C22.02 15.096 24 13.59 24 12.004c0-1.59-1.99-3.097-5.043-4.032.704-3.11.39-5.587-.988-6.38-.318-.184-.688-.277-1.092-.278zm-.005 1.09v.006c.225 0 .406.044.558.127.666.382.955 1.835.73 3.704-.054.46-.142.945-.25 1.44-.96-.236-2.006-.417-3.107-.534-.66-.905-1.345-1.727-2.035-2.447 1.592-1.48 3.087-2.292 4.105-2.295zm-9.77.02c1.012 0 2.514.808 4.11 2.28-.686.72-1.37 1.537-2.02 2.442-1.107.117-2.154.298-3.113.538-.112-.49-.195-.964-.254-1.42-.23-1.868.054-3.32.714-3.707.19-.09.4-.127.563-.132zm4.882 3.05c.455.468.91.992 1.36 1.564-.44-.02-.89-.034-1.345-.034-.46 0-.915.01-1.36.034.44-.572.895-1.096 1.345-1.565zM12 8.1c.74 0 1.477.034 2.202.093.406.582.802 1.203 1.183 1.86.372.64.71 1.29 1.018 1.946-.308.655-.646 1.31-1.013 1.95-.38.66-.773 1.288-1.18 1.87-.728.063-1.466.098-2.21.098-.74 0-1.477-.035-2.202-.093-.406-.582-.802-1.204-1.183-1.86-.372-.64-.71-1.29-1.018-1.946.303-.657.646-1.313 1.013-1.954.38-.66.773-1.286 1.18-1.868.728-.064 1.466-.098 2.21-.098zm-3.635.254c-.24.377-.48.763-.704 1.16-.225.39-.435.782-.635 1.174-.265-.656-.49-1.31-.676-1.947.64-.15 1.315-.283 2.015-.386zm7.26 0c.695.103 1.365.23 2.006.387-.18.632-.405 1.282-.66 1.933-.2-.39-.41-.783-.64-1.174-.225-.392-.465-.774-.705-1.146zm3.063.675c.484.15.944.317 1.375.498 1.732.74 2.852 1.708 2.852 2.476-.005.768-1.125 1.74-2.857 2.475-.42.18-.88.342-1.355.493-.28-.958-.646-1.956-1.1-2.98.45-1.017.81-2.01 1.085-2.964zm-13.395.004c.278.96.645 1.957 1.1 2.98-.45 1.017-.812 2.01-1.086 2.964-.484-.15-.944-.318-1.37-.5-1.732-.737-2.852-1.706-2.852-2.474 0-.768 1.12-1.742 2.852-2.476.42-.18.88-.342 1.356-.494zm11.678 4.28c.265.657.49 1.312.676 1.948-.64.157-1.316.29-2.016.39.24-.375.48-.762.705-1.158.225-.39.435-.788.636-1.18zm-9.945.02c.2.392.41.783.64 1.175.23.39.465.772.705 1.143-.695-.102-1.365-.23-2.006-.386.18-.63.406-1.282.66-1.933zM17.92 16.32c.112.493.2.968.254 1.423.23 1.868-.054 3.32-.714 3.708-.147.09-.338.128-.563.128-1.012 0-2.514-.807-4.11-2.28.686-.72 1.37-1.536 2.02-2.44 1.107-.118 2.154-.3 3.113-.54zm-11.83.01c.96.234 2.006.415 3.107.532.66.905 1.345 1.727 2.035 2.446-1.595 1.483-3.092 2.295-4.11 2.295-.22-.005-.406-.05-.553-.132-.666-.38-.955-1.834-.73-3.703.054-.46.142-.944.25-1.438zm4.56.64c.44.02.89.034 1.345.034.46 0 .915-.01 1.36-.034-.44.572-.895 1.095-1.345 1.565-.455-.47-.91-.993-1.36-1.565z"/>',
  nextdotjs:
    '<path d="M18.665 21.978C16.758 23.255 14.465 24 12 24 5.377 24 0 18.623 0 12S5.377 0 12 0s12 5.377 12 12c0 3.583-1.574 6.801-4.067 9.001L9.219 7.2H7.2v9.596h1.615V9.251l9.85 12.727Zm-3.332-8.533 1.6 2.061V7.2h-1.6v6.245Z"/>',
  vuedotjs:
    '<path d="M24,1.61H14.06L12,5.16,9.94,1.61H0L12,22.39ZM12,14.08,5.16,2.23H9.59L12,6.41l2.41-4.18h4.43Z"/>',
  angular:
    '<path d="M16.712 17.711H7.288l-1.204 2.916L12 24l5.916-3.373-1.204-2.916ZM14.692 0l7.832 16.855.814-12.856L14.692 0ZM9.308 0 .662 3.999l.814 12.856L9.308 0Zm-.405 13.93h6.198L12 6.396 8.903 13.93Z"/>',
  tailwindcss:
    '<path d="M12.001,4.8c-3.2,0-5.2,1.6-6,4.8c1.2-1.6,2.6-2.2,4.2-1.8c0.913,0.228,1.565,0.89,2.288,1.624 C13.666,10.618,15.027,12,18.001,12c3.2,0,5.2-1.6,6-4.8c-1.2,1.6-2.6,2.2-4.2,1.8c-0.913-0.228-1.565-0.89-2.288-1.624 C16.337,6.182,14.976,4.8,12.001,4.8z M6.001,12c-3.2,0-5.2,1.6-6,4.8c1.2-1.6,2.6-2.2,4.2-1.8c0.913,0.228,1.565,0.89,2.288,1.624 c1.177,1.194,2.538,2.576,5.512,2.576c3.2,0,5.2-1.6,6-4.8c-1.2,1.6-2.6,2.2-4.2,1.8c-0.913-0.228-1.565-0.89-2.288-1.624 C10.337,13.382,8.976,12,6.001,12z"/>',
  sass: '<path d="M12 0c6.627 0 12 5.373 12 12s-5.373 12-12 12S0 18.627 0 12 5.373 0 12 0zM9.615 15.998c.175.645.156 1.248-.024 1.792l-.065.18c-.024.061-.052.12-.078.176-.14.29-.326.56-.555.81-.698.759-1.672 1.047-2.09.805-.45-.262-.226-1.335.584-2.19.871-.918 2.12-1.509 2.12-1.509v-.003l.108-.061zm9.911-10.861c-.542-2.133-4.077-2.834-7.422-1.645-1.989.707-4.144 1.818-5.693 3.267C4.568 8.48 4.275 9.98 4.396 10.607c.427 2.211 3.457 3.657 4.703 4.73v.006c-.367.18-3.056 1.529-3.686 2.925-.675 1.47.105 2.521.615 2.655 1.575.436 3.195-.36 4.065-1.649.84-1.261.766-2.881.404-3.676.496-.135 1.08-.195 1.83-.104 2.101.24 2.521 1.56 2.43 2.1-.09.539-.523.854-.674.944-.15.091-.195.12-.181.181.015.09.091.09.21.075.165-.03 1.096-.45 1.141-1.471.045-1.29-1.186-2.729-3.375-2.7-.9.016-1.471.091-1.875.256-.03-.045-.061-.075-.105-.105-1.35-1.455-3.855-2.475-3.75-4.41.03-.705.285-2.564 4.8-4.814 3.705-1.846 6.661-1.335 7.171-.21.733 1.604-1.576 4.59-5.431 5.024-1.47.165-2.235-.404-2.431-.615-.209-.225-.239-.24-.314-.194-.12.06-.045.255 0 .375.12.3.585.825 1.396 1.095.704.225 2.43.359 4.5-.45 2.324-.899 4.139-3.405 3.614-5.505l.073.067z"/>',
  greensock:
    '<path d="M17.21 0c-.545.003-1.084.134-1.256.367-.11.165-.192 1.196-.11 1.718 0 0 .032.345.09.614a14.6 14.6 0 0 1-.02.182 7.024 7.024 0 0 1-.097.605c-.01.056-.207.095-.425.152a2.495 2.495 0 0 0-.138-.042c-.234-.069-.385.123-.618.26-.069-.04-.371-.178-.536-.082-.165.096-.275.193-.44.261-.082-.041-.302-.041-.48.028a1.27 1.27 0 0 0-.483.278c-2.314.58-4.813 1.635-5.012 1.741-1.017.522-2.679 1.415-3.434 2.033-1.291 1.071-2.06 2.322-2.363 3.242-.385 1.14-.275 1.827.096 1.387.298-.366 1.632-1.454 2.475-1.999l-.002.007a3.219 3.219 0 0 1 .44-.26l.233-.124.505-.323c.602.552.803 1.433.937 2.63.22 1.841 1.704 2.693 3.434 2.72 1.8.028 2.446.399 3.119 1.305.153.201.318.307.47.368a1.954 1.954 0 0 0-.16.405c-.075.17-.125.38-.157.608a.157.157 0 0 0-.03.075c-.068.536-.055 1.8-.068 2.473-.014.673-.028.77-.083.866-.055.11-.11.178-.178.467-.069.302-.193.384-.316.631-.206.385-.165.81.041 1.003.206.192.77.481 1.538.385.77-.096.88-.151.756-.893-.014-.11-.192-.605-.137-.797.082-.206-.096-.563-.055-.577.041-.014.096-.288.096-.426 0-.137-.014-.796.137-1.14.062-.14.193-.46.326-.785.442-.723.459-1.161.48-1.41.03-.202.046-.46.018-.744.055-.083.289-.275.316-.646 0 0 .644-.337 1.102-1.148.16.557.31.91.286 1.272-.499.39-.684.678-.76.959-.048-.02-.076-.037-.11-.04h-.027a.437.437 0 0 0-.106.029c-.192.068-.041 1.318.165 1.827.206.508.316.81.398 1.36.083.549-.192 1.222-.302 1.524 0 0-.179.536.233.824.358.248 1.704.18 2.308.18.605 0 1.511.219 2.088.109.715-.124.824-.55.399-.77-.426-.22-1.072-.329-1.91-.933-.22-.152-.522-.289-.563-.412-.041-.124-.041-.838-.027-1.457.013-.618.22-1.414.288-1.84.064-.398-.076-.388-.262-.351.032-.147.066-.292.097-.446.344-.632.193-1.223.193-1.223.82-1.044.4-3.27.22-4.048.64.303.96.188.96.188.102-.055.192-.134.274-.224.337-.362.51-.916.51-.916V11c.782-.783 1.151-1.936.26-2.692a1.331 1.331 0 0 0-.219-1.263 1.56 1.56 0 0 0-.37-1.731 1.36 1.36 0 0 0-.487-.297c-.2-.295-.245-.417-.572-.349-.15-.165-.178-.288-.494-.178 0 0-.096-.234-.275-.289a.25.25 0 0 0-.05-.015c-.302-.21-.576-.215-.772-.16-.064-.048-.061-.124-.07-.388-.008-.2-.019-.486-.031-.744.027-.328.102-.974.126-1.303.028-.37.042-.948-.123-1.195C18.303.12 17.754-.003 17.21 0zm-1.133 2.702c.146.149.301.306.432.416.124.11.426.096.7.096.248 0 .468.028.564-.027.154-.077.355-.235.523-.394.011.152.022.304.026.435.01.295-.043.468.024.57-.082.048-.174.105-.269.156-.151.08-.306.136-.403.115h-.002c-.209-.035-.931-.215-1.331-.407-.167-.259-.335-.398-.326-.448.027-.137.04-.247.054-.425.004-.03.005-.058.008-.088z"/>',
  framer: '<path d="M4 0h16v8h-8zM4 8h8l8 8H4zM4 16h8v8z"/>',
  figma:
    '<path d="M15.852 8.981h-4.588V0h4.588c2.476 0 4.49 2.014 4.49 4.49s-2.014 4.491-4.49 4.491zM12.735 7.51h3.117c1.665 0 3.019-1.355 3.019-3.019s-1.355-3.019-3.019-3.019h-3.117V7.51zm0 1.471H8.148c-2.476 0-4.49-2.014-4.49-4.49S5.672 0 8.148 0h4.588v8.981zm-4.587-7.51c-1.665 0-3.019 1.355-3.019 3.019s1.354 3.02 3.019 3.02h3.117V1.471H8.148zm4.587 15.019H8.148c-2.476 0-4.49-2.014-4.49-4.49s2.014-4.49 4.49-4.49h4.588v8.98zM8.148 8.981c-1.665 0-3.019 1.355-3.019 3.019s1.355 3.019 3.019 3.019h3.117V8.981H8.148zM8.172 24c-2.489 0-4.515-2.014-4.515-4.49s2.014-4.49 4.49-4.49h4.588v4.441c0 2.503-2.047 4.539-4.563 4.539zm-.024-7.51a3.023 3.023 0 0 0-3.019 3.019c0 1.665 1.365 3.019 3.044 3.019 1.705 0 3.093-1.376 3.093-3.068v-2.97H8.148zm7.704 0h-.098c-2.476 0-4.49-2.014-4.49-4.49s2.014-4.49 4.49-4.49h.098c2.476 0 4.49 2.014 4.49 4.49s-2.014 4.49-4.49 4.49zm-.097-7.509c-1.665 0-3.019 1.355-3.019 3.019s1.355 3.019 3.019 3.019h.098c1.665 0 3.019-1.355 3.019-3.019s-1.355-3.019-3.019-3.019h-.098z"/>',
  git: '<path d="M13.09 23.549a1.54 1.54 0 0 1-2.18 0L.451 13.089a1.54 1.54 0 0 1 0-2.179l7.191-7.19 2.733 2.733a1.85 1.85 0 0 0 .964 2.326v6.66a1.849 1.849 0 1 0 1.54 0V8.957l2.508 2.508a1.85 1.85 0 1 0 1.09-1.09l-2.634-2.634a1.85 1.85 0 0 0-2.378-2.377L8.73 2.63 10.91.451a1.54 1.54 0 0 1 2.179 0l10.459 10.46a1.54 1.54 0 0 1 0 2.179z"/>',
  wordpress:
    '<path d="M21.469 6.825c.84 1.537 1.318 3.3 1.318 5.175 0 3.979-2.156 7.456-5.363 9.325l3.295-9.527c.615-1.54.82-2.771.82-3.864 0-.405-.026-.78-.07-1.11m-7.981.105c.647-.03 1.232-.105 1.232-.105.582-.075.514-.93-.067-.899 0 0-1.755.135-2.88.135-1.064 0-2.85-.15-2.85-.15-.585-.03-.661.855-.075.885 0 0 .54.061 1.125.09l1.68 4.605-2.37 7.08L5.354 6.9c.649-.03 1.234-.1 1.234-.1.585-.075.516-.93-.065-.896 0 0-1.746.138-2.874.138-.2 0-.438-.008-.69-.015C4.911 3.15 8.235 1.215 12 1.215c2.809 0 5.365 1.072 7.286 2.833-.046-.003-.091-.009-.141-.009-1.06 0-1.812.923-1.812 1.914 0 .89.513 1.643 1.06 2.531.411.72.89 1.643.89 2.977 0 .915-.354 1.994-.821 3.479l-1.075 3.585-3.9-11.61.001.014zM12 22.784c-1.059 0-2.081-.153-3.048-.437l3.237-9.406 3.315 9.087c.024.053.05.101.078.149-1.12.393-2.325.609-3.582.609M1.211 12c0-1.564.336-3.05.935-4.39L7.29 21.709C3.694 19.96 1.212 16.271 1.211 12M12 0C5.385 0 0 5.385 0 12s5.385 12 12 12 12-5.385 12-12S18.615 0 12 0"/>',
  vite: '<path d="M13.056 23.238a.57.57 0 0 1-1.02-.355v-5.202c0-.63-.512-1.143-1.144-1.143H5.148a.57.57 0 0 1-.464-.903l3.777-5.29c.54-.753 0-1.804-.93-1.804H.57a.574.574 0 0 1-.543-.746.6.6 0 0 1 .08-.157L5.008.78a.57.57 0 0 1 .467-.24h14.589a.57.57 0 0 1 .466.903l-3.778 5.29c-.54.755 0 1.806.93 1.806h5.745c.238 0 .424.138.513.322a.56.56 0 0 1-.063.603z"/>',
  webpack:
    '<path d="M22.1987 18.498l-9.7699 5.5022v-4.2855l6.0872-3.3338 3.6826 2.117zm.6683-.6026V6.3884l-3.5752 2.0544v7.396zm-21.0657.6026l9.7699 5.5022v-4.2855L5.484 16.3809l-3.6826 2.117zm-.6683-.6026V6.3884l3.5751 2.0544v7.396zm.4183-12.2515l10.0199-5.644v4.1434L5.152 7.6586l-.0489.028zm20.8975 0l-10.02-5.644v4.1434l6.4192 3.5154.0489.028 3.5518-2.0427zm-10.8775 13.096l-6.0056-3.2873V8.9384l6.0054 3.4525v6.349zm.8575 0l6.0053-3.2873V8.9384l-6.0053 3.4525zM5.9724 8.1845l6.0287-3.3015L18.03 8.1845l-6.0288 3.4665z"/>',
  gauge: '<path d="m12 14 4-4"/><path d="M3.34 19a10 10 0 1 1 17.32 0"/>',
  landmark:
    '<path d="M10 18v-7"/><path d="M11.119 2.205a2 2 0 0 1 1.762 0l7.84 3.846A.5.5 0 0 1 20.5 7h-17a.5.5 0 0 1-.22-.949z"/><path d="M14 18v-7"/><path d="M18 18v-7"/><path d="M3 22h18"/><path d="M6 18v-7"/>',
  search: '<path d="m21 21-4.34-4.34"/><circle cx="11" cy="11" r="8"/>',
  accessibility:
    '<circle cx="16" cy="4" r="1"/><path d="m18 19 1-7-6 1"/><path d="m5 8 3-3 5.5 3-2.36 3.5"/><path d="M4.24 14.5a5 5 0 0 0 6.88 6"/><path d="M13.76 17.5a5 5 0 0 0-6.88-6"/>',
  "monitor-smartphone":
    '<path d="M18 8V6a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2v7a2 2 0 0 0 2 2h8"/><path d="M10 19v-3.96 3.15"/><path d="M7 19h5"/><rect width="6" height="10" x="16" y="12" rx="2"/>',
  braces:
    '<path d="M8 3H7a2 2 0 0 0-2 2v5a2 2 0 0 1-2 2 2 2 0 0 1 2 2v5c0 1.1.9 2 2 2h1"/><path d="M16 21h1a2 2 0 0 0 2-2v-5c0-1.1.9-2 2-2a2 2 0 0 1-2-2V5a2 2 0 0 0-2-2h-1"/>',
  infinity: '<path d="M6 16c5 0 7-8 12-8a4 4 0 0 1 0 8c-5 0-7-8-12-8a4 4 0 1 0 0 8"/>',
  activity:
    '<path d="M22 12h-2.48a2 2 0 0 0-1.93 1.46l-2.35 8.36a.25.25 0 0 1-.48 0L9.24 2.18a.25.25 0 0 0-.48 0l-2.35 8.36A2 2 0 0 1 4.49 12H2"/>',
};

const skillGroups = [
  {
    id: "01",
    title: "Frontend Core",
    skills: [
      { name: "HTML", icon: "html5", color: "#E34F26", type: "brand" },
      { name: "CSS", icon: "css3", color: "#1572B6", type: "brand" },
      { name: "JavaScript", icon: "javascript", color: "#F7DF1E", type: "brand" },
      { name: "TypeScript", icon: "typescript", color: "#3178C6", type: "brand" },
      { name: "React", icon: "react", color: "#61DAFB", type: "brand" },
      { name: "Next.js", icon: "nextdotjs", color: "#EDEDED", type: "brand" },
      { name: "Vue", icon: "vuedotjs", color: "#4FC08D", type: "brand" },
      { name: "Angular", icon: "angular", color: "#DD0031", type: "brand" },
    ],
  },
  {
    id: "02",
    title: "UI & Motion",
    skills: [
      { name: "Tailwind", icon: "tailwindcss", color: "#38BDF8", type: "brand" },
      { name: "Sass", icon: "sass", color: "#CC6699", type: "brand" },
      { name: "GSAP", icon: "greensock", color: "#88CE02", type: "brand" },
      { name: "Framer Motion", icon: "framer", color: "#0055FF", type: "brand" },
      { name: "Figma", icon: "figma", color: "#A259FF", type: "brand" },
    ],
  },
  {
    id: "03",
    title: "Performance",
    skills: [
      { name: "Core Web Vitals", icon: "gauge", color: "#D92732", type: "lucide" },
      { name: "Lighthouse", icon: "landmark", color: "#D92732", type: "lucide" },
      { name: "SEO técnico", icon: "search", color: "#D92732", type: "lucide" },
      { name: "Acessibilidade", icon: "accessibility", color: "#D92732", type: "lucide" },
      { name: "Responsive Design", icon: "monitor-smartphone", color: "#D92732", type: "lucide" },
    ],
  },
  {
    id: "04",
    title: "Tools & Workflow",
    skills: [
      { name: "Git", icon: "git", color: "#F05032", type: "brand" },
      { name: "APIs", icon: "braces", color: "#D92732", type: "lucide" },
      { name: "WordPress", icon: "wordpress", color: "#C6C6C6", type: "brand" },
      { name: "Vite", icon: "vite", color: "#646CFF", type: "brand" },
      { name: "Webpack", icon: "webpack", color: "#8DD6F9", type: "brand" },
      { name: "CI/CD", icon: "infinity", color: "#D92732", type: "lucide" },
    ],
  },
];

{
  const skillsSection = document.querySelector("section.skills");
  const skillsContent = skillsSection?.querySelector(".content");

  if (skillsSection && skillsContent) {
    const arrowRight =
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 12h14"/><path d="m12 5 7 7-7 7"/></svg>';

    skillsContent.innerHTML = skillGroups
      .map((group) => {
        const items = group.skills
          .map((skill) => {
            const wrapper =
              skill.type === "brand"
                ? `<svg viewBox="0 0 24 24" fill="currentColor">${skillIcons[skill.icon]}</svg>`
                : `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">${skillIcons[skill.icon]}</svg>`;
            return `<div class="tech">
              <span class="icon" style="color:${skill.color}">${wrapper}</span>
              <span class="label">${skill.name}</span>
            </div>`;
          })
          .join("");

        return `<div class="group">
          <div class="head">
            <span class="number">${group.id}</span>
            <h3>${group.title}</h3>
            ${arrowRight}
          </div>
          <div class="grid">${items}</div>
        </div>`;
      })
      .join("");

    // -- entrance ------------------------------------------------------------
    if (window.gsap && window.ScrollTrigger && !reducedMotion) {
      gsap.registerPlugin(ScrollTrigger);

      const introTl = gsap.timeline({
        defaults: { ease: "power3.out" },
        scrollTrigger: { trigger: skillsSection, start: "top 72%", once: true },
      });

      introTl
        .to(skillsSection.querySelector(".glow"), { opacity: 1, duration: 1 }, 0)
        .from(skillsSection.querySelector(".intro .pd"), { y: 16, opacity: 0, duration: 0.6 }, 0.1)
        .from(skillsSection.querySelector(".intro .title"), { y: 24, opacity: 0, duration: 0.8 }, 0.2)
        .from(skillsSection.querySelector(".intro .sub"), { y: 16, opacity: 0, duration: 0.6 }, 0.4)
        .from(skillsSection.querySelector(".intro .cta"), { y: 12, opacity: 0, duration: 0.5 }, 0.55)
        .from(
          skillsSection.querySelectorAll(".group"),
          { opacity: 0, y: 28, duration: 0.8, stagger: 0.09 },
          0.3,
        )
        .from(
          skillsSection.querySelectorAll(".tech"),
          { opacity: 0, scale: 0.97, duration: 0.4, stagger: 0.03 },
          0.55,
        )
        .from(skillsSection.querySelectorAll(".pillar"), { opacity: 0, y: 16, duration: 0.6, stagger: 0.08 }, 0.9);
    }

    // -- subtle cursor-follow glow, groups area only, pointer-fine only ------
    if (canHover && !reducedMotion) {
      skillsContent.addEventListener("pointermove", (event) => {
        const bounds = skillsContent.getBoundingClientRect();
        skillsContent.style.setProperty("--mouse-x", `${event.clientX - bounds.left}px`);
        skillsContent.style.setProperty("--mouse-y", `${event.clientY - bounds.top}px`);
      });
    }
  }
}

// -- solution break: a scroll-led handoff into the canvas -------------------
{
  const solutionBreak = document.querySelector(".solution-break");

  if (solutionBreak && window.gsap && window.ScrollTrigger && !reducedMotion) {
    const zoom = solutionBreak.querySelector(".solution-break__zoom");
    const first = solutionBreak.querySelector(".solution-break__first");
    const enter = solutionBreak.querySelector(".solution-break__enter");
    const second = solutionBreak.querySelector(".solution-break__second");

    if (zoom && first && enter && second) {
      gsap.registerPlugin(ScrollTrigger);
      const motion = { progress: 0 };

      const render = (progress) => {
        const value = Math.min(1, Math.max(0, progress));

        gsap.set(zoom, { scale: 1 + value * 3, force3D: false });
        gsap.set(first, { yPercent: value * -100, force3D: false });
        gsap.set(enter, {
          autoAlpha: Math.min(1, value * 2),
          scale: value * 10,
          transformOrigin: `50.7% ${50 - value * 25}%`,
          force3D: false,
        });
      };

      render(0);

      gsap.to(motion, {
        progress: 1,
        ease: "none",
        onUpdate: () => render(motion.progress),
        scrollTrigger: {
          trigger: solutionBreak,
          start: "top top",
          end: "bottom bottom",
          scrub: 0.35,
          invalidateOnRefresh: true,
          onRefresh: (trigger) => render(trigger.progress),
        },
      });
    }
  }
}

// -- contact: entrance --------------------------------------------------------
if (window.gsap && window.ScrollTrigger && !reducedMotion) {
  gsap.registerPlugin(ScrollTrigger);

  const contact = document.querySelector(".contact");

  if (contact) {
    const tl = gsap.timeline({
      defaults: { ease: "power3.out" },
      scrollTrigger: { trigger: contact, start: "top 72%", once: true },
    });

    tl.from(contact.querySelector(".content .pd"), { y: 16, opacity: 0, duration: 0.6 }, 0)
      .from(contact.querySelector(".content .title"), { y: 24, opacity: 0, duration: 0.8 }, 0.1)
      .from(contact.querySelector(".content .sub"), { y: 16, opacity: 0, duration: 0.6 }, 0.3)
      .from(contact.querySelectorAll(".content .info li"), { y: 12, opacity: 0, duration: 0.5, stagger: 0.07 }, 0.4)
      .from(contact.querySelector(".content .social"), { y: 12, opacity: 0, duration: 0.5 }, 0.6)
      .from(contact.querySelector(".content .quote"), { y: 12, opacity: 0, duration: 0.5 }, 0.7)
      .from(contact.querySelector(".visual"), { opacity: 0, y: 24, duration: 0.9 }, 0.2);
  }
}

// -- castle journey: scroll-driven canvas image sequence ---------------------
// The source "video" the brief describes is actually a 64-frame PNG
// sequence (assets/img/canva/) rather than an .mp4 — drawing whichever
// frame the scroll maps to is simpler and more reliable than seeking a
// <video>, with none of currentTime's async/seek-throttling concerns, and
// produces the identical scroll-scrubbed result.
{
  const section = document.querySelector(".castle-journey");
  const canvas = section?.querySelector(".canvas");

  if (section && canvas) {
    const ctx = canvas.getContext("2d");
    const sticky = section.querySelector(".sticky");
    const treeLeft = section.querySelector(".tree.left");
    const treeRight = section.querySelector(".tree.right");
    const journeyCopy = section.querySelector(".journey-copy");
    const typedText = journeyCopy?.querySelector(".typed");
    const journeyPhrase = typedText?.dataset.text || "";

    const renderJourneyText = (progress) => {
      if (!journeyCopy || !typedText) return;

      const normalizedProgress = Math.min(1, Math.max(0, progress));
      const visibleCharacters = Math.round(journeyPhrase.length * normalizedProgress);

      typedText.textContent = journeyPhrase.slice(0, visibleCharacters);
      journeyCopy.classList.toggle("is-visible", normalizedProgress > 0.01);
    };

    const TOTAL_FRAMES = 64;
    const framePath = (n) => `assets/img/canva/ezgif-frame-${String(n).padStart(3, "0")}.png`;

    const frames = [];
    let sequenceRequested = false;
    let lastDrawnIndex = -1;

    const isMobile = window.matchMedia("(max-width: 767px)").matches;
    const dprCap = isMobile ? 1.5 : 2;

    function drawFrame(index, force) {
      const img = frames[index];
      if (!img || !img.complete || !img.naturalWidth) return;
      if (index === lastDrawnIndex && !force) return;
      lastDrawnIndex = index;

      const cw = canvas.width;
      const ch = canvas.height;
      const canvasRatio = cw / ch;
      const imgRatio = img.naturalWidth / img.naturalHeight;

      // object-fit: cover, computed by hand since canvas has no such thing
      let sx, sy, sw, sh;
      if (imgRatio > canvasRatio) {
        sh = img.naturalHeight;
        sw = sh * canvasRatio;
        sx = (img.naturalWidth - sw) / 2;
        sy = 0;
      } else {
        sw = img.naturalWidth;
        sh = sw / canvasRatio;
        sx = 0;
        sy = (img.naturalHeight - sh) / 2;
      }

      ctx.clearRect(0, 0, cw, ch);
      ctx.drawImage(img, sx, sy, sw, sh, 0, 0, cw, ch);
    }

    function resizeCanvas() {
      const dpr = Math.min(window.devicePixelRatio || 1, dprCap);
      const rect = sticky.getBoundingClientRect();
      canvas.width = Math.max(1, Math.round(rect.width * dpr));
      canvas.height = Math.max(1, Math.round(rect.height * dpr));
      drawFrame(Math.max(lastDrawnIndex, 0), true);
    }

    function loadFrame(index, onReady) {
      if (frames[index]) {
        if (frames[index].complete) onReady?.();
        else frames[index].addEventListener("load", () => onReady?.(), { once: true });
        return frames[index];
      }
      const img = new Image();
      img.decoding = "async";
      if (onReady) img.addEventListener("load", onReady, { once: true });
      img.src = framePath(index + 1);
      frames[index] = img;
      return img;
    }

    // Loads every frame — used once the section is actually approaching
    // the viewport (see IntersectionObserver below), never eagerly on
    // page load, so it doesn't compete with the Hero for bandwidth.
    function requestSequence() {
      if (sequenceRequested) return;
      sequenceRequested = true;
      loadFrame(0, () => drawFrame(0, true));
      for (let i = 1; i < TOTAL_FRAMES; i++) loadFrame(i);
    }

    resizeCanvas();

    if (reducedMotion) {
      // Static shot only — no pin, no scrub, just the arrival frame.
      loadFrame(TOTAL_FRAMES - 1, () => drawFrame(TOTAL_FRAMES - 1, true));
      renderJourneyText(1);
    } else {
      if ("IntersectionObserver" in window) {
        const observer = new IntersectionObserver(
          (entries) => {
            if (entries.some((entry) => entry.isIntersecting)) {
              requestSequence();
              observer.disconnect();
            }
          },
          { rootMargin: "1500px 0px" },
        );
        observer.observe(section);
      } else {
        requestSequence();
      }

      if (window.gsap && window.ScrollTrigger) {
        gsap.registerPlugin(ScrollTrigger);

        const isTablet = window.matchMedia("(max-width: 1023px)").matches;
        const treeScale = isMobile ? 1.35 : isTablet ? 1.45 : 1.6;
        const scrollLengthVh = isMobile ? 300 : isTablet ? 360 : 400;

        const tl = gsap.timeline({
          scrollTrigger: {
            trigger: section,
            start: "top top",
            end: () => `+=${window.innerHeight * (scrollLengthVh / 100)}`,
            scrub: 1,
            pin: sticky,
            anticipatePin: 1,
            invalidateOnRefresh: true,
            onUpdate: (self) => renderJourneyText(self.progress),
            onRefresh: (self) => renderJourneyText(self.progress),
          },
        });

        // TREE PHASE — roughly the first 20% of the scrub. The canvas
        // barely moves; the trees rush toward camera and peel apart to
        // the sides, fading only in their last quarter so we see them
        // physically leave before they vanish.
        tl.to(treeLeft, { scale: treeScale, xPercent: -60, yPercent: 4, duration: 1, ease: "none" }, 0)
          .to(treeLeft, { opacity: 0, duration: 0.25, ease: "none" }, 0.75)
          .to(treeRight, { scale: treeScale, xPercent: 60, yPercent: 3, duration: 1, ease: "none" }, 0)
          .to(treeRight, { opacity: 0, duration: 0.25, ease: "none" }, 0.75)
          .to(canvas, { scale: 1.015, duration: 1, ease: "none" }, 0);

        // SEQUENCE PHASE — roughly the next 72%. Scroll position maps
        // linearly (ease: none) to a frame index, forward and backward.
        const seq = { frame: 0 };
        tl.to(
          seq,
          {
            frame: TOTAL_FRAMES - 1,
            duration: 3.6,
            ease: "none",
            onUpdate() {
              drawFrame(Math.round(seq.frame));
            },
          },
          1,
        );

        // FINAL HOLD — roughly the last 8%. Nothing changes; this just
        // reserves scroll distance so the arrival at the gate registers
        // before normal page scroll resumes.
        tl.to({}, { duration: 0.4 }, 1 + 3.6);
      }
    }

    let resizeTimer;
    window.addEventListener("resize", () => {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(() => {
        resizeCanvas();
        window.ScrollTrigger?.refresh();
      }, 150);
    });
  }
}

// -- tech marquee: two crossing infinite strips --------------------------
// Data kept separate from markup so this reads as a reusable component —
// pass either array + a track element into buildTrack()/spin() below.
const frontendTech = [
  { name: "HTML", subtitle: "Structure", icon: "html5", color: "#E34F26", type: "brand" },
  { name: "CSS", subtitle: "Styling", icon: "css3", color: "#1572B6", type: "brand" },
  { name: "JavaScript", subtitle: "Logic", icon: "javascript", color: "#F7DF1E", type: "brand" },
  { name: "TypeScript", subtitle: "Safety", icon: "typescript", color: "#3178C6", type: "brand" },
  { name: "React", subtitle: "UI Library", icon: "react", color: "#61DAFB", type: "brand" },
  { name: "Next.js", subtitle: "Fullstack", icon: "nextdotjs", color: "#EDEDED", type: "brand" },
  { name: "Angular", subtitle: "Framework", icon: "angular", color: "#DD0031", type: "brand" },
  { name: "Vue.js", subtitle: "Progressive UI", icon: "vuedotjs", color: "#4FC08D", type: "brand" },
];

const workflowTech = [
  { name: "GSAP", subtitle: "Animations", icon: "greensock", color: "#88CE02", type: "brand" },
  { name: "Tailwind", subtitle: "Styling", icon: "tailwindcss", color: "#38BDF8", type: "brand" },
  { name: "Figma", subtitle: "Design", icon: "figma", color: "#A259FF", type: "brand" },
  { name: "Git", subtitle: "Version Control", icon: "git", color: "#F05032", type: "brand" },
  { name: "APIs", subtitle: "Integrations", icon: "braces", color: "#D92732", type: "lucide" },
  { name: "WordPress", subtitle: "CMS", icon: "wordpress", color: "#C6C6C6", type: "brand" },
  { name: "Performance", subtitle: "Optimized", icon: "gauge", color: "#D92732", type: "lucide" },
  { name: "Core Web Vitals", subtitle: "Metrics", icon: "activity", color: "#D92732", type: "lucide" },
  { name: "Responsive", subtitle: "Adaptive", icon: "monitor-smartphone", color: "#D92732", type: "lucide" },
];

{
  const section = document.querySelector(".tech-marquee");

  if (section) {
    const renderItems = (items) =>
      items
        .map((tech) => {
          const wrapper =
            tech.type === "brand"
              ? `<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">${skillIcons[tech.icon]}</svg>`
              : `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${skillIcons[tech.icon]}</svg>`;
          return `<div class="tech-item">
              <span class="icon" style="color:${tech.color}">${wrapper}</span>
              <span class="content"><strong>${tech.name}</strong><span>${tech.subtitle}</span></span>
            </div>
            <span class="sep" aria-hidden="true">+</span>`;
        })
        .join("");

    const buildTrack = (track, items) => {
      if (!track) return;
      // Each half of the looping track must be wider than the viewport-sized
      // strip. Repeating the item sequence inside each half prevents an empty
      // black tail on wide monitors while preserving the exact 50% loop seam.
      const sequence = renderItems(items).repeat(3);
      const group = `<div class="group">${sequence}</div>`;
      track.innerHTML = group + group;
    };

    const primaryStrip = section.querySelector(".strip.primary");
    const secondaryStrip = section.querySelector(".strip.secondary");
    const primaryTrack = primaryStrip?.querySelector(".track");
    const secondaryTrack = secondaryStrip?.querySelector(".track");
    buildTrack(primaryTrack, frontendTech);
    buildTrack(secondaryTrack, workflowTech);

    if (window.gsap && !reducedMotion) {
      const tweens = [];

      // direction 1 = left → right, -1 = right → left. Content is
      // duplicated exactly twice, so animating exactly half the track's
      // own width loops seamlessly.
      const spin = (track, direction, duration) => {
        if (!track) return;
        gsap.set(track, { xPercent: direction === 1 ? -50 : 0 });
        tweens.push(
          gsap.to(track, {
            xPercent: direction === 1 ? 0 : -50,
            duration,
            ease: "none",
            repeat: -1,
          }),
        );
      };

      spin(primaryTrack, 1, 40);
      spin(secondaryTrack, -1, 46);

      if (window.ScrollTrigger) {
        gsap.registerPlugin(ScrollTrigger);

        // -- scroll speeds both strips up (each in its own direction),
        // easing back to resting speed once scrolling stops -------------
        const boost = { scale: 1 };
        let idleTimer;

        ScrollTrigger.create({
          trigger: section,
          start: "top bottom",
          end: "bottom top",
          onUpdate: (self) => {
            const velocity = Math.abs(self.getVelocity());
            const target = gsap.utils.clamp(1, 3.4, 1 + velocity / 2200);

            gsap.killTweensOf(boost);
            gsap.to(boost, {
              scale: target,
              duration: 0.25,
              onUpdate: () => tweens.forEach((t) => t.timeScale(boost.scale)),
            });

            clearTimeout(idleTimer);
            idleTimer = setTimeout(() => {
              gsap.to(boost, {
                scale: 1,
                duration: 0.9,
                ease: "power2.out",
                onUpdate: () => tweens.forEach((t) => t.timeScale(boost.scale)),
              });
            }, 120);
          },
        });

        // -- entrance ------------------------------------------------------
        gsap
          .timeline({
            defaults: { duration: 1, ease: "power3.out" },
            scrollTrigger: { trigger: section, start: "top 80%", once: true },
          })
          .from(primaryStrip, { opacity: 0 }, 0)
          .from(secondaryStrip, { opacity: 0 }, 0.1);

        // The divider stays attached to the exact boundary between chapters.
        // Only its internal horizontal drift is scrubbed; nothing is pinned,
        // so it can never travel down into the contact section or create an
        // empty spacer in the document flow.
        const compact = window.matchMedia("(max-width: 767px)").matches;
        const stripTravel = () => Math.min(window.innerWidth * (compact ? 0.045 : 0.035), compact ? 28 : 64);

        gsap
          .timeline({
            scrollTrigger: {
              trigger: section,
              start: "top 92%",
              end: "top 58%",
              scrub: 0.6,
              invalidateOnRefresh: true,
            },
          })
          .fromTo(
            primaryStrip,
            { "--drift": () => `${-stripTravel()}px` },
            { "--drift": () => `${stripTravel()}px`, ease: "none" },
            0,
          )
          .fromTo(
            secondaryStrip,
            { "--drift": () => `${stripTravel()}px` },
            { "--drift": () => `${-stripTravel()}px`, ease: "none" },
            0,
          );
      }
    }

    // -- hover: dim siblings within the same strip, don't touch the marquee --
    if (canHover && !reducedMotion) {
      section.querySelectorAll(".strip").forEach((strip) => {
        const items = strip.querySelectorAll(".tech-item");
        items.forEach((item) => {
          item.addEventListener("pointerenter", () => {
            items.forEach((other) => other.classList.toggle("dim", other !== item));
          });
          item.addEventListener("pointerleave", () => {
            items.forEach((other) => other.classList.remove("dim"));
          });
        });
      });
    }
  }
}
