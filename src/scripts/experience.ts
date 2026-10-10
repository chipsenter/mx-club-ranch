import { swagItems } from '../data/site';

// Store identifiers and quantities only; prices/inventory must come from a future commerce provider.
type CartLine = { id: string; quantity: number };
const CART_KEY = 'club-ranch-mx-cart-v1';
const drawer = document.querySelector<HTMLDialogElement>('.cart-drawer');
const toast = document.querySelector<HTMLElement>('.cart-toast');
const products = new Map(swagItems.map(item => [item.id, item]));
let cart: CartLine[] = [];
let toastTimer: ReturnType<typeof setTimeout>;
let returnFocus: HTMLElement | null = null;
const readCart = (value: string | null): CartLine[] => {
  try {
    const data: unknown = JSON.parse(value || '[]');
    if (!Array.isArray(data)) return [];
    const result = new Map<string, number>();
    for (const line of data) {
      if (line && typeof line.id === 'string' && products.has(line.id) && Number.isInteger(line.quantity) && line.quantity > 0) result.set(line.id, Math.min(10, line.quantity));
    }
    return [...result].map(([id, quantity]) => ({ id, quantity }));
  } catch { return []; }
};
try { cart = readCart(localStorage.getItem(CART_KEY)); } catch { /* In-memory cart remains usable. */ }
const announce = (message: string) => {
  const label = document.querySelector('[data-cart-message]');
  if (label) label.textContent = message;
  toast?.classList.add('is-visible');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast?.classList.remove('is-visible'), 5500);
};
const save = () => { try { localStorage.setItem(CART_KEY, JSON.stringify(cart)); } catch { announce('Saved for this visit. Browser storage is unavailable.'); } };
const renderCart = () => {
  const count = cart.reduce((total, line) => total + line.quantity, 0);
  document.querySelectorAll('[data-cart-count]').forEach(node => { node.textContent = String(count); });
  document.querySelector('.cart-trigger')?.setAttribute('aria-label', `Open cart, ${count} ${count === 1 ? 'item' : 'items'}`);
  const summary = document.querySelector('[data-cart-summary]');
  if (summary) summary.textContent = count ? `${count} ${count === 1 ? 'item' : 'items'} saved for later` : 'No items yet';
  const empty = document.querySelector<HTMLElement>('[data-cart-empty]');
  const footer = document.querySelector<HTMLElement>('[data-cart-footer]');
  if (empty) empty.hidden = count > 0;
  if (footer) footer.hidden = count === 0;
  const container = document.querySelector('[data-cart-items]');
  container?.replaceChildren();
  cart.forEach(line => {
    const product = products.get(line.id)!;
    const article = document.createElement('article'); article.className = 'cart-line';
    const img = document.createElement('img'); img.src = product.image; img.alt = product.imageAlt; img.width = 84; img.height = 100;
    const content = document.createElement('div');
    const title = document.createElement('h3'); title.textContent = product.name;
    const price = document.createElement('p'); price.textContent = 'Price to be announced';
    const row = document.createElement('div'); row.className = 'quantity-row';
    const control = document.createElement('div'); control.className = 'quantity-control'; control.setAttribute('role', 'group'); control.setAttribute('aria-label', `${product.name} quantity`);
    const quantity = document.createElement('span'); quantity.textContent = String(line.quantity); quantity.setAttribute('aria-label', `Quantity ${line.quantity}`);
    const makeButton = (action: 'decrease' | 'increase' | 'remove', label: string, text: string) => {
      const button = document.createElement('button'); button.type = 'button'; button.textContent = text; button.setAttribute('aria-label', label); button.dataset.id = line.id; button.dataset.cartAction = action; return button;
    };
    const minus = makeButton('decrease', `Decrease ${product.name} quantity`, '−'); minus.disabled = line.quantity === 1;
    const plus = makeButton('increase', `Increase ${product.name} quantity`, '+'); plus.disabled = line.quantity >= 10;
    const remove = makeButton('remove', `Remove ${product.name}`, 'Remove'); remove.className = 'remove-item';
    control.append(minus, quantity, plus); row.append(control, remove); content.append(title, price, row); article.append(img, content); container?.append(article);
  });
};
const closeCart = () => drawer?.close();
if (drawer) {
  document.querySelectorAll<HTMLButtonElement>('[data-cart-open]').forEach(button => {
    button.hidden = false;
    button.addEventListener('click', () => { returnFocus = button.closest('.cart-toast') ? document.querySelector<HTMLElement>('.cart-trigger') : button; toast?.classList.remove('is-visible'); renderCart(); drawer.showModal(); });
  });
  document.querySelectorAll<HTMLButtonElement>('[data-add-cart]').forEach(button => {
    button.hidden = false;
    button.addEventListener('click', () => {
      const id = button.dataset.addCart!;
      if (!products.has(id)) return;
      const line = cart.find(item => item.id === id);
      if (line && line.quantity >= 10) { announce('Maximum 10 per item in your saved cart.'); return; }
      if (line) line.quantity++; else cart.push({ id, quantity: 1 });
      renderCart(); announce(`${products.get(id)!.name} added to cart.`); save();
    });
  });
  document.querySelectorAll('[data-cart-close]').forEach(button => button.addEventListener('click', closeCart));
  drawer.addEventListener('click', event => { if (event.target === drawer && event.clientX < drawer.getBoundingClientRect().left) closeCart(); });
  drawer.addEventListener('close', () => { returnFocus?.focus({ preventScroll: true }); });
  document.querySelector('[data-cart-browse]')?.addEventListener('click', () => { closeCart(); document.querySelector('#swag')?.scrollIntoView({ behavior: 'instant' }); document.querySelector<HTMLButtonElement>('[data-add-cart]')?.focus({ preventScroll: true }); });
  drawer.querySelector('[data-cart-items]')?.addEventListener('click', event => {
    const button = (event.target as Element).closest<HTMLButtonElement>('[data-cart-action]');
    if (!button) return;
    const id = button.dataset.id!; const action = button.dataset.cartAction;
    const line = cart.find(item => item.id === id); if (!line) return;
    if (action === 'remove') cart = cart.filter(item => item.id !== id);
    else line.quantity = Math.max(1, Math.min(10, line.quantity + (action === 'increase' ? 1 : -1)));
    save(); renderCart();
    const same = drawer.querySelector<HTMLButtonElement>(`[data-id="${id}"][data-cart-action="${action}"]`);
    const fallback = drawer.querySelector<HTMLButtonElement>(`[data-id="${id}"]:not(:disabled)`) || drawer.querySelector<HTMLButtonElement>('[data-cart-close]');
    (same && !same.disabled ? same : fallback)?.focus();
  });
  window.addEventListener('storage', event => { if (event.key === CART_KEY || event.key === null) { cart = readCart(event.newValue); renderCart(); } });
  renderCart();
}

// Full photographs remain accessible through ordinary links when JavaScript is off.
const viewer = document.querySelector<HTMLDialogElement>('.photo-viewer');
const photoLinks = [...document.querySelectorAll<HTMLAnchorElement>('.photo-gallery a, .swag-photo, .news-poster')];
let viewerIndex = 0;
let viewerSet: HTMLAnchorElement[] = [];
let viewerOrigin: HTMLElement | null = null;
const renderPhoto = () => {
  const link = viewerSet[viewerIndex]; if (!link || !viewer) return;
  const original = link.querySelector('img')!;
  const img = viewer.querySelector<HTMLImageElement>('[data-viewer-image]')!;
  img.src = link.href; img.alt = original.alt;
  const caption = link.closest('figure')?.querySelector('figcaption')?.textContent || link.closest('article')?.querySelector('h3')?.textContent || 'November MX School · Dates coming soon';
  viewer.querySelector('#viewer-caption')!.textContent = `${caption}${viewerSet.length > 1 ? ` · ${viewerIndex + 1} / ${viewerSet.length}` : ''}`;
  viewer.querySelectorAll<HTMLButtonElement>('[data-viewer-prev], [data-viewer-next]').forEach(button => { button.hidden = viewerSet.length < 2; });
};
photoLinks.forEach(link => link.addEventListener('click', event => {
  if (!viewer || event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return;
  event.preventDefault(); viewerOrigin = link;
  viewerSet = link.closest('.photo-gallery') ? [...document.querySelectorAll<HTMLAnchorElement>('.photo-gallery a')] : [link];
  viewerIndex = viewerSet.indexOf(link); renderPhoto(); viewer.showModal();
}));
const changePhoto = (offset: number) => { viewerIndex = (viewerIndex + offset + viewerSet.length) % viewerSet.length; renderPhoto(); };
viewer?.querySelector('[data-viewer-close]')?.addEventListener('click', () => viewer.close());
viewer?.querySelector('[data-viewer-prev]')?.addEventListener('click', () => changePhoto(-1));
viewer?.querySelector('[data-viewer-next]')?.addEventListener('click', () => changePhoto(1));
viewer?.addEventListener('keydown', event => { if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') { event.preventDefault(); changePhoto(event.key === 'ArrowLeft' ? -1 : 1); } });
viewer?.addEventListener('close', () => viewerOrigin?.focus({ preventScroll: true }));
viewer?.addEventListener('click', event => { if (event.target === viewer) { const rect = viewer.getBoundingClientRect(); if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) viewer.close(); } });

const progress = document.querySelector<HTMLElement>('[data-reading-progress]');
let ticking = false;
const updateProgress = () => {
  const distance = document.documentElement.scrollHeight - innerHeight;
  if (progress) progress.style.transform = `scaleX(${distance > 0 ? Math.min(1, Math.max(0, scrollY / distance)) : 0})`;
  ticking = false;
};
window.addEventListener('scroll', () => { if (!ticking) { ticking = true; requestAnimationFrame(updateProgress); } }, { passive: true });
window.addEventListener('resize', updateProgress);
updateProgress();
