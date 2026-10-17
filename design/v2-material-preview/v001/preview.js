(() => {
  const THEME_KEY = "syyh-v2-material-preview-theme";
  const WORK_THEMES = ["Her", "ZZZ", "FFF", "COS"];
  const ISLAND_ORDER = [
    { id: "island-sky", theme: "Her", title: "Her", usage: "虚拟人物。透明概念图，用来核对天空岛的轮廓与建筑。" },
    { id: "island-ancient", theme: "ZZZ", title: "ZZZ", usage: "梦幻世界。透明概念图，用来核对远古岛的尺度和地标。" },
    { id: "island-apocalypse", theme: "FFF", title: "FFF", usage: "机甲战斗。透明概念图，用来核对机械星球的破碎轮廓。" },
    { id: "island-home", theme: "COS", title: "COS", usage: "COSPLAY。无限城半剖悬浮岛：半边保留外壳，半边敞开展示内景。" }
  ];
  const CROPS = [
    { key: "portrait", hint: "竖幅裁切", position: "center 28%" },
    { key: "wide", hint: "横幅裁切", position: "center 42%" },
    { key: "square", hint: "方图裁切", position: "center 35%" }
  ];

  const main = document.getElementById("main");
  const dialogRoot = document.getElementById("dialog-root");
  const viewMaterials = document.getElementById("view-materials");
  const viewWorks = document.getElementById("view-works");
  const themeDay = document.getElementById("theme-day");
  const themeNight = document.getElementById("theme-night");

  const state = {
    manifest: null,
    loadError: "",
    theme: "night",
    view: "materials",
    filter: "all",
    dialog: null,
    trigger: null,
    scrollY: 0
  };

  const reduced = () => window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  function el(tag, attrs = {}, ...children) {
    const node = document.createElement(tag);
    for (const [key, value] of Object.entries(attrs)) {
      if (value == null || value === false) continue;
      if (key === "className") node.className = value;
      else if (key === "dataset") Object.assign(node.dataset, value);
      else if (key === "style" && typeof value === "object") Object.assign(node.style, value);
      else if (typeof value === "boolean") node.toggleAttribute(key, value);
      else node.setAttribute(key, String(value));
    }
    for (const child of children.flat()) {
      if (child == null || child === false) continue;
      node.append(child.nodeType ? child : document.createTextNode(String(child)));
    }
    return node;
  }

  function assets() {
    const list = state.manifest && Array.isArray(state.manifest.assets) ? state.manifest.assets : [];
    return list.filter((item) => item && typeof item === "object" && item.id);
  }

  function byId(id) {
    return assets().find((item) => item.id === id) || null;
  }

  function workThemeOf(asset) {
    if (!asset) return "";
    if (asset.workTheme) return asset.workTheme;
    const known = ISLAND_ORDER.find((item) => item.id === asset.id);
    return known ? known.theme : "";
  }

  function applyTheme(theme) {
    state.theme = theme === "day" ? "day" : "night";
    document.documentElement.dataset.theme = state.theme;
    try {
      localStorage.setItem(THEME_KEY, state.theme);
    } catch {
      /* private mode */
    }
    themeDay.setAttribute("aria-pressed", String(state.theme === "day"));
    themeNight.setAttribute("aria-pressed", String(state.theme === "night"));
  }

  function restoreTheme() {
    let saved = "";
    try {
      saved = localStorage.getItem(THEME_KEY) || "";
    } catch {
      saved = "";
    }
    applyTheme(saved === "day" || saved === "night" ? saved : "night");
  }

  function setView(view) {
    state.view = view === "works" ? "works" : "materials";
    document.documentElement.dataset.view = state.view;
    viewMaterials.setAttribute("aria-selected", String(state.view === "materials"));
    viewWorks.setAttribute("aria-selected", String(state.view === "works"));
    render();
  }

  function setFilter(filter) {
    state.filter = WORK_THEMES.includes(filter) ? filter : "all";
    document.documentElement.dataset.filter = state.filter;
    render();
  }

  async function loadManifest() {
    state.loadError = "";
    try {
      const response = await fetch("manifest.json", { cache: "no-store" });
      if (!response.ok) throw new Error("清单读取失败");
      const data = await response.json();
      if (!data || typeof data !== "object") throw new Error("清单格式无法使用");
      state.manifest = data;
    } catch {
      state.manifest = null;
      state.loadError = "预览清单还没有读到。可以重新读取。";
    }
    render();
  }

  function cacheBust(src) {
    return src + (src.includes("?") ? "&" : "?") + "r=" + Date.now();
  }

  function bindImage(stage, img, src, openItem) {
    const copy = el("p", { className: "stage-copy" }, "正在载入。");
    let openBound = false;
    stage.dataset.imageState = "loading";
    stage.append(img, copy);

    const bindOpen = () => {
      if (!openItem || openBound) return;
      openBound = true;
      stage.tabIndex = 0;
      stage.setAttribute("role", "button");
      stage.setAttribute("aria-label", `打开大图：${openItem.label || "概念预览"}`);
      const open = () => openDialog(openItem.group, openItem.index, stage);
      stage.addEventListener("click", (event) => {
        if (event.target.closest(".retry")) return;
        open();
      });
      stage.addEventListener("keydown", (event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          open();
        }
      });
    };

    img.addEventListener("error", () => {
      img.hidden = true;
      stage.dataset.imageState = "fail";
      if (!copy.isConnected) stage.append(copy);
      copy.textContent = "这张图还没有载入成功。";
      stage.querySelector(".retry")?.remove();
      const retry = el("button", { type: "button", className: "retry" }, "重新加载");
      retry.addEventListener("click", (event) => {
        event.preventDefault();
        event.stopPropagation();
        retry.remove();
        if (!copy.isConnected) stage.append(copy);
        copy.textContent = "正在载入。";
        stage.dataset.imageState = "loading";
        img.hidden = true;
        img.src = cacheBust(src);
      });
      stage.append(retry);
    });
    img.addEventListener("load", () => {
      copy.remove();
      img.hidden = false;
      stage.dataset.imageState = "loaded";
      stage.querySelector(".retry")?.remove();
      bindOpen();
    });
    img.src = src;
  }

  function emptyStage(stage, text) {
    stage.dataset.imageState = "empty";
    stage.append(el("p", { className: "stage-copy" }, text));
  }

  function mediaStage({ className, asset, alt, contain = true, crop, openItem }) {
    const stage = el("div", { className: `stage ${className}` });
    if (crop) stage.dataset.ratio = crop.key;
    if (!asset || !asset.path) {
      emptyStage(stage, "概念图还没有进入预览。");
      return stage;
    }
    const img = el("img", {
      alt: alt || asset.title || "",
      decoding: "async"
    });
    img.style.objectFit = contain ? "contain" : "cover";
    img.style.objectPosition = contain ? "center bottom" : (crop?.position || "center");
    bindImage(stage, img, asset.path, openItem ? { ...openItem, label: asset.title || alt } : null);
    return stage;
  }

  const KNOWN_IDS = new Set(["character", "greeting-storyboard", "environment-day", "environment-night", ...ISLAND_ORDER.map((item) => item.id)]);

  function extraAssets() {
    return assets().filter((item) => !KNOWN_IDS.has(item.id));
  }

  function materialGroup() {
    const group = [];
    const push = (asset) => {
      if (asset?.path) group.push({ kind: "asset", asset, contain: true });
    };
    push(byId("character"));
    push(byId("greeting-storyboard"));
    for (const island of ISLAND_ORDER) push(byId(island.id));
    push(byId("environment-day"));
    push(byId("environment-night"));
    for (const asset of extraAssets()) push(asset);
    return group;
  }

  function pushCrops(items, asset, theme) {
    if (!asset?.path) return;
    for (const crop of CROPS) {
      items.push({
        kind: "work",
        asset,
        crop,
        theme,
        contain: false
      });
    }
  }

  function workItems() {
    const items = [];
    for (const island of ISLAND_ORDER) {
      const asset = byId(island.id);
      pushCrops(items, asset, workThemeOf(asset) || island.theme);
    }
    if (!items.length) pushCrops(items, byId("character"), "");
    return items;
  }

  function visibleWorks() {
    const items = workItems();
    if (state.filter === "all") return items;
    return items.filter((item) => item.theme === state.filter);
  }

  function heroItem() {
    const character = byId("character");
    if (character?.path) return { kind: "asset", asset: character, contain: true };
    const first = visibleWorks()[0];
    return first || null;
  }

  function openDialog(group, index, trigger) {
    if (!group.length) return;
    state.trigger = trigger || document.activeElement;
    state.scrollY = window.scrollY;
    state.dialog = { group, index: (index + group.length) % group.length };
    document.body.classList.add("is-locked");
    renderDialog();
  }

  function closeDialog() {
    const trigger = state.trigger;
    const y = state.scrollY;
    state.dialog = null;
    state.trigger = null;
    document.body.classList.remove("is-locked");
    dialogRoot.replaceChildren();
    dialogRoot.removeAttribute("data-open");
    document.querySelector("header")?.removeAttribute("inert");
    main.removeAttribute("inert");
    window.scrollTo(0, y);
    if (trigger && typeof trigger.focus === "function") {
      trigger.focus({ preventScroll: true });
      if (typeof trigger.scrollIntoView === "function") {
        trigger.scrollIntoView({ block: "nearest", inline: "nearest", behavior: reduced() ? "auto" : "smooth" });
      }
    }
  }

  function moveDialog(step) {
    if (!state.dialog) return;
    const { group, index } = state.dialog;
    if (group.length < 2) return;
    state.dialog.index = (index + step + group.length) % group.length;
    renderDialog(true);
  }

  function dialogCopy(item) {
    if (item.kind === "work") {
      return `${item.theme || "同一主角"} 的布局占位。同一张概念图的${item.crop.hint}，用来看错落排布，不是另一件作品。`;
    }
    const asset = item.asset;
    if (asset.id === "character") return "人物外观设定图，用来核对气质与服装。这是平面概念预览，不是实时 3D。";
    if (asset.id === "greeting-storyboard") return "招呼动作的静止分镜，用来核对机位和表情变化。这不是可播放视频。";
    if (asset.presentation === "cutaway") return `${asset.title} v003 无限城半剖悬浮岛。保留半边屋顶与木构外壳，敞开半边展示纵深内景、交错楼梯与悬置房间。本轮待审核，正式日夜分层后续制作。`;
    if (asset.presentation === "interior") return `${asset.title} 无限城内景概念。城内回廊视角、交错楼梯与悬置房间；参考动漫原画方向，正式入口层次后续制作。`;
    if (asset.id.startsWith("island-")) return `${asset.title || workThemeOf(asset)} 的透明岛图，用来核对轮廓。概念预览，不是成品分层资产。`;
    if (asset.id === "environment-day") return "无岛日间环境。用来看地平线和横竖安全区。";
    if (asset.id === "environment-night") return "无岛夜间环境。用来看地平线和横竖安全区。";
    return asset.description || "概念预览。";
  }

  function focusables(root) {
    return [...root.querySelectorAll("button, [href], input, select, textarea, [tabindex]:not([tabindex='-1'])")]
      .filter((node) => !node.disabled && node.getAttribute("aria-hidden") !== "true");
  }

  function renderDialog(keepExplain) {
    const current = state.dialog;
    if (!current) return;
    const item = current.group[current.index];
    const asset = item.asset;
    const resume = restoreFocusTarget();
    const explainOpen = keepExplain && dialogRoot.querySelector(".explain") && !dialogRoot.querySelector(".explain").hidden;
    const dialog = el("div", {
      className: "dialog",
      role: "dialog",
      "aria-modal": "true",
      "aria-labelledby": "dialog-title"
    });
    const closeBtn = el("button", { type: "button", className: "dialog-close" }, "关闭");
    closeBtn.addEventListener("click", closeDialog);
    const title = el("h2", { id: "dialog-title", className: "dialog-title", "aria-live": "polite" }, asset.title || "概念预览");
    const count = el("p", { className: "hint" }, `${current.index + 1} / ${current.group.length}`);
    const stage = el("div", { className: "dialog-stage stage" });
    const img = el("img", { alt: asset.title || "", decoding: "async" });
    img.style.objectFit = item.contain === false ? "contain" : "contain";
    img.style.objectPosition = "center";
    bindImage(stage, img, asset.path);
    const prev = el("button", { type: "button" }, "上一张");
    const next = el("button", { type: "button" }, "下一张");
    prev.disabled = current.group.length < 2;
    next.disabled = current.group.length < 2;
    prev.addEventListener("click", () => moveDialog(-1));
    next.addEventListener("click", () => moveDialog(1));
    const toggle = el("button", {
      type: "button",
      className: "explain-toggle",
      "aria-expanded": String(!!explainOpen),
      "aria-controls": "dialog-explain"
    }, explainOpen ? "收起说明" : "展开说明");
    const explain = el("div", {
      id: "dialog-explain",
      className: "explain"
    }, el("p", { className: "dialog-note" }, dialogCopy(item)));
    if (item.kind === "work") {
      explain.append(el("p", { className: "hint" }, "布局占位 · 同一概念图，不同安全裁切。"));
    }
    explain.hidden = !explainOpen;
    toggle.addEventListener("click", () => {
      const open = explain.hidden;
      explain.hidden = !open;
      toggle.setAttribute("aria-expanded", String(open));
      toggle.textContent = open ? "收起说明" : "展开说明";
    });
    dialog.append(
      el("div", { className: "dialog-chrome" }, el("div", {}, title, count), closeBtn),
      stage,
      el("div", { className: "dialog-nav" }, prev, toggle, next)
    );
    dialog.append(explain);
    dialogRoot.replaceChildren(dialog);
    dialogRoot.dataset.open = "true";
    document.querySelector("header")?.setAttribute("inert", "");
    main.setAttribute("inert", "");
    if (resume === "上一张") prev.focus();
    else if (resume === "下一张") next.focus();
    else closeBtn.focus();
  }

  function renderMaterials() {
    const group = materialGroup();
    const indexOf = (id) => group.findIndex((item) => item.asset.id === id);
    const character = byId("character");
    const story = byId("greeting-storyboard");
    const envDay = byId("environment-day");
    const envNight = byId("environment-night");

    const islands = ISLAND_ORDER.map((island) => {
      const asset = byId(island.id);
      const idx = indexOf(island.id);
      return el(
        "article",
        { className: "island-card", dataset: { assetId: island.id, presentation: asset?.presentation || "cutout" } },
        mediaStage({
          className: asset?.presentation === "interior" ? "scene-stage" : "island-stage",
          asset,
          alt: island.title,
          contain: true,
          openItem: idx >= 0 ? { group, index: idx } : null
        }),
        el("div", { className: "meta" },
          el("h3", {}, island.title),
          el("p", { className: "hint" }, island.usage),
          el("p", { className: "hint" }, asset?.approvedByUser ? "概念已通过" : `v${String(asset?.revision || 1).padStart(3, "0")} · 待审核`)
        )
      );
    });

    return [
      el("p", { className: "lead" },
        "本轮只审核 COS v003 半剖悬浮岛。人物、招呼分镜、Her／ZZZ／FFF、日夜云海与作品布局交互均已通过。当前仍为概念预览，正式模型、影片与日夜分层后续制作。"
      ),
      el("section", { className: "section", "aria-labelledby": "sec-character" },
        el("div", { className: "section-head" },
          el("h2", { id: "sec-character" }, "人物外观"),
          el("p", { className: "section-copy" }, "用来核对成年女性气质、黑长直和海边度假着装。平面设定图，不是实时 3D。")
        ),
        el("article", { className: "character-card", dataset: { assetId: "character" } },
          mediaStage({
            className: "character-stage",
            asset: character,
            alt: "人物外观",
            contain: true,
            openItem: indexOf("character") >= 0 ? { group, index: indexOf("character") } : null
          }),
          el("div", { className: "meta" },
            el("h3", {}, character?.title || "人物外观"),
            el("p", { className: "hint" }, character?.description || "成年人物设定预览")
          )
        )
      ),
      el("section", { className: "section", "aria-labelledby": "sec-story" },
        el("div", { className: "section-head" },
          el("h2", { id: "sec-story" }, "招呼分镜"),
          el("p", { className: "section-copy" }, "固定机位、居中半身。先冷淡，再微笑伸手。这是静止分镜，不是可播放视频。")
        ),
        el("article", { className: "story-card", dataset: { assetId: "greeting-storyboard" } },
          mediaStage({
            className: "story-stage",
            asset: story,
            alt: "招呼分镜",
            contain: true,
            openItem: indexOf("greeting-storyboard") >= 0 ? { group, index: indexOf("greeting-storyboard") } : null
          }),
          el("div", { className: "meta" },
            el("h3", {}, story?.title || "招呼分镜"),
            el("p", { className: "hint" }, story?.description || "用来核对表情和伸手动作的静止画面。")
          )
        )
      ),
      el("section", { className: "section", "aria-labelledby": "sec-islands" },
        el("div", { className: "section-head" },
          el("h2", { id: "sec-islands" }, "四座岛"),
          el("p", { className: "section-copy" }, "Her、ZZZ、FFF 已通过。COS v003 按最新反馈改为半剖悬浮岛，在完整浮岛轮廓内同时展示外壳与层叠内景。点击 COS 查看大图。")
        ),
        el("div", { className: "island-grid" }, ...islands)
      ),
      el("section", { className: "section", "aria-labelledby": "sec-env" },
        el("div", { className: "section-head" },
          el("h2", { id: "sec-env" }, "无岛环境"),
          el("p", { className: "section-copy" }, "日夜底板概念，用来看地平线和安全区。岛不会画进这些图。")
        ),
        el("div", { className: "env-grid" },
          el("article", { className: "env-card", dataset: { assetId: "environment-day" } },
            mediaStage({
              className: "env-stage",
              asset: envDay,
              alt: "日间无岛环境",
              contain: true,
              openItem: indexOf("environment-day") >= 0 ? { group, index: indexOf("environment-day") } : null
            }),
            el("div", { className: "meta" },
              el("h3", {}, envDay?.title || "日间环境"),
              el("p", { className: "hint" }, envDay?.description || "海边清晨方向的底板概念。")
            )
          ),
          el("article", { className: "env-card", dataset: { assetId: "environment-night" } },
            mediaStage({
              className: "env-stage",
              asset: envNight,
              alt: "夜间无岛环境",
              contain: true,
              openItem: indexOf("environment-night") >= 0 ? { group, index: indexOf("environment-night") } : null
            }),
            el("div", { className: "meta" },
              el("h3", {}, envNight?.title || "夜间环境"),
              el("p", { className: "hint" }, envNight?.description || "海边夜晚方向的底板概念。")
            )
          )
        )
      ),
      extraAssets().length
        ? el("section", { className: "section", "aria-labelledby": "sec-extra" },
          el("div", { className: "section-head" },
            el("h2", { id: "sec-extra" }, "其他概念"),
            el("p", { className: "section-copy" }, "清单里还有这些图，按原样放在这里审核。")
          ),
          el("div", { className: "env-grid" },
            ...extraAssets().map((asset) => {
              const idx = indexOf(asset.id);
              return el("article", { className: "env-card", dataset: { assetId: asset.id } },
                mediaStage({
                  className: "env-stage",
                  asset,
                  alt: asset.title || "概念图",
                  contain: true,
                  openItem: idx >= 0 ? { group, index: idx } : null
                }),
                el("div", { className: "meta" },
                  el("h3", {}, asset.title || "概念图"),
                  el("p", { className: "hint" }, asset.description || "概念预览")
                )
              );
            })
          )
        )
        : null
    ].filter(Boolean);
  }

  function renderWorks() {
    const items = visibleWorks();
    const hero = heroItem();
    const heroGroup = hero ? [hero, ...items.filter((item) => item.asset !== hero.asset)] : items;
    const filters = el("div", { className: "filters", role: "group", "aria-label": "作品主题" },
      ...["all", ...WORK_THEMES].map((value) => {
        const label = value === "all" ? "全部" : value;
        const chip = el("button", {
          type: "button",
          className: "chip",
          "aria-pressed": String(state.filter === value)
        }, label);
        chip.addEventListener("click", () => setFilter(value));
        return chip;
      })
    );
    const sort = el("div", { className: "sorts", role: "group", "aria-label": "排序" },
      el("button", { type: "button", className: "chip", "aria-pressed": "true" }, "精选")
    );

    const cards = items.map((item, index) => el(
      "article",
      { className: "work-card", dataset: { assetId: item.asset.id, crop: item.crop.key, theme: item.theme } },
      mediaStage({
        className: "work-stage",
        asset: item.asset,
        alt: `${item.theme} 布局占位`,
        contain: false,
        crop: item.crop,
        openItem: { group: items, index }
      }),
      el("div", { className: "meta" },
        el("span", { className: "placeholder-mark" }, "布局占位"),
        el("h3", {}, item.theme || "同一主角"),
        el("p", { className: "hint" }, `同一张概念图的${item.crop.hint}，用来看排布。`)
      )
    ));

    const heroIndex = hero ? heroGroup.findIndex((item) => item.asset === hero.asset) : -1;

    return [
      el("p", { className: "lead" },
        "作品展示先看位置和交互。图是本轮概念素材做的布局示意，全部标成布局占位。没有标题、日期、客户或点赞。同一分类若只有一张概念图，会用不同安全裁切来模拟比例，并不表示有多件作品。"
      ),
      el("section", { className: "section", "aria-labelledby": "sec-hero" },
        el("article", { className: "hero-card" },
          mediaStage({
            className: "hero-stage",
            asset: hero?.asset || null,
            alt: "精选主视觉",
            contain: true,
            openItem: hero && heroIndex >= 0 ? { group: heroGroup, index: heroIndex } : null
          }),
          el("div", { className: "hero-copy" },
            el("h2", { id: "sec-hero" }, "精选主视觉"),
            el("p", { className: "hint" }, hero?.asset ? "当前用人物或岛的概念图占这个位置。" : "人物图进入后会出现在这里。"),
            hero ? el("span", { className: "placeholder-mark" }, "布局占位") : null
          )
        )
      ),
      el("div", { className: "works-toolbar" }, filters, sort),
      items.length
        ? el("div", { className: "gallery" }, ...cards)
        : el("p", { className: "empty-copy" },
          state.filter === "all"
            ? "这个布局还在等概念图进入。主题筛选和三列错落会留在这里。"
            : `${state.filter} 还没有概念图进入预览。筛选位置会留着。`
        )
    ];
  }

  function render() {
    const title = state.manifest?.title || "第二版素材预览";
    document.title = title;
    if (state.loadError) {
      main.replaceChildren(
        el("div", { className: "banner" },
          el("p", {}, state.loadError),
          el("button", { type: "button", className: "text-btn", id: "reload-manifest" }, "重新读取")
        )
      );
      main.querySelector("#reload-manifest").addEventListener("click", loadManifest);
      return;
    }
    const nodes = state.view === "works" ? renderWorks() : renderMaterials();
    main.replaceChildren(...nodes);
    if (state.dialog) renderDialog(true);
  }

  function onKey(event) {
    if (!state.dialog) return;
    if (event.key === "Escape") {
      event.preventDefault();
      closeDialog();
      return;
    }
    if (event.key === "ArrowLeft") {
      event.preventDefault();
      moveDialog(-1);
      return;
    }
    if (event.key === "ArrowRight") {
      event.preventDefault();
      moveDialog(1);
      return;
    }
    if (event.key === "Tab") {
      const dialog = dialogRoot.querySelector(".dialog");
      if (!dialog) return;
      const nodes = focusables(dialog);
      if (!nodes.length) return;
      const first = nodes[0];
      const last = nodes[nodes.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    }
  }

  function restoreFocusTarget() {
    const active = document.activeElement;
    return active && dialogRoot.contains(active) ? active.textContent : "";
  }

  viewMaterials.addEventListener("click", () => setView("materials"));
  viewWorks.addEventListener("click", () => setView("works"));
  themeDay.addEventListener("click", () => applyTheme("day"));
  themeNight.addEventListener("click", () => applyTheme("night"));
  document.addEventListener("keydown", onKey);

  restoreTheme();
  loadManifest();
})();
