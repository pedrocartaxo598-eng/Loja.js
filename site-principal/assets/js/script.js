const form = document.getElementById('product-form');
const submitButton = form.querySelector('button[type="submit"]');
const nameInput = document.getElementById('product-name');
const quantityInput = document.getElementById('product-quantity');
const expirationInput = document.getElementById('product-expiration');
const feedback = document.getElementById('feedback');
const productList = document.getElementById('product-list');
const emptyState = document.getElementById('empty-state');
const productCount = document.getElementById('product-count');
const legacyStorageKey = 'cantinaProdutos';

let products = [];
let isSaving = false;
let isLoaded = false;

async function requestJson(url, options) {
    const response = await fetch(url, options);
    if (response.status === 204) {
        return null;
    }

    const contentType = response.headers.get('content-type') || '';

    if (!contentType.includes('application/json')) {
        throw new Error('A resposta não veio da API do estoque. Abra o site em http://127.0.0.1:5152.');
    }

    const result = await response.json();
    if (!response.ok) {
        throw new Error(result.error || 'A solicitação ao servidor falhou.');
    }
    return result;
}

function showLoadError(error) {
    feedback.classList.remove('success');
    const openedFromFile = window.location.protocol === 'file:';
    const validHost = window.location.hostname === '127.0.0.1'
        || window.location.hostname === 'localhost';
    const openedOnWrongAddress = !validHost || window.location.port !== '5152';
    const instructions = openedFromFile || openedOnWrongAddress
        ? 'Inicie o programa e abra http://127.0.0.1:5152.'
        : 'Verifique se o servidor está em execução.';
    feedback.textContent = `Não foi possível carregar os produtos. ${instructions} (${error.message})`;
    console.error('Erro ao carregar produtos do estoque:', error);
}

function getDaysUntilExpiration(dateString) {
    const [year, month, day] = dateString.split('-').map(Number);
    const expirationDay = Date.UTC(year, month - 1, day);
    const today = new Date();
    const todayDay = Date.UTC(today.getFullYear(), today.getMonth(), today.getDate());
    return Math.round((expirationDay - todayDay) / 86400000);
}

function formatDate(dateString) {
    const [year, month, day] = dateString.split('-');
    return `${day}/${month}/${year}`;
}

function parseIsoDate(dateString) {
    const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dateString);
    if (!match) {
        return null;
    }

    const [, year, month, day] = match;
    const date = new Date(Date.UTC(Number(year), Number(month) - 1, Number(day)));
    if (
        Number(year) < 1000
        || date.getUTCFullYear() !== Number(year)
        || date.getUTCMonth() !== Number(month) - 1
        || date.getUTCDate() !== Number(day)
    ) {
        return null;
    }

    return `${year}-${month}-${day}`;
}

function createProductCard(product) {
    const card = document.createElement('article');
    card.className = 'product-card';

    const details = document.createElement('div');
    const name = document.createElement('h3');
    name.className = 'product-name';
    name.textContent = product.name;

    const expiration = document.createElement('p');
    expiration.className = 'product-expiration';
    expiration.textContent = `Validade: ${formatDate(product.expiration)}`;

    const daysRemaining = getDaysUntilExpiration(product.expiration);
    const status = document.createElement('span');
    status.className = 'expiry-status';
    if (daysRemaining < 0) {
        status.classList.add('expired');
        status.textContent = 'Vencido';
    } else if (daysRemaining <= 30) {
        status.classList.add('soon');
        status.textContent = daysRemaining === 0 ? 'Vence hoje' : `Vence em ${daysRemaining} dia(s)`;
    } else {
        status.textContent = 'Dentro da validade';
    }

    details.append(name, expiration, status);

    const quantity = document.createElement('p');
    quantity.className = 'product-quantity';
    quantity.append('Quantidade: ');
    const quantityValue = document.createElement('strong');
    quantityValue.textContent = product.quantity;
    quantity.append(quantityValue);

    const deleteButton = document.createElement('button');
    deleteButton.className = 'delete-button';
    deleteButton.type = 'button';
    deleteButton.textContent = 'Remover';
    deleteButton.disabled = isSaving;
    deleteButton.setAttribute('aria-label', `Remover ${product.name} do estoque`);
    deleteButton.addEventListener('click', () => removeProduct(product.id));

    card.append(details, quantity, deleteButton);
    return card;
}

function renderProducts() {
    productList.replaceChildren(...products.map(createProductCard));
    emptyState.hidden = products.length > 0;
    productCount.textContent = `${products.length} ${products.length === 1 ? 'produto' : 'produtos'} no estoque`;
}

async function createProduct(product) {
    return requestJson('/api/products', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(product)
    });
}

async function migrateLegacyProducts() {
    const savedProducts = localStorage.getItem(legacyStorageKey);
    if (savedProducts === null) {
        return [];
    }

    let legacyProducts;
    try {
        legacyProducts = JSON.parse(savedProducts);
    } catch (error) {
        throw new Error('Os produtos antigos salvos no navegador estão em um formato inválido.');
    }
    if (!Array.isArray(legacyProducts)) {
        throw new Error('Os produtos antigos salvos no navegador estão em um formato inválido.');
    }

    const result = await requestJson('/api/products/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(legacyProducts)
    });
    if (!result || !Array.isArray(result.products)) {
        throw new Error('O servidor retornou um resultado inválido ao importar os produtos antigos.');
    }

    localStorage.removeItem(legacyStorageKey);
    return result.products;
}

function showSaveError(error) {
    feedback.classList.remove('success');
    feedback.textContent = `Não foi possível salvar os produtos no banco de dados: ${error.message}`;
    console.error('Erro ao salvar produtos no banco de dados:', error);
}

async function removeProduct(productId) {
    if (isSaving || !isLoaded) {
        return;
    }

    isSaving = true;
    renderProducts();

    try {
        await requestJson(`/api/products/${encodeURIComponent(productId)}`, {
            method: 'DELETE'
        });
        products = products.filter((product) => product.id !== productId);
        feedback.classList.add('success');
        feedback.textContent = 'Produto removido do estoque.';
    } catch (error) {
        showSaveError(error);
    } finally {
        isSaving = false;
        renderProducts();
    }
}

form.addEventListener('submit', async (event) => {
    event.preventDefault();

    if (isSaving || !isLoaded) {
        return;
    }

    const name = nameInput.value.trim();
    const quantity = Number(quantityInput.value);
    const expiration = parseIsoDate(expirationInput.value);

    if (!name || !Number.isSafeInteger(quantity) || quantity < 1 || !expiration) {
        feedback.classList.remove('success');
        feedback.textContent = 'Informe nome, quantidade inteira maior que zero e uma data de validade válida.';
        return;
    }

    const product = {
        name,
        quantity,
        expiration
    };

    isSaving = true;
    submitButton.disabled = true;

    try {
        const savedProduct = await createProduct(product);
        products = [savedProduct, ...products];
        form.reset();
        nameInput.focus();
        feedback.classList.add('success');
        feedback.textContent = 'Produto cadastrado com sucesso.';
    } catch (error) {
        showSaveError(error);
    } finally {
        isSaving = false;
        submitButton.disabled = false;
        renderProducts();
    }
});

async function loadProducts() {
    try {
        const result = await requestJson('/api/products');
        if (!Array.isArray(result)) {
            throw new Error('O servidor retornou os produtos em um formato inválido.');
        }

        products = result;
        isLoaded = true;
        try {
            const migratedProducts = await migrateLegacyProducts();
            const productsById = new Map(products.map((product) => [product.id, product]));
            migratedProducts.forEach((product) => productsById.set(product.id, product));
            products = Array.from(productsById.values())
                .sort((first, second) => first.expiration.localeCompare(second.expiration));
            if (migratedProducts.length > 0) {
                feedback.classList.add('success');
                feedback.textContent = 'Produtos antigos importados para o banco de dados.';
            }
        } catch (error) {
            showSaveError(error);
        }
        renderProducts();
    } catch (error) {
        showLoadError(error);
    } finally {
        submitButton.disabled = !isLoaded;
    }
}

submitButton.disabled = true;
loadProducts();
