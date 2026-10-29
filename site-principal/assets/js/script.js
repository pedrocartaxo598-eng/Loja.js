const form = document.getElementById('product-form');
const submitButton = form.querySelector('button[type="submit"]');
const nameInput = document.getElementById('product-name');
const quantityInput = document.getElementById('product-quantity');
const expirationInput = document.getElementById('product-expiration');
const feedback = document.getElementById('feedback');
const productList = document.getElementById('product-list');
const emptyState = document.getElementById('empty-state');
const productCount = document.getElementById('product-count');

let products = [];
let isSaving = false;
let isLoaded = false;

async function requestJson(url, options) {
    const response = await fetch(url, options);
    const contentType = response.headers.get('content-type') || '';

    if (!contentType.includes('application/json')) {
        throw new Error('A resposta não veio da API do estoque. Abra o site em http://127.0.0.1:3000.');
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
    const openedOnWrongAddress = !validHost || window.location.port !== '3000';
    const instructions = openedFromFile || openedOnWrongAddress
        ? 'Inicie o servidor e abra http://127.0.0.1:3000.'
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

function parseBrazilianDate(dateString) {
    const match = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(dateString);
    if (!match) {
        return null;
    }

    const [, day, month, year] = match;
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

async function saveProducts(updatedProducts) {
    await requestJson('/api/products', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatedProducts)
    });
}

function showSaveError(error) {
    feedback.classList.remove('success');
    feedback.textContent = `Não foi possível salvar os produtos no arquivo JSON: ${error.message}`;
    console.error('Erro ao salvar produtos do estoque:', error);
}

async function removeProduct(productId) {
    if (isSaving || !isLoaded) {
        return;
    }

    const previousProducts = products;
    const updatedProducts = products.filter((product) => product.id !== productId);
    isSaving = true;
    products = updatedProducts;
    renderProducts();

    try {
        await saveProducts(products);
        feedback.classList.add('success');
        feedback.textContent = 'Produto removido do estoque.';
    } catch (error) {
        products = previousProducts;
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
    const expiration = parseBrazilianDate(expirationInput.value.trim());

    if (!name || !Number.isSafeInteger(quantity) || quantity < 1 || !expiration) {
        feedback.classList.remove('success');
        feedback.textContent = 'Informe nome, quantidade inteira maior que zero e validade no formato DD/MM/AAAA (data válida).';
        return;
    }

    const previousProducts = products;
    const product = {
        id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
        name,
        quantity,
        expiration
    };

    products = [product, ...products];
    isSaving = true;
    submitButton.disabled = true;
    renderProducts();

    try {
        await saveProducts(products);
        form.reset();
        nameInput.focus();
        feedback.classList.add('success');
        feedback.textContent = 'Produto cadastrado com sucesso.';
    } catch (error) {
        products = previousProducts;
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
        renderProducts();
    } catch (error) {
        showLoadError(error);
    } finally {
        submitButton.disabled = !isLoaded;
    }
}

submitButton.disabled = true;
loadProducts();
