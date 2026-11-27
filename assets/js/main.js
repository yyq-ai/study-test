/* =========================================================
   Little Nook · 交互
   ---------------------------------------------------------
   线上内容来自 content/*.json（可通过 Pages CMS 在线编辑）。
   直接双击 index.html 时，会回退到 assets/js/data.js 里的离线副本。
   这个文件负责渲染、导航、筛选、阅读弹窗和图片灯箱。
   ========================================================= */
(function () {
  "use strict";

  let data = window.SITE_DATA || {};

  const CONTENT_FILES = {
    site: "content/site.json",
    about: "content/about.json",
    learning: "content/learning.json",
    reading: "content/reading.json",
    projects: "content/projects.json",
    interests: "content/interests.json",
    gallery: "content/gallery.json",
  };

  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => Array.from(root.querySelectorAll(selector));

  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  const escapeHTML = (value) =>
    String(value == null ? "" : value).replace(/[&<>"']/g, (character) => {
      const entities = {
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;",
      };
      return entities[character];
    });

  const svgIcon = (name, extraClass = "") =>
    `<svg class="icon ${extraClass}" aria-hidden="true"><use href="#icon-${escapeHTML(name)}"></use></svg>`;

  const toneClass = (tone) => `tone-${["blue", "butter", "pink", "sage"].includes(tone) ? tone : "blue"}`;

  const safeUrl = (url) => {
    const value = String(url || "").trim();
    return /^https?:\/\//i.test(value) ? value : "";
  };

  const getPath = (object, path) =>
    path.split(".").reduce((current, key) => (current == null ? undefined : current[key]), object);

  const galleryLabelFallbacks = {
    life: "生活",
    star: "明星",
    collection: "收藏",
  };

  /* ---------------------------------------------------------
     内容加载
     ---------------------------------------------------------
     通过 HTTP/HTTPS 打开时读取 content/*.json；
     直接双击本地 HTML 时使用 assets/js/data.js 离线回退。
     --------------------------------------------------------- */
  async function loadContent() {
    const fallback = window.SITE_DATA || {};

    if (window.location.protocol === "file:") {
      document.documentElement.dataset.contentSource = "fallback";
      return fallback;
    }

    try {
      const entries = await Promise.all(
        Object.entries(CONTENT_FILES).map(async ([key, path]) => {
          const response = await fetch(path, { cache: "no-store" });
          if (!response.ok) throw new Error(`${path}: HTTP ${response.status}`);
          return [key, await response.json()];
        })
      );

      document.documentElement.dataset.contentSource = "json";
      const parts = Object.fromEntries(entries);
      const site = parts.site || {};

      return {
        site: site.site || fallback.site || {},
        profile: site.profile || fallback.profile || {},
        previews: Array.isArray(site.previews) ? site.previews : fallback.previews || [],
        about: parts.about || fallback.about || {},
        learning: parts.learning || fallback.learning || {},
        readingCategories:
          parts.reading && Array.isArray(parts.reading.readingCategories)
            ? parts.reading.readingCategories
            : fallback.readingCategories || [],
        readings:
          parts.reading && Array.isArray(parts.reading.readings)
            ? parts.reading.readings
            : fallback.readings || [],
        projects:
          parts.projects && Array.isArray(parts.projects.projects)
            ? parts.projects.projects
            : fallback.projects || [],
        projectsIntro:
          parts.projects && parts.projects.projectsIntro
            ? parts.projects.projectsIntro
            : fallback.projectsIntro || {},
        interests: parts.interests || fallback.interests || {},
        galleryCategories:
          parts.gallery && Array.isArray(parts.gallery.galleryCategories)
            ? parts.gallery.galleryCategories
            : fallback.galleryCategories || [],
        gallery:
          parts.gallery && Array.isArray(parts.gallery.gallery)
            ? parts.gallery.gallery
            : fallback.gallery || [],
        galleryEmpty:
          parts.gallery && parts.gallery.galleryEmpty
            ? parts.gallery.galleryEmpty
            : fallback.galleryEmpty || {},
      };
    } catch (error) {
      document.documentElement.dataset.contentSource = "fallback";
      console.warn(
        "[little nook] 无法读取 content JSON，改用 assets/js/data.js 离线数据。",
        error
      );
      return fallback;
    }
  }

  function prepareData() {
    data.site = data.site || {};
    data.profile = data.profile || {};
    data.about = data.about || {};
    data.learning = data.learning || {};
    data.projectsIntro = data.projectsIntro || {};
    data.interests = data.interests || {};
    data.galleryEmpty = data.galleryEmpty || {};
    data.readingCategories = Array.isArray(data.readingCategories) ? data.readingCategories : [];
    data.readings = Array.isArray(data.readings) ? data.readings : [];
    data.galleryCategories = Array.isArray(data.galleryCategories) ? data.galleryCategories : [];
    data.gallery = Array.isArray(data.gallery) ? data.gallery : [];
    data.previews = Array.isArray(data.previews) ? data.previews : [];
    data.projects = Array.isArray(data.projects) ? data.projects : [];

    // 兼容 CMS 可能写出的 /assets/... 绝对路径，保证 GitHub Pages 子路径部署也能显示。
    const normalizeAsset = (value) =>
      typeof value === "string" && value.startsWith("/assets/") ? value.slice(1) : value;

    data.profile.heroImage = normalizeAsset(data.profile.heroImage);
    data.readings.forEach((item) => {
      item.coverImage = normalizeAsset(item.coverImage);
    });
    data.projects.forEach((item) => {
      item.image = normalizeAsset(item.image);
    });
    data.gallery.forEach((item) => {
      item.src = normalizeAsset(item.src);
    });
    if (data.interests && Array.isArray(data.interests.cards)) {
      data.interests.cards.forEach((card) => {
        card.src = normalizeAsset(card.src);
      });
    }

    // 用稳定 id 绑定阅读详情和灯箱；即使 CMS 新条目没有手填 id 也能工作。
    data.readings.forEach((item, index) => {
      if (!item.id) item.id = `reading-${index + 1}`;
    });

    data.gallery.forEach((item, index) => {
      if (!item.id) item.id = `gallery-${index + 1}`;
      if (!item.categoryLabel) item.categoryLabel = galleryLabelFallbacks[item.category] || "收藏";
    });
  }

  /* ---------------------------------------------------------
     基础数据绑定
     --------------------------------------------------------- */
  function bindPageMeta() {
    const site = data.site || {};
    const profile = data.profile || {};

    if (site.title) document.title = site.title;
    const description = $('meta[name="description"]');
    if (description && site.description) description.setAttribute("content", site.description);

    $$("[data-field]").forEach((element) => {
      const value = getPath(data, element.dataset.field);
      if (value !== undefined && value !== null && value !== "") {
        element.textContent = value;
      }
    });

    $$("[data-src-field]").forEach((element) => {
      const value = getPath(data, element.dataset.srcField);
      if (value) element.setAttribute("src", value);
    });

    $$("[data-alt-field]").forEach((element) => {
      const value = getPath(data, element.dataset.altField);
      if (value) element.setAttribute("alt", value);
    });

    const year = $("#current-year");
    if (year) year.textContent = String(new Date().getFullYear());

    if (site.showPlaceholderNotes === false) {
      document.body.classList.add("hide-placeholder-notes");
    }

    if (profile.isPlaceholder === false) {
      document.body.classList.add("no-profile-placeholders");
    }
  }

  /* ---------------------------------------------------------
     首页预览
     --------------------------------------------------------- */
  function renderPreviews() {
    const container = $("#preview-grid");
    if (!container || !Array.isArray(data.previews)) return;

    container.innerHTML = data.previews
      .map(
        (item) => `
        <a class="preview-card ${toneClass(item.tone)}" href="${escapeHTML(item.href)}" data-reveal>
          <span class="preview-top">
            <span class="preview-icon">${svgIcon(item.icon)}</span>
            <span class="preview-no">${escapeHTML(item.no)}</span>
          </span>
          <h3>${escapeHTML(item.title)}</h3>
          <p>${escapeHTML(item.text)}</p>
          <span class="preview-foot">
            <span>${escapeHTML(item.eyebrow)}</span>
            <span class="preview-arrow">${svgIcon("arrow-up-right")}</span>
          </span>
        </a>`
      )
      .join("");
  }

  /* ---------------------------------------------------------
     About Me
     --------------------------------------------------------- */
  function renderAbout() {
    const fields = $("#about-fields");
    if (fields && data.about && Array.isArray(data.about.fields)) {
      fields.innerHTML = data.about.fields
        .map(
          (field) => `
          <div class="fact">
            <dt>${escapeHTML(field.label)}</dt>
            <dd>${escapeHTML(field.value)}${field.note ? `<span>${escapeHTML(field.note)}</span>` : ""}</dd>
          </div>`
        )
        .join("");
    }

    const interests = $("#about-interests");
    if (interests && data.about && Array.isArray(data.about.interests)) {
      interests.innerHTML = data.about.interests
        .map((item) => `<span class="tag">${escapeHTML(item)}</span>`)
        .join("");
    }

    const hobbies = $("#about-hobbies");
    if (hobbies && data.about && Array.isArray(data.about.hobbies)) {
      hobbies.innerHTML = data.about.hobbies
        .map(
          (hobby) => `
          <span class="hobby">
            ${svgIcon(hobby.icon)}
            ${escapeHTML(hobby.label)}
          </span>`
        )
        .join("");
    }
  }

  /* ---------------------------------------------------------
     Learning
     --------------------------------------------------------- */
  function renderLearning() {
    const learning = data.learning || {};
    const container = $("#learning-now");

    if (container && Array.isArray(learning.now)) {
      container.innerHTML = learning.now
        .map(
          (item) => `
          <article class="learning-card ${toneClass(item.tone)}" data-reveal>
            <div class="learning-top">
              <span class="learning-icon">${svgIcon(item.icon)}</span>
              <span class="learning-status">${escapeHTML(item.status)}</span>
            </div>
            <p class="learning-kicker">${escapeHTML(item.no)} — ${escapeHTML(item.kicker)}</p>
            <h3>${escapeHTML(item.title)}</h3>
            <p class="learning-description">${escapeHTML(item.description)}</p>
            <div class="learning-topics">
              ${(item.topics || [])
                .map((topic) => `<span class="topic">${escapeHTML(topic)}</span>`)
                .join("")}
            </div>
            <p class="learning-note">${escapeHTML(item.note)}</p>
          </article>`
        )
        .join("");
    }

    const future = $("#future-chips");
    if (future && Array.isArray(learning.future)) {
      future.innerHTML = learning.future
        .map(
          (item) => `
          <span class="future-chip">
            ${svgIcon("plus")}
            ${escapeHTML(item)}
          </span>`
        )
        .join("");
    }

    const timeline = $("#learning-timeline");
    if (!timeline) return;

    if (Array.isArray(learning.timeline) && learning.timeline.length > 0) {
      timeline.innerHTML = learning.timeline
        .map(
          (entry) => `
          <div class="timeline-entry">
            <span class="timeline-date">${escapeHTML(entry.date)}</span>
            <div>
              <span class="mini-eyebrow">${escapeHTML(entry.tag || "记录")}</span>
              <h4>${escapeHTML(entry.title)}</h4>
              <p>${escapeHTML(entry.text)}</p>
            </div>
          </div>`
        )
        .join("");
      return;
    }

    timeline.innerHTML = `
      <div class="timeline-empty">
        <span class="timeline-empty-cat" aria-hidden="true">
          <img src="assets/img/cat/bao-face.webp" alt="">
        </span>
        <div>
          <h4>第一段记录，正在发生。</h4>
          <p>重要的学习阶段、完成的小作品，或某个突然想通的瞬间，都会沿着这条线慢慢长出来。</p>
          <span class="soft-note">时间轴内容 · 待补充</span>
        </div>
      </div>`;
  }

  /* ---------------------------------------------------------
     Reading
     --------------------------------------------------------- */
  function readingCoverMarkup(item) {
    const coverImage = item.coverImage
      ? `<img class="cover-image" src="${escapeHTML(item.coverImage)}" alt="${escapeHTML(item.coverImageAlt || item.title + " 封面")}" loading="lazy" decoding="async">`
      : "";
    return `
      <span class="read-cover${item.coverImage ? " read-cover--image" : ""}">
        ${coverImage}
        <span class="cover-label">${escapeHTML(item.coverLabel || "COLLECTION")}</span>
        <span class="cover-mark">${escapeHTML(item.coverMark || "·")}</span>
        <span class="cover-foot">${escapeHTML(item.status || "收藏")}</span>
      </span>`;
  }

  function renderReading() {
    const groupsContainer = $("#reading-groups");
    if (!groupsContainer) return;

    const categories = Array.isArray(data.readingCategories) ? data.readingCategories : [];
    const readings = Array.isArray(data.readings) ? data.readings : [];

    groupsContainer.innerHTML = categories
      .map((category, index) => {
        const items = readings.filter((item) => item.category === category.key);
        const cards = items.length
          ? items
              .map(
                (item) => `
              <article
                class="read-card ${toneClass(item.tone || category.tone)}"
                role="button"
                tabindex="0"
                aria-haspopup="dialog"
                aria-label="查看《${escapeHTML(item.title)}》的阅读详情"
                data-reading-id="${escapeHTML(item.id)}"
              >
                ${readingCoverMarkup(item)}
                <div class="read-body">
                  <div class="read-meta">
                    <span class="read-category">${escapeHTML(category.label)}</span>
                    ${item.example ? '<span class="read-example">示例 · 可替换</span>' : ""}
                  </div>
                  <h4>${escapeHTML(item.title)}</h4>
                  <p class="read-author">${escapeHTML(item.author)}</p>
                  <p class="read-summary">${escapeHTML(item.summary)}</p>
                  <span class="read-more">
                    翻开看看
                    ${svgIcon("arrow-up-right")}
                  </span>
                </div>
              </article>`
              )
              .join("")
          : `<div class="reading-empty">这一类还没有条目，之后慢慢补充。</div>`;

        return `
          <section class="reading-group ${toneClass(category.tone)}" aria-labelledby="reading-group-${escapeHTML(category.key)}">
            <div class="reading-group-head">
              <div class="group-top">
                <span class="group-icon">${svgIcon(category.icon)}</span>
                <span class="group-no">0${index + 1}</span>
              </div>
              <div class="group-title-wrap">
                <h3 id="reading-group-${escapeHTML(category.key)}">${escapeHTML(category.label)}</h3>
                <span class="group-en">${escapeHTML(category.en)}</span>
              </div>
              <p class="group-desc">${escapeHTML(category.desc)}</p>
              <span class="group-count">${items.length} 条收藏</span>
            </div>
            <div class="reading-grid">${cards}</div>
          </section>`;
      })
      .join("");
  }

  function findReading(id) {
    return (data.readings || []).find((item) => item.id === id);
  }

  function readingModalMarkup(item) {
    const category = (data.readingCategories || []).find((entry) => entry.key === item.category);
    const categoryLabel = category ? category.label : "收藏";
    const link = safeUrl(item.link);

    return `
      <div class="modal-cover-side">
        ${readingCoverMarkup(item)}
        <p class="modal-cover-note">${escapeHTML(item.coverLabel || "collecting little things")}</p>
      </div>
      <div class="modal-info">
        <div class="modal-category-row">
          <span class="modal-category">${escapeHTML(categoryLabel)}</span>
          ${item.example ? '<span class="modal-example">示例条目 · 可替换</span>' : ""}
        </div>
        <h2 class="modal-title" id="reading-modal-title">${escapeHTML(item.title)}</h2>
        ${item.titleZh ? `<p class="modal-title-zh">${escapeHTML(item.titleZh)}</p>` : ""}
        <p class="modal-author">${escapeHTML(item.author)}</p>

        <div class="modal-divider"></div>

        <p class="modal-section-label">内容简介</p>
        <p class="modal-summary">${escapeHTML(item.summary)}</p>

        <div class="modal-note">
          <p class="modal-section-label">留在这里的理由</p>
          <p>${escapeHTML(item.note)}</p>
        </div>

        ${
          link
            ? `<a class="modal-link" href="${escapeHTML(link)}" target="_blank" rel="noopener noreferrer">
                 ${escapeHTML(item.linkLabel || "查看公开链接")}
                 ${svgIcon("external")}
               </a>`
            : `<p class="modal-no-link">这个条目暂未设置外部链接，可在 data.js 中添加。</p>`
        }
      </div>`;
  }

  /* ---------------------------------------------------------
     Projects
     --------------------------------------------------------- */
  function renderProjects() {
    const empty = $("#projects-empty");
    const emptyCopy = $("#projects-empty-copy");
    const grid = $("#projects-grid");
    if (!empty || !grid) return;

    const intro = data.projectsIntro || {};
    if (emptyCopy) {
      emptyCopy.innerHTML = `
        <p class="mini-eyebrow">${escapeHTML(intro.eyebrow || "Work in progress")}</p>
        <h3>${escapeHTML(intro.title || "第一件作品，正在路上。")}</h3>
        <p>${escapeHTML(intro.text || "")}</p>
        <div class="project-specs">
          ${(intro.specs || [])
            .map((spec) => `<span class="project-spec">${escapeHTML(spec)}</span>`)
            .join("")}
        </div>
        <p class="project-note">
          ${svgIcon("lock")}
          ${escapeHTML(intro.note || "只展示公开介绍与访问链接，不公开源码与敏感信息。")}
        </p>`;
    }

    const projects = Array.isArray(data.projects) ? data.projects : [];
    if (projects.length === 0) {
      grid.hidden = true;
      empty.hidden = false;
      return;
    }

    empty.hidden = true;
    grid.hidden = false;
    grid.innerHTML = projects
      .map((project) => {
        const link = safeUrl(project.link);
        return `
        <article class="project-card">
          ${project.image ? `<img class="project-card-image" src="${escapeHTML(project.image)}" alt="${escapeHTML(project.name)} 的项目预览图" loading="lazy" decoding="async">` : ""}
          <div class="project-card-body">
            <p class="mini-eyebrow">Public project</p>
            <h3>${escapeHTML(project.name)}</h3>
            <p>${escapeHTML(project.summary)}</p>
            <p><strong>用途 / 功能：</strong>${escapeHTML(project.purpose || "待补充")}</p>
            <div class="project-links">
              <span class="soft-note">仅公开介绍</span>
              ${
                link
                  ? `<a class="project-link" href="${escapeHTML(link)}" target="_blank" rel="noopener noreferrer">
                       ${escapeHTML(project.linkLabel || "访问项目")}
                       ${svgIcon("external")}
                     </a>`
                  : `<span class="modal-no-link">访问链接待补充</span>`
              }
            </div>
          </div>
        </article>`;
      })
      .join("");
  }

  /* ---------------------------------------------------------
     Interests
     --------------------------------------------------------- */
  function renderInterests() {
    const wall = $("#interests-wall");
    if (!wall) return;

    const interests = data.interests || {};
    const tags = Array.isArray(interests.tags) ? interests.tags : [];
    const cards = Array.isArray(interests.cards) ? interests.cards : [];

    wall.innerHTML = cards
      .map((card) => {
        if (card.type === "image") {
          return `
          <article class="insp-card insp-image ${toneClass(card.tone)}">
            <div class="insp-image">
              <img src="${escapeHTML(card.src)}" alt="${escapeHTML(card.alt)}" loading="lazy" decoding="async">
            </div>
            <div class="insp-image-copy">
              <p class="insp-eyebrow">${escapeHTML(card.eyebrow || "A little scene")}</p>
              <h3>${escapeHTML(card.title)}</h3>
              <p class="insp-caption">${escapeHTML(card.caption || "")}</p>
            </div>
          </article>`;
        }

        if (card.type === "quote") {
          return `
          <article class="insp-card insp-quote">
            <span class="insp-quote-mark" aria-hidden="true">“</span>
            <p>${escapeHTML(card.text)}</p>
            <span>${escapeHTML(card.note || "")}</span>
          </article>`;
        }

        if (card.type === "palette") {
          return `
          <article class="insp-card insp-palette">
            <h3>${escapeHTML(card.title)}</h3>
            <p>${escapeHTML(card.subtitle || "")}</p>
            <div class="palette-dots" aria-label="颜色示例">
              ${(card.colors || [])
                .map(
                  (color) =>
                    `<span class="palette-dot" style="background:${escapeHTML(color)}" title="${escapeHTML(color)}"></span>`
                )
                .join("")}
            </div>
          </article>`;
        }

        if (card.type === "tags") {
          return `
          <article class="insp-card insp-tags">
            <h3>${escapeHTML(card.title)}</h3>
            <div class="insp-tag-list">
              ${tags.map((tag) => `<span class="insp-tag">${escapeHTML(tag)}</span>`).join("")}
            </div>
            <span class="soft-note">${escapeHTML(card.note || "示例关键词 · 可替换")}</span>
          </article>`;
        }

        return `
        <article class="insp-card insp-note">
          <h3>${escapeHTML(card.title)}</h3>
          <p>${escapeHTML(card.text)}</p>
          <span>${escapeHTML(card.footer || "")}</span>
        </article>`;
      })
      .join("");
  }

  /* ---------------------------------------------------------
     Gallery
     --------------------------------------------------------- */
  let activeGalleryFilter = "all";
  let currentGalleryItems = [];

  function renderGalleryFilters() {
    const container = $("#gallery-filters");
    if (!container) return;

    const categories = Array.isArray(data.galleryCategories)
      ? data.galleryCategories
      : [{ key: "all", label: "全部" }];

    container.innerHTML = categories
      .map(
        (category, index) => `
        <button
          class="gallery-filter"
          type="button"
          data-gallery-filter="${escapeHTML(category.key)}"
          aria-pressed="${index === 0 ? "true" : "false"}"
        >${escapeHTML(category.label)}</button>`
      )
      .join("");
  }

  function renderGallery() {
    const grid = $("#gallery-grid");
    if (!grid) return;

    const items = Array.isArray(data.gallery) ? data.gallery : [];
    grid.innerHTML = items
      .map(
        (item) => `
        <article
          class="gallery-card ${toneClass(item.tone)}"
          role="button"
          tabindex="0"
          data-gallery-id="${escapeHTML(item.id)}"
          data-category="${escapeHTML(item.category)}"
          style="--span:${Number(item.span) || 4}"
          aria-label="放大查看图片：${escapeHTML(item.title)}"
        >
          <img src="${escapeHTML(item.src)}" alt="${escapeHTML(item.alt)}" loading="lazy" decoding="async">
          <span class="gallery-badge">${escapeHTML(item.categoryLabel || "收藏")}</span>
          ${item.placeholder ? '<span class="gallery-placeholder-badge">插画占位</span>' : ""}
          <div class="gallery-copy">
            <div>
              <h3>${escapeHTML(item.title)}</h3>
              <p>${escapeHTML(item.caption)}</p>
            </div>
            <span class="gallery-zoom">${svgIcon("plus")}</span>
          </div>
        </article>`
      )
      .join("");

    applyGalleryFilter("all", false);
  }

  function applyGalleryFilter(filter, animate = true) {
    const grid = $("#gallery-grid");
    const empty = $("#gallery-empty");
    if (!grid) return;

    activeGalleryFilter = filter;
    const items = Array.isArray(data.gallery) ? data.gallery : [];
    const allCards = $$(".gallery-card", grid);

    currentGalleryItems = items.filter((item) => filter === "all" || item.category === filter);

    allCards.forEach((card) => {
      const shouldShow = filter === "all" || card.dataset.category === filter;
      card.hidden = !shouldShow;
    });

    grid.classList.toggle("is-filtered", filter !== "all");
    grid.hidden = currentGalleryItems.length === 0;

    if (empty) {
      const emptyConfig = (data.galleryEmpty || {})[filter] || {
        title: "这一格还在等一张照片。",
        text: "之后会慢慢补充。",
        note: "内容待添加",
      };
      empty.hidden = currentGalleryItems.length > 0;
      const title = $("#gallery-empty-title");
      const text = $("#gallery-empty-text");
      const note = $("#gallery-empty-note");
      if (title) title.textContent = emptyConfig.title;
      if (text) text.textContent = emptyConfig.text;
      if (note) note.textContent = emptyConfig.note;
    }

    $$(".gallery-filter").forEach((button) => {
      button.setAttribute("aria-pressed", String(button.dataset.galleryFilter === filter));
    });

    if (animate && !reduceMotion && currentGalleryItems.length > 0) {
      const visibleCards = allCards.filter((card) => !card.hidden);
      visibleCards.forEach((card, index) => {
        card.animate(
          [
            { opacity: 0, transform: "translateY(8px)" },
            { opacity: 1, transform: "translateY(0)" },
          ],
          {
            duration: 380,
            delay: index * 35,
            easing: "cubic-bezier(0.22, 1, 0.36, 1)",
            fill: "backwards",
          }
        );
      });
    }
  }

  /* ---------------------------------------------------------
     导航 / 滚动状态
     --------------------------------------------------------- */
  let menuOpen = false;
  let menuCloseTimer = null;

  function setMenu(open, returnFocus = false) {
    const toggle = $("#nav-toggle");
    const menu = $("#nav-menu");
    const scrim = $("#nav-scrim");
    if (!toggle || !menu || !scrim) return;

    menuOpen = open;
    toggle.setAttribute("aria-expanded", String(open));
    menu.classList.toggle("is-open", open);
    document.body.classList.toggle("is-locked", open);

    if (open) {
      window.clearTimeout(menuCloseTimer);
      scrim.hidden = false;
      requestAnimationFrame(() => scrim.classList.add("is-visible"));
    } else {
      scrim.classList.remove("is-visible");
      menuCloseTimer = window.setTimeout(() => {
        scrim.hidden = true;
      }, 300);
      if (returnFocus) toggle.focus({ preventScroll: true });
    }
  }

  function initNavigation() {
    const toggle = $("#nav-toggle");
    const scrim = $("#nav-scrim");
    const navLinks = $$(".nav-link");
    const header = $("#site-header");
    const toTop = $("#to-top");
    const backToTopText = $("#back-to-top-text");
    const progress = $("#scroll-progress-bar");
    const sections = navLinks
      .map((link) => document.getElementById(link.dataset.nav))
      .filter(Boolean);

    if (toggle) {
      toggle.addEventListener("click", () => setMenu(!menuOpen));
    }

    if (scrim) {
      scrim.addEventListener("click", () => setMenu(false, true));
    }

    navLinks.forEach((link) => {
      link.addEventListener("click", () => {
        navLinks.forEach((item) => item.removeAttribute("aria-current"));
        link.setAttribute("aria-current", "page");
        if (menuOpen) setMenu(false);
      });
    });

    document.addEventListener("keydown", (event) => {
      if (event.key === "Escape" && menuOpen) {
        setMenu(false, true);
      }
    });

    window.addEventListener("resize", () => {
      if (window.innerWidth > 980 && menuOpen) setMenu(false);
    });

    const scrollToTop = () => {
      window.scrollTo({ top: 0, behavior: reduceMotion ? "auto" : "smooth" });
    };

    if (toTop) toTop.addEventListener("click", scrollToTop);
    if (backToTopText) backToTopText.addEventListener("click", scrollToTop);

    let ticking = false;

    function updateScrollUI() {
      const scrollTop = window.scrollY || document.documentElement.scrollTop;
      const maxScroll = document.documentElement.scrollHeight - window.innerHeight;
      const progressValue = maxScroll > 0 ? Math.min(scrollTop / maxScroll, 1) : 0;

      if (header) header.classList.toggle("is-scrolled", scrollTop > 14);
      if (toTop) toTop.classList.toggle("is-visible", scrollTop > 520);
      if (progress) progress.style.transform = `scaleX(${progressValue})`;

      const marker = scrollTop + window.innerHeight * 0.34;
      let currentSection = sections[0] ? sections[0].id : "home";

      sections.forEach((section) => {
        const sectionTop = section.getBoundingClientRect().top + scrollTop;
        if (sectionTop <= marker) currentSection = section.id;
      });

      if (scrollTop + window.innerHeight >= document.documentElement.scrollHeight - 5) {
        currentSection = "gallery";
      }

      navLinks.forEach((link) => {
        if (link.dataset.nav === currentSection) {
          link.setAttribute("aria-current", "page");
        } else {
          link.removeAttribute("aria-current");
        }
      });

      ticking = false;
    }

    function requestScrollUI() {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(updateScrollUI);
    }

    window.addEventListener("scroll", requestScrollUI, { passive: true });
    window.addEventListener("load", requestScrollUI);
    window.setTimeout(requestScrollUI, 250);
    updateScrollUI();
  }

  /* ---------------------------------------------------------
     滚动淡入
     --------------------------------------------------------- */
  function initReveal() {
    const items = $$("[data-reveal]");
    if (!("IntersectionObserver" in window)) {
      items.forEach((item) => item.classList.add("is-visible"));
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          entry.target.classList.add("is-visible");
          observer.unobserve(entry.target);
        });
      },
      { rootMargin: "0px 0px -8% 0px", threshold: 0.08 }
    );

    items.forEach((item) => observer.observe(item));
  }

  /* ---------------------------------------------------------
     弹窗基础
     --------------------------------------------------------- */
  const openDialogs = new Set();
  let lastReadingOpener = null;
  let lastLightboxOpener = null;

  function lockBody() {
    document.body.classList.add("is-locked");
  }

  function unlockBodyIfIdle() {
    DialogState.cleanup();
    if (openDialogs.size === 0) document.body.classList.remove("is-locked");
  }

  const DialogState = {
    cleanup() {
      $$("dialog[open]").forEach((dialog) => {
        if (!dialog.open) openDialogs.delete(dialog);
      });
    },
  };

  function openDialog(dialog) {
    if (!dialog) return;
    openDialogs.add(dialog);
    lockBody();
    if (typeof dialog.showModal === "function") {
      if (!dialog.open) dialog.showModal();
    } else {
      dialog.setAttribute("open", "");
    }
  }

  function closeDialog(dialog) {
    if (!dialog) return;
    if (dialog.open && typeof dialog.close === "function") {
      dialog.close();
    } else {
      dialog.removeAttribute("open");
    }
    openDialogs.delete(dialog);
    unlockBodyIfIdle();
  }

  function initDialogs() {
    const readingDialog = $("#reading-dialog");
    const readingBody = $("#reading-modal-body");
    const readingClose = $("#reading-dialog-close");
    const lightbox = $("#lightbox");
    const lightboxClose = $("#lightbox-close");

    $$("dialog").forEach((dialog) => {
      dialog.addEventListener("close", () => {
        openDialogs.delete(dialog);
        unlockBodyIfIdle();
      });

      dialog.addEventListener("click", (event) => {
        if (event.target === dialog) closeDialog(dialog);
      });
    });

    if (readingClose && readingDialog) {
      readingClose.addEventListener("click", () => closeDialog(readingDialog));
    }

    if (lightboxClose && lightbox) {
      lightboxClose.addEventListener("click", () => closeDialog(lightbox));
    }

    const readingGroups = $("#reading-groups");
    if (readingGroups) {
      const openReadingCard = (card) => {
        const item = findReading(card.dataset.readingId);
        if (!item || !readingDialog || !readingBody) return;
        lastReadingOpener = card;
        readingBody.className = toneClass(item.tone);
        readingBody.innerHTML = readingModalMarkup(item);
        openDialog(readingDialog);
        const info = $(".modal-info", readingBody);
        if (info) info.scrollTop = 0;
      };

      readingGroups.addEventListener("click", (event) => {
        const card = event.target.closest(".read-card");
        if (card) openReadingCard(card);
      });

      readingGroups.addEventListener("keydown", (event) => {
        if (event.key !== "Enter" && event.key !== " ") return;
        const card = event.target.closest(".read-card");
        if (!card) return;
        event.preventDefault();
        openReadingCard(card);
      });
    }

    if (readingDialog) {
      readingDialog.addEventListener("close", () => {
        if (lastReadingOpener) {
          lastReadingOpener.focus({ preventScroll: true });
          lastReadingOpener = null;
        }
      });
    }

    initLightbox();
  }

  /* ---------------------------------------------------------
     相册灯箱
     --------------------------------------------------------- */
  let lightboxIndex = 0;

  function initLightbox() {
    const lightbox = $("#lightbox");
    const grid = $("#gallery-grid");
    if (!lightbox || !grid) return;

    const image = $("#lightbox-image");
    const title = $("#lightbox-title");
    const caption = $("#lightbox-caption-text");
    const category = $("#lightbox-category");
    const counter = $("#lightbox-counter");
    const prev = $("#lightbox-prev");
    const next = $("#lightbox-next");

    const updateLightbox = () => {
      const item = currentGalleryItems[lightboxIndex];
      if (!item) return;
      image.src = item.src;
      image.alt = item.alt || item.title || "";
      title.textContent = item.title;
      caption.textContent = item.caption || "";
      category.textContent = `${item.categoryLabel || "收藏"}${item.placeholder ? " · 插画占位" : ""}`;
      counter.textContent = `${lightboxIndex + 1} / ${currentGalleryItems.length}`;
      const multiple = currentGalleryItems.length > 1;
      if (prev) prev.disabled = !multiple;
      if (next) next.disabled = !multiple;
    };

    const openLightbox = (card) => {
      const id = card.dataset.galleryId;
      const index = currentGalleryItems.findIndex((item) => item.id === id);
      if (index < 0) return;
      lightboxIndex = index;
      lastLightboxOpener = card;
      updateLightbox();
      openDialog(lightbox);
    };

    const move = (direction) => {
      if (currentGalleryItems.length < 2) return;
      lightboxIndex =
        (lightboxIndex + direction + currentGalleryItems.length) % currentGalleryItems.length;
      updateLightbox();
    };

    grid.addEventListener("click", (event) => {
      const card = event.target.closest(".gallery-card");
      if (card) openLightbox(card);
    });

    grid.addEventListener("keydown", (event) => {
      if (event.key !== "Enter" && event.key !== " ") return;
      const card = event.target.closest(".gallery-card");
      if (!card) return;
      event.preventDefault();
      openLightbox(card);
    });

    if (prev) prev.addEventListener("click", () => move(-1));
    if (next) next.addEventListener("click", () => move(1));

    lightbox.addEventListener("keydown", (event) => {
      if (event.key === "ArrowLeft") {
        event.preventDefault();
        move(-1);
      }
      if (event.key === "ArrowRight") {
        event.preventDefault();
        move(1);
      }
    });

    lightbox.addEventListener("close", () => {
      if (lastLightboxOpener) {
        lastLightboxOpener.focus({ preventScroll: true });
        lastLightboxOpener = null;
      }
    });

    const filters = $("#gallery-filters");
    if (filters) {
      filters.addEventListener("click", (event) => {
        const button = event.target.closest("[data-gallery-filter]");
        if (!button) return;
        applyGalleryFilter(button.dataset.galleryFilter);
      });
    }
  }

  /* ---------------------------------------------------------
     启动
     --------------------------------------------------------- */
  async function init() {
    data = await loadContent();
    prepareData();
    bindPageMeta();
    renderPreviews();
    renderAbout();
    renderLearning();
    renderReading();
    renderProjects();
    renderInterests();
    renderGalleryFilters();
    renderGallery();
    initNavigation();
    initDialogs();
    initReveal();
    applyGalleryFilter("all", false);
  }

  function start() {
    init().catch((error) => {
      console.error("[little nook] 页面初始化失败。", error);
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", start);
  } else {
    start();
  }
})();
