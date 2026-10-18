const STORAGE_KEY = 'cantinaProdutos';
const form = document.getElementById('product-form');
const nameInput = document.getElementById('product-name');
const quantityInput = document.getElementById('product-quantity');
const expirationInput = document.getElementById('product-expiration');
const feedback = document.getElementById('feedback');
const productList = document.getElementById('product-list');
const emptyState = document.getElementById('empty-state');
const productCount = document.getElementById('product-count');

function readProducts() {
    const savedProducts = localStorage.getItem(STORAGE_KEY);

    if (!savedProducts) {
        return [];
    }

    try {
        const products = JSON.parse(savedProducts);
        if (!Array.isArray(products)) {
            throw new Error('Os dados salvos não estão no formato esperado.');
        }
        return products;
    } catch (error) {
        feedback.textContent = 'Não foi possível ler os produtos salvos. Limpe os dados deste site e tente novamente.';
        console.error('Erro ao carregar produtos do estoque:', error);
        return [];
    }
}

let products = readProducts();

function localDateString(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
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

function saveProducts() {
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(products));
        return true;
    } catch (error) {
        feedback.classList.remove('success');
        feedback.textContent = 'Não foi possível salvar no navegador. Verifique as permissões e o espaço disponível.';
        console.error('Erro ao salvar produtos do estoque:', error);
        return false;
    }
}

function removeProduct(productId) {
    const updatedProducts = products.filter((product) => product.id !== productId);
    const previousProducts = products;
    products = updatedProducts;

    if (!saveProducts()) {
        products = previousProducts;
        return;
    }

    feedback.classList.add('success');
    feedback.textContent = 'Produto removido do estoque.';
    renderProducts();
}

form.addEventListener('submit', (event) => {
    event.preventDefault();

    const name = nameInput.value.trim();
    const quantity = Number(quantityInput.value);
    const expiration = expirationInput.value;

    if (!name || !Number.isSafeInteger(quantity) || quantity < 1 || !expiration) {
        feedback.classList.remove('success');
        feedback.textContent = 'Informe um nome, uma quantidade inteira maior que zero e a validade.';
        return;
    }

    const product = {
        id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
        name,
        quantity,
        expiration
    };

    products.unshift(product);
    if (!saveProducts()) {
        products.shift();
        return;
    }

    renderProducts();
    form.reset();
    nameInput.focus();
    feedback.classList.add('success');
    feedback.textContent = 'Produto cadastrado com sucesso.';
});

renderProducts();
