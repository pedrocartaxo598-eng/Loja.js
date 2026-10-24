const http = require('node:http');
const fs = require('node:fs/promises');
const path = require('node:path');
const { randomUUID } = require('node:crypto');

const host = process.env.HOST || '127.0.0.1';
const port = Number(process.env.PORT || 3000);
const productsFile = path.join(__dirname, 'produtos.json');
const maxRequestSize = 1024 * 1024;
const staticFiles = new Map([
    ['/', ['index.html', 'text/html; charset=utf-8']],
    ['/index.html', ['index.html', 'text/html; charset=utf-8']],
    ['/script.js', ['script.js', 'text/javascript; charset=utf-8']],
    ['/style.css', ['style.css', 'text/css; charset=utf-8']]
]);

class RequestError extends Error {
    constructor(message, statusCode) {
        super(message);
        this.statusCode = statusCode;
    }
}

function sendJson(response, statusCode, data) {
    response.writeHead(statusCode, {
        'Content-Type': 'application/json; charset=utf-8',
        'Cache-Control': 'no-store'
    });
    response.end(JSON.stringify(data));
}

function isValidProduct(product) {
    if (!product || typeof product !== 'object' || Array.isArray(product)) {
        return false;
    }

    if (
        typeof product.id !== 'string'
        || product.id.trim().length === 0
        || product.id.length > 120
        || typeof product.name !== 'string'
        || product.name.trim().length === 0
        || product.name.trim().length > 80
        || !Number.isSafeInteger(product.quantity)
        || product.quantity < 1
        || typeof product.expiration !== 'string'
    ) {
        return false;
    }

    const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(product.expiration);
    if (!match) {
        return false;
    }

    const [, year, month, day] = match;
    const date = new Date(Date.UTC(Number(year), Number(month) - 1, Number(day)));
    return date.getUTCFullYear() === Number(year)
        && date.getUTCMonth() === Number(month) - 1
        && date.getUTCDate() === Number(day);
}

function validateProducts(products) {
    if (!Array.isArray(products) || !products.every(isValidProduct)) {
        throw new RequestError(
            'Os produtos devem conter ID, nome, quantidade positiva e validade válida.',
            400
        );
    }

    return products.map(({ id, name, quantity, expiration }) => ({
        id,
        name: name.trim(),
        quantity,
        expiration
    }));
}

async function readProducts() {
    const contents = await fs.readFile(productsFile, 'utf8');
    let products;

    try {
        products = JSON.parse(contents);
    } catch (error) {
        throw new Error(`O arquivo produtos.json contém JSON inválido: ${error.message}`);
    }

    try {
        return validateProducts(products);
    } catch (error) {
        throw new Error(`Os dados de produtos.json são inválidos: ${error.message}`);
    }
}

function readRequestBody(request) {
    return new Promise((resolve, reject) => {
        const chunks = [];
        let size = 0;
        let tooLarge = false;

        request.on('data', (chunk) => {
            size += chunk.length;
            if (size > maxRequestSize) {
                tooLarge = true;
            } else if (!tooLarge) {
                chunks.push(chunk);
            }
        });
        request.on('end', () => {
            if (tooLarge) {
                reject(new RequestError('A solicitação excede o limite de 1 MB.', 413));
                return;
            }
            resolve(Buffer.concat(chunks).toString('utf8'));
        });
        request.on('error', reject);
    });
}

let writeQueue = Promise.resolve();

function saveProducts(products) {
    const save = writeQueue.then(async () => {
        const temporaryFile = `${productsFile}.${process.pid}.${randomUUID()}.tmp`;
        try {
            await fs.writeFile(temporaryFile, `${JSON.stringify(products, null, 2)}\n`, 'utf8');
            await fs.rename(temporaryFile, productsFile);
        } catch (error) {
            try {
                await fs.unlink(temporaryFile);
            } catch (cleanupError) {
                if (cleanupError.code !== 'ENOENT') {
                    console.error('Não foi possível remover o arquivo temporário:', cleanupError);
                }
            }
            throw error;
        }
    });
    writeQueue = save.catch(() => {});
    return save;
}

async function handleApiRequest(request, response) {
    if (request.url === '/api/products' && request.method === 'GET') {
        sendJson(response, 200, await readProducts());
        return;
    }

    if (request.url === '/api/products' && request.method === 'PUT') {
        const contentType = request.headers['content-type'] || '';
        if (!contentType.toLowerCase().startsWith('application/json')) {
            throw new RequestError('Envie os produtos como application/json.', 415);
        }

        let submittedProducts;
        try {
            submittedProducts = JSON.parse(await readRequestBody(request));
        } catch (error) {
            if (error instanceof RequestError) {
                throw error;
            }
            throw new RequestError('O corpo da solicitação não contém JSON válido.', 400);
        }

        const products = validateProducts(submittedProducts);
        await saveProducts(products);
        sendJson(response, 200, { success: true });
        return;
    }

    if (request.url.startsWith('/api/')) {
        throw new RequestError('Rota da API não encontrada.', 404);
    }

    throw new RequestError('Rota não encontrada.', 404);
}

const server = http.createServer(async (request, response) => {
    const requestUrl = new URL(request.url, `http://${request.headers.host || host}`);

    try {
        if (requestUrl.pathname.startsWith('/api/')) {
            await handleApiRequest(request, response);
            return;
        }

        if (request.method !== 'GET' && request.method !== 'HEAD') {
            throw new RequestError('Método não permitido.', 405);
        }

        const staticFile = staticFiles.get(requestUrl.pathname);
        if (!staticFile) {
            throw new RequestError('Arquivo não encontrado.', 404);
        }

        const [fileName, contentType] = staticFile;
        const contents = await fs.readFile(path.join(__dirname, fileName));
        response.writeHead(200, {
            'Content-Type': contentType,
            'Content-Length': contents.length
        });
        response.end(request.method === 'HEAD' ? undefined : contents);
    } catch (error) {
        const statusCode = error instanceof RequestError ? error.statusCode : 500;
        if (statusCode === 500) {
            console.error('Erro ao processar solicitação:', error);
        }
        sendJson(response, statusCode, {
            error: statusCode === 500
                ? 'Não foi possível ler ou salvar os produtos.'
                : error.message
        });
    }
});

server.listen(port, host, () => {
    console.log(`Servidor da cantina disponível em http://${host}:${port}`);
});

server.on('error', (error) => {
    console.error('Não foi possível iniciar o servidor:', error);
    process.exitCode = 1;
});
