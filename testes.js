/**
 * Testes das regras de negócio da calculadora.
 * Rode com: node testes.js (ou npm test)
 */

const test = require("node:test");
const assert = require("node:assert/strict");

const {
    TARIFA_PERCENTUAL,
    converterNumero,
    dividirCentavos,
    formatarMoeda,
    validarNovoCliente,
    validarNovoProduto,
    ratearComanda
} = require("./logica.js");

/** Converte reais para centavos inteiros, evitando ruído de ponto flutuante. */
function centavos(valor)
{
    return Math.round(valor * 100);
}

/** Soma dos totais de todas as notas, em centavos. */
function somaTotais(notas)
{
    return notas.reduce((soma, nota) => soma + centavos(nota.total), 0);
}

test("converterNumero aceita vírgula, milhar e ponto decimal", () =>
{
    assert.equal(converterNumero("10,50"), 10.5);
    assert.equal(converterNumero("1.234,56"), 1234.56);
    assert.equal(converterNumero("10.50"), 10.5);
    assert.equal(converterNumero("R$ 12,90"), 12.9);
    assert.equal(converterNumero(7), 7);
});

test("converterNumero rejeita texto vazio ou inválido", () =>
{
    assert.ok(Number.isNaN(converterNumero("")));
    assert.ok(Number.isNaN(converterNumero("   ")));
    assert.ok(Number.isNaN(converterNumero("abc")));
    assert.ok(Number.isNaN(converterNumero(null)));
});

test("validarNovoCliente exige nome", () =>
{
    assert.equal(validarNovoCliente("Ana"), "");
    assert.equal(validarNovoCliente("  "), "Informe o nome do cliente.");
});

test("validarNovoProduto exige nome, preço positivo e quantidade inteira", () =>
{
    assert.equal(validarNovoProduto("Cerveja", 12.5, 2), "");
    assert.match(validarNovoProduto("", 12.5, 2), /nome/);
    assert.match(validarNovoProduto("Cerveja", 0, 2), /preço/);
    assert.match(validarNovoProduto("Cerveja", NaN, 2), /preço/);
    assert.match(validarNovoProduto("Cerveja", 12.5, 0), /quantidade/);
    assert.match(validarNovoProduto("Cerveja", 12.5, 1.5), /quantidade/);
});

test("dividirCentavos distribui a sobra sem perder centavo", () =>
{
    assert.deepEqual(dividirCentavos(1000, 3), [334, 333, 333]);
    assert.deepEqual(dividirCentavos(1000, 5), [200, 200, 200, 200, 200]);
    assert.deepEqual(dividirCentavos(1180, 2), [590, 590]);
    assert.deepEqual(dividirCentavos(5, 2), [3, 2]);
    assert.deepEqual(dividirCentavos(100, 0), []);
    assert.equal(dividirCentavos(9999, 7).reduce((a, b) => a + b, 0), 9999);
});

test("rateio simples: um produto dividido entre duas pessoas", () =>
{
    const clientes = [
        { id: 1, nome: "Ana", tarifa: false },
        { id: 2, nome: "Bruno", tarifa: false }
    ];
    const produtos = [{ id: 1, nome: "Pizza", preco: 50, quantidade: 1 }];
    const notas = ratearComanda(clientes, produtos, { 1: [1, 2] });

    assert.equal(centavos(notas[0].subtotal), 2500);
    assert.equal(centavos(notas[1].subtotal), 2500);
    assert.equal(centavos(notas[0].total), 2500);
    assert.equal(notas[0].itens[0].descricao, "Pizza");
    assert.equal(somaTotais(notas), centavos(50));
});

test("rateio com quantidade: preço x quantidade divide o total", () =>
{
    const clientes = [
        { id: 1, nome: "Ana", tarifa: false },
        { id: 2, nome: "Bruno", tarifa: false }
    ];
    const produtos = [{ id: 1, nome: "Suco", preco: 5.9, quantidade: 2 }];
    const notas = ratearComanda(clientes, produtos, { 1: [1, 2] });

    assert.equal(centavos(notas[0].subtotal), 590);
    assert.equal(centavos(notas[1].subtotal), 590);
    assert.equal(somaTotais(notas), centavos(11.8));
});

test("arredondamento: R$ 10,00 entre três pessoas fecha exatamente", () =>
{
    const clientes = [
        { id: 1, nome: "Ana", tarifa: false },
        { id: 2, nome: "Bruno", tarifa: false },
        { id: 3, nome: "Carla", tarifa: false }
    ];
    const produtos = [{ id: 1, nome: "Porção", preco: 10, quantidade: 1 }];
    const notas = ratearComanda(clientes, produtos, { 1: [1, 2, 3] });

    assert.deepEqual(notas.map((nota) => centavos(nota.total)), [334, 333, 333]);
    assert.equal(somaTotais(notas), 1000);
});

test("tarifa de 10% incide sobre o subtotal de quem a paga", () =>
{
    const clientes = [
        { id: 1, nome: "Ana", tarifa: true },
        { id: 2, nome: "Bruno", tarifa: false }
    ];
    const produtos = [{ id: 1, nome: "Jantar", preco: 100, quantidade: 1 }];
    const notas = ratearComanda(clientes, produtos, { 1: [1, 2] });

    assert.equal(TARIFA_PERCENTUAL, 10);
    assert.equal(centavos(notas[0].subtotal), 5000);
    assert.equal(centavos(notas[0].tarifaValor), 500);
    assert.equal(centavos(notas[0].total), 5500);
    assert.equal(centavos(notas[1].tarifaValor), 0);
    assert.equal(centavos(notas[1].total), 5000);
});

test("tarifa com centavos arredonda para o centavo mais próximo", () =>
{
    const clientes = [{ id: 1, nome: "Ana", tarifa: true }];
    const produtos = [{ id: 1, nome: "Café", preco: 8.33, quantidade: 1 }];
    const notas = ratearComanda(clientes, produtos, { 1: [1] });

    assert.equal(centavos(notas[0].tarifaValor), 83);
    assert.equal(centavos(notas[0].total), 916);
});

test("produto sem consumidor é ignorado, sem valor inválido", () =>
{
    const clientes = [{ id: 1, nome: "Ana", tarifa: false }];
    const produtos = [
        { id: 1, nome: "Pizza", preco: 40, quantidade: 1 },
        { id: 2, nome: "Sobremesa", preco: 20, quantidade: 2 }
    ];
    const notas = ratearComanda(clientes, produtos, { 1: [1] });

    assert.equal(notas[0].itens.length, 1);
    assert.equal(centavos(notas[0].total), 4000);
    assert.ok(Number.isFinite(notas[0].total));
});

test("consumidor marcado duas vezes não paga em dobro", () =>
{
    const clientes = [{ id: 1, nome: "Ana", tarifa: false }];
    const produtos = [{ id: 1, nome: "Refrigerante", preco: 12, quantidade: 1 }];
    const notas = ratearComanda(clientes, produtos, { 1: [1, 1] });

    assert.equal(centavos(notas[0].total), 1200);
});

test("consumidor inexistente é descartado do rateio", () =>
{
    const clientes = [{ id: 1, nome: "Ana", tarifa: false }];
    const produtos = [{ id: 1, nome: "Pizza", preco: 30, quantidade: 1 }];
    const notas = ratearComanda(clientes, produtos, { 1: [1, 99] });

    assert.equal(centavos(notas[0].total), 3000);
});

test("formatarMoeda usa o padrão brasileiro", () =>
{
    assert.equal(formatarMoeda(3.5).replace(/\u00a0/g, " "), "R$ 3,50");
    assert.equal(formatarMoeda(1234.56).replace(/\u00a0/g, " "), "R$ 1.234,56");
    assert.equal(formatarMoeda(NaN).replace(/\u00a0/g, " "), "R$ 0,00");
});
