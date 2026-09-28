/**
 * Calculadora de Comanda — regras de negócio (sem DOM).
 *
 * Recebe clientes, produtos e o consumo e devolve o rateio pronto.
 * Carregado pelo navegador (window.LogicaComanda) e pelo Node
 * (module.exports), para os testes de testes.js rodarem sem navegador.
 */

(function (raiz, fabrica)
{
    if (typeof module === "object" && module.exports)
    {
        module.exports = fabrica();
    }
    else
    {
        raiz.LogicaComanda = fabrica();
    }
})(typeof self !== "undefined" ? self : this, function ()
{
    "use strict";

    var TARIFA_PERCENTUAL = 10;

    var formatadorMoeda = new Intl.NumberFormat("pt-BR",
    {
        style: "currency",
        currency: "BRL"
    });

    /** Formata um número como moeda brasileira (ex.: 3.5 -> "R$ 3,50"). */
    function formatarMoeda(valor)
    {
        return formatadorMoeda.format(Number.isFinite(valor) ? valor : 0);
    }

    /**
     * Converte texto digitado em número, aceitando vírgula decimal
     * ("10,50"), milhar com ponto ("1.234,56") e ponto decimal ("10.50").
     * Devolve NaN quando não é um número válido.
     */
    function converterNumero(texto)
    {
        if (typeof texto === "number")
        {
            return Number.isFinite(texto) ? texto : NaN;
        }

        if (typeof texto !== "string")
        {
            return NaN;
        }

        var limpo = texto.trim().replace(/[Rr]\$\s*/g, "");

        if (!limpo)
        {
            return NaN;
        }

        if (limpo.indexOf(",") >= 0)
        {
            limpo = limpo.replace(/\./g, "").replace(",", ".");
        }

        var valor = Number(limpo);
        return Number.isFinite(valor) ? valor : NaN;
    }

    /** Valida o cadastro de um cliente. Devolve a mensagem de erro ou "". */
    function validarNovoCliente(nome)
    {
        if (!String(nome == null ? "" : nome).trim())
        {
            return "Informe o nome do cliente.";
        }

        return "";
    }

    /** Valida o cadastro de um produto. Devolve a mensagem de erro ou "". */
    function validarNovoProduto(nome, preco, quantidade)
    {
        if (!String(nome == null ? "" : nome).trim())
        {
            return "Informe o nome do produto.";
        }

        if (!Number.isFinite(preco) || preco <= 0)
        {
            return "Informe um preço válido, maior que zero.";
        }

        if (!Number.isInteger(quantidade) || quantidade < 1)
        {
            return "Informe uma quantidade válida, de 1 em diante.";
        }

        return "";
    }

    /**
     * Divide um total em centavos entre N pessoas sem perder centavo:
     * as sobras são distribuídas de um em um a partir da primeira pessoa.
     * Ex.: 1000 centavos entre 3 -> [334, 333, 333].
     */
    function dividirCentavos(totalCentavos, pessoas)
    {
        if (!Number.isInteger(pessoas) || pessoas < 1)
        {
            return [];
        }

        var base = Math.floor(totalCentavos / pessoas);
        var sobra = totalCentavos - base * pessoas;
        var partes = [];

        for (var i = 0; i < pessoas; i++)
        {
            partes.push(base + (i < sobra ? 1 : 0));
        }

        return partes;
    }

    function centavosParaReais(centavos)
    {
        return centavos / 100;
    }

    /**
     * Calcula o que cada cliente deve.
     *
     * - O total de cada produto (preço x quantidade) é dividido em centavos
     *   exatos entre as pessoas marcadas como consumidoras.
     * - Produto sem consumidor é ignorado, sem gerar valor inválido.
     * - A tarifa de 10% de quem a paga incide sobre o próprio subtotal.
     *
     * @param {Array<{id:number,nome:string,tarifa:boolean}>} clientes
     * @param {Array<{id:number,nome:string,preco:number,quantidade:number}>} produtos
     * @param {Object<number, number[]>} consumo id do produto -> ids dos clientes
     * @returns {Array<{id:number,nome:string,tarifa:boolean,itens:Array<{descricao:string,valor:number}>,subtotal:number,tarifaValor:number,total:number}>}
     */
    function ratearComanda(clientes, produtos, consumo)
    {
        var notas = [];
        var notaPorId = {};

        (clientes || []).forEach(function (cliente)
        {
            var nota = {
                id: cliente.id,
                nome: cliente.nome,
                tarifa: cliente.tarifa === true,
                itens: [],
                subtotalCentavos: 0
            };

            notas.push(nota);
            notaPorId[cliente.id] = nota;
        });

        (produtos || []).forEach(function (produto)
        {
            var ids = (consumo && consumo[produto.id]) || [];
            var consumidores = ids.filter(function (id, indice)
            {
                return notaPorId[id] && ids.indexOf(id) === indice;
            });

            if (consumidores.length === 0)
            {
                return;
            }

            var totalCentavos = Math.round(produto.preco * produto.quantidade * 100);
            var partes = dividirCentavos(totalCentavos, consumidores.length);

            consumidores.forEach(function (id, indice)
            {
                var nota = notaPorId[id];
                nota.itens.push(
                {
                    descricao: produto.nome,
                    valor: centavosParaReais(partes[indice])
                });
                nota.subtotalCentavos += partes[indice];
            });
        });

        return notas.map(function (nota)
        {
            var tarifaCentavos = nota.tarifa
                ? Math.round(nota.subtotalCentavos * TARIFA_PERCENTUAL / 100)
                : 0;

            return {
                id: nota.id,
                nome: nota.nome,
                tarifa: nota.tarifa,
                itens: nota.itens,
                subtotal: centavosParaReais(nota.subtotalCentavos),
                tarifaValor: centavosParaReais(tarifaCentavos),
                total: centavosParaReais(nota.subtotalCentavos + tarifaCentavos)
            };
        });
    }

    return {
        TARIFA_PERCENTUAL: TARIFA_PERCENTUAL,
        formatarMoeda: formatarMoeda,
        converterNumero: converterNumero,
        validarNovoCliente: validarNovoCliente,
        validarNovoProduto: validarNovoProduto,
        dividirCentavos: dividirCentavos,
        ratearComanda: ratearComanda
    };
});
