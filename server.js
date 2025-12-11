const express = require('express');
const sqlite = require('sqlite');
const path = require('path');
const sqliteDriver = require('sqlite3');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 3000;
let DB_PATH = path.join(__dirname, 'Tienda Abarrotes.db');

// Detectar y preparar la base de datos al arrancar.
async function ensureDatabase() {
    const candidates = [
        'Tienda Abarrotes.db',
        'TiendaAbarrotes.db'
    ];

    // Buscar archivo que exista y tenga la tabla Products
    for (const name of candidates) {
        const p = path.join(__dirname, name);
        if (fs.existsSync(p)) {
            try {
                const db = await sqlite.open({ filename: p, driver: sqliteDriver.Database });
                const row = await db.get("SELECT name FROM sqlite_master WHERE type='table' AND name='Products'");
                await db.close();
                if (row && row.name === 'Products') {
                    DB_PATH = p;
                    console.log('Usando base de datos existente con tabla Products:', name);
                    return;
                }
            } catch (err) {
                console.warn('No se pudo inspeccionar', name, err.message || err);
            }
        }
    }

    // Si llegamos aquí, o no hay archivo con Products, elegimos el primer candidato (o creamos uno)
    const chosen = path.join(__dirname, candidates[0]);
    DB_PATH = chosen;
    try {
        const db = await sqlite.open({ filename: DB_PATH, driver: sqliteDriver.Database });

        // Crear la tabla si no existe
        await db.exec(`
            CREATE TABLE IF NOT EXISTS Products (
                IdProduct INTEGER PRIMARY KEY AUTOINCREMENT,
                NameP TEXT NOT NULL,
                Price REAL NOT NULL,
                Image TEXT
            );
        `);

        // Si está vacía, insertar algunos ejemplos mínimos
        const cnt = await db.get('SELECT COUNT(*) AS cnt FROM Products');
        if (!cnt || cnt.cnt === 0) {
            const sample = [
                ['Arroz 1kg', 18.5, 'arroz.jpg'],
                ['Aceite 1L', 45.0, 'aceite.jpg'],
                ['Azúcar 1kg', 20.0, 'azucar.jpg']
            ];
            const stmt = await db.prepare('INSERT INTO Products (NameP, Price, Image) VALUES (?, ?, ?)');
            for (const row of sample) {
                await stmt.run(row[0], row[1], row[2]);
            }
            await stmt.finalize();
            console.log('Tabla Products creada e insertados productos de ejemplo en', DB_PATH);
        } else {
            console.log('Tabla Products existe pero no estaba encontrada antes; usando', DB_PATH);
        }

        await db.close();
    } catch (err) {
        console.error('Error preparando la base de datos:', err);
    }
}

app.use(express.static(path.join(__dirname)));
app.use(express.json());

app.get('/api/producto/:id', async (req, res) => {
    let db;
    try {
        const productoId = req.params.id;

        db = await sqlite.open({
            filename: DB_PATH,
            driver: sqliteDriver.Database 
        });

        const producto = await db.get(
            `SELECT 
                IdProduct AS id,
                NameP AS nombre, 
                Price AS precio,
                Image AS imagen_url 
             FROM Products 
             WHERE IdProduct = ?`,
            [productoId]
        );

        if (producto) {
            res.json(producto);
        } else {
            res.status(404).json({ error: 'Producto no encontrado' });
        }
    } catch (err) {
        console.error('Error al obtener producto:', err);
        res.status(500).json({ error: 'Error interno del servidor' });
    } finally {
        if (db) {
            await db.close();
        }
    }
});

app.post('/api/agregar-producto', async (req, res) => {
    let db;
    try {
        const { nombre, precio, imagen } = req.body;

        db = await sqlite.open({
            filename: DB_PATH,
            driver: sqliteDriver.Database 
        });

        const result = await db.run(
            `INSERT INTO Products (NameP, Price, Image) VALUES (?, ?, ?)`,
            [nombre, precio, imagen]
        );

        res.status(201).json({ message: 'Producto agregado', id: result.lastID });
    } catch (err) {
        console.error('Error al agregar producto:', err);
        res.status(500).json({ error: 'Error interno del servidor' });
    } finally {
        if (db) {
            await db.close();
        }
    }
});

// Listar todos los productos
app.get('/api/productos', async (req, res) => {
    let db;
    try {
        db = await sqlite.open({
            filename: DB_PATH,
            driver: sqliteDriver.Database
        });

        const productos = await db.all(
            `SELECT IdProduct AS id, NameP AS nombre, Price AS precio, Image AS imagen_url FROM Products`
        );

        res.json(productos);
    } catch (err) {
        console.error('Error al listar productos:', err);
        res.status(500).json({ error: 'Error interno del servidor' });
    } finally {
        if (db) {
            await db.close();
        }
    }
});

app.delete('/api/eliminar-producto/:id', async (req, res) => {
    let db;
    try {
        const productoId = req.params.id;

        db = await sqlite.open({
            filename: DB_PATH,
            driver: sqliteDriver.Database 
        });

        const result = await db.run(
            `DELETE FROM Products WHERE IdProduct = ?`,
            [productoId]
        );

        if (result.changes > 0) {
            res.json({ message: 'Producto eliminado correctamente' });
        } else {
            res.status(404).json({ error: 'Producto no encontrado' });
        }
    } catch (err) {
        console.error('Error al eliminar producto:', err);
        res.status(500).json({ error: 'Error interno del servidor' });
    } finally {
        if (db) {
            await db.close();
        }
    }
});

(async () => {
    await ensureDatabase();
    app.listen(PORT, () => {
        console.log(`Servidor corriendo en http://localhost:${PORT}`);
    });
})();