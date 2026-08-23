import { useEffect, useRef, useState } from "react";
import * as THREE from "three";

type ShelfBook = {
  title: string;
  label: string;
  note: string;
  color: string;
  accent: string;
  author?: string;
  isbn?: string;
  cover?: string;
  coverAlt?: string;
  featured?: boolean;
};

type RuntimeBook = {
  root: THREE.Group;
  model: THREE.Group;
  mesh: THREE.Mesh;
  home: THREE.Vector3;
  height: number;
  textures: THREE.Texture[];
  targetRotationX: number;
  targetRotationY: number;
  targetZoom: number;
};

type ShelfEngine = {
  clearHover: () => void;
  hover: (index: number) => void;
  browse: (index: number) => void;
  select: (index: number) => void;
  closeDetail: () => void;
  resetView: () => void;
  dispose: () => void;
};

function damp(current: number, target: number, speed: number, delta: number) {
  return THREE.MathUtils.damp(current, target, speed, delta);
}

function coverTexture(book: ShelfBook, renderer: THREE.WebGLRenderer) {
  const canvas = document.createElement("canvas");
  canvas.width = 640;
  canvas.height = 1024;
  const context = canvas.getContext("2d")!;
  const gradient = context.createLinearGradient(0, 0, canvas.width, canvas.height);
  gradient.addColorStop(0, book.color);
  gradient.addColorStop(.72, book.color);
  gradient.addColorStop(1, "#151413");
  context.fillStyle = gradient;
  context.fillRect(0, 0, canvas.width, canvas.height);
  context.strokeStyle = book.accent;
  context.globalAlpha = .55;
  context.lineWidth = 2;
  context.strokeRect(48, 48, canvas.width - 96, canvas.height - 96);
  context.globalAlpha = 1;
  context.fillStyle = book.accent;
  context.font = "600 22px Arial";
  context.letterSpacing = "3px";
  context.fillText(book.label.toUpperCase(), 74, 100);
  context.font = "400 66px Georgia";
  const words = book.title.split(" ");
  const lines: string[] = [];
  let line = "";
  words.forEach((word) => {
    const candidate = `${line} ${word}`.trim();
    if (context.measureText(candidate).width > 480 && line) {
      lines.push(line);
      line = word;
    } else line = candidate;
  });
  lines.push(line);
  lines.forEach((text, index) => context.fillText(text, 74, 400 + index * 72));
  context.font = "500 18px Arial";
  context.letterSpacing = "2px";
  context.fillText("CURSOR & COVERS / FIELD NOTES", 74, 920);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = Math.min(8, renderer.capabilities.getMaxAnisotropy());
  return texture;
}

function wrapCanvasText(context: CanvasRenderingContext2D, text: string, maxWidth: number) {
  const words = text.split(/\s+/);
  const lines: string[] = [];
  let line = "";
  words.forEach((word) => {
    const candidate = `${line} ${word}`.trim();
    if (line && context.measureText(candidate).width > maxWidth) {
      lines.push(line);
      line = word;
    } else {
      line = candidate;
    }
  });
  if (line) lines.push(line);
  return lines;
}

function backCoverTexture(book: ShelfBook, renderer: THREE.WebGLRenderer) {
  const canvas = document.createElement("canvas");
  canvas.width = 640;
  canvas.height = 1024;
  const context = canvas.getContext("2d")!;
  const gradient = context.createLinearGradient(0, 0, canvas.width, canvas.height);
  gradient.addColorStop(0, book.color);
  gradient.addColorStop(.7, book.color);
  gradient.addColorStop(1, "#171513");
  context.fillStyle = gradient;
  context.fillRect(0, 0, canvas.width, canvas.height);

  // A quiet print texture makes the recreated jacket feel physical without
  // pretending to be an official publisher scan.
  context.globalAlpha = .055;
  for (let y = 0; y < canvas.height; y += 5) {
    context.fillStyle = y % 10 === 0 ? book.accent : "#000000";
    context.fillRect(0, y, canvas.width, 1);
  }
  context.globalAlpha = 1;
  context.strokeStyle = book.accent;
  context.globalAlpha = .48;
  context.lineWidth = 2;
  context.strokeRect(48, 48, canvas.width - 96, canvas.height - 96);
  context.globalAlpha = 1;

  context.fillStyle = book.accent;
  context.font = "600 18px Arial";
  context.letterSpacing = "3px";
  context.fillText(book.featured ? "FEATURED AI SELECTION" : "CURATED READING NOTE", 72, 100);

  context.font = "400 43px Georgia";
  context.letterSpacing = "0px";
  const titleLines = wrapCanvasText(context, book.title, 490).slice(0, 3);
  titleLines.forEach((line, index) => context.fillText(line, 72, 174 + index * 49));

  const titleBottom = 174 + titleLines.length * 49;
  if (book.author) {
    context.font = "600 19px Arial";
    context.letterSpacing = "1px";
    context.fillText(book.author.toUpperCase(), 72, titleBottom + 16);
  }

  const noteY = titleBottom + 92;
  context.fillStyle = book.accent;
  context.globalAlpha = .86;
  context.font = "400 25px Georgia";
  context.letterSpacing = "0px";
  const noteLines = wrapCanvasText(context, book.note, 490).slice(0, 9);
  noteLines.forEach((line, index) => context.fillText(line, 72, noteY + index * 37));
  context.globalAlpha = 1;

  context.strokeStyle = book.accent;
  context.globalAlpha = .42;
  context.beginPath();
  context.moveTo(72, 718);
  context.lineTo(568, 718);
  context.stroke();
  context.globalAlpha = 1;

  context.fillStyle = book.accent;
  context.font = "600 15px Arial";
  context.letterSpacing = "2px";
  context.fillText("DEMO READING LIBRARY", 72, 756);
  context.font = "400 13px Arial";
  context.letterSpacing = "1px";
  context.globalAlpha = .72;
  context.fillText("OPEN-SOURCE 3D EDITION", 72, 781);
  context.globalAlpha = 1;

  const code = (book.isbn ?? book.title).replace(/\D/g, "") || [...book.title].map((character) => character.charCodeAt(0) % 10).join("");
  const barcodeX = 334;
  const barcodeY = 758;
  const barcodeWidth = 234;
  const barcodeHeight = 126;
  context.fillStyle = "#f8f4e9";
  context.fillRect(barcodeX, barcodeY, barcodeWidth, barcodeHeight);
  context.fillStyle = "#171513";
  let cursor = barcodeX + 15;
  for (let index = 0; cursor < barcodeX + barcodeWidth - 15; index += 1) {
    const digit = Number(code[index % code.length]);
    const barWidth = 1 + digit % 4;
    const gap = 1 + (digit + index) % 3;
    context.fillRect(cursor, barcodeY + 14, barWidth, 77 + (index % 3) * 5);
    cursor += barWidth + gap;
  }
  context.font = "500 13px Arial";
  context.letterSpacing = "2px";
  context.fillText(book.isbn ? `ISBN ${book.isbn}` : "SPECIAL EDITION", barcodeX + 15, barcodeY + 111);

  context.fillStyle = book.accent;
  context.font = "500 13px Arial";
  context.letterSpacing = "1px";
  context.globalAlpha = .7;
  context.fillText("Cover artwork © respective publisher and artist", 72, 930);
  context.globalAlpha = 1;

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = Math.min(8, renderer.capabilities.getMaxAnisotropy());
  return texture;
}

function spineTexture(book: ShelfBook, renderer: THREE.WebGLRenderer) {
  const canvas = document.createElement("canvas");
  canvas.width = 192;
  canvas.height = 1024;
  const context = canvas.getContext("2d")!;
  const gradient = context.createLinearGradient(0, 0, canvas.width, 0);
  gradient.addColorStop(0, "#171513");
  gradient.addColorStop(.16, book.color);
  gradient.addColorStop(.82, book.color);
  gradient.addColorStop(1, "#171513");
  context.fillStyle = gradient;
  context.fillRect(0, 0, canvas.width, canvas.height);
  context.strokeStyle = book.accent;
  context.globalAlpha = .56;
  context.lineWidth = 3;
  context.strokeRect(22, 22, canvas.width - 44, canvas.height - 44);
  context.globalAlpha = 1;

  context.save();
  context.translate(canvas.width / 2, canvas.height / 2);
  context.rotate(-Math.PI / 2);
  context.fillStyle = book.accent;
  context.textAlign = "center";
  context.textBaseline = "middle";
  context.font = "500 39px Georgia";
  const title = book.title.length > 42 ? `${book.title.slice(0, 39)}…` : book.title;
  context.fillText(title, 0, -14, 790);
  context.font = "600 20px Arial";
  context.letterSpacing = "2px";
  context.fillText((book.author ?? book.label).toUpperCase(), 0, 42, 760);
  context.restore();

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = Math.min(8, renderer.capabilities.getMaxAnisotropy());
  return texture;
}

function createEngine(
  canvas: HTMLCanvasElement,
  books: ShelfBook[],
  onSelection: (index: number | null) => void,
  onBrowse: (index: number) => void,
): ShelfEngine {
  const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, window.innerWidth < 720 ? 1.25 : 1.5));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFShadowMap;
  renderer.outputColorSpace = THREE.SRGBColorSpace;

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(35, 1, .1, 40);
  const browsePosition = new THREE.Vector3(0, 1.8, 5.8);
  camera.position.copy(browsePosition);
  camera.lookAt(0, 1.05, .05);

  scene.add(new THREE.HemisphereLight(0xfff8e8, 0x6f6259, 2.5));
  const keyLight = new THREE.DirectionalLight(0xfff3dc, 4.2);
  keyLight.position.set(-3, 6, 5);
  keyLight.castShadow = true;
  keyLight.shadow.mapSize.set(512, 512);
  scene.add(keyLight);
  const rimLight = new THREE.DirectionalLight(0xd9e6ff, 2.1);
  rimLight.position.set(4, 2, -3);
  scene.add(rimLight);

  const shelfMaterial = new THREE.ShadowMaterial({ color: 0x313131, opacity: .16 });
  const shelf = new THREE.Mesh(new THREE.PlaneGeometry(3.75, 1.15), shelfMaterial);
  shelf.rotation.x = -Math.PI / 2;
  shelf.position.set(0, .065, -.02);
  shelf.receiveShadow = true;
  scene.add(shelf);

  const runtime: RuntimeBook[] = [];
  const pickTargets: THREE.Object3D[] = [];
  let disposed = false;
  const spacing = Math.min(.215, 1.72 / Math.max(1, books.length - 2));
  books.forEach((book, index) => {
    const height = book.featured ? 1.72 : 1.48 + (index % 3) * .075;
    const width = height * (.64 + (index % 2) * .012);
    const depth = book.featured ? .245 : .19 + (index % 4) * .012;
    const texture = coverTexture(book, renderer);
    const backTexture = backCoverTexture(book, renderer);
    const spineMap = spineTexture(book, renderer);
    const cover = new THREE.MeshPhysicalMaterial({ map: texture, roughness: .68, sheen: .34, sheenColor: new THREE.Color(book.accent) });
    const backCover = new THREE.MeshPhysicalMaterial({ map: backTexture, roughness: .76, sheen: .22, sheenColor: new THREE.Color(book.accent) });
    const spine = new THREE.MeshPhysicalMaterial({ map: spineMap, roughness: .74, sheen: .25, sheenColor: new THREE.Color(book.accent) });
    const pages = new THREE.MeshStandardMaterial({ color: "#e8dfcb", roughness: .9 });
    const geometry = new THREE.BoxGeometry(width, height, depth, 2, 2, 1);
    const mesh = new THREE.Mesh(geometry, [spine, spine, pages, pages, cover, backCover]);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    mesh.userData.bookIndex = index;
    const model = new THREE.Group();
    model.add(mesh);
    const root = new THREE.Group();
    const initiallyOpen = index === 0;
    const initialSpineOrder = Math.max(0, index - 1);
    const home = new THREE.Vector3(initiallyOpen ? -.78 : -.16 + initialSpineOrder * spacing, .15 + height / 2, initiallyOpen ? .5 : .03);
    root.position.copy(home);
    root.rotation.y = initiallyOpen ? 0 : Math.PI / 2;
    root.scale.setScalar(initiallyOpen ? 1.28 : 1);
    root.add(model);
    scene.add(root);
    const runtimeBook: RuntimeBook = { root, model, mesh, home, height, textures: [texture, backTexture, spineMap], targetRotationX: 0, targetRotationY: 0, targetZoom: 1 };
    runtime.push(runtimeBook);
    pickTargets.push(mesh);
    if (book.cover) {
      new THREE.TextureLoader().load(book.cover, (loadedTexture) => {
        if (disposed) {
          loadedTexture.dispose();
          return;
        }
        loadedTexture.colorSpace = THREE.SRGBColorSpace;
        loadedTexture.anisotropy = Math.min(8, renderer.capabilities.getMaxAnisotropy());
        runtimeBook.textures.push(loadedTexture);
        cover.map = loadedTexture;
        cover.needsUpdate = true;
      });
    }
  });

  const raycaster = new THREE.Raycaster();
  const pointer = new THREE.Vector2(10, 10);
  let hoveredIndex: number | null = null;
  let browseIndex = 0;
  let displayedIndex = 0;
  let pendingBrowseIndex = 0;
  let transitionPhase: "idle" | "closing" | "extracting" | "opening" = "idle";
  let transitionStartedAt = 0;
  let selectedIndex: number | null = null;
  let frame = 0;
  let pointerId: number | null = null;
  let dragging = false;
  let pressIndex: number | null = null;
  let pressX = 0;
  let pressY = 0;
  let pressMoved = false;
  let browsePointerId: number | null = null;
  let browseStartIndex = 0;
  let pointerLastX = 0;
  let pointerLastY = 0;
  let pinchStartDistance = 0;
  let pinchStartZoom = 1;
  const activePointers = new Map<number, { x: number; y: number }>();
  let lastFrameTime = performance.now();

  const setPointer = (event: PointerEvent) => {
    const rect = canvas.getBoundingClientRect();
    pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    pointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
  };
  const hitBook = () => {
    raycaster.setFromCamera(pointer, camera);
    const hit = raycaster.intersectObjects(pickTargets, false)[0];
    return typeof hit?.object.userData.bookIndex === "number" ? hit.object.userData.bookIndex as number : null;
  };

  const browse = (index: number) => {
    if (selectedIndex !== null) return;
    const nextIndex = THREE.MathUtils.clamp(Math.round(index), 0, books.length - 1);
    hoveredIndex = nextIndex;
    if (browseIndex !== nextIndex) {
      browseIndex = nextIndex;
      pendingBrowseIndex = nextIndex;
      transitionPhase = "closing";
      transitionStartedAt = performance.now();
      onBrowse(nextIndex);
    }
    canvas.style.cursor = "pointer";
  };
  const hover = (index: number) => {
    if (selectedIndex !== null || transitionPhase !== "idle") return;
    hoveredIndex = index;
    canvas.style.cursor = "pointer";
  };
  const clearHover = () => {
    if (selectedIndex !== null) return;
    hoveredIndex = null;
    canvas.style.cursor = "grab";
  };
  const select = (index: number) => {
    if (selectedIndex !== null && selectedIndex !== index) {
      runtime[selectedIndex].targetRotationX = 0;
      runtime[selectedIndex].targetRotationY = 0;
      runtime[selectedIndex].targetZoom = 1;
    }
    selectedIndex = index;
    browseIndex = index;
    displayedIndex = index;
    pendingBrowseIndex = index;
    transitionPhase = "idle";
    onBrowse(index);
    hoveredIndex = null;
    shelf.visible = false;
    runtime.forEach((book, bookIndex) => { book.root.visible = bookIndex === index; });
    canvas.style.cursor = "grab";
    onSelection(index);
  };
  const closeDetail = () => {
    if (selectedIndex !== null) {
      runtime[selectedIndex].targetRotationX = 0;
      runtime[selectedIndex].targetRotationY = 0;
      runtime[selectedIndex].targetZoom = 1;
    }
    selectedIndex = null;
    hoveredIndex = null;
    displayedIndex = browseIndex;
    pendingBrowseIndex = browseIndex;
    transitionPhase = "idle";
    shelf.visible = true;
    runtime.forEach((book) => { book.root.visible = true; });
    dragging = false;
    pointerId = null;
    pressIndex = null;
    browsePointerId = null;
    activePointers.clear();
    canvas.style.cursor = "grab";
    onSelection(null);
  };
  const resetView = () => {
    if (selectedIndex === null) return;
    const book = runtime[selectedIndex];
    book.targetRotationX = 0;
    book.targetRotationY = 0;
    book.targetZoom = 1;
  };

  const handleMove = (event: PointerEvent) => {
    if (activePointers.has(event.pointerId)) activePointers.set(event.pointerId, { x: event.clientX, y: event.clientY });
    if (pressIndex !== null && Math.hypot(event.clientX - pressX, event.clientY - pressY) > 7) pressMoved = true;
    if (dragging && selectedIndex !== null) {
      const activeBook = runtime[selectedIndex];
      if (activePointers.size >= 2) {
        const points = [...activePointers.values()];
        const distance = Math.hypot(points[0].x - points[1].x, points[0].y - points[1].y);
        if (pinchStartDistance > 0) activeBook.targetZoom = THREE.MathUtils.clamp(pinchStartZoom * distance / pinchStartDistance, .72, 1.65);
      } else if (event.pointerId === pointerId) {
        const deltaX = event.clientX - pointerLastX;
        const deltaY = event.clientY - pointerLastY;
        activeBook.targetRotationY += deltaX * .012;
        activeBook.targetRotationX = THREE.MathUtils.clamp(activeBook.targetRotationX + deltaY * .009, -.8, .8);
        pointerLastX = event.clientX;
        pointerLastY = event.clientY;
      }
      return;
    }
    if (selectedIndex === null && event.pointerId === browsePointerId) {
      if (Math.hypot(event.clientX - pressX, event.clientY - pressY) > 7) pressMoved = true;
      if (pressMoved) {
        browse(browseStartIndex + Math.round((pressX - event.clientX) / 58));
        canvas.style.cursor = "grabbing";
      }
      return;
    }
    if (selectedIndex !== null || event.pointerType !== "mouse" || transitionPhase !== "idle") return;
    setPointer(event);
    const hit = hitBook();
    if (hit === null) clearHover();
    else hover(hit);
  };
  const handleDown = (event: PointerEvent) => {
    setPointer(event);
    const hit = hitBook();
    if (selectedIndex === null) {
      if (hit !== null) hover(hit);
      pressIndex = hit;
      browsePointerId = event.pointerId;
      browseStartIndex = browseIndex;
      pressX = event.clientX;
      pressY = event.clientY;
      pressMoved = false;
      canvas.setPointerCapture(event.pointerId);
      canvas.style.cursor = "grabbing";
      return;
    }
    if (hit !== selectedIndex) return;
    activePointers.set(event.pointerId, { x: event.clientX, y: event.clientY });
    if (activePointers.size === 1) {
      pointerId = event.pointerId;
      pointerLastX = event.clientX;
      pointerLastY = event.clientY;
    } else if (activePointers.size === 2) {
      const points = [...activePointers.values()];
      pinchStartDistance = Math.hypot(points[0].x - points[1].x, points[0].y - points[1].y);
      pinchStartZoom = runtime[selectedIndex].targetZoom;
    }
    dragging = true;
    canvas.setPointerCapture(event.pointerId);
    canvas.style.cursor = "grabbing";
  };
  const handleUp = (event: PointerEvent) => {
    if (selectedIndex === null && event.pointerId === browsePointerId) {
      const chosenIndex = pressIndex;
      pressIndex = null;
      browsePointerId = null;
      if (canvas.hasPointerCapture(event.pointerId)) canvas.releasePointerCapture(event.pointerId);
      if (!pressMoved && chosenIndex !== null) {
        if (transitionPhase === "idle" && chosenIndex === browseIndex && chosenIndex === displayedIndex) select(chosenIndex);
        else browse(chosenIndex);
      }
      else canvas.style.cursor = "grab";
      return;
    }
    activePointers.delete(event.pointerId);
    if (canvas.hasPointerCapture(event.pointerId)) canvas.releasePointerCapture(event.pointerId);
    if (activePointers.size === 0) {
      dragging = false;
      pointerId = null;
      canvas.style.cursor = "grab";
    } else {
      const [nextId, point] = [...activePointers.entries()][0];
      pointerId = nextId;
      pointerLastX = point.x;
      pointerLastY = point.y;
    }
  };
  const handleCancel = (event: PointerEvent) => {
    pressIndex = null;
    if (event.pointerId === browsePointerId) browsePointerId = null;
    activePointers.delete(event.pointerId);
    if (canvas.hasPointerCapture(event.pointerId)) canvas.releasePointerCapture(event.pointerId);
    if (activePointers.size === 0) {
      dragging = false;
      pointerId = null;
      canvas.style.cursor = "grab";
    }
  };
  const handleWheel = (event: WheelEvent) => {
    if (selectedIndex === null) return;
    event.preventDefault();
    const book = runtime[selectedIndex];
    book.targetZoom = THREE.MathUtils.clamp(book.targetZoom * Math.exp(-event.deltaY * .0012), .72, 1.65);
  };
  const handleKey = (event: KeyboardEvent) => {
    if (event.key === "Escape") closeDetail();
    if (selectedIndex === null && event.key === "ArrowLeft") {
      event.preventDefault();
      browse(browseIndex - 1);
    }
    if (selectedIndex === null && event.key === "ArrowRight") {
      event.preventDefault();
      browse(browseIndex + 1);
    }
    if ((event.key === "Enter" || event.key === " ") && selectedIndex === null) {
      event.preventDefault();
      select(browseIndex);
    }
    if ((event.key === "r" || event.key === "R") && selectedIndex !== null) resetView();
  };
  canvas.addEventListener("pointermove", handleMove);
  canvas.addEventListener("pointerdown", handleDown);
  canvas.addEventListener("pointerup", handleUp);
  canvas.addEventListener("pointercancel", handleCancel);
  canvas.addEventListener("wheel", handleWheel, { passive: false });
  canvas.addEventListener("keydown", handleKey);
  canvas.style.cursor = "grab";

  let compact = false;
  const resize = () => {
    const width = canvas.clientWidth;
    const height = canvas.clientHeight;
    if (!width || !height) return;
    compact = width < 760;
    renderer.setSize(width, height, false);
    camera.aspect = width / height;
    camera.position.set(0, compact ? 1.72 : 1.8, compact ? 7.7 : 5.8);
    camera.lookAt(0, compact ? 1.05 : 1.05, .05);
    camera.updateProjectionMatrix();
  };
  const resizeObserver = new ResizeObserver(resize);
  resizeObserver.observe(canvas);
  resize();

  const animate = () => {
    if (disposed) return;
    frame = requestAnimationFrame(animate);
    const now = performance.now();
    const delta = Math.min((now - lastFrameTime) / 1000, .05);
    lastFrameTime = now;
    if (selectedIndex === null && transitionPhase === "closing" && now - transitionStartedAt >= 230) {
      displayedIndex = pendingBrowseIndex;
      transitionPhase = "extracting";
      transitionStartedAt = now;
    } else if (selectedIndex === null && transitionPhase === "extracting" && now - transitionStartedAt >= 320) {
      transitionPhase = "opening";
      transitionStartedAt = now;
    } else if (selectedIndex === null && transitionPhase === "opening" && now - transitionStartedAt >= 620) {
      transitionPhase = "idle";
    }
    const cameraTargetZ = selectedIndex !== null ? (compact ? 6.35 : 5.55) : compact ? 7.7 : 5.8;
    camera.position.z = damp(camera.position.z, cameraTargetZ, 6.5, delta);
    camera.lookAt(0, compact ? 1.05 : 1.05, .05);
    runtime.forEach((book, index) => {
      const selected = index === selectedIndex;
      const closingShelf = selectedIndex === null && transitionPhase === "closing";
      const extractingBook = selectedIndex === null && transitionPhase === "extracting" && index === displayedIndex;
      const openOnShelf = selectedIndex === null && !closingShelf && index === displayedIndex;
      const showingCover = openOnShelf && !extractingBook;
      const spineOrder = closingShelf ? index : index < displayedIndex ? index : index - 1;
      const spineBaseX = closingShelf ? (compact ? -.44 : -.46) : compact ? -.08 : -.16;
      const spineX = spineBaseX + Math.max(0, spineOrder) * spacing * (compact ? .88 : 1);
      const targetX = selected ? (compact ? 0 : -1.42) : extractingBook ? (compact ? -.72 : -1.02) : openOnShelf ? (compact ? -.56 : -.78) : spineX;
      const targetY = selected ? (compact ? 1.42 : 1.26) : book.home.y + (openOnShelf ? .06 : 0);
      const targetZ = selected ? 1.08 : extractingBook ? .78 : openOnShelf ? .5 : .03;
      const targetYaw = selected || showingCover ? 0 : Math.PI / 2;
      const targetScale = selected ? (compact ? 1.44 : 1.42) * book.targetZoom : showingCover ? (compact ? 1.16 : 1.28) : extractingBook ? 1.06 : 1;
      const motionSpeed = closingShelf ? 30 : extractingBook ? 13 : 7.5;
      book.root.position.x = damp(book.root.position.x, targetX, motionSpeed, delta);
      book.root.position.y = damp(book.root.position.y, targetY, motionSpeed, delta);
      book.root.position.z = damp(book.root.position.z, targetZ, motionSpeed, delta);
      book.root.rotation.y = damp(book.root.rotation.y, targetYaw, closingShelf ? 32 : 8, delta);
      const nextScale = damp(book.root.scale.x, targetScale, motionSpeed, delta);
      book.root.scale.setScalar(nextScale);
      book.model.position.y = damp(book.model.position.y, selected ? .045 : 0, 5, delta);
      book.model.rotation.x = damp(book.model.rotation.x, selected ? book.targetRotationX : 0, 11, delta);
      book.model.rotation.y = damp(book.model.rotation.y, selected ? book.targetRotationY : 0, 11, delta);
    });
    renderer.render(scene, camera);
  };
  animate();

  return {
    clearHover,
    hover,
    browse,
    select,
    closeDetail,
    resetView,
    dispose: () => {
      disposed = true;
      cancelAnimationFrame(frame);
      resizeObserver.disconnect();
      canvas.removeEventListener("pointermove", handleMove);
      canvas.removeEventListener("pointerdown", handleDown);
      canvas.removeEventListener("pointerup", handleUp);
      canvas.removeEventListener("pointercancel", handleCancel);
      canvas.removeEventListener("wheel", handleWheel);
      canvas.removeEventListener("keydown", handleKey);
      scene.traverse((object) => {
        if (!(object instanceof THREE.Mesh)) return;
        object.geometry.dispose();
        const materials = Array.isArray(object.material) ? object.material : [object.material];
        materials.forEach((material) => material.dispose());
      });
      runtime.forEach((book) => book.textures.forEach((texture) => texture.dispose()));
      renderer.dispose();
    },
  };
}

export function ThreeShelf({ books }: { books: ShelfBook[] }) {
  const shelfRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const engineRef = useRef<ShelfEngine | null>(null);
  const [browseIndex, setBrowseIndex] = useState(0);
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const browseBook = books[browseIndex];
  const selectedBook = selectedIndex === null ? null : books[selectedIndex];

  useEffect(() => {
    if (!canvasRef.current) return;
    const engine = createEngine(canvasRef.current, books, setSelectedIndex, setBrowseIndex);
    engineRef.current = engine;
    return () => {
      engine.dispose();
      engineRef.current = null;
    };
  }, [books]);

  useEffect(() => {
    if (selectedIndex === null || !window.matchMedia("(max-width: 760px)").matches) return;
    const frame = requestAnimationFrame(() => shelfRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }));
    return () => cancelAnimationFrame(frame);
  }, [selectedIndex]);

  return <div ref={shelfRef} className={`three-shelf ${selectedBook ? "is-inspecting" : ""}`} onPointerLeave={() => engineRef.current?.clearHover()}>
    <div className="three-shelf__lead"><p>Books I’ve read recently. Click a spine to pull it out, then click the open cover to inspect it. Drag to browse.</p></div>
    <canvas ref={canvasRef} className="three-shelf__canvas" tabIndex={0} role="application" aria-label={`Interactive three-dimensional shelf of ${books.length} books. Click a spine to bring it forward, click the open cover to inspect it, or drag and use the arrow keys to browse.`} />
    <div className="three-shelf__caption" aria-live="polite">
      <span>{String(browseIndex + 1).padStart(2, "0")} / {String(books.length).padStart(2, "0")}</span>
      <h3>{browseBook.title}</h3>
      {browseBook.author ? <p>{browseBook.author}</p> : null}
      <button onClick={() => engineRef.current?.select(browseIndex)}>Inspect <span aria-hidden="true">↗</span></button>
    </div>
    <button className="three-shelf__arrow three-shelf__arrow--left" onClick={() => engineRef.current?.browse(browseIndex - 1)} disabled={browseIndex === 0} aria-label="Previous book">←</button>
    <button className="three-shelf__arrow three-shelf__arrow--right" onClick={() => engineRef.current?.browse(browseIndex + 1)} disabled={browseIndex === books.length - 1} aria-label="Next book">→</button>
    <aside className="three-shelf__details" aria-hidden={!selectedBook} aria-live="polite">
      {selectedBook ? <div className="three-shelf__details-inner">
        <div className="three-shelf__topbar"><button className="three-shelf__back" onClick={() => engineRef.current?.closeDetail()}><span aria-hidden="true">←</span> Back to shelf</button><div className="three-shelf__count"><span>{String(selectedIndex! + 1).padStart(2, "0")}</span><i /><span>{String(books.length).padStart(2, "0")}</span></div></div>
        <div className={`three-shelf__copy ${selectedBook.featured ? "is-featured" : ""}`}><span>{selectedBook.featured ? "★ " : ""}{selectedBook.label}</span><h3>{selectedBook.title}</h3>{selectedBook.author ? <p className="three-shelf__author">{selectedBook.author}</p> : null}<p>{selectedBook.note}</p><dl><div><dt>Format</dt><dd>{selectedBook.featured ? "Featured AI guide" : "Published book"}</dd></div>{selectedBook.isbn ? <div><dt>ISBN</dt><dd>{selectedBook.isbn}</dd></div> : null}<div><dt>Controls</dt><dd>Drag · scroll · pinch</dd></div></dl></div>
        <div className="three-shelf__controls"><p>drag to orbit · scroll to zoom · esc to close</p><button onClick={() => engineRef.current?.resetView()}>Reset</button></div>
      </div> : null}
    </aside>
    <nav className="three-shelf__index" aria-label="Reading library volumes">
      {books.map((book, index) => <button key={book.title} className={index === browseIndex ? "active" : ""} onPointerEnter={() => engineRef.current?.hover(index)} onPointerLeave={() => engineRef.current?.clearHover()} onFocus={() => engineRef.current?.hover(index)} onBlur={() => engineRef.current?.clearHover()} onClick={() => engineRef.current?.browse(index)} aria-current={index === browseIndex ? "true" : undefined} aria-label={`Browse to ${book.title}`}><span /></button>)}
    </nav>
  </div>;
}
