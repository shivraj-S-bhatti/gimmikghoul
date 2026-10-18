/* Local extension for the pinned FalkorDB Browser v2.7.1 / canvas 0.3.3. */
(() => {
  const marker = '__pokemonSpriteRenderer';
  if (window[marker]) return;
  const report = window[marker] = {version: 1, canvases: 0, loaded: 0, failed: 0, drawn: 0};
  const installed = new WeakSet();
  const cache = new Map();

  function spritePath(node) {
    if (node.data?.spriteStatus !== 'exact' || typeof node.data?.imageUrl !== 'string') return;
    try {
      const url = new URL(node.data.imageUrl, location.origin);
      // Render only explicitly imported local assets; never fetch arbitrary node URLs.
      if (!['localhost', '127.0.0.1'].includes(url.hostname)) return;
      if (!/^\/sprites\/[a-z0-9]+\.(png|gif)$/.test(url.pathname)) return;
      return url.pathname;
    } catch { return; }
  }

  function getImage(path, canvas) {
    let record = cache.get(path);
    if (!record) {
      const image = new Image();
      record = {image, ready: false, failed: false, canvases: new Set()};
      cache.set(path, record);
      image.onload = () => {
        record.ready = true;
        report.loaded++;
        for (const target of record.canvases) if (target.isConnected) target.refresh();
        record.canvases.clear();
      };
      image.onerror = () => {record.failed = true; report.failed++; record.canvases.clear();};
      image.src = path;
    }
    if (!record.ready && !record.failed) record.canvases.add(canvas);
    return record;
  }

  function install(canvas) {
    if (installed.has(canvas)) return;
    // Public custom-rendering callbacks use the pinned renderer's original
    // drawing and pointer methods as fallbacks, preserving other node types.
    if (typeof canvas.setConfig !== 'function' || typeof canvas.drawNode !== 'function' || typeof canvas.pointerNode !== 'function') {
      console.warn('Pokemon sprites: incompatible FalkorDB canvas; leaving native renderer unchanged.');
      return;
    }
    installed.add(canvas);
    report.canvases++;
    canvas.setConfig({node: {
      nodeCanvasObject(node, ctx) {
        const path = spritePath(node);
        const record = path && getImage(path, canvas);
        if (!record?.ready) return canvas.drawNode(node, ctx);
        if (canvas.config?.largeGraph?.enabled && typeof canvas.isNodeInCullingBounds === 'function' && !canvas.isNodeInCullingBounds(node)) return;
        // Keep the native circle, selection border, expand glow and link geometry.
        // Its caption moves below the image so a transparent sprite stays legible.
        const displayName = node.displayName;
        node.displayName = [' ', ' '];
        try {canvas.drawNode(node, ctx);} finally {node.displayName = displayName;}
        const radius = node.size;
        const image = record.image;
        const scale = (radius * 1.8) / Math.max(image.naturalWidth, image.naturalHeight);
        const width = image.naturalWidth * scale, height = image.naturalHeight * scale;
        ctx.save();
        if (canvas.config?.dimmed && canvas.config?.isNodeDimmed?.(node)) ctx.globalAlpha = canvas.config.dimOpacity ?? 0.15;
        ctx.imageSmoothingEnabled = false;
        ctx.drawImage(image, node.x - width / 2, node.y - height / 2, width, height);
        const caption = String(node.data?.name || node.data?.spriteId || 'Pokemon');
        const fontSize = Math.max(1.5, radius * 0.32);
        ctx.font = `600 ${fontSize}px sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'top';
        const y = node.y + radius + fontSize * 0.15;
        ctx.lineWidth = fontSize * 0.24;
        ctx.strokeStyle = canvas.config?.backgroundColor || '#ffffff';
        ctx.strokeText(caption, node.x, y);
        ctx.fillStyle = canvas.config?.foregroundColor || '#111827';
        ctx.fillText(caption, node.x, y);
        ctx.restore();
        report.drawn++;
      },
      nodePointerAreaPaint(node, color, ctx) {canvas.pointerNode(node, color, ctx);},
    }});
    canvas.refresh();
  }

  customElements.whenDefined('falkordb-canvas').then(() => {
    const scan = () => document.querySelectorAll('falkordb-canvas').forEach(install);
    scan();
    new MutationObserver(scan).observe(document.documentElement, {childList: true, subtree: true});
  });
})();
