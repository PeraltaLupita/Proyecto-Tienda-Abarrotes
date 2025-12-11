const productosGrid = document.getElementById('productos-grid');
const verCarritoBtn = document.getElementById('ver-carrito');
const btnAgregarProducto = document.getElementById('btn-agregar-producto');
const btnEliminarProducto = document.getElementById('btn-eliminar-producto');
const modalCarrito = document.getElementById('modal-carrito');
const closeModalBtn = modalCarrito.querySelector('.close');
const carritoItems = document.getElementById('carrito-items');
const totalPrecio = document.getElementById('total-precio');
const btnComprar = document.getElementById('btn-comprar');

let productsCache = [];
let cart = [];

// Cargar productos desde el servidor y renderizar
async function loadProducts() {
    try {
        const res = await fetch('/api/productos');
        const data = await res.json();
        productsCache = Array.isArray(data) ? data : [];
        renderProducts(productsCache);
    } catch (err) {
        console.error('Error al cargar productos:', err);
        productosGrid.innerHTML = '<p>No se pudieron cargar los productos.</p>';
    }
}

function renderProducts(products) {
    productosGrid.innerHTML = '';
    products.forEach(p => {
        const card = document.createElement('div');
        card.className = 'producto-card';

        const img = document.createElement('img');
        img.className = 'producto-img';
        img.src = p.imagen_url ? `images/${p.imagen_url}` : 'images/placeholder.png';
        img.alt = p.nombre || 'Producto';

        const name = document.createElement('h3');
        name.textContent = p.nombre || 'Sin nombre';

        const price = document.createElement('p');
        price.className = 'precio';
        price.textContent = `$${Number(p.precio || 0).toFixed(2)}`;

        const btnAdd = document.createElement('button');
        btnAdd.className = 'btn-agregar';
        btnAdd.textContent = 'Agregar al carrito';
        btnAdd.addEventListener('click', () => addToCart(p));

        card.appendChild(img);
        card.appendChild(name);
        card.appendChild(price);
        card.appendChild(btnAdd);

        productosGrid.appendChild(card);
    });
}

function addToCart(product) {
    const existing = cart.find(i => i.id === product.id);
    if (existing) existing.qty += 1;
    else cart.push({ id: product.id, nombre: product.nombre, precio: Number(product.precio || 0), qty: 1 });
    renderCart();
}

function removeFromCart(id) {
    cart = cart.filter(i => i.id !== id);
    renderCart();
}

function changeQty(id, delta) {
    const item = cart.find(i => i.id === id);
    if (!item) return;
    item.qty += delta;
    if (item.qty <= 0) removeFromCart(id);
    renderCart();
}

function renderCart() {
    carritoItems.innerHTML = '';
    let total = 0;
    if (cart.length === 0) {
        carritoItems.innerHTML = '<p>El carrito está vacío.</p>';
    } else {
        cart.forEach(item => {
            const div = document.createElement('div');
            div.className = 'carrito-item';

            const info = document.createElement('div');
            info.textContent = `${item.nombre} — $${item.precio.toFixed(2)} x ${item.qty}`;

            const controls = document.createElement('div');
            controls.className = 'carrito-controls';

            const btnMinus = document.createElement('button');
            btnMinus.textContent = '-';
            btnMinus.addEventListener('click', () => changeQty(item.id, -1));

            const btnPlus = document.createElement('button');
            btnPlus.textContent = '+';
            btnPlus.addEventListener('click', () => changeQty(item.id, 1));

            const btnRemove = document.createElement('button');
            btnRemove.textContent = 'Eliminar';
            btnRemove.addEventListener('click', () => removeFromCart(item.id));

            controls.appendChild(btnMinus);
            controls.appendChild(btnPlus);
            controls.appendChild(btnRemove);

            div.appendChild(info);
            div.appendChild(controls);

            carritoItems.appendChild(div);

            total += item.precio * item.qty;
        });
    }
    totalPrecio.textContent = total.toFixed(2);
}

// Modal handlers
verCarritoBtn.addEventListener('click', () => {
    modalCarrito.style.display = 'block';
    renderCart();
});
closeModalBtn.addEventListener('click', () => {
    modalCarrito.style.display = 'none';
});
window.addEventListener('click', (e) => {
    if (e.target === modalCarrito) modalCarrito.style.display = 'none';
});

// Comprar
btnComprar.addEventListener('click', () => {
    if (cart.length === 0) {
        alert('El carrito está vacío');
        return;
    }
    alert(`Compra realizada. Total: $${totalPrecio.textContent}`);
    cart = [];
    renderCart();
    modalCarrito.style.display = 'none';
});

// Inicializar
loadProducts();

// Handler: redirigir a la página de agregar producto
btnAgregarProducto.addEventListener('click', () => {
    window.location.href = 'AgregarProducto.html';
});

// Handler: eliminar producto por ID (prompt)
btnEliminarProducto.addEventListener('click', async () => {
    const id = prompt('ID del producto a eliminar:');
    if (!id) return;
    if (!confirm('¿Eliminar producto con ID ' + id + '?')) return;

    try {
        const res = await fetch(`/api/eliminar-producto/${encodeURIComponent(id)}`, { method: 'DELETE' });
        const data = await res.json();
        if (res.ok) {
            alert('Producto eliminado correctamente');
            loadProducts();
        } else {
            alert('Error al eliminar: ' + (data.error || JSON.stringify(data)));
        }
    } catch (err) {
        console.error('Error al eliminar producto:', err);
        alert('Error al conectar con el servidor');
    }
});